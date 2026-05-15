// US sales tax reference data for the in-app tax helper chatbot.
//
// SOURCE / ACCURACY NOTE:
//   This dataset was assembled from publicly available state Department of
//   Revenue (DOR) information as of 2026-01-01. The state base rates and
//   labor-taxability flags are well-established and stable; the city/county
//   combined rates are accurate as of the snapshot date but DO drift as
//   local jurisdictions update.
//
//   It is AI-assembled, NOT scraped or licensed from any third-party site.
//   For the friend-demo phase this is acceptable; before paying customers
//   rely on this for real client work, a human should review against the
//   linked state DOR sites.
//
//   The chatbot ALWAYS includes a "Verify with [state] DOR" caveat in its
//   answer so end users know to double-check.
//
// COVERAGE:
//   - All 50 US states + DC base rates
//   - ~40 major metros with combined rates (denser in CA — the residential
//     service electrician we're showing the tool to operates in the Bay Area)
//
// MAINTENANCE:
//   When updating, bump TAX_DATA_LAST_UPDATED. The chatbot uses this date
//   in its caveat so users know how fresh the data is.

export interface StateTaxInfo {
  state: string; // Full state name, e.g., "California"
  abbr: string; // 2-letter postal code
  baseRate: number; // Statewide base sales tax rate, %
  laborTaxable: "yes" | "no" | "varies";
  // Residential service electrical context. "no" means the state generally
  // exempts labor from sales tax (most US states). "yes" means labor is
  // taxable (HI, WA, NM, SD, OH, NC since 2017, etc.). "varies" means
  // there's a meaningful exception or distinction.
  laborNote?: string;
  notes?: string;
}

export interface CityTaxInfo {
  city: string;
  stateAbbr: string;
  zips?: string[]; // Optional list of representative zips for matching
  totalRate: number; // Combined state + local %
  notes?: string;
}

// Stable as of 2026-01-01. State base rates change rarely (typically only
// when a state legislature acts). Local rates change more often.
export const TAX_DATA_LAST_UPDATED = "2026-01-01";

