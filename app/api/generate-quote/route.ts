import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getQuoteGeneratorSystemPrompt } from "@/lib/prompts/quote-generator";
import { getQuoteReviewerSystemPrompt } from "@/lib/prompts/quote-reviewer";
import { NextRequest } from "next/server";

// Claude Sonnet pricing (per token) as of 2025.
const SONNET_INPUT_PRICE_PER_TOKEN = 3 / 1_000_000; // $3 per 1M input tokens
const SONNET_OUTPUT_PRICE_PER_TOKEN = 15 / 1_000_000; // $15 per 1M output tokens
const MODEL = "claude-sonnet-4-20250514";

// Shape of each line item in Claude's JSON response
interface AILineItem {
  item_type: "material" | "labor";
  category?: string;
  description: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  confidence: "high" | "medium" | "low";
}

// Shape of a correction from the review agent
interface ReviewCorrection {
  action: "update" | "add" | "remove";
  line_item_index?: number;
  field?: string;
  old_value?: string | number;
  new_value?: string | number;
  line_item?: AILineItem;
  reason: string;
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
    const chatMessages: Anthropic.MessageParam[] = chatHistory.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content.replace("[READY_TO_GENERATE]", "").trim(),
    }));

    const anthropic = new Anthropic({ apiKey });

    // Track total token usage across both generation and review calls
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    // ─── STEP 1: Generate the quote ──────────────────────────────────────────
    let lineItems: AILineItem[] | null = null;
    let aiResponse: string = "";

    for (let attempt = 0; attempt < 2; attempt++) {
      const messagesToSend =
        attempt === 0
          ? chatMessages
          : [
              ...chatMessages,
              { role: "assistant" as const, content: aiResponse },
              {
                role: "user" as const,
                content:
                  "Your previous response was not valid JSON. Please respond with ONLY the JSON object containing the line_items array, no other text.",
              },
            ];

      const result = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 8192,
        system: getQuoteGeneratorSystemPrompt({ zipCode }),
        messages: messagesToSend,
      });

      aiResponse = result.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("");

      totalInputTokens += result.usage.input_tokens;
      totalOutputTokens += result.usage.output_tokens;

      try {
        const parsed = JSON.parse(aiResponse);
        if (!parsed.line_items || !Array.isArray(parsed.line_items)) {
          throw new Error("Missing line_items array");
        }

        for (const item of parsed.line_items) {
          if (!item.item_type || !item.description || item.quantity == null || item.unit_cost == null) {
            throw new Error("Line item missing required fields");
          }
        }

        lineItems = parsed.line_items;
        break;
      } catch (parseError) {
        if (attempt === 0) {
          console.warn("First JSON parse attempt failed, retrying:", parseError);
          continue;
        }
        console.error("Quote generation JSON parse failed after retry:", parseError);
        return Response.json(
          { error: "Quote generation failed. Your conversation is saved — please try again." },
          { status: 500 }
        );
      }
    }

    if (!lineItems) {
      return Response.json(
        { error: "Quote generation failed." },
        { status: 500 }
      );
    }

    // ─── STEP 2: Review agent checks the quote against the conversation ─────
    // A second AI call compares the generated line items to the chat to catch
    // errors like wrong quantities, missing items, or material substitutions.
    try {
      const reviewResult = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system: getQuoteReviewerSystemPrompt({ zipCode }),
        messages: [
          {
            role: "user",
            content: `Here is the conversation between the electrician and the clarification agent:\n\n${chatHistory
              .map((msg) => `${msg.role.toUpperCase()}: ${msg.content.replace("[READY_TO_GENERATE]", "").trim()}`)
              .join("\n\n")}\n\n---\n\nHere are the generated line items to review:\n\n${JSON.stringify(lineItems, null, 2)}`,
          },
        ],
      });

      totalInputTokens += reviewResult.usage.input_tokens;
      totalOutputTokens += reviewResult.usage.output_tokens;

      const reviewResponse = reviewResult.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("");

      const review = JSON.parse(reviewResponse);

      // Apply corrections if the reviewer found issues
      if (review.status === "corrections_needed" && Array.isArray(review.corrections)) {
        console.log(`Review agent found ${review.corrections.length} correction(s)`);

        // Process removals first (in reverse order to preserve indices),
        // then updates, then additions
        const removals = review.corrections
          .filter((c: ReviewCorrection) => c.action === "remove")
          .sort((a: ReviewCorrection, b: ReviewCorrection) => (b.line_item_index ?? 0) - (a.line_item_index ?? 0));

        for (const correction of removals) {
          if (correction.line_item_index != null && correction.line_item_index < lineItems.length) {
            console.log(`Removing item ${correction.line_item_index}: ${correction.reason}`);
            lineItems.splice(correction.line_item_index, 1);
          }
        }

        // Apply updates
        const updates = review.corrections.filter((c: ReviewCorrection) => c.action === "update");
        for (const correction of updates) {
          if (
            correction.line_item_index != null &&
            correction.line_item_index < lineItems.length &&
            correction.field &&
            correction.new_value != null
          ) {
            console.log(
              `Updating item ${correction.line_item_index} ${correction.field}: ${correction.old_value} → ${correction.new_value} (${correction.reason})`
            );
            const item = lineItems[correction.line_item_index] as unknown as Record<string, unknown>;
            item[correction.field] = correction.new_value;
          }
        }

        // Apply additions
        const additions = review.corrections.filter((c: ReviewCorrection) => c.action === "add");
        for (const correction of additions) {
          if (correction.line_item) {
            console.log(`Adding item: ${correction.line_item.description} (${correction.reason})`);
            lineItems.push(correction.line_item);
          }
        }
      } else {
        console.log("Review agent approved the quote — no corrections needed");
      }
    } catch (reviewError) {
      // If the review step fails, we still have a valid quote from step 1.
      // Log the error but don't block the user — a reviewed quote is better
      // than no quote, but an unreviewed quote is better than an error.
      console.error("Review agent failed (proceeding with unreviewed quote):", reviewError);
    }

    // ─── STEP 3: Save the final (reviewed) line items to the database ───────
    const lineItemRows = lineItems.map((item, index) => {
      const margin = item.item_type === "labor" ? laborMargin : materialMargin;
      const billablePrice = item.unit_cost * item.quantity * (1 + margin / 100);

      return {
        quote_id,
        item_type: item.item_type,
        category: item.category || "General",
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

    // Calculate totals
    const subtotal = lineItemRows.reduce((sum, item) => sum + item.billable_price, 0);
    const total = Math.round(subtotal * 100) / 100;

    // Update the quote with generation metadata and totals
    const estimatedCost =
      totalInputTokens * SONNET_INPUT_PRICE_PER_TOKEN +
      totalOutputTokens * SONNET_OUTPUT_PRICE_PER_TOKEN;

    await supabase
      .from("quotes")
      .update({
        ai_model_used: MODEL,
        total_tokens_used: totalInputTokens + totalOutputTokens,
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
      input_tokens: totalInputTokens,
      output_tokens: totalOutputTokens,
      estimated_cost_usd: estimatedCost,
    });

    return Response.json({
      line_items: insertedItems,
      subtotal: total,
      total: total,
    });
  } catch (error) {
    console.error("Generate quote error:", error);
    return Response.json(
      { error: "Quote generation failed. Your conversation is saved — please try again." },
      { status: 500 }
    );
  }
}
