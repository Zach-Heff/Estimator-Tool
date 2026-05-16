// Pricing module — handles the contractor's uploaded price list:
//   1. parsing CSV uploads into structured rows
//   2. fuzzy-matching AI-generated line items against the contractor's catalog
//
// At quote-generation time, /api/generate-quote calls fuzzyMatchItem() for
// each AI-generated material line. If a match scores above the threshold,
// the AI's estimated cost is replaced with the contractor's actual price
// and price_source flips from "ai_estimate" to "contractor_list" so the
// UI can show the green "From Your List" badge instead of amber "AI Estimate".

// ─── CSV Parsing ────────────────────────────────────────────────────────────

export interface ParsedPriceListRow {
  name: string;
  unit_price: number;
  unit?: string;
  sku?: string;
}

// Simple CSV parser. Handles:
//   - Quoted fields containing commas
//   - Escaped quotes (doubled "")
//   - Windows + Unix line endings
//   - UTF-8 BOM at start of file
// Does NOT handle: multi-line cells (rare in price lists, not worth the complexity).
export function parseCSVRows(text: string): string[][] {
  // Strip UTF-8 BOM if present — Excel exports sometimes include it
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        current.push(field);
        field = "";
      } else if (c === "\n") {
        current.push(field);
        rows.push(current);
        current = [];
        field = "";
      } else if (c === "\r") {
        // Skip carriage returns — the \n that follows will end the row
      } else {
        field += c;
      }
    }
  }
  // Flush last field/row if the file doesn't end with a newline
  if (field !== "" || current.length > 0) {
    current.push(field);
    rows.push(current);
  }
  return rows;
}

// Headers we recognize for column auto-detection. Contractors label their
// columns inconsistently, so we accept a few common variants.
const NAME_HEADERS = new Set([
  "name",
  "item",
  "description",
  "product",
  "part",
  "material",
  "product name",
  "item name",
  "item description",
]);
const PRICE_HEADERS = new Set([
  "price",
  "cost",
  "unit price",
  "unit cost",
  "unitprice",
  "unitcost",
  "$",
  "amount",
  "price each",
  "each",
]);
const UNIT_HEADERS = new Set(["unit", "uom", "units"]);
const SKU_HEADERS = new Set([
  "sku",
  "part #",
  "part number",
  "partnumber",
  "item #",
  "item number",
  "code",
]);

interface ColumnMap {
  name: number;
  price: number;
  unit?: number;
  sku?: number;
}

export function detectColumns(
  headerRow: string[]
): ColumnMap | { error: string } {
  let nameCol = -1;
  let priceCol = -1;
  let unitCol = -1;
  let skuCol = -1;

  headerRow.forEach((h, i) => {
    const norm = h.trim().toLowerCase();
    if (nameCol === -1 && NAME_HEADERS.has(norm)) nameCol = i;
    if (priceCol === -1 && PRICE_HEADERS.has(norm)) priceCol = i;
    if (unitCol === -1 && UNIT_HEADERS.has(norm)) unitCol = i;
    if (skuCol === -1 && SKU_HEADERS.has(norm)) skuCol = i;
  });

  if (nameCol === -1) {
    return {
      error:
        "Could not find an item name column. Expected a header like: " +
        Array.from(NAME_HEADERS).slice(0, 5).join(", "),
    };
  }
  if (priceCol === -1) {
    return {
      error:
        "Could not find a price column. Expected a header like: " +
        Array.from(PRICE_HEADERS).slice(0, 5).join(", "),
    };
  }

  const map: ColumnMap = { name: nameCol, price: priceCol };
  if (unitCol !== -1) map.unit = unitCol;
  if (skuCol !== -1) map.sku = skuCol;
  return map;
}

// Parse a full CSV text into structured rows. Returns parsed rows + any
// per-row errors (so the caller can surface "imported X rows, skipped Y").
export function parsePriceListCSV(text: string): {
  rows: ParsedPriceListRow[];
  errors: string[];
} {
  const rawRows = parseCSVRows(text);
  if (rawRows.length === 0) return { rows: [], errors: ["File is empty"] };

  const header = rawRows[0];
  const columnMap = detectColumns(header);
  if ("error" in columnMap) return { rows: [], errors: [columnMap.error] };

  const rows: ParsedPriceListRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < rawRows.length; i++) {
    const r = rawRows[i];
    // Skip blank lines
    if (r.length === 0 || r.every((c) => !c.trim())) continue;

    const name = r[columnMap.name]?.trim();
    const priceRaw = r[columnMap.price]?.trim() ?? "";
    // Strip $, commas, and whitespace from price strings like "$1,250.00"
    const priceClean = priceRaw.replace(/[$,\s]/g, "");
    const price = parseFloat(priceClean);

    if (!name) {
      errors.push(`Row ${i + 1}: missing item name`);
      continue;
    }
    if (isNaN(price) || price < 0) {
      errors.push(`Row ${i + 1}: invalid price "${priceRaw}"`);
      continue;
    }

    const row: ParsedPriceListRow = { name, unit_price: price };
    if (columnMap.unit != null) {
      const u = r[columnMap.unit]?.trim();
      if (u) row.unit = u;
    }
    if (columnMap.sku != null) {
      const s = r[columnMap.sku]?.trim();
      if (s) row.sku = s;
    }
    rows.push(row);
  }

  return { rows, errors };
}

