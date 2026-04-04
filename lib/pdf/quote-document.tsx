// PDF template for QuoteCraft quotes.
// Uses @react-pdf/renderer to build a professional, branded PDF entirely in React.
// This file is server-only — it's imported by the /api/generate-pdf route.

import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface QuotePDFProps {
  company: {
    name: string;
    address: string | null;
    phone: string | null;
    license_number: string | null;
    logo_base64: string | null;
    default_payment_terms: string | null;
    default_quote_validity_days: number | null;
  };
  quote: {
    quote_number: string;
    created_at: string;
    client_name: string | null;
    client_email: string | null;
    client_address: string | null;
    job_site_address: string | null;
    tax_rate: number;
  };
  estimatorName: string;
  lineItems: {
    description: string;
    quantity: number;
    unit: string | null;
    unit_cost: number;
    margin_percent: number;
    item_type: string;
    category: string;
  }[];
}

// ─── Design tokens ───────────────────────────────────────────────────────────
const ACCENT = "#1e40af";
const ACCENT_LIGHT = "#dbeafe";
const ACCENT_DARK = "#1e3a8a";
const DARK_TEXT = "#1e293b";
const LIGHT_TEXT = "#64748b";
const BORDER = "#e2e8f0";

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: DARK_TEXT,
    paddingBottom: 70,
  },

  // ── Header ──
  header: {
    backgroundColor: ACCENT,
    paddingHorizontal: 40,
    paddingVertical: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: { width: 80, height: 80, objectFit: "contain" as const },
  companyInfo: { textAlign: "right" as const, color: "#ffffff" },
  companyName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
    color: "#ffffff",
  },
  companyDetail: { fontSize: 9, color: ACCENT_LIGHT, marginBottom: 1 },

  // ── Meta section (quote ID, performed by, client, summary box) ──
  metaSection: {
    paddingHorizontal: 40,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: "row",
    gap: 20,
  },
  metaLeft: { flex: 1 },
  metaRight: { width: 220 },

  metaLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: LIGHT_TEXT,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  metaValue: { fontSize: 10, lineHeight: 1.4, marginBottom: 2 },
  metaBlock: { marginBottom: 10 },

  // ── Quote Totals summary box (like reference image) ──
  summaryBox: {
    borderWidth: 1.5,
    borderColor: ACCENT,
    borderRadius: 4,
    overflow: "hidden" as const,
  },
  summaryTitle: {
    backgroundColor: ACCENT,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  summaryTitleText: {
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    textAlign: "center" as const,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
  },
  summaryRowLast: {
    borderBottomWidth: 0,
    backgroundColor: ACCENT_LIGHT,
  },
  summaryLabel: { fontSize: 10 },
  summaryValue: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  summaryTotal: { fontSize: 13, fontFamily: "Helvetica-Bold", color: ACCENT },

  // ── Category section header ──
  categoryHeader: {
    backgroundColor: ACCENT_DARK,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginTop: 10,
  },
  categoryHeaderText: {
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
  },

  // ── Table ──
  table: { marginHorizontal: 40 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: ACCENT,
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  tableHeaderText: {
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
  },
  tableRowAlt: { backgroundColor: ACCENT_LIGHT },
  tableCell: { fontSize: 9 },

  // Column widths (no margin column — margin is baked into the unit price for the client)
  colDesc: { width: "48%" },
  colQty: { width: "10%", textAlign: "center" as const },
  colUnit: { width: "12%", textAlign: "center" as const },
  colUnitCost: { width: "15%", textAlign: "right" as const },
  colTotal: { width: "15%", textAlign: "right" as const },

  // ── Signature section ──
  signatureSection: {
    marginHorizontal: 40,
    marginTop: 30,
    flexDirection: "row",
    gap: 40,
  },
  signatureBlock: { flex: 1 },
  signatureLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: LIGHT_TEXT,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 30,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: DARK_TEXT,
    marginBottom: 4,
  },
  signatureCaption: { fontSize: 8, color: LIGHT_TEXT },

  // ── Footer ──
  footer: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: ACCENT,
    paddingHorizontal: 40,
    paddingVertical: 10,
  },
  footerText: {
    fontSize: 7,
    color: ACCENT_LIGHT,
    textAlign: "center" as const,
    lineHeight: 1.5,
  },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const ten =
    digits.length === 11 && digits.startsWith("1")
      ? digits.slice(1)
      : digits;
  if (ten.length === 10) {
    return `${ten.slice(0, 3)}-${ten.slice(3, 6)}-${ten.slice(6)}`;
  }
  return phone;
}

