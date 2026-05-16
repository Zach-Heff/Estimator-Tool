// Regression tests for the pricing module's fuzzy matcher.
//
// Born from a real bug: the matcher would happily replace a $1.85/ft AI
// estimate with a $168/roll catalog price and multiply it by a 70ft quantity,
// producing a $15,288 line item that should have been ~$220. The fix added a
// unit-compatibility check (lib/modules/pricing.ts::unitsCompatible).
//
// Usage:
//   bun scripts/pricing-test.ts
//
// Each case prints PASS or FAIL; exit code is 1 if any case fails.

import {
  fuzzyMatchItem,
  normalizeUnit,
  unitsCompatible,
  type CatalogEntry,
} from "../lib/modules/pricing";

interface TestCase {
  name: string;
  itemDescription: string;
  itemUnit: string | null;
  catalog: CatalogEntry[];
  expect: "no match" | { catalogName: string };
}

// A minimal catalog modeled on sample-data/electrical-price-list.csv. We only
// include rows the tests need — the full CSV doesn't need to be loaded.
const catalog: CatalogEntry[] = [
  {
    id: "1",
    original_name: "12/2 NM-B Romex Cable, 250ft roll",
    unit_price: 168.0,
    unit: "roll",
  },
  {
    id: "2",
    original_name: "15A GFCI receptacle, white",
    unit_price: 18.75,
    unit: "each",
  },
  {
    id: "3",
    original_name: "20A GFCI receptacle, white",
    unit_price: 22.5,
    unit: "each",
  },
  {
    id: "4",
    original_name: "USB-C dual outlet receptacle, 20A",
    unit_price: 38.5,
    unit: "each",
  },
  {
    id: "5",
    original_name: "Single-pole light switch, white",
    unit_price: 1.85,
    unit: "each",
  },
  {
    id: "6",
    original_name: "1/2 inch EMT conduit, 10ft stick",
    unit_price: 9.75,
    unit: "stick",
  },
];

const cases: TestCase[] = [
  // THE bug: catalog stores Romex per roll, AI generated per ft. With the fix,
  // this should fall back to AI estimate (no match returned).
  {
    name: "Romex per-roll vs per-ft → no match (the bug)",
    itemDescription: "12/2 NM-B cable for kitchen circuits",
    itemUnit: "ft",
    catalog,
    expect: "no match",
  },
  // Happy path: GFCI receptacles, both 'each' — should still match. We pick
  // an itemDescription whose tokens overlap the catalog name above the 0.3
  // Jaccard threshold ("20A GFCI receptacle white" → 4/4 tokens identical),
  // because plurals like "receptacles"/"receptacle" don't share tokens and
  // would skew this test below threshold for reasons unrelated to the
  // unit-compatibility check we're verifying here.
  {
    name: "GFCI receptacle each-vs-each → matches",
    itemDescription: "20A GFCI receptacle white",
    itemUnit: "ea",
    catalog,
    expect: { catalogName: "20A GFCI receptacle, white" },
  },
  // Unit-normalization: "ea" should equal "each".
  {
    name: "'ea' normalizes to 'each'",
    itemDescription: "Single-pole light switch, white Decora",
    itemUnit: "ea",
    catalog,
    expect: { catalogName: "Single-pole light switch, white" },
  },
  // Unit-normalization: "feet" should equal "ft".
  {
    name: "'feet' normalizes to 'ft'",
    itemDescription: "12/2 NM-B cable",
    itemUnit: "feet",
    // For this test we use a hypothetical catalog where the same item is
    // stored per-foot — to confirm "feet"==="ft" still matches.
    catalog: [
      {
        id: "x",
        original_name: "12/2 NM-B cable, per foot",
        unit_price: 0.67,
        unit: "ft",
      },
    ],
    expect: { catalogName: "12/2 NM-B cable, per foot" },
  },
  // Missing unit on either side → trust the match (we can't prove a mismatch).
  {
    name: "AI line item has no unit → still matches",
    itemDescription: "20A GFCI receptacle white",
    itemUnit: null,
    catalog,
    expect: { catalogName: "20A GFCI receptacle, white" },
  },
  // Stick vs ft mismatch — EMT comes as 10ft sticks, AI might say "ft".
  {
    name: "EMT per-stick vs per-ft → no match",
    itemDescription: "1/2 inch EMT conduit run from panel",
    itemUnit: "ft",
    catalog,
    expect: "no match",
  },
  // Plural normalization: line says "receptacles", catalog says "receptacle".
  // Without singularization in tokenize(), this would Jaccard at ~0.286
  // (below threshold) and miss a legitimate match.
  {
    name: "plural 'receptacles' matches singular 'receptacle' in catalog",
    itemDescription: "20A GFCI duplex receptacles tamper-resistant",
    itemUnit: "ea",
    catalog,
    expect: { catalogName: "20A GFCI receptacle, white" },
  },
  // Specificity penalty: generic "dimmer switch" should NOT match a
  // catalog entry that has a critical qualifier ("3-way") absent from
  // the line item. The penalty (-0.15) should drag the 3-way variant's
  // score below the 0.4 threshold even though Jaccard alone would let it pass.
  {
    name: "generic 'dimmer switch' rejected against '3-way dimmer'",
    itemDescription: "LED dimmer switch Decora white",
    itemUnit: "ea",
    catalog: [
      // Only the 3-way variant is in this catalog. Without the specificity
      // penalty, Jaccard ≈ 0.5 (decora, led, dimmer overlap) would falsely
      // match. WITH the penalty, the unmatched "3-way" qualifier drags it
      // below threshold → null.
      {
        id: "d1",
        original_name: "Decora 3-way LED dimmer",
        unit_price: 28.5,
        unit: "each",
      },
    ],
    expect: "no match",
  },
  // Ambiguity rejection: two catalog entries score identically against
  // the line. Before this fix the matcher returned whichever was listed
  // first (the cheaper $4.65 duplex) and silently underbilled by $67/ea.
  // Now: returns null and lets the AI estimate stand.
  {
    name: "tied scores between duplex and USB-C combo → ambiguity null",
    itemDescription: "20A USB-C combination receptacles duplex outlet",
    itemUnit: "ea",
    catalog: [
      {
        id: "d2",
        original_name: "20A duplex receptacle outlet, white",
        unit_price: 4.65,
        unit: "each",
      },
      {
        id: "d3",
        original_name: "USB-C dual outlet receptacle, 20A",
        unit_price: 38.5,
        unit: "each",
      },
    ],
    expect: "no match",
  },
];