// ─── Fuzzy Matching ────────────────────────────────────────────────────────

// Strip simple English plurals so "receptacles" and "receptacle" tokenize
// the same. We only handle the most common cases — anything fancier
// (full Porter stemmer) risks over-normalizing electrical specs like
// "AWG-6" or "GFCI" where the trailing letter matters. The length-≥4 guard
// prevents collapsing useful short tokens like "bus" → "bu".
//
// Rule order matters: the "-es" rule is gated by the preceding consonant
// pattern (x/s/z/ch/sh) so we don't chop "receptacles" → "receptacl".
// Without the gate, the bare "endsWith('es')" check fires on any word that
// happens to end in "...es" — including words whose real plural is just
// adding "s" to a stem already ending in "e" (receptacle → receptacles).
function singularize(t: string): string {
  if (t.length < 4) return t;
  // batteries → battery
  if (t.endsWith("ies")) return t.slice(0, -3) + "y";
  // boxes → box, dishes → dish, churches → church, buzzes → buzz, masses → mass
  if (/(?:x|s|z|ch|sh)es$/.test(t)) return t.slice(0, -2);
  // receptacles → receptacle, outlets → outlet (don't strip "ss" like "mass")
  if (t.endsWith("s") && !t.endsWith("ss")) return t.slice(0, -1);
  return t;
}

// Tokenize a string for fuzzy matching. Lowercase, keep word characters +
// slash + hyphen (electrical specs like "12/2" and "AWG-6" matter), split
// on whitespace. Singularize plurals so "receptacles" matches "receptacle".
// Returns a Set for O(1) membership lookup.
function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^\w\s/-]/g, " ") // Replace punctuation with whitespace
      .split(/\s+/)
      .filter((t) => t.length > 0)
      .map(singularize)
  );
}

// Jaccard similarity: |A ∩ B| / |A ∪ B|. Range 0–1.
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection++;
  const union = a.size + b.size - intersection;
  return intersection / union;
}

// Normalize unit strings so common abbreviations and synonyms compare equal.
// Suppliers and AIs both write units inconsistently: "ea"/"each"/"EA" all
// mean the same thing; "ft"/"feet"/"foot" do too. We canonicalize so the
// unit-match check below doesn't reject a legitimate match over typography.
//
// We deliberately do NOT try to convert *between* incompatible units (e.g.,
// roll → ft, box → each) because the catalog doesn't capture roll length or
// box count. Any such "smart" conversion would be guessing. When units don't
// reconcile here, we want the caller to fall back to the AI estimate rather
// than risk a 70-250x pricing error like the one fixed in this change.
export function normalizeUnit(unit: string | null | undefined): string {
  if (!unit) return "";
  const u = unit.trim().toLowerCase();
  const aliases: Record<string, string> = {
    ea: "each",
    eaches: "each",
    pc: "each",
    pcs: "each",
    piece: "each",
    pieces: "each",
    unit: "each",
    units: "each",
    feet: "ft",
    foot: "ft",
    "linear ft": "ft",
    "lin ft": "ft",
    "linear feet": "ft",
    lf: "ft",
    rolls: "roll",
    boxes: "box",
    bx: "box",
    sticks: "stick",
    packs: "pack",
    pk: "pack",
    pkg: "pack",
    package: "pack",
  };
  return aliases[u] ?? u;
}

// Returns true if two units should be treated as equivalent for pricing.
// "ea" === "each" → true. "ft" === "roll" → false. Empty strings on either
// side return true (we can't prove a mismatch, so we trust the match).
export function unitsCompatible(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  const na = normalizeUnit(a);
  const nb = normalizeUnit(b);
  if (!na || !nb) return true;
  return na === nb;
}

// Tokens that describe critical product variants in residential electrical.
// If a catalog entry contains one of these and the line item description
// does NOT, the catalog entry probably refers to a different variant than
// what the contractor wants — apply a score penalty so we don't pick the
// 3-way dimmer when the line item said "LED dimmer switch", for example.
//
// All entries are in their post-tokenization form (lowercased, hyphens kept).
// Keep this list short and high-signal — adding noise tokens reduces recall.
const QUALIFIER_TOKENS = new Set([
  // switch types
  "3-way",
  "4-way",
  "single-pole",
  "double-pole",
  // breaker types
  "afci",
  "gfci",
  "dual-function",
  // receptacle features
  "tamper-resistant",
  "weather-resistant",
  "usb-c",
  "usb-a",
  // outdoor enclosure types
  "in-use",
  "watertight",
]);

