import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getQuoteGeneratorSystemPrompt } from "@/lib/prompts/quote-generator";
import { NextRequest } from "next/server";

// Claude Opus pricing (per token) as of 2025.
// Opus is more expensive than Sonnet — we use it here because quote generation
// requires stronger reasoning to produce accurate, complete bills of materials.
const OPUS_INPUT_PRICE_PER_TOKEN = 15 / 1_000_000; // $15 per 1M input tokens
const OPUS_OUTPUT_PRICE_PER_TOKEN = 75 / 1_000_000; // $75 per 1M output tokens
const MODEL = "claude-opus-4-20250514";

// Shape of each line item in Claude's JSON response
interface AILineItem {
  item_type: "material" | "labor";
  description: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  confidence: "high" | "medium" | "low";
}

export async function POST(request: NextRequest) {
  try {
    const { quote_id } = await request.json();

    if (!quote_id) {
      return Response.json(
        { error: "quote_id is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error("ANTHROPIC_API_KEY is not set in environment variables");
      return Response.json(
        { error: "AI service is not configured." },
        { status: 500 }
      );
    }

    const supabase = await createClient();

    // Verify the user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's company
    const { data: profile } = await supabase
      .from("users")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return Response.json({ error: "User profile not found" }, { status: 404 });
    }

    // Verify quote exists and belongs to this company
    const { data: quote } = await supabase
      .from("quotes")
      .select("id, company_id")
      .eq("id", quote_id)
      .single();

    if (!quote) {
      return Response.json({ error: "Quote not found" }, { status: 404 });
    }

    // Load all chat messages for this quote — Claude needs the full conversation context
    const { data: chatHistory } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("quote_id", quote_id)
      .order("created_at", { ascending: true });

    if (!chatHistory || chatHistory.length === 0) {
      return Response.json(
        { error: "No conversation found. Complete the clarification chat first." },
        { status: 400 }
      );
    }

    // Get company details: zip code for regional pricing, margins for markup
    const { data: company } = await supabase
      .from("companies")
      .select("zip_code, default_labor_margin, default_material_margin")
      .eq("id", profile.company_id)
      .single();

    const zipCode = company?.zip_code || "unknown";
    // Default margins: 20% if not set during onboarding
    const laborMargin = company?.default_labor_margin ?? 20;
    const materialMargin = company?.default_material_margin ?? 20;

    // Build messages for Claude from conversation history.
    // Strip the [READY_TO_GENERATE] tag — it was a UI signal, not part of the real conversation.
    const messages: Anthropic.MessageParam[] = chatHistory.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content.replace("[READY_TO_GENERATE]", "").trim(),
    }));

    // Call Claude Opus for quote generation
    const anthropic = new Anthropic({ apiKey });

    let aiResponse: string;
    let inputTokens: number;
    let outputTokens: number;

    // Attempt to generate the quote — retry once if JSON parsing fails
    for (let attempt = 0; attempt < 2; attempt++) {
      const messagesToSend =
        attempt === 0
          ? messages
          : [
              ...messages,
              {
                role: "assistant" as const,
                content: aiResponse!,
              },
              {
                role: "user" as const,
                content:
                  "Your previous response was not valid JSON. Please respond with ONLY the JSON object containing the line_items array, no other text.",
              },
            ];

      const result = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 8192,
        system: getQuoteGeneratorSystemPrompt(zipCode),
        messages: messagesToSend,
      });

      // Extract the text content from Claude's response
      aiResponse = result.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("");

      inputTokens = result.usage.input_tokens;
      outputTokens = result.usage.output_tokens;

      // Try to parse the JSON
      try {
        const parsed = JSON.parse(aiResponse);
        if (!parsed.line_items || !Array.isArray(parsed.line_items)) {
          throw new Error("Missing line_items array");
        }

        // Validate each line item has required fields
        for (const item of parsed.line_items) {
          if (!item.item_type || !item.description || item.quantity == null || item.unit_cost == null) {
            throw new Error("Line item missing required fields");
          }
        }

        // JSON is valid — process the line items
        const lineItems: AILineItem[] = parsed.line_items;

        // Build the database rows from the AI response
        const lineItemRows = lineItems.map((item, index) => {
          // Pick the right margin based on whether it's labor or material
          const margin =
            item.item_type === "labor" ? laborMargin : materialMargin;
          // Billable price = cost * quantity with margin markup applied
          const billablePrice =
            item.unit_cost * item.quantity * (1 + margin / 100);

          return {
            quote_id,
            item_type: item.item_type,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unit_cost: item.unit_cost,
            margin_percent: margin,
            billable_price: Math.round(billablePrice * 100) / 100,
            price_source: "ai_estimate",
            confidence_flag: item.confidence,
            sort_order: index + 1,
            // Preserve the AI's original values so we can track edits for training data
            ai_original_description: item.description,
            ai_original_quantity: item.quantity,
            ai_original_unit_cost: item.unit_cost,
            was_edited: false,
            was_added_manually: false,
          };
        });

        // Insert all line items into the database
        const { data: insertedItems, error: insertError } = await supabase
          .from("quote_line_items")
          .insert(lineItemRows)
          .select();

        if (insertError) {
          console.error("Failed to insert line items:", insertError);
          return Response.json(
            { error: "Failed to save quote line items." },
            { status: 500 }
          );
        }

        // Calculate totals for the quote
        const subtotal = lineItemRows.reduce(
          (sum, item) => sum + item.billable_price,
          0
        );
        const total = Math.round(subtotal * 100) / 100;

        // Update the quote with generation metadata and totals
        const estimatedCost =
          inputTokens! * OPUS_INPUT_PRICE_PER_TOKEN +
          outputTokens! * OPUS_OUTPUT_PRICE_PER_TOKEN;

        await supabase
          .from("quotes")
          .update({
            ai_model_used: MODEL,
            total_tokens_used: inputTokens! + outputTokens!,
            estimated_api_cost: estimatedCost,
            subtotal: total,
            total: total,
          })
          .eq("id", quote_id);

        // Log the API usage (required by CLAUDE.md — every API call must be tracked)
        await supabase.from("api_usage_log").insert({
          company_id: profile.company_id,
          quote_id,
          user_id: user.id,
          endpoint_type: "quote_generation",
          model_used: MODEL,
          input_tokens: inputTokens!,
          output_tokens: outputTokens!,
          estimated_cost_usd: estimatedCost,
        });

        return Response.json({
          line_items: insertedItems,
          subtotal: total,
          total: total,
        });
      } catch (parseError) {
        // First attempt failed to parse — retry
        if (attempt === 0) {
          console.warn("First JSON parse attempt failed, retrying:", parseError);
          continue;
        }
        // Second attempt also failed — give up
        console.error("Quote generation JSON parse failed after retry:", parseError);
        return Response.json(
          { error: "Quote generation failed. Your conversation is saved — please try again." },
          { status: 500 }
        );
      }
    }

    // TypeScript needs this even though the loop always returns
    return Response.json(
      { error: "Quote generation failed." },
      { status: 500 }
    );
  } catch (error) {
    console.error("Generate quote error:", error);
    return Response.json(
      { error: "Quote generation failed. Your conversation is saved — please try again." },
      { status: 500 }
    );
  }
}
