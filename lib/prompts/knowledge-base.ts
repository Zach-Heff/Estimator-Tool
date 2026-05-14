// Programmatic version of docs/residential-service-knowledge-base.md.
// The .md file is the human-readable source of truth; this file is the
// machine-readable derivative that the AI prompts embed.
//
// When updating residential service knowledge, edit BOTH:
//   1. docs/residential-service-knowledge-base.md (the bible)
//   2. this file (the prompt-ready constants)
//
// They should stay in sync. Drift = AI behavior diverges from documented behavior.

// ─── Shared types (also used by DB column unions in Step 3) ────────────────

export type JobType = "residential" | "commercial";

export type JobCategory =
  | "panel_upgrade"
  | "subpanel_install"
  | "ev_charger"
  | "service_call"
  | "kitchen_rewire"
  | "bath_rewire"
  | "gfci_afci_update"
  | "lighting"
  | "outlet_switch"
  | "generator_interlock"
  | "hvac_minisplit"
  | "hot_tub_spa"
  | "surge_protector"
  | "smoke_co_hardwire"
  | "aluminum_kt_remediation"
  | "remodel"
  | "new_construction"
  | "other";

export type LaborMode = "hourly" | "margin_on_cost" | "flat_fee";

// Context passed into the prompt-builder functions. All fields except zipCode
// are optional so existing callers (Step 2) don't break before Step 3 wires
// the new params through.
export interface QuoteContext {
  zipCode: string;
  jobType?: JobType;
  jobCategory?: JobCategory | null;
  laborMode?: LaborMode;
  laborRatePerHour?: number | null;
}

// ─── Human-readable labels for categories (used in UI dropdowns + prompts) ─

export const CATEGORY_LABELS: Record<JobCategory, string> = {
  panel_upgrade: "Panel Upgrade",
  subpanel_install: "Subpanel Install",
  ev_charger: "EV Charger Install",
  service_call: "Service Call / Troubleshooting",
  kitchen_rewire: "Kitchen Rewire",
  bath_rewire: "Bath Rewire",
  gfci_afci_update: "GFCI / AFCI Update",
  lighting: "Lighting",
  outlet_switch: "Outlet & Switch Work",
  generator_interlock: "Generator Interlock / Tie-In",
  hvac_minisplit: "HVAC / Mini-Split Dedicated Circuit",
  hot_tub_spa: "Hot Tub / Spa Dedicated Circuit",
  surge_protector: "Whole-House Surge Protector",
  smoke_co_hardwire: "Smoke / CO Detector Hardwire",
  aluminum_kt_remediation: "Aluminum or Knob-and-Tube Remediation",
  remodel: "Remodel (multi-category)",
  new_construction: "New Construction",
  other: "Other (describe in scope)",
};

// ─── Trade vocabulary guide (Section C of the .md doc) ─────────────────────

export const VOCABULARY_GUIDE = `VOCABULARY — match the precision an experienced estimator would use:
- "Conductor" for individual wires by spec; "cable" for assemblies (e.g., NM-B, MC); avoid generic "wire" when spec matters
- "Receptacle" for the device itself; "outlet" for the wiring point (NEC term)
- "Panel" or "panelboard"; not "fuse box" or "breaker box"
- "Branch circuit" = conductors + protective device, together
- "Grounding electrode system" includes rod(s), ufer (concrete-encased electrode), bonded water pipe, etc.
- "Equipment grounding conductor" (EGC); "grounded conductor" (neutral); "ungrounded conductor" (hot/line)
- "Authority Having Jurisdiction" (AHJ) covers city/county/state/utility
- "Ampacity" (not loose "amps") for current-carrying capacity
- "Continuous load" triggers NEC 210.19 125% derate for breaker sizing
- "Tamper-resistant" (TR) per NEC 406.12; "in-use cover" for outdoor receptacles
- "Listed" by NRTL (UL/ETL/CSA) — specific meaning; not "approved"
Default NEC version is 2023 unless the AHJ uses a different cycle. Flag "verify with AHJ" rather than asserting local rules.`;