function usd(value: number): string {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ─── The PDF Document ────────────────────────────────────────────────────────

export function QuoteDocument({
  company,
  quote,
  estimatorName,
  lineItems,
}: QuotePDFProps) {
  // ── Consolidate labor items per category ──
  // Customers see one "Labor" line per category instead of every individual task.
  // Material items are shown in full detail.
  type DisplayItem = {
    description: string;
    quantity: number;
    unit: string | null;
    unit_cost: number;
    margin_percent: number;
    item_type: string;
    category: string;
  };

  const displayItems: DisplayItem[] = [];
  // Consolidate both material and labor items per category.
  // Customers see one "Materials" line and one "Labor" line per category
  // instead of every individual nut, screw, and task.
  const consolidated: Record<string, { materials: number; materialMargin: number; labor: number; laborMargin: number }> = {};

  for (const item of lineItems) {
    const cat = item.category || "General";
    if (!consolidated[cat]) {
      consolidated[cat] = { materials: 0, materialMargin: 0, labor: 0, laborMargin: 0 };
    }
    const rawCost = item.unit_cost * item.quantity;
    if (item.item_type === "labor") {
      consolidated[cat].labor += rawCost;
      consolidated[cat].laborMargin = item.margin_percent;
    } else {
      consolidated[cat].materials += rawCost;
      consolidated[cat].materialMargin = item.margin_percent;
    }
  }

  // Build display items — one Materials line + one Labor line per category
  for (const [cat, totals] of Object.entries(consolidated)) {
    if (totals.materials > 0) {
      displayItems.push({
        description: `Materials — ${cat}`,
        quantity: 1,
        unit: "lot",
        unit_cost: Math.round(totals.materials * 100) / 100,
        margin_percent: totals.materialMargin,
        item_type: "material",
        category: cat,
      });
    }
    if (totals.labor > 0) {
      displayItems.push({
        description: `Labor — ${cat}`,
        quantity: 1,
        unit: "lot",
        unit_cost: Math.round(totals.labor * 100) / 100,
        margin_percent: totals.laborMargin,
        item_type: "labor",
        category: cat,
      });
    }
  }

  // Calculate totals
  const subtotal = displayItems.reduce((sum, item) => {
    return sum + item.unit_cost * item.quantity * (1 + item.margin_percent / 100);
  }, 0);
  const taxRate = quote.tax_rate;
  const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  const paymentTerms = company.default_payment_terms || "Due upon receipt";
  const validityDays = company.default_quote_validity_days || 30;

  // Group display items by category, preserving order of first appearance
  const categoryOrder: string[] = [];
  const grouped: Record<string, DisplayItem[]> = {};
  for (const item of displayItems) {
    const cat = item.category || "General";
    if (!grouped[cat]) {
      grouped[cat] = [];
      categoryOrder.push(cat);
    }
    grouped[cat].push(item);
  }

  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        {/* ── Header band ── */}
        <View style={s.header} fixed>
          <View>
            {company.logo_base64 ? (
              <Image src={company.logo_base64} style={s.logo} />
            ) : (
              <View style={{ width: 80 }} />
            )}
          </View>
          <View style={s.companyInfo}>
            <Text style={s.companyName}>{company.name}</Text>
            {company.address && (
              <Text style={s.companyDetail}>{company.address}</Text>
            )}
            {company.phone && (
              <Text style={s.companyDetail}>
                {formatPhone(company.phone)}
              </Text>
            )}
            {company.license_number && (
              <Text style={s.companyDetail}>
                License #{company.license_number}
              </Text>
            )}
          </View>
        </View>

        {/* ── Meta section: quote info (left) + summary box (right) ── */}
        <View style={s.metaSection}>
          <View style={s.metaLeft}>
            {/* Quote ID + Date */}
            <View style={s.metaBlock}>
              <Text style={s.metaLabel}>Quote</Text>
              <Text style={[s.metaValue, { fontFamily: "Helvetica-Bold", fontSize: 13 }]}>
                {quote.quote_number}
              </Text>
              <Text style={[s.metaValue, { color: LIGHT_TEXT }]}>
                {formatDate(quote.created_at)}
              </Text>
            </View>

            {/* Performed by */}
            <View style={s.metaBlock}>
              <Text style={s.metaLabel}>Performed By</Text>
              <Text style={s.metaValue}>{estimatorName}</Text>
            </View>

            {/* Client details */}
            <View style={s.metaBlock}>
              <Text style={s.metaLabel}>Client</Text>
              {quote.client_name && (
                <Text style={s.metaValue}>{quote.client_name}</Text>
              )}
              {quote.client_email && (
                <Text style={s.metaValue}>{quote.client_email}</Text>
              )}
              {quote.client_address && (
                <Text style={s.metaValue}>{quote.client_address}</Text>
              )}
            </View>

            {/* Job site — only show if different from client address */}
            {quote.job_site_address &&
              quote.job_site_address !== quote.client_address && (
              <View style={s.metaBlock}>
                <Text style={s.metaLabel}>Job Site</Text>
                <Text style={s.metaValue}>{quote.job_site_address}</Text>
              </View>
            )}
          </View>

          {/* Quote Totals summary box */}
          <View style={s.metaRight}>
            <View style={s.summaryBox}>
              <View style={s.summaryTitle}>
                <Text style={s.summaryTitleText}>Quote Totals</Text>
              </View>
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Subtotal</Text>
                <Text style={s.summaryValue}>{usd(subtotal)}</Text>
              </View>
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Tax ({taxRate}%)</Text>
                <Text style={s.summaryValue}>{usd(taxAmount)}</Text>
              </View>
              <View style={[s.summaryRow, s.summaryRowLast]}>
                <Text style={[s.summaryLabel, { fontFamily: "Helvetica-Bold" }]}>
                  Total
                </Text>
                <Text style={s.summaryTotal}>{usd(total)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Line Items Table (grouped by category) ── */}
        <View style={s.table}>
          {/* Table column headers */}
          <View style={s.tableHeader}>
            <Text style={[s.tableHeaderText, s.colDesc]}>Description</Text>
            <Text style={[s.tableHeaderText, s.colQty]}>Qty</Text>
            <Text style={[s.tableHeaderText, s.colUnit]}>Unit</Text>
            <Text style={[s.tableHeaderText, s.colUnitCost]}>Unit Price</Text>
            <Text style={[s.tableHeaderText, s.colTotal]}>Total</Text>
          </View>

          {/* Render each category group */}
          {categoryOrder.map((cat) => {
            const items = grouped[cat];
            // Track row index within category for alternating colors
            let rowIdx = 0;
            return (
              <View key={cat}>
                {/* Category section header — only show if more than one category */}
                {categoryOrder.length > 1 && (
                  <View style={s.categoryHeader}>
                    <Text style={s.categoryHeaderText}>{cat}</Text>
                  </View>
                )}

                {/* Category rows */}
                {items.map((item, i) => {
                  // Bake margin into unit price — client sees the marked-up price, not the raw cost
                  const unitPriceWithMargin =
                    item.unit_cost * (1 + item.margin_percent / 100);
                  const lineTotal = unitPriceWithMargin * item.quantity;
                  const isAlt = rowIdx % 2 === 1;
                  rowIdx++;
                  return (
                    <View
                      key={`${cat}-${i}`}
                      style={[s.tableRow, isAlt ? s.tableRowAlt : {}]}
                    >
                      <Text style={[s.tableCell, s.colDesc]}>
                        {item.description}
                      </Text>
                      <Text style={[s.tableCell, s.colQty]}>
                        {item.quantity}
                      </Text>
                      <Text style={[s.tableCell, s.colUnit]}>
                        {item.unit || "ea"}
                      </Text>
                      <Text style={[s.tableCell, s.colUnitCost]}>
                        {usd(unitPriceWithMargin)}
                      </Text>
                      <Text style={[s.tableCell, s.colTotal]}>
                        {usd(lineTotal)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>

        {/* ── Signature section ── */}
        <View style={s.signatureSection} wrap={false}>
          <View style={s.signatureBlock}>
            <Text style={s.signatureLabel}>Client Signature</Text>
            <View style={s.signatureLine} />
            <Text style={s.signatureCaption}>
              {quote.client_name || "Client Name"} — Date: _______________
            </Text>
          </View>
          <View style={s.signatureBlock}>
            <Text style={s.signatureLabel}>Estimator Signature</Text>
            <View style={s.signatureLine} />
            <Text style={s.signatureCaption}>
              {estimatorName} — Date: _______________
            </Text>
          </View>
        </View>

        {/* ── Footer (fixed to every page bottom) ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            Payment Terms: {paymentTerms} · This quote is valid for{" "}
            {validityDays} days from the date above.
          </Text>
          <Text style={[s.footerText, { marginTop: 2 }]}>
            This quote is an estimate based on the scope described. Final pricing
            may vary if site conditions differ from what was discussed. All work
            performed in accordance with local electrical codes and regulations.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