// Penalty applied when a catalog entry contains a qualifier token absent
// from the line item. 0.15 was chosen empirically: large enough to push a
// 0.5 Jaccard below the new 0.4 threshold (kills the dimmer false positive)
// but small enough that a strong match with one missing qualifier (Jaccard
// 0.6+) still wins.
const SPECIFICITY_PENALTY = 0.15;

function specificityPenalty(
  itemTokens: Set<string>,
  entryTokens: Set<string>
): number {
  for (const t of entryTokens) {
    if (QUALIFIER_TOKENS.has(t) && !itemTokens.has(t)) {
      return SPECIFICITY_PENALTY;
    }
  }
  return 0;
}

export interface CatalogEntry {
  id: string;
  original_name: string;
  unit_price: number;
  unit: string | null;
}

export interface MatchResult {
  catalogItem: CatalogEntry;
  score: number;
}

// Threshold and gap constants for fuzzyMatchItem. Pulled out so the tests
// and any future tuning have a single place to look.
//
// MATCH_THRESHOLD (0.4): minimum *post-penalty* Jaccard score for a catalog
// entry to be considered. Raised from 0.3 after demo testing surfaced
// false positives at the old threshold (USB-C combo matching plain duplex,
// generic "dimmer switch" matching "Decora 3-way dimmer").
//
// AMBIGUITY_GAP (0.06): if the top candidate and the runner-up are both
// above MATCH_THRESHOLD - 0.05 AND within this gap of each other, the
// match is rejected as ambiguous. Better to fall back to AI estimate than
// to confidently pick the wrong variant on a tie.
//
// Initially set to 0.08 but tightened to 0.06 after the integration test
// against the 86-row sample catalog revealed cases where the right answer
// (e.g., line "20A GFCI duplex receptacles" → catalog "20A GFCI receptacle")
// has a runner-up sitting ~0.07 below it ("20A duplex receptacle, white").
// 0.06 still catches actual ties (USB-C combo vs plain duplex, gap = 0)
// without rejecting decisive 0.07-gap wins.
const MATCH_THRESHOLD = 0.4;
const AMBIGUITY_GAP = 0.06;

// Find the best match in a catalog for a given item description. Returns
// null if:
//   1. No match scores above MATCH_THRESHOLD after specificity penalty
//   2. The best candidate has an incompatible unit (see unitsCompatible)
//   3. The top two candidates are too close to call (AMBIGUITY_GAP)
//
// The matcher is deliberately conservative — when in doubt, fall back to
// AI estimate (yellow badge in the UI) rather than confidently show the
// contractor a wrong price. This is consistent with the project rule:
// "Visual Distinction for AI Estimates" (be honest about accuracy).
export function fuzzyMatchItem(
  itemDescription: string,
  catalog: CatalogEntry[],
  itemUnit: string | null | undefined = null,
  threshold = MATCH_THRESHOLD
): MatchResult | null {
  if (catalog.length === 0) return null;

  const itemTokens = tokenize(itemDescription);
  if (itemTokens.size === 0) return null;

  // Track top two candidates so we can apply the ambiguity check.
  let best: MatchResult | null = null;
  let runnerUp: MatchResult | null = null;

  for (const entry of catalog) {
    // Filter out candidates whose unit is incompatible with the line item's
    // unit. This is the guardrail against the unit-mismatch pricing bug.
    if (!unitsCompatible(itemUnit, entry.unit)) continue;

    const entryTokens = tokenize(entry.original_name);
    const rawScore = jaccard(itemTokens, entryTokens);
    // Subtract a penalty if the catalog entry has a critical qualifier
    // (e.g., "3-way", "GFCI") that the line item doesn't mention. See
    // QUALIFIER_TOKENS above for the rationale.
    const score = rawScore - specificityPenalty(itemTokens, entryTokens);

    if (score < threshold) continue;

    if (best === null || score > best.score) {
      runnerUp = best;
      best = { catalogItem: entry, score };
    } else if (runnerUp === null || score > runnerUp.score) {
      runnerUp = { catalogItem: entry, score };
    }
  }

  if (best === null) return null;

  // Ambiguity check: if the runner-up is right behind the leader and both
  // are above (threshold - 0.05), we can't confidently pick one. Bail out
  // and let the AI estimate stand.
  if (
    runnerUp !== null &&
    runnerUp.score >= threshold - 0.05 &&
    best.score - runnerUp.score < AMBIGUITY_GAP
  ) {
    return null;
  }

  return best;
}