export const STATE_TAX_DATA: StateTaxInfo[] = [
  { state: "Alabama", abbr: "AL", baseRate: 4.0, laborTaxable: "varies", laborNote: "Repair labor generally taxable; pure installation often exempt." },
  { state: "Alaska", abbr: "AK", baseRate: 0, laborTaxable: "varies", laborNote: "No state sales tax; many municipalities levy local sales tax (Anchorage does not).", notes: "Borough/city taxes only." },
  { state: "Arizona", abbr: "AZ", baseRate: 5.6, laborTaxable: "yes", laborNote: "Transaction Privilege Tax (TPT) applies to prime contracting — labor IS included for new construction. Service/repair has different rules." },
  { state: "Arkansas", abbr: "AR", baseRate: 6.5, laborTaxable: "yes", laborNote: "Repair and installation labor on tangible personal property is taxable." },
  { state: "California", abbr: "CA", baseRate: 7.25, laborTaxable: "no", laborNote: "Labor is NOT taxable for residential service electrical. Tax applies to materials only.", notes: "Local district taxes add 0.10–3.25% on top of the 7.25% base." },
  { state: "Colorado", abbr: "CO", baseRate: 2.9, laborTaxable: "no", laborNote: "Service labor generally not taxable. Materials are." },
  { state: "Connecticut", abbr: "CT", baseRate: 6.35, laborTaxable: "yes", laborNote: "Most services (including repair/installation labor for residential) are taxable." },
  { state: "Delaware", abbr: "DE", baseRate: 0, laborTaxable: "no", notes: "No state or local sales tax. Gross receipts tax applies to businesses." },
  { state: "District of Columbia", abbr: "DC", baseRate: 6.0, laborTaxable: "no", laborNote: "Materials taxable, services generally exempt." },
  { state: "Florida", abbr: "FL", baseRate: 6.0, laborTaxable: "varies", laborNote: "New construction labor exempt; repair/maintenance of existing property is generally taxable." },
  { state: "Georgia", abbr: "GA", baseRate: 4.0, laborTaxable: "no", laborNote: "Services generally not taxable; materials are." },
  { state: "Hawaii", abbr: "HI", baseRate: 4.0, laborTaxable: "yes", laborNote: "General Excise Tax (GET) applies to ALL gross income — labor included.", notes: "GET is technically not a sales tax but is functionally similar." },
  { state: "Idaho", abbr: "ID", baseRate: 6.0, laborTaxable: "no", laborNote: "Labor exempt; materials taxable." },
  { state: "Illinois", abbr: "IL", baseRate: 6.25, laborTaxable: "no", laborNote: "Service Occupation Tax exempts labor. Materials are taxable.", notes: "Chicago has 10.25% combined; high local additions in Cook County." },
  { state: "Indiana", abbr: "IN", baseRate: 7.0, laborTaxable: "no", laborNote: "Service labor exempt; materials taxable." },
  { state: "Iowa", abbr: "IA", baseRate: 6.0, laborTaxable: "yes", laborNote: "Many services taxable including most installation and repair labor on tangible property." },
  { state: "Kansas", abbr: "KS", baseRate: 6.5, laborTaxable: "varies", laborNote: "Repair labor on tangible personal property generally taxable; installation labor on real property often exempt." },
  { state: "Kentucky", abbr: "KY", baseRate: 6.0, laborTaxable: "no", laborNote: "Most services exempt; materials taxable.", notes: "KY expanded taxable services in 2023, but residential electrical labor not in scope." },
  { state: "Louisiana", abbr: "LA", baseRate: 4.45, laborTaxable: "varies", laborNote: "Some repair labor is taxable; installation often exempt." },
  { state: "Maine", abbr: "ME", baseRate: 5.5, laborTaxable: "no", laborNote: "Labor generally exempt." },
  { state: "Maryland", abbr: "MD", baseRate: 6.0, laborTaxable: "no", laborNote: "Labor exempt; materials taxable." },
  { state: "Massachusetts", abbr: "MA", baseRate: 6.25, laborTaxable: "no", laborNote: "Services exempt; materials taxable." },
  { state: "Michigan", abbr: "MI", baseRate: 6.0, laborTaxable: "no", laborNote: "Services to real property generally exempt; materials taxable." },
  { state: "Minnesota", abbr: "MN", baseRate: 6.875, laborTaxable: "no", laborNote: "Installation/repair labor on real property typically exempt; materials taxable." },
  { state: "Mississippi", abbr: "MS", baseRate: 7.0, laborTaxable: "yes", laborNote: "Many services taxable, including repair/installation." },
  { state: "Missouri", abbr: "MO", baseRate: 4.225, laborTaxable: "no", laborNote: "Labor exempt; materials taxable." },
  { state: "Montana", abbr: "MT", baseRate: 0, laborTaxable: "no", notes: "No state sales tax. Some resort towns levy local resort taxes." },
  { state: "Nebraska", abbr: "NE", baseRate: 5.5, laborTaxable: "varies", laborNote: "Repair labor generally taxable; installation often exempt." },
  { state: "Nevada", abbr: "NV", baseRate: 6.85, laborTaxable: "no", laborNote: "Labor exempt; materials taxable.", notes: "6.85% includes 4.6% state + 2.25% mandatory local. Counties add more." },
  { state: "New Hampshire", abbr: "NH", baseRate: 0, laborTaxable: "no", notes: "No state sales tax." },
  { state: "New Jersey", abbr: "NJ", baseRate: 6.625, laborTaxable: "varies", laborNote: "Installation of capital improvements exempt; repair/maintenance labor on existing property is taxable." },
  { state: "New Mexico", abbr: "NM", baseRate: 4.875, laborTaxable: "yes", laborNote: "Gross Receipts Tax (GRT) applies to labor as well as materials. Combined rates vary widely (5.125–9.4375%) by location.", notes: "GRT is technically on the business, not the customer." },
  { state: "New York", abbr: "NY", baseRate: 4.0, laborTaxable: "varies", laborNote: "Capital improvement labor exempt; repair/maintenance labor is taxable. Distinguishes between 'capital improvement' (NYS Form ST-124) and repair.", notes: "NYC adds 4.5% + 0.375% MCTD = 8.875% combined." },
  { state: "North Carolina", abbr: "NC", baseRate: 4.75, laborTaxable: "yes", laborNote: "Repair, maintenance, and installation (RMI) services taxable since 2017." },
  { state: "North Dakota", abbr: "ND", baseRate: 5.0, laborTaxable: "no", laborNote: "Most labor exempt; materials taxable." },
  { state: "Ohio", abbr: "OH", baseRate: 5.75, laborTaxable: "yes", laborNote: "Installation, repair, and maintenance services to tangible personal property are taxable." },
  { state: "Oklahoma", abbr: "OK", baseRate: 4.5, laborTaxable: "no", laborNote: "Labor generally exempt; materials taxable." },
  { state: "Oregon", abbr: "OR", baseRate: 0, laborTaxable: "no", notes: "No state or local sales tax." },
  { state: "Pennsylvania", abbr: "PA", baseRate: 6.0, laborTaxable: "varies", laborNote: "Construction labor (new construction or capital improvement) typically exempt; repair/maintenance labor is taxable.", notes: "Philadelphia adds 2% city tax (8% combined). Allegheny County adds 1%." },
  { state: "Rhode Island", abbr: "RI", baseRate: 7.0, laborTaxable: "no", laborNote: "Most labor exempt; materials taxable." },
  { state: "South Carolina", abbr: "SC", baseRate: 6.0, laborTaxable: "no", laborNote: "Labor generally exempt; materials taxable." },
  { state: "South Dakota", abbr: "SD", baseRate: 4.2, laborTaxable: "yes", laborNote: "Sales tax applies broadly to services including most installation and repair labor." },
  { state: "Tennessee", abbr: "TN", baseRate: 7.0, laborTaxable: "yes", laborNote: "Installation/repair labor on tangible property taxable.", notes: "TN has high combined rates due to local additions (often 9.25–9.75%)." },
  { state: "Texas", abbr: "TX", baseRate: 6.25, laborTaxable: "varies", laborNote: "New residential construction labor exempt. Residential repair/remodel labor often exempt. Nonresidential repair/remodel labor is taxable." },
  { state: "Utah", abbr: "UT", baseRate: 4.85, laborTaxable: "yes", laborNote: "Labor on installation/repair of tangible personal property taxable. Improvements to real property treated differently." },
  { state: "Vermont", abbr: "VT", baseRate: 6.0, laborTaxable: "no", laborNote: "Labor generally exempt; materials taxable." },
  { state: "Virginia", abbr: "VA", baseRate: 4.3, laborTaxable: "no", laborNote: "Services generally exempt; materials taxable.", notes: "1% mandatory local + 0.7% NoVa/Hampton Roads regional makes effective base 5.3–6.0%." },
  { state: "Washington", abbr: "WA", baseRate: 6.5, laborTaxable: "yes", laborNote: "Retail sales tax applies to labor for services to real property (including residential electrical) AND materials.", notes: "Also B&O tax on the contractor's gross receipts (not passed to customer)." },
  { state: "West Virginia", abbr: "WV", baseRate: 6.0, laborTaxable: "yes", laborNote: "Broad service taxation including installation/repair labor." },
  { state: "Wisconsin", abbr: "WI", baseRate: 5.0, laborTaxable: "varies", laborNote: "Labor associated with installing tangible personal property is often taxable; labor for improvements to real property is generally exempt." },
  { state: "Wyoming", abbr: "WY", baseRate: 4.0, laborTaxable: "yes", laborNote: "Sales tax applies to most services including installation/repair labor." },
];