// ─── Key code triggers (Section D — the universal ones) ────────────────────

export const CODE_TRIGGERS = `KEY NEC 2023 CODE TRIGGERS for residential service (always check):
- GFCI required (NEC 210.8): bathrooms, kitchen countertops, within 6 ft of sinks, garages, outdoors, basements, laundry, crawl spaces, bath/shower stalls
- AFCI required (NEC 210.12): most 15A and 20A 120V branch circuits in habitable rooms; dual-function AFCI/GFCI covers both
- Tamper-resistant receptacles in dwelling units (NEC 406.12)
- Working space around panels: 30" wide × 36" deep × 6'6" high (NEC 110.26)
- IC-rated recessed lights REQUIRED in insulated ceilings
- Smoke detectors hardwired AND interconnected (14/3 NM-B) in new construction and significant remodels (IRC + NEC)
- Continuous loads (EV chargers, etc.): conductor and breaker sized at 125% (NEC 210.19)
- NM-B (Romex) NOT permitted in wet locations — use THWN-2 in conduit
- Wet-location boxes: NEMA 3R or better; in-use covers per NEC 406.9(B)
- Pool/spa bonding grid required (NEC 680); GFCI on spa circuits; disconnect within sight 5–10 ft from water
- Aluminum branch wiring (1965–1973 era): COPALUM crimps or AlumiConn connectors with antioxidant compound; use CO/ALR-rated devices where applicable
- Red-flag legacy panel brands: Federal Pacific Stab-Lok, Zinsco, Pushmatic — known fire hazards, recommend replacement`;

// ─── Confidence rules (Section F) ──────────────────────────────────────────

export const CONFIDENCE_RULES = `CONFIDENCE FLAGS — apply per line item:
- "low": unknown service-entrance length; unknown AHJ permit rules; red-flag legacy panel brand suspected; unknown available breaker space; unknown wall/ceiling material when fishing/concealing required; indoor vs. outdoor not specified when it changes materials; wire-run length unknown beyond a 10-foot bound; branch-circuit count ambiguous
- "medium": general job type is clear but specific specs not given (breaker brand, fixture model, receptacle style); approximate quantities (e.g., "a few outlets" → assumed 4–6); regional pricing has limited recent comparables
- "high": all specs given and standard; quantities explicit; standard residential materials (NM-B, common breaker brands, standard fixtures)
If any line item is "low", the overall quote merits a review banner — flag prominently in the description.`;

// ─── Category-specific baseline line-item templates (Section B) ────────────
// These are injected into the generator and reviewer prompts when the owner
// has picked a job_category. They give the AI a concrete checklist.

