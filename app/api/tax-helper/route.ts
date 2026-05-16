// POST /api/tax-helper — single-shot tax Q&A.
//
// The chatbot is grounded in lib/data/us-sales-tax.ts (verified curated data)
// and is permitted to fall back to Claude's general knowledge when the
// location isn't in our dataset. The system prompt requires the bot to
// distinguish "Verified" answers from "Best known" fallbacks so the user
// knows which parts of an answer to trust.
//
// Scope is locked to three buckets: rate lookups, applicability, and
// tax_basis recommendation. Off-topic questions get a polite refusal.
//
// Reuses the auth + api_usage_log pattern from /api/chat/route.ts but
// without the SSE streaming complexity — this endpoint returns JSON.

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import {
  STATE_TAX_DATA,
  CITY_TAX_DATA,
  TAX_DATA_LAST_UPDATED,
} from "@/lib/data/us-sales-tax";
import { NextRequest } from "next/server";

const SONNET_INPUT_PRICE_PER_TOKEN = 3 / 1_000_000;
const SONNET_OUTPUT_PRICE_PER_TOKEN = 15 / 1_000_000;
const MODEL = "claude-sonnet-4-20250514";

function buildSystemPrompt(): string {
  return `You are a US sales tax helper for QuoteCraft, a quoting tool for electrical contractors. You answer ONLY questions about US sales tax — refuse other topics politely.

VERIFIED DATA — our curated dataset, last updated ${TAX_DATA_LAST_UPDATED}.
States:
${JSON.stringify(STATE_TAX_DATA, null, 0)}

Cities (combined state + local rates):
${JSON.stringify(CITY_TAX_DATA, null, 0)}

WHEN ANSWERING:
1. Always check VERIFIED DATA first.
2. If the user's location IS in the VERIFIED DATA (state and/or city match), give the exact number and label it: "Verified (our ${TAX_DATA_LAST_UPDATED} dataset)."
3. If only the STATE is in VERIFIED DATA but the specific city isn't, give the state base rate as Verified, then estimate a likely combined rate using your general knowledge. Label the city portion: "Best known — verify with [state] DOR before using."
4. If neither state nor city is in VERIFIED DATA, use your general knowledge and label the whole answer "Best known — verify with the state DOR before using."
5. In every answer, be explicit about WHICH part is Verified vs. Best known.

QUESTION SCOPE — you may answer:
- **Rate lookups:** "What's the sales tax rate in San Jose CA?"
- **Applicability:** "Is labor taxed in Washington?"
- **tax_basis recommendation:** "Should I tax labor in my California jobs?" → recommend exactly one of: \`materials\`, \`subtotal\`, or \`none\`, based on the state's labor-tax rules.

REFUSAL — for anything off-topic:
Respond exactly with: "I only answer US sales tax questions for electrical contractors. Try asking about your local rate, whether labor is taxed in your state, or what tax_basis to use."

FORMAT:
- 2 to 4 sentences. Direct and specific.
- Cite the state name.
- Always include a "Verify with [state] DOR before using" caveat on the LAST line.
- Use markdown bold (**...**) for rate numbers, tax_basis values, and key facts. Do NOT use links, headings, or other markdown.

EXAMPLES:

User: "What's the sales tax rate in San Jose CA 95118?"
You: "**9.375%** combined — that's 7.25% California state + 1.875% Santa Clara County district + 0.25% city. Verified (our ${TAX_DATA_LAST_UPDATED} dataset). California exempts labor, so the rate applies to materials only.
Verify with the California Department of Tax and Fee Administration (CDTFA) before using."

User: "Is labor taxed in Washington?"
You: "**Yes** — Washington's retail sales tax applies to BOTH labor and materials for residential electrical services. Verified (our ${TAX_DATA_LAST_UPDATED} dataset). The base state rate is 6.5%; total rates with local additions are typically 8.5–10.5%. Use **\`subtotal\`** as your tax_basis.
Verify with the Washington Department of Revenue before using."

User: "What's the weather in Phoenix?"
You: "I only answer US sales tax questions for electrical contractors. Try asking about your local rate, whether labor is taxed in your state, or what tax_basis to use."`;
}

export async function POST(request: NextRequest) {
  try {
    const { question, locationHint } = await request.json();

    if (!question || typeof question !== "string") {
      return Response.json(
        { error: "question is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error("ANTHROPIC_API_KEY is not set");
      return Response.json(
        { error: "AI service is not configured." },
        { status: 500 }
      );
    }

    const supabase = await createClient();

    // Auth check + get company for usage logging (RLS handles tenancy)
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("company_id")
      .eq("id", user.id)
      .single();
    if (!profile) {
      return Response.json({ error: "User profile not found" }, { status: 404 });
    }

    // If the caller supplied a location hint (e.g., the company zip code or
    // the quote's job-site zip), prefix it to the question so the model
    // doesn't have to ask. The user can still override by including a
    // different location in their question.
    const userMessage = locationHint
      ? `Context: my location is ${locationHint}.\n\n${question}`
      : question;

    const anthropic = new Anthropic({ apiKey });
    const result = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 512, // Answers are 2-4 sentences; 512 is generous
      system: buildSystemPrompt(),
      messages: [{ role: "user", content: userMessage }],
    });

    const answer = result.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    // Log usage per CLAUDE.md "every Claude call must be tracked"
    const inputTokens = result.usage.input_tokens;
    const outputTokens = result.usage.output_tokens;
    const estimatedCost =
      inputTokens * SONNET_INPUT_PRICE_PER_TOKEN +
      outputTokens * SONNET_OUTPUT_PRICE_PER_TOKEN;

    await supabase.from("api_usage_log").insert({
      company_id: profile.company_id,
      // quote_id intentionally left null — tax helper isn't tied to a quote
      quote_id: null,
      user_id: user.id,
      endpoint_type: "tax_helper",
      model_used: MODEL,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_cost_usd: estimatedCost,
    });

    return Response.json({ answer });
  } catch (error) {
    console.error("Tax helper error:", error);
    return Response.json(
      { error: "Failed to get an answer. Please try again." },
      { status: 500 }
    );
  }
}