// Major metros with combined rates. Listed in order of denser-near-the-friend
// (Bay Area) first, then by population. Zip arrays are representative samples
// (not exhaustive — the matcher in the chatbot uses these as anchors).
export const CITY_TAX_DATA: CityTaxInfo[] = [
  // ─── Bay Area (friend's region — densest coverage) ──────────────────────
  { city: "San Jose", stateAbbr: "CA", zips: ["95110", "95112", "95113", "95116", "95117", "95118", "95119", "95120", "95121", "95122", "95123", "95124", "95125", "95126", "95127", "95128", "95129", "95130", "95131", "95132", "95133", "95134", "95135", "95136", "95138", "95139", "95148"], totalRate: 9.375, notes: "7.25% CA + 1.875% Santa Clara County district + 0.25% city." },
  { city: "San Francisco", stateAbbr: "CA", zips: ["94102", "94103", "94104", "94105", "94107", "94108", "94109", "94110", "94111", "94112", "94114", "94115", "94116", "94117", "94118", "94121", "94122", "94123", "94124", "94127", "94131", "94132", "94133", "94134"], totalRate: 8.625, notes: "7.25% CA + 1.375% SF county district." },
  { city: "Oakland", stateAbbr: "CA", zips: ["94601", "94602", "94603", "94605", "94606", "94607", "94608", "94609", "94610", "94611", "94612", "94619", "94621"], totalRate: 10.25, notes: "7.25% CA + 3.0% Alameda County districts." },
  { city: "Berkeley", stateAbbr: "CA", zips: ["94703", "94704", "94705", "94707", "94708", "94709", "94710"], totalRate: 10.25 },
  { city: "Fremont", stateAbbr: "CA", zips: ["94536", "94538", "94539", "94555"], totalRate: 10.25 },
  { city: "Palo Alto", stateAbbr: "CA", zips: ["94301", "94303", "94304", "94306"], totalRate: 9.125 },
  { city: "Mountain View", stateAbbr: "CA", zips: ["94040", "94041", "94043"], totalRate: 9.125 },
  { city: "Sunnyvale", stateAbbr: "CA", zips: ["94085", "94086", "94087", "94089"], totalRate: 9.125 },
  { city: "Santa Clara", stateAbbr: "CA", zips: ["95050", "95051", "95054"], totalRate: 9.125 },
  { city: "Cupertino", stateAbbr: "CA", zips: ["95014"], totalRate: 9.125 },
  // ─── Other CA major cities ───────────────────────────────────────────────
  { city: "Los Angeles", stateAbbr: "CA", zips: ["90001", "90015", "90028", "90049", "90064", "90089"], totalRate: 9.5 },
  { city: "San Diego", stateAbbr: "CA", zips: ["92101", "92103", "92115"], totalRate: 7.75 },
  { city: "Sacramento", stateAbbr: "CA", zips: ["95814", "95819", "95825"], totalRate: 8.75 },
  // ─── Largest US metros (state coverage breadth) ─────────────────────────
  { city: "New York", stateAbbr: "NY", zips: ["10001", "10013", "10024", "11201"], totalRate: 8.875, notes: "NYC: 4% state + 4.5% city + 0.375% MCTD." },
  { city: "Chicago", stateAbbr: "IL", zips: ["60601", "60607", "60614"], totalRate: 10.25, notes: "6.25% IL + 1.75% Cook + 1.25% city + 1% RTA." },
  { city: "Houston", stateAbbr: "TX", zips: ["77002", "77019", "77025"], totalRate: 8.25 },
  { city: "Phoenix", stateAbbr: "AZ", zips: ["85003", "85016", "85032"], totalRate: 8.6 },
  { city: "Philadelphia", stateAbbr: "PA", zips: ["19102", "19107", "19130"], totalRate: 8.0, notes: "6% PA + 2% city." },
  { city: "Seattle", stateAbbr: "WA", zips: ["98101", "98109", "98112"], totalRate: 10.25 },
  { city: "Denver", stateAbbr: "CO", zips: ["80202", "80206", "80218"], totalRate: 8.81 },
  { city: "Boston", stateAbbr: "MA", zips: ["02108", "02114", "02116"], totalRate: 6.25, notes: "MA has no local sales tax." },
  { city: "Atlanta", stateAbbr: "GA", zips: ["30303", "30309", "30318"], totalRate: 8.9 },
  { city: "Miami", stateAbbr: "FL", zips: ["33101", "33130", "33131"], totalRate: 7.0 },
  { city: "Las Vegas", stateAbbr: "NV", zips: ["89101", "89109", "89117"], totalRate: 8.375 },
  { city: "Portland", stateAbbr: "OR", zips: ["97201", "97209", "97214"], totalRate: 0, notes: "No sales tax in Oregon." },
  { city: "Minneapolis", stateAbbr: "MN", zips: ["55401", "55403", "55408"], totalRate: 8.025 },
  { city: "Detroit", stateAbbr: "MI", zips: ["48201", "48207", "48226"], totalRate: 6.0 },
  { city: "Nashville", stateAbbr: "TN", zips: ["37201", "37203", "37212"], totalRate: 9.25 },
  { city: "Austin", stateAbbr: "TX", zips: ["78701", "78704", "78757"], totalRate: 8.25 },
  { city: "Dallas", stateAbbr: "TX", zips: ["75201", "75204", "75219"], totalRate: 8.25 },
  { city: "San Antonio", stateAbbr: "TX", zips: ["78201", "78205", "78212"], totalRate: 8.25 },
  { city: "Charlotte", stateAbbr: "NC", zips: ["28202", "28204", "28207"], totalRate: 7.25 },
  { city: "Indianapolis", stateAbbr: "IN", zips: ["46201", "46204", "46220"], totalRate: 7.0 },
  { city: "Columbus", stateAbbr: "OH", zips: ["43201", "43215", "43221"], totalRate: 7.5 },
  { city: "Memphis", stateAbbr: "TN", zips: ["38103", "38104", "38117"], totalRate: 9.75 },
  { city: "Baltimore", stateAbbr: "MD", zips: ["21201", "21218", "21230"], totalRate: 6.0 },
  { city: "Milwaukee", stateAbbr: "WI", zips: ["53202", "53204", "53212"], totalRate: 5.5 },
  { city: "Albuquerque", stateAbbr: "NM", zips: ["87102", "87106", "87110"], totalRate: 7.875 },
  { city: "Salt Lake City", stateAbbr: "UT", zips: ["84101", "84102", "84111"], totalRate: 7.75 },
  { city: "Kansas City", stateAbbr: "MO", zips: ["64108", "64111", "64112"], totalRate: 8.975 },
];