export const CATEGORY_TEMPLATES: Record<JobCategory, string> = {
  panel_upgrade: `PANEL UPGRADE BASELINE (e.g., 100A → 200A):
Every panel upgrade quote should include these items unless the conversation explicitly excludes them:
- New main panel + main breaker (sized to the new service)
- New meter base (size matches new service)
- New service entrance conductors (SE cable) — length from clarification
- New weatherhead
- Grounding electrode system: ufer OR two 5/8" × 8' ground rods spaced ≥6 ft apart, bonded
- Equipment grounding and bonding (water pipe within 5 ft of entry if metallic; gas line per NEC 250.104)
- Branch-circuit breakers to match existing circuits (count and sizes from clarification)
- Permit fee (separate line, pass-through, NO markup)
- Inspection (often bundled with permit; check AHJ)
- Coordination with utility for shutoff/reconnect (typically no cost line; mention in Terms)
- Labor: typical 6–10 hours for a 200A residential panel swap
Red-flag panel brands to mention if the homeowner has them: Federal Pacific Stab-Lok, Zinsco, Pushmatic.`,

  subpanel_install: `SUBPANEL INSTALL BASELINE (separate structure or remote location):
- Subpanel + main breaker (sized to feeder)
- Feeder breaker in main panel (2-pole, sized to subpanel ampacity)
- Feeder conductors: 4-wire (two hots + neutral + EGC) — NEVER 3-wire to a separate structure under NEC 2008+
- Conduit (PVC Sch 40 underground; EMT or rigid above-ground per AHJ)
- Trenching if underground (typical 18" depth for PVC Sch 40 per NEC 300.5)
- Grounding electrode at the separate structure (ground rod + bond)
- Branch breakers per loads served
- Permit + inspection
- Labor: 4–10 hours depending on run length and trenching`,

  ev_charger: `EV CHARGER INSTALL BASELINE (Level 2 — 240V):
- Dedicated 2-pole breaker (typically 40A or 50A; sized per charger spec + 125% continuous-load rule per NEC 210.19)
- Conductors sized to circuit AND length (6 AWG copper typical for 50A; 4 AWG for long runs)
- Outlet (NEMA 14-50 most common) OR hardwire to charger unit
- Weatherproof in-use cover if outdoor mount (NEC 406.9(B))
- Disconnect within sight if AHJ requires
- Cable/conduit per run path (NM-B fine for open-joist indoor; THWN-2 in conduit for outdoor/wet)
- Permit + inspection (most jurisdictions require permit for new 240V circuit)
- Labor: 3–6 hours typical
The customer usually supplies the charger unit itself — confirm during clarification; do NOT include the charger as a line item unless the contractor is supplying it.`,

  service_call: `SERVICE CALL / TROUBLESHOOTING BASELINE:
Highly variable scope. Default approach:
- Diagnostic labor: minimum 1 hour at posted rate; often capped at 2 hours before pause-and-confirm with customer
- Materials only as identified during diagnosis (could be a single GFCI replacement; could be a partial rewire)
- If issue is not resolvable within the diagnostic window, generate a follow-up quote for the actual repair scope
- No permit usually needed for minor repair/replace; permit needed if new circuits are required
Confidence should default to "medium" or "low" until clarification narrows the actual fault.`,

  kitchen_rewire: `KITCHEN RENOVATION ELECTRICAL BASELINE:
- Dedicated 20A small-appliance branch circuits — minimum 2 per NEC 210.52(B); plus separate dedicated 20A for refrigerator, microwave, dishwasher, disposal as applicable
- GFCI protection on all receptacles serving countertop surfaces and within 6 ft of sink (NEC 210.8(A)(6) + (A)(7))
- AFCI protection on most 15A and 20A kitchen circuits (NEC 210.12); dual-function AFCI/GFCI common
- Under-cabinet lighting / strips if scope includes
- Recessed lighting rough-in + finish (homeowner often supplies fixtures — confirm)
- Tamper-resistant receptacles in dwelling units (NEC 406.12)
- 12/2 NM-B for 20A circuits; 14/2 for 15A circuits (residential typical)
- Misc: wire nuts, staples, box extensions, cover plates
- Permit + inspection if new circuits added
- Labor: 4–16 hours — highly variable with scope`,

  bath_rewire: `BATHROOM ELECTRICAL UPDATE BASELINE:
- Dedicated 20A circuit for bathroom receptacles (NEC requires)
- GFCI on all bathroom receptacles (NEC 210.8(A)(1))
- AFCI per NEC 210.12 (dual-function AFCI/GFCI is common single-device solution)
- Lighting circuit (often shared with hall in some jurisdictions; verify AHJ)
- Bath fan + switch (heat-rated if combo fan/light/heat)
- Tamper-resistant receptacles
- Permit if new circuits added`,

  gfci_afci_update: `GFCI / AFCI UPDATE BASELINE (no rewiring required):
- NEC 406.4(D) allows replacing ungrounded 2-prong outlets with GFCI outlets WITHOUT rewiring; each labeled "GFCI Protected / No Equipment Ground"
- GFCI outlet per location, OR one GFCI feeding downstream via LINE/LOAD terminals (cheaper for multiple downstream locations)
- Standard outlet + faceplate replacements for non-GFCI locations
- Outdoor GFCIs in weatherproof in-use covers (NEC 406.9(B))
- GFCI test labels per code
- Misc materials (wire nuts, faceplates)
- Typically NO permit required (straight outlet replacement)
- Labor: ~30 min per receptacle for straightforward swap; longer if fishing new circuits to outdoor locations`,

  lighting: `LIGHTING WORK BASELINE:
- Fixtures (clarify: homeowner-supplied or contractor-supplied)
- Switching: single-pole / 3-way / 4-way / dimmer / smart — clarify
- Boxes: deep boxes for fan-rated locations; shallow boxes for chandelier weight; correct box for fixture weight
- Cable: 14/2 NM-B for 15A lighting circuits; 14/3 for 3-way / 4-way switching
- Recessed lights: IC-rated REQUIRED if in insulated ceiling
- Outdoor lighting: weatherproof boxes, weatherproof covers, photocell or motion if specified
- Labor: ~30 min per fixture swap at same location; 1–2 hours per new run + fixture`,

  outlet_switch: `OUTLET / SWITCH WORK BASELINE:
- Receptacles: 15A or 20A (must match circuit; 20A receptacles required on 20A small-appliance branches)
- Switches: single-pole / 3-way / 4-way / dimmer; smart switches if requested
- USB-integrated receptacles if requested
- Box upgrades if existing box is too shallow for new device
- Tamper-resistant in dwelling units (NEC 406.12)
- Labor: ~15–30 min per device for straightforward replacement at same location`,

  generator_interlock: `GENERATOR INTERLOCK / TIE-IN BASELINE:
- Interlock kit listed for the specific panel brand/model (Square D HomeLine, GE PowerMark, Siemens, etc.) — UL listing matters for AHJ acceptance
- Generator inlet box (typically L14-30 or L14-50 depending on generator)
- 2-pole breaker for inlet (sized per generator output)
- Cable from inlet to breaker (gauge per breaker size)
- Labor: 2–4 hours typical
PITFALL: confirm exact panel brand and model BEFORE quoting; the interlock kit is panel-specific and universal aftermarket interlocks are often rejected by AHJ.`,

  hvac_minisplit: `HVAC / MINI-SPLIT DEDICATED CIRCUIT BASELINE:
- Dedicated breaker sized to unit (typically 20A or 30A, 240V)
- Conductors sized to circuit
- Disconnect within sight of unit — REQUIRED by NEC 440.14 for HVAC equipment
- Whip from disconnect to unit (sometimes supplied by HVAC contractor; clarify)
- Permit if new circuit
- Labor: 2–4 hours`,

  hot_tub_spa: `HOT TUB / SPA DEDICATED CIRCUIT BASELINE:
- Dedicated 50A or 60A 240V GFCI-protected circuit (NEC 680 requires GFCI on spas)
- Disconnect within sight, 5–10 ft from spa, accessible (NEC 680.12)
- Conductors: 6 AWG copper typical for 50A; 4 AWG for 60A
- Equipotential bonding grid around perimeter of spa (NEC 680.26) — #8 AWG solid copper bonded to all metallic parts; required even for above-ground spas in some interpretations
- Permit + inspection required
- Labor: 4–8 hours`,

  surge_protector: `WHOLE-HOUSE SURGE PROTECTOR BASELINE:
- Type 2 SPD listed for residential service-panel installation
- 2-pole breaker (typically 15A or 20A) for SPD mounting
- Mounted in or adjacent to main panel
- Labor: 1–2 hours`,

  smoke_co_hardwire: `SMOKE / CO DETECTOR HARDWIRE BASELINE:
- Smoke detectors (UL-listed; photoelectric or ionization or combined)
- CO detectors (UL-listed; combined smoke/CO common, co-located near sleeping areas)
- 14/3 NM-B cable for the interconnect leg (required so all alarm when one triggers, per IRC + NEC)
- Battery backup (most modern hardwired detectors have built-in 10-yr lithium backup)
- Permit if new circuit; not always required for replacement on existing wiring
- Labor: 30–45 min per detector if existing wiring; longer for new runs`,

  aluminum_kt_remediation: `ALUMINUM / KNOB-AND-TUBE REMEDIATION BASELINE:
ALUMINUM BRANCH WIRING (1965–1973 era):
- Pigtail to copper at each receptacle and switch using COPALUM crimps (requires certified installer + special tool) OR AlumiConn connectors (purple, easier to install)
- CO/ALR-rated devices at any termination that cannot be pigtailed
- Antioxidant compound at all aluminum-copper joints
- Significant labor — every device in the house
KNOB-AND-TUBE (pre-1950 era):
- Full rewire is the standard scope; partial K&T replacement is sometimes done but insurance often disallows
- Replace with NM-B
- Old fuse panel typically replaced as part of scope
- Permit + inspection (multi-day job)
- Labor: tens of hours; quote per-room or per-circuit`,

  remodel: `REMODEL (MULTI-CATEGORY) BASELINE:
Use the appropriate sub-templates above based on what's in scope. Examples:
- Kitchen + bath = combine kitchen_rewire + bath_rewire templates
- Whole-home rewire = K&T-style remediation + multiple panel sub-circuits
Generate line items grouped by the rooms or sub-projects involved.`,

  new_construction: `NEW CONSTRUCTION BASELINE:
- Rough-in: boxes, runs to panel, no fixtures (rough inspection)
- Trim-out: devices, fixtures, cover plates (final inspection)
- Service equipment (panel + main breaker + service entrance + grounding)
- Multiple permits/inspections at rough and final stages
- Labor: highly variable; quote per square foot or per circuit`,

  other: ``, // No template — rely entirely on conversation
};

