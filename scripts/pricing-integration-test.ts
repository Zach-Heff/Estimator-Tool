// Integration test for the pricing module's fuzzy matcher, end-to-end.
//
// Replays the line items from the 2026-05-15 demo overquote ($18,421) against
// the actual sample price list (sample-data/electrical-price-list.csv) and
// verifies each line now resolves correctly:
//
//   - The three known false positives from the screenshot now fall back to
//     yellow "AI Estimate" (12/2 Romex, USB-C combo, single-pole dimmer).
//   - The legitimate matches still resolve green ("From Your List") at the
//     same price they did before.
//
// Run:
//   bun scripts/pricing-integration-test.ts
//
// Exit 1 if any expectation fails.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  fuzzyMatchItem,
  parsePriceListCSV,
  type CatalogEntry,
} from "../lib/modules/pricing";

// ─── Load the real catalog from the sample CSV ──────────────────────────────
// Using fileURLToPath / dirname so this works under both Bun and Node. Bun's
// shorthand `import.meta.dir` isn't in stock TypeScript's ImportMeta type and
// trips up `bunx tsc --noEmit`.
const scriptDir = dirname(fileURLToPath(import.meta.url));
const csvPath = join(scriptDir, "..", "sample-data", "electrical-price-list.csv");
const csvText = readFileSync(csvPath, "utf-8");
const { rows: parsedRows, errors: parseErrors } = parsePriceListCSV(csvText);
if (parseErrors.length > 0) {
  console.error("CSV parse errors:", parseErrors);
  process.exit(1);
}

// Synthesize CatalogEntry objects exactly like the API does after the
// product_catalog insert (id is a uuid in prod; here we just stringify the
// index, the matcher doesn't care).
const catalog: CatalogEntry[] = parsedRows.map((r, i) => ({
  id: String(i),
  original_name: r.name,
  unit_price: r.unit_price,
  unit: r.unit ?? null,
}));

console.log(`Loaded catalog: ${catalog.length} rows from ${csvPath}`);
console.log("");

// ─── The actual line items from the buggy $18,421 quote ─────────────────────
//
// Sourced from the screenshots Zach shared on 2026-05-15. Descriptions are
// verbatim where visible; truncated columns are reconstructed to the most
// plausible full phrasing the AI would have output.
//
// For each line: what the matcher SHOULD do post-fix.
//   - "fall back" = no match expected; AI estimate (yellow) stands
//   - "match X"   = catalog row name; matcher should pick this exact one
//
// Three lines were fixed by this PR (12/2 Romex, USB-C combo, LED dimmer);
// they are now expected to fall back. The other matches should be unchanged.

interface LineItem {
  description: string;
  quantity: number;
  unit: string;
  aiUnitCost: number; // what the AI estimated, used to compute "would-be" billable
  // expected post-fix behavior
  expect: "fall back" | { matchName: string; expectedUnitCost: number };
  // status before the fix (for the report) — informational only
  beforeFix: "false positive" | "legitimate match" | "ai estimate";
}

const lineItems: LineItem[] = [
  // ─── THE THREE BUG FIXES ──────────────────────────────────────────────────
  {
    description: "12/2 NM-B cable for kitchen circuits",
    quantity: 70,
    unit: "ft",
    aiUnitCost: 1.85,
    expect: "fall back", // unit mismatch (ft vs roll) → rejected
    beforeFix: "false positive",
  },
  {
    description: "20A USB-C combination receptacles (duplex outlet)",
    quantity: 2,
    unit: "ea",
    aiUnitCost: 38.5,
    expect: "fall back", // tied with plain duplex → ambiguity rejection
    beforeFix: "false positive",
  },
  {
    description: "LED dimmer switch, Decora white",
    quantity: 1,
    unit: "ea",
    aiUnitCost: 22.0,
    expect: "fall back", // specificity penalty kills the 3-way variant
    beforeFix: "false positive",
  },
  // ─── LEGITIMATE MATCHES (regression — must still work) ────────────────────
  {
    description: "20A GFCI duplex receptacles, tamper-resistant",
    quantity: 4,
    unit: "ea",
    aiUnitCost: 20.0,
    expect: { matchName: "20A GFCI receptacle, white", expectedUnitCost: 22.5 },
    beforeFix: "legitimate match",
  },
  {
    description: "20A GFCI duplex receptacles, weather-resistant",
    quantity: 2,
    unit: "ea",
    aiUnitCost: 26.0,
    expect: {
      matchName: "20A weather-resistant GFCI receptacle",
      expectedUnitCost: 28.95,
    },
    beforeFix: "legitimate match",
  },
  {
    description: "3-way switches, Decora white",
    quantity: 2,
    unit: "ea",
    aiUnitCost: 6.0,
    expect: { matchName: "3-way light switch, white", expectedUnitCost: 4.35 },
    beforeFix: "legitimate match",
  },
  {
    description: "Decora 1-gang cover plates, white",
    quantity: 4,
    unit: "ea",
    aiUnitCost: 1.5,
    expect: {
      matchName: "1-gang Decora wallplate, white",
      expectedUnitCost: 0.95,
    },
    beforeFix: "legitimate match",
  },
  {
    description: "20A single-pole breaker for exterior circuit",
    quantity: 1,
    unit: "ea",
    aiUnitCost: 15.0,
    expect: {
      matchName: "20A single-pole circuit breaker Square D Homeline",
      expectedUnitCost: 13.95,
    },
    beforeFix: "legitimate match",
  },
  {
    description: "Weatherproof in-use outlet covers for outdoor receptacles",
    quantity: 2,
    unit: "ea",
    aiUnitCost: 14.0,
    expect: {
      matchName: "In-use weatherproof outlet cover",
      expectedUnitCost: 15.5,
    },
    beforeFix: "legitimate match",
  },
  // ─── LINES THAT WERE ALREADY AI ESTIMATES (regression — must stay so) ─────
  {
    description: "Cable staples and fasteners",
    quantity: 1,
    unit: "lot",
    aiUnitCost: 15.0,
    expect: "fall back", // "lot" unit has no compatible catalog entry
    beforeFix: "ai estimate",
  },
  {
    description: "12/2 NM-B cable for attic run, THWN-2 in conduit",
    quantity: 65,
    unit: "ft",
    aiUnitCost: 1.85,
    expect: "fall back", // same unit-mismatch as kitchen Romex
    beforeFix: "ai estimate",
  },
  {
    description: "San Jose electrical permit for new circuits",
    quantity: 1,
    unit: "ea",
    aiUnitCost: 325.0,
    expect: "fall back", // no catalog entry for permits
    beforeFix: "ai estimate",
  },
];

