// Sanity test for the upgraded AI prompts (Knowledge Base + pre-chat filters).
// Runs sample scopes from `5 Residential Electrical Estimates — Study Guide.docx`
// through the actual quote-generator + quote-reviewer prompts and prints the
// AI output alongside the ground-truth line items for side-by-side comparison.
//
// Skips the clarification phase — the sample scopes are fully detailed, so
// going straight to the generator approximates what the AI would produce
// after a successful clarification round.
//
// Usage:
//   bun scripts/sanity-test.ts                  # runs both scopes
//   bun scripts/sanity-test.ts ev_charger       # runs just the EV charger scope
//   bun scripts/sanity-test.ts panel_upgrade    # runs just the panel upgrade
//
// Requires ANTHROPIC_API_KEY in .env.local.

import Anthropic from "@anthropic-ai/sdk";
import { getQuoteGeneratorSystemPrompt } from "../lib/prompts/quote-generator";
import { getQuoteReviewerSystemPrompt } from "../lib/prompts/quote-reviewer";
import type { JobCategory, LaborMode } from "../lib/prompts/knowledge-base";

// Bun auto-loads .env.local — no dotenv import needed.

const MODEL = "claude-sonnet-4-20250514";

// Strip markdown code fences if Sonnet wraps its JSON output in ```json...```
// (it sometimes does this even when the prompt says "respond with ONLY valid JSON").
function extractJson(text: string): string {
  const fenceMatch = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```\s*$/);
  if (fenceMatch) return fenceMatch[1];
  return text.trim();
}

interface AILineItem {
  item_type: "material" | "labor";
  category?: string;
  description: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  confidence: "high" | "medium" | "low";
}

interface SampleScope {
  estimateId: string;
  label: string;
  zipCode: string;
  jobCategory: JobCategory;
  laborMode: LaborMode;
  scope: string;
  groundTruth: {
    grandTotal: number;
    lineItems: Array<{
      description: string;
      quantity: number;
      unit: string;
      laborCost: number;
      materialCost: number;
    }>;
  };
}

// Sample scopes verbatim from the study guide. Ground-truth line items
// are exactly what the contractor charged the customer — these are what
// we're hoping the AI gets close to.
const SCOPES: Record<string, SampleScope> = {
  ev_charger: {
    estimateId: "EST-2025-001",
    label: "EV Charger Install (Level 2 — 240V / 50A)",
    zipCode: "95118",
    jobCategory: "ev_charger",
    laborMode: "margin_on_cost",
    scope:
      "Install one (1) dedicated 240V / 50A circuit for a Level 2 EV charger in the attached garage. Existing 200A main panel has available breaker space. Run 35 ft of 6/3 NM-B cable from panel to garage, install 50A double-pole breaker, mount a NEMA 14-50 outlet at customer-specified location on garage wall. Pull city permit. Test circuit and verify charger compatibility.",
    groundTruth: {
      grandTotal: 1122.5,
      lineItems: [
        { description: "50A double-pole circuit breaker (Square D QO250)", quantity: 1, unit: "ea", laborCost: 0, materialCost: 65 },
        { description: "6/3 NM-B copper wire (35 ft run)", quantity: 35, unit: "ft", laborCost: 0, materialCost: 87.5 },
        { description: "NEMA 14-50 flush-mount outlet + weatherproof cover plate", quantity: 1, unit: "ea", laborCost: 0, materialCost: 42 },
        { description: "Electrical boxes, connectors, staples, wire nuts", quantity: 1, unit: "lot", laborCost: 0, materialCost: 28 },
        { description: "Labor — panel work, wire run, outlet installation, testing", quantity: 5, unit: "hr", laborCost: 750, materialCost: 0 },
        { description: "City of San Jose electrical permit", quantity: 1, unit: "ea", laborCost: 0, materialCost: 150 },
      ],
    },
  },

  panel_upgrade: {
    estimateId: "EST-2025-002",
    label: "Panel Upgrade — 100A to 200A",
    zipCode: "95125",
    jobCategory: "panel_upgrade",
    laborMode: "margin_on_cost",
    scope:
      "Complete service upgrade from 100-amp to 200-amp electrical service. Replace existing Federal Pacific 100A panel with a new 200A Square D HomeLine main breaker panel (32-space, 64-circuit). Install new meter base, service entrance cable, and weatherhead. Coordinate temporary power shutoff with PG&E. Install 10 tandem breakers to match existing circuits. Pull city permit, schedule inspection, and restore all power. Estimated duration: 1 full business day.",
    groundTruth: {
      grandTotal: 2330,
      lineItems: [
        { description: "200A Square D HomeLine main panel (32-space)", quantity: 1, unit: "ea", laborCost: 0, materialCost: 320 },
        { description: "200A main breaker", quantity: 1, unit: "ea", laborCost: 0, materialCost: 85 },
        { description: "Square D tandem breakers (to match existing circuits)", quantity: 10, unit: "ea", laborCost: 0, materialCost: 180 },
        { description: "Meter base (200A, ringless)", quantity: 1, unit: "ea", laborCost: 0, materialCost: 95 },
        { description: "4/0 aluminum service entrance cable (10 ft)", quantity: 10, unit: "ft", laborCost: 0, materialCost: 60 },
        { description: "Weatherhead, conduit, connectors, grounding rod + clamp", quantity: 1, unit: "lot", laborCost: 0, materialCost: 140 },
        { description: "Labor — full panel swap, meter base, service entrance, circuit transfer, testing", quantity: 8, unit: "hr", laborCost: 1200, materialCost: 0 },
        { description: "City of San Jose permit + PG&E coordination fee", quantity: 1, unit: "ea", laborCost: 0, materialCost: 250 },
      ],
    },
  },
};

async function runScope(key: string, sample: SampleScope) {
  console.log("\n" + "═".repeat(80));
  console.log(`SCOPE: ${sample.label}  [${sample.estimateId}]`);
  console.log(`Zip: ${sample.zipCode}  |  Category: ${sample.jobCategory}  |  Labor mode: ${sample.laborMode}`);
  console.log("═".repeat(80));

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY not set in .env.local");
    process.exit(1);
  }

  const anthropic = new Anthropic({ apiKey });
  const context = {
    zipCode: sample.zipCode,
    jobType: "residential" as const,
    jobCategory: sample.jobCategory,
    laborMode: sample.laborMode,
    laborRatePerHour: null,
  };

  // ─── Generator pass ────────────────────────────────────────────────────────
  console.log("\n[1/2] Calling quote-generator prompt...");
  const t0 = Date.now();
  const genResult = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: getQuoteGeneratorSystemPrompt(context),
    messages: [{ role: "user", content: sample.scope }],
  });
  const genText = genResult.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  let lineItems: AILineItem[];
  try {
    const parsed = JSON.parse(extractJson(genText));
    lineItems = parsed.line_items;
  } catch {
    console.error("Failed to parse generator JSON. Raw output:");
    console.error(genText.slice(0, 500));
    return;
  }

  console.log(`   ${lineItems.length} items in ${Date.now() - t0}ms (${genResult.usage.input_tokens} in / ${genResult.usage.output_tokens} out)`);

  // ─── Reviewer pass ─────────────────────────────────────────────────────────
  console.log("[2/2] Calling quote-reviewer prompt...");
  const t1 = Date.now();
  const revResult = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: getQuoteReviewerSystemPrompt(context),
    messages: [
      {
        role: "user",
        content: `Here is the conversation between the electrician and the clarification agent:\n\nUSER: ${sample.scope}\n\n---\n\nHere are the generated line items to review:\n\n${JSON.stringify(lineItems, null, 2)}`,
      },
    ],
  });
  const revText = revResult.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  let corrections: Array<{ action: string; reason: string; line_item?: AILineItem; line_item_index?: number; field?: string; new_value?: unknown }> = [];
  let reviewStatus = "unknown";
  try {
    const parsed = JSON.parse(extractJson(revText));
    reviewStatus = parsed.status;
    corrections = parsed.corrections ?? [];
  } catch {
    console.error("Failed to parse reviewer JSON.");
  }

  console.log(`   Status: ${reviewStatus}  |  ${corrections.length} correction(s) in ${Date.now() - t1}ms`);

  // Apply corrections (same order the route does: remove, update, add)
  const removals = corrections.filter((c) => c.action === "remove").sort((a, b) => (b.line_item_index ?? 0) - (a.line_item_index ?? 0));
  for (const c of removals) if (c.line_item_index != null) lineItems.splice(c.line_item_index, 1);
  for (const c of corrections.filter((c) => c.action === "update")) {
    if (c.line_item_index != null && c.field && c.new_value != null) {
      const item = lineItems[c.line_item_index] as unknown as Record<string, unknown>;
      item[c.field] = c.new_value;
    }
  }
  for (const c of corrections.filter((c) => c.action === "add")) {
    if (c.line_item) lineItems.push(c.line_item);
  }

  // ─── Side-by-side output ───────────────────────────────────────────────────
  console.log("\n──── AI OUTPUT (after review pass) ─────────────────────────────────────────────");
  for (const item of lineItems) {
    const flag = item.confidence === "low" ? "  ⚠️ LOW" : item.confidence === "medium" ? "  ~med" : "";
    const cat = item.category ? ` [${item.category}]` : "";
    console.log(
      `  ${item.item_type === "labor" ? "L" : "M"}  ${item.quantity}${item.unit ? " " + item.unit : ""}  $${item.unit_cost.toFixed(2)}/u  ${item.description}${cat}${flag}`,
    );
  }
  const aiTotalCost = lineItems.reduce((s, i) => s + i.unit_cost * i.quantity, 0);
  console.log(`  ── AI raw cost subtotal: $${aiTotalCost.toFixed(2)} (margins applied by route, not by this script)`);

  console.log("\n──── GROUND TRUTH (study guide) ───────────────────────────────────────────────");
  for (const item of sample.groundTruth.lineItems) {
    const type = item.laborCost > 0 ? "L" : "M";
    const total = item.laborCost + item.materialCost;
    console.log(
      `  ${type}  ${item.quantity}${item.unit ? " " + item.unit : ""}  $${total.toFixed(2)}  ${item.description}`,
    );
  }
  console.log(`  ── Grand total (with margins): $${sample.groundTruth.grandTotal.toFixed(2)}`);

  console.log("\n──── REVIEWER NOTES ───────────────────────────────────────────────────────────");
  if (corrections.length === 0) {
    console.log("  (No corrections — reviewer approved on first pass)");
  } else {
    for (const c of corrections) {
      console.log(`  • ${c.action.toUpperCase()}: ${c.reason}`);
    }
  }
}

async function main() {
  const arg = process.argv[2];
  const keysToRun = arg && SCOPES[arg] ? [arg] : Object.keys(SCOPES);

  for (const key of keysToRun) {
    await runScope(key, SCOPES[key]);
  }

  console.log("\n" + "═".repeat(80));
  console.log("DONE. Compare AI output to ground truth above.");
  console.log("═".repeat(80) + "\n");
}

main().catch((err) => {
  console.error("Sanity test failed:", err);
  process.exit(1);
});