// ─── Builder helpers used by the prompt files ──────────────────────────────

export function getCategoryTemplate(category: JobCategory | null | undefined): string {
  if (!category || category === "other") return "";
  const template = CATEGORY_TEMPLATES[category];
  if (!template) return "";
  return `\n--- CATEGORY-SPECIFIC TEMPLATE ---\n${template}\n--- END TEMPLATE ---\n`;
}

export function getCategoryLabel(category: JobCategory | null | undefined): string {
  if (!category) return "(not specified)";
  return CATEGORY_LABELS[category] || "(unknown)";
}

export function getJobTypeLabel(jobType: JobType | undefined): string {
  if (!jobType) return "(not specified — assume residential)";
  return jobType === "residential" ? "Residential" : "Commercial";
}

// Returns a prompt-ready instruction block for the chosen labor mode.
// Defaults to margin_on_cost to match the app's current behavior before Step 3.
export function getLaborModeInstructions(
  mode: LaborMode | undefined,
  ratePerHour: number | null | undefined
): string {
  const effectiveMode = mode || "margin_on_cost";

  if (effectiveMode === "hourly") {
    const rate = ratePerHour ?? 95; // Reasonable residential default if rate not set yet
    return `LABOR PRICING — HOURLY MODE:
- The contractor prices labor as hours × hourly rate
- For each labor line item: quantity = number of hours; unit = "hr"; unit_cost = ${rate.toFixed(2)} (the contractor's hourly rate)
- Do NOT apply margin to labor in this mode — the system bills labor at hours × rate
- Material line items still use the company's material margin (handled by the system)`;
  }

  if (effectiveMode === "flat_fee") {
    return `LABOR PRICING — FLAT FEE MODE:
- The contractor prices labor as a single flat amount per task (no rate × hours math)
- For each labor line item: quantity = 1; unit = "task"; unit_cost = the flat-fee amount in USD for that task
- Pull flat-fee estimates from regional norms for the contractor's zip code
- Material line items still use the company's material margin (handled by the system)`;
  }

  // margin_on_cost — current default behavior
  return `LABOR PRICING — MARGIN-ON-COST MODE:
- The contractor's raw hourly cost is marked up by the company's labor margin to compute billable price
- For each labor line item: quantity = hours; unit = "hr"; unit_cost = the contractor's RAW hourly cost (not their billable rate)
- The system applies the company's labor margin to compute billable_price (do NOT pre-apply margin yourself)
- This is the current default if no labor_mode is set`;
}