// ─── Run each line item through the matcher and tally results ───────────────

const MATERIAL_MARGIN = 30; // % — matches the demo company's margin

interface Result {
  line: LineItem;
  matchedName: string | null;
  matchedUnitCost: number | null;
  billable: number;
  ok: boolean;
  reason: string;
}

const results: Result[] = lineItems.map((line) => {
  const match = fuzzyMatchItem(line.description, catalog, line.unit);
  const unitCost = match ? match.catalogItem.unit_price : line.aiUnitCost;
  const billable =
    Math.round(unitCost * line.quantity * (1 + MATERIAL_MARGIN / 100) * 100) /
    100;

  let ok: boolean;
  let reason: string;
  if (line.expect === "fall back") {
    ok = match === null;
    reason = match === null
      ? "no match → AI estimate (correct)"
      : `unexpected match: "${match.catalogItem.original_name}" @ $${match.catalogItem.unit_price}`;
  } else {
    if (match === null) {
      ok = false;
      reason = `expected match "${line.expect.matchName}", got null`;
    } else if (match.catalogItem.original_name !== line.expect.matchName) {
      ok = false;
      reason = `expected "${line.expect.matchName}", got "${match.catalogItem.original_name}"`;
    } else if (match.catalogItem.unit_price !== line.expect.expectedUnitCost) {
      ok = false;
      reason = `correct match but price drift: expected $${line.expect.expectedUnitCost}, got $${match.catalogItem.unit_price}`;
    } else {
      ok = true;
      reason = `matched "${match.catalogItem.original_name}" @ $${match.catalogItem.unit_price}`;
    }
  }

  return {
    line,
    matchedName: match?.catalogItem.original_name ?? null,
    matchedUnitCost: match?.catalogItem.unit_price ?? null,
    billable,
    ok,
    reason,
  };
});

// ─── Print results ──────────────────────────────────────────────────────────

function badge(matched: boolean): string {
  return matched ? "🟢 From List" : "🟡 AI Estimate";
}

console.log("─── per-line results ───\n");
for (const r of results) {
  const tag = r.ok ? "PASS" : "FAIL";
  console.log(`  ${tag}  ${r.line.description.slice(0, 60)}`);
  console.log(
    `         qty ${r.line.quantity} ${r.line.unit}  →  ${badge(r.matchedName !== null)}  $${r.billable}`
  );
  console.log(`         ${r.reason}`);
  console.log("");
}

// ─── Summary ────────────────────────────────────────────────────────────────

const passed = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok).length;
const totalBillable = results.reduce((sum, r) => sum + r.billable, 0);

console.log("─── summary ───");
console.log(`  ${passed} passed, ${failed} failed (${results.length} total)`);
console.log(
  `  Subtotal across these material lines: $${Math.round(totalBillable * 100) / 100}`
);
console.log(
  `    (excludes labor + permits + lines we didn't replay; previous buggy total for these same lines was ~$15,750)`
);

if (failed > 0) {
  console.log("\n  ❌ Integration check FAILED — see above");
  process.exit(1);
} else {
  console.log("\n  ✅ All checks passed — matcher fix verified end-to-end");
  process.exit(0);
}
