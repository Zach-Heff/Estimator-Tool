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

// Tokenize a string for fuzzy matching. Lowercase, keep word characters +
// slash + hyphen (electrical specs like "12/2" and "AWG-6" matter), split
// on whitespace. Returns a Set for O(1) membership lookup.
function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^\w\s/-]/g, " ") // Replace punctuation with whitespace
      .split(/\s+/)
      .filter((t) => t.length > 0)
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

// Find the best match in a catalog for a given item description. Returns
// null if no match scores above the threshold.
//
// Default threshold of 0.3 (Jaccard) is empirically tuned for electrical
// supply descriptions — e.g., "12/2 NM-B Romex cable (35 ft run)" matches
// "12-2 NM-B Romex" at ~0.4 Jaccard. Tune up if seeing false positives,
// down if missing legitimate matches.
export function fuzzyMatchItem(
  itemDescription: string,
  catalog: CatalogEntry[],
  threshold = 0.3
): MatchResult | null {
  if (catalog.length === 0) return null;

  const itemTokens = tokenize(itemDescription);
  if (itemTokens.size === 0) return null;

  let best: MatchResult | null = null;

  for (const entry of catalog) {
    const entryTokens = tokenize(entry.original_name);
    const score = jaccard(itemTokens, entryTokens);
    if (score >= threshold && (best === null || score > best.score)) {
      best = { catalogItem: entry, score };
    }
  }

  return best;
}