function describeExpectation(e: TestCase["expect"]): string {
  return e === "no match" ? "null" : `match "${e.catalogName}"`;
}

let passed = 0;
let failed = 0;

console.log("\n─── pricing module regression tests ───\n");

// Sanity-check the helpers themselves.
const helperChecks: [string, boolean][] = [
  ["normalizeUnit('EA') === 'each'", normalizeUnit("EA") === "each"],
  ["normalizeUnit('Feet') === 'ft'", normalizeUnit("Feet") === "ft"],
  ["unitsCompatible('ea', 'each')", unitsCompatible("ea", "each")],
  ["unitsCompatible('ft', 'roll') is false", !unitsCompatible("ft", "roll")],
  ["unitsCompatible(null, 'each') is true (trust)", unitsCompatible(null, "each")],
  ["unitsCompatible('', '') is true (trust)", unitsCompatible("", "")],
];
for (const [label, ok] of helperChecks) {
  if (ok) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.log(`  FAIL  ${label}`);
    failed++;
  }
}

console.log("");

for (const c of cases) {
  const result = fuzzyMatchItem(c.itemDescription, c.catalog, c.itemUnit);
  let ok = false;
  let actual: string;

  if (c.expect === "no match") {
    ok = result === null;
    actual = result === null ? "null" : `matched "${result.catalogItem.original_name}"`;
  } else {
    ok = result !== null && result.catalogItem.original_name === c.expect.catalogName;
    actual = result === null ? "null" : `matched "${result.catalogItem.original_name}"`;
  }

  if (ok) {
    console.log(`  PASS  ${c.name}`);
    console.log(`          → ${actual}`);
    passed++;
  } else {
    console.log(`  FAIL  ${c.name}`);
    console.log(`          expected: ${describeExpectation(c.expect)}`);
    console.log(`          actual:   ${actual}`);
    failed++;
  }
}

console.log(`\n─── ${passed} passed, ${failed} failed ───\n`);
process.exit(failed > 0 ? 1 : 0);
