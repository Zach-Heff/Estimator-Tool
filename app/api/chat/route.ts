import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getClarificationSystemPrompt } from "@/lib/prompts/clarification-agent";
import { NextRequest } from "next/server";

// Claude Sonnet pricing (per token) as of 2025 — used to estimate API costs.
// Update these if Anthropic changes pricing.
const SONNET_INPUT_PRICE_PER_TOKEN = 3 / 1_000_000; // $3 per 1M input tokens
const SONNET_OUTPUT_PRICE_PER_TOKEN = 15 / 1_000_000; // $15 per 1M output tokens
const MODEL = "claude-sonnet-4-20250514";

export async function POST(request: NextRequest) {
  try {
    const { quote_id, message } = await request.json();

    if (!quote_id || !message) {
      return Response.json(
        { error: "quote_id and message are required" },
        { status: 400 }
      );
    }

    // Verify the API key exists server-side before doing anything else
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error("ANTHROPIC_API_KEY is not set in environment variables");
      return Response.json(
        { error: "AI service is not configured. Please contact support." },
        { status: 500 }
      );
    }

    const supabase = await createClient();

    // Verify the user is authenticated and get their identity
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the user's profile to find their company
    const { data: profile } = await supabase
      .from("users")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return Response.json({ error: "User profile not found" }, { status: 404 });
    }

    // Verify this quote belongs to the user's company (RLS handles this too,
    // but an explicit check gives us a clearer error message).
    // Also fetch address fields so we can extract a zip code for regional pricing.
    const { data: quote } = await supabase
      .from("quotes")
      .select("id, company_id, client_address, job_site_address")
      .eq("id", quote_id)
      .single();

    if (!quote) {
      return Response.json({ error: "Quote not found" }, { status: 404 });
    }

    // Save the user's message to the database immediately
    const { error: saveUserMsgError } = await supabase
      .from("chat_messages")
      .insert({
        quote_id,
        role: "user",
        content: message,
      });

    if (saveUserMsgError) {
      console.error("Failed to save user message:", saveUserMsgError);
    }

    // Load the full conversation history for context
    const { data: chatHistory } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("quote_id", quote_id)
      .order("created_at", { ascending: true });

    // Get the company's zip code for regional pricing context
    const { data: company } = await supabase
      .from("companies")
      .select("zip_code")
      .eq("id", profile.company_id)
      .single();

    // Try to determine the best zip code for regional pricing context.
    // Priority: job site address → client address → company zip code on file.
    // We extract a 5-digit zip from the address string using a simple regex.
    function extractZip(address: string | null): string | null {
      if (!address) return null;
      const match = address.match(/\b(\d{5})(?:-\d{4})?\b/);
      return match ? match[1] : null;
    }

    const zipCode =
      extractZip(quote?.job_site_address) ||
      extractZip(quote?.client_address) ||
      company?.zip_code ||
      "unknown";

    // Build the messages array for Claude from the conversation history
    const messages: Anthropic.MessageParam[] = (chatHistory || []).map(
      (msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })
    );

    // Stream the response from Claude
    const anthropic = new Anthropic({ apiKey });

    const stream = anthropic.messages.stream({
      model: MODEL,
      max_tokens: 1024,
      system: getClarificationSystemPrompt({ zipCode }),
      messages,
    });

    // We'll collect the full response text so we can save it after streaming completes
    let fullResponse = "";
    let inputTokens = 0;
    let outputTokens = 0;

    // Create a ReadableStream that sends Server-Sent Events (SSE) to the frontend.
    // SSE is a simple protocol where the server pushes "data: ..." lines to the client
    // in real-time — perfect for streaming AI responses word by word.
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          stream.on("text", (text) => {
            fullResponse += text;
            // Each SSE event is "data: <payload>\n\n" — the double newline marks the end of an event
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "text", text })}\n\n`)
            );
          });

          // Wait for the stream to finish so we can get the final token counts
          const finalMessage = await stream.finalMessage();
          inputTokens = finalMessage.usage.input_tokens;
          outputTokens = finalMessage.usage.output_tokens;

          // Send a final event with token usage info
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "done",
                input_tokens: inputTokens,
                output_tokens: outputTokens,
              })}\n\n`
            )
          );

          controller.close();

          // After the stream closes, save the assistant's response and log the API call.
          // We do this after closing so the user doesn't wait for DB writes.
          const estimatedCost =
            inputTokens * SONNET_INPUT_PRICE_PER_TOKEN +
            outputTokens * SONNET_OUTPUT_PRICE_PER_TOKEN;

          // Save assistant message
          await supabase.from("chat_messages").insert({
            quote_id,
            role: "assistant",
            content: fullResponse,
            model_used: MODEL,
            tokens_used: inputTokens + outputTokens,
          });

          // Log the API usage for cost tracking (required by CLAUDE.md — no exceptions)
          await supabase.from("api_usage_log").insert({
            company_id: profile.company_id,
            quote_id,
            user_id: user.id,
            endpoint_type: "clarification_chat",
            model_used: MODEL,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            estimated_cost_usd: estimatedCost,
          });
        } catch (error) {
          console.error("Streaming error:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                message:
                  "I'm having trouble connecting right now. Your conversation is saved — please try again in a moment.",
              })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return Response.json(
      {
        error:
          "I'm having trouble connecting right now. Your conversation is saved — please try again in a moment.",
      },
      { status: 500 }
    );
  }
}
