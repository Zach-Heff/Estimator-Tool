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
- "NM-B" preferred over the trade name "Romex" in formal scope and permit paperwork (Romex is a Southwire trademark; AHJs often prefer the generic term)
- "Receptacle" for the device itself; "outlet" for the wiring point (NEC term)
- "Panel" or "panelboard"; not "fuse box" or "breaker box"
- "Service disconnect" is the NEC term (NEC 230.70) — regardless of breaker, fused switch, or molded-case switch
- "Service drop" = utility-owned OVERHEAD conductors from pole to weatherhead; "service lateral" = utility-owned UNDERGROUND conductors from transformer to meter; "service conductors" = customer-owned conductors from utility attachment through meter to service disconnect
- "120/240V split-phase" is the correct term for US residential single-phase service (two hots 180° out of phase + neutral) — do NOT call it "220V"
- "Branch circuit" = conductors + protective device, together
- "Grounding electrode system" (GES) includes rod(s), ufer (concrete-encased electrode / CEE), bonded metallic water pipe, building steel, etc.
- "Equipment grounding conductor" (EGC); "grounded conductor" (neutral, when precision matters); "ungrounded conductor" (hot/line, when precision matters)
- "Authority Having Jurisdiction" (AHJ) covers city/county/state/utility
- "Ampacity" (not loose "amps") for current-carrying capacity
- "Continuous load" (3+ hours) triggers NEC 210.19 and 215.2 125% derate for conductor and OCPD sizing
- "Tamper-resistant" (TR) per NEC 406.12; "weather-resistant" (WR) for outdoor per NEC 406.9(A); "in-use cover" (NOT just weatherproof) for outdoor receptacles
- "Listed" by NRTL (UL/ETL/CSA) — specific meaning; not "approved"
- "EVSE" (Electric Vehicle Supply Equipment) is the technical term for the wall unit; "EV charger" is fine for customer-facing scope; "EVSE" preferred in permit/inspection paperwork
- "Knockout" (KO) — the removable disc in a panel or box
- Conduit: "EMT" (thin-wall steel) vs "IMC" (intermediate-wall threadable steel) vs "RMC" (heavy-wall rigid steel) vs "PVC Sch 40" (general underground) vs "PVC Sch 80" (exposed-to-damage) — use the specific type, not just "conduit"
- "Rough-in" = boxes + cable runs before drywall (rough inspection); "trim-out" / "trim" = devices + fixtures + cover plates after drywall (final inspection); "pull" = running conductors through conduit; "make-up" = terminating conductors at a box

REGIONAL VARIATION — match the contractor's regional usage rather than correcting them:
- "Mast" (Western US) vs "riser" (Northeast) for the service entrance pipe from roof to weatherhead
- "Service disconnect" (NEC) vs "main shutoff" (West/South colloquial) vs "service switch" (Northeast colloquial)
- California Title 24 layers energy-code requirements on top of NEC for lighting and HVAC controls; AHJs enforce both
- Chicago / Cook County IL: historic local amendment requires conduit (EMT) for ALL branch circuits in dwellings — NM-B prohibited. Quotes for these jurisdictions must budget conduit material + labor on every run

Default NEC version is 2023 unless the AHJ uses a different cycle. Flag "verify with AHJ" rather than asserting local rules.`;

// ─── Key code triggers (Section D — the universal ones) ────────────────────

export const CODE_TRIGGERS = `KEY NEC 2023 CODE TRIGGERS for residential service (always check):
- WHOLE-HOUSE SPD REQUIRED on all services supplying dwelling units (NEC 230.67, added in NEC 2020 cycle). Type 1 or Type 2 SPD, integral with or immediately adjacent to service equipment. Applies to single-family, multi-family, dormitories, hotel/motel guest rooms, and patient sleeping rooms. This is the single most-missed line item on legacy panel-upgrade quote templates.
- GFCI required (NEC 210.8(A)): bathrooms, kitchen countertops, within 6 ft of sinks, garages, outdoors, basements, laundry, crawl spaces, bath/shower stalls, boathouses. NEC 2023 expanded 210.8(D)/(F) to dwelling-unit appliances (dishwashers, ranges) — [verify with AHJ — adoption varies].
- AFCI required (NEC 210.12): most 15A and 20A 120V branch circuits in habitable rooms; dual-function AFCI/GFCI covers both
- Tamper-resistant receptacles in dwelling units (NEC 406.12); replacement rule (NEC 406.4(D)(5)) — when replacing a receptacle in a TR-required location, replacement must be TR. Exceptions: ≥5½ ft above floor; part of luminaire/appliance; dedicated-space receptacles behind non-easily-moved appliances.
- Working space around panels: 30" wide × 36" deep × 6'6" high (NEC 110.26). NEC 2023 also extended 110.26(A) working-space requirements to HVAC disconnects under 440.14 — a disconnect crammed behind a condenser will now fail inspection.
- IC-rated recessed lights REQUIRED in insulated ceilings
- Smoke / CO detectors: hardwired AND interconnected (14/3 NM-B) in new construction and significant remodels (IRC R314/R315 + NEC). Required placement: one smoke per bedroom, one outside each sleeping area, one per floor; one CO outside each sleeping area; combination smoke/CO units satisfy both at sleeping-area locations.
- Continuous loads (3+ hours; EV chargers, electric water heaters ≤120 gal, etc.): conductor and OCPD sized at 125% (NEC 210.19, 215.2)
- 4-WIRE RANGE / DRYER required for any new circuit (NEC 250.140; 3-wire range/dryer disallowed for new since NEC 1996). Existing 3-wire is grandfathered; replacing branch-circuit conductors triggers 4-wire requirement.
- NM-B (Romex) NOT permitted in wet OR damp locations (NEC 334.12(B)) — use THWN-2 in conduit
- Wet-location boxes: NEMA 3R or better; in-use covers per NEC 406.9(B) (damp-location covers insufficient for outdoor receptacles where cords may be plugged in continuously)
- Required outdoor receptacles (NEC 210.52(E)(1)): at least one at front AND back of dwelling, readily accessible from grade, ≤6½ ft above grade. Balconies/decks/porches accessible from inside need one within perimeter, ≤6½ ft above surface (NEC 210.52(E)(3)).
- Kitchen small-appliance circuits: minimum 2 dedicated 20A circuits serving countertop + dining receptacles (NEC 210.52(B), 210.11(C)(1)); countertop receptacle spacing — no point along the countertop wall line more than 24" from a receptacle (NEC 210.52(C)(1)). NEC 2023: island/peninsula receptacles are now optional, but if omitted, future-installation provisions (junction box, blank cover labeled "for future") required.
- Dishwasher/disposal connection (NEC 422.16): cord-and-plug permitted with manufacturer-listed flexible cord (dishwasher 3–6.5 ft cord, disposal 18–36" cord), grounding-type plug; dishwasher receptacle in adjacent space (typically under sink), not in dishwasher space.
- HVAC / mini-split disconnect within sight and readily accessible from equipment (NEC 440.14); NEC 2023 requires the disconnect to meet 110.26(A) working space.
- Garage door opener ceiling receptacle: GFCI protection required (NEC 210.8(A)(2)) — older "single GDO receptacle exempt from GFCI" allowance removed in NEC 2020.
- Bath fan with heater = fixed appliance, typically dedicated 20A circuit [verify against fan nameplate]; plain bath fan (<1A) can share lighting circuit; the dedicated bathroom 20A small-appliance circuit (NEC 210.11(C)(3)) is for receptacles only.
- Pool/spa bonding grid required (NEC 680.26, #8 AWG solid CU); GFCI on spa circuits per NEC 680; disconnect within sight 5–10 ft from water (NEC 680.12)
- Subpanel at separate structure (NEC 250.32): 4-wire feeder REQUIRED (2 hots + neutral + EGC); separate grounding electrode system AT the structure (typically a ground rod) bonded to EGC bus only; neutral and ground bars ISOLATED in subpanel (neutral floats). Exception for single-branch-circuit feeds.
- Generator transfer equipment (NEC 702.5): must be LISTED and prevent parallel utility connection. Breaker interlock kits must be listed for the specific panel brand AND model — universal/aftermarket interlocks are commonly rejected by AHJ. Service-entrance-rated transfer switches contain the service disconnect and OCPD.
- Aluminum branch wiring (1965–1973 era): COPALUM crimps or AlumiConn connectors with antioxidant compound; use CO/ALR-rated devices where applicable
- Red-flag legacy panel brands: Federal Pacific Stab-Lok, Zinsco, Pushmatic, Challenger, early ITE/Bulldog Pushmatic — known fire hazards, recommend replacement`;

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
- Subpanel enclosure + main breaker or main lugs (sized to feeder; main-breaker subpanel preferred where it serves as the disconnect at a separate structure)
- Feeder breaker in main panel (2-pole, sized to subpanel ampacity)
- Feeder conductors: 4-WIRE (2 hots + neutral + EGC) — NEVER 3-wire for a separate structure under NEC 2008+. Common: 6/3 NM-B + ground for 60A; 4/3 NM-B for 100A short runs; 2/3 SER for 100A on longer runs (voltage-drop sensitive)
- Conduit: PVC Sch 40 typical underground; Sch 80 where subject to physical damage; EMT or RMC above-ground per AHJ
- Trenching if underground — min 18" depth for PVC Sch 40 residential per NEC 300.5; deeper under driveways
- GROUNDING ELECTRODE AT THE SEPARATE STRUCTURE (NEC 250.32(A)): ground rod (typically two 5/8" × 8' driven ≥6 ft apart) bonded to the subpanel's EGC bus — NOT to neutral
- NEUTRAL AND GROUND BUS ISOLATED at the subpanel (neutral floats; ground bonded to enclosure). Main-bonding jumper REQUIRED at service but PROHIBITED at downstream panels — #1 mistake on subpanel installs
- Exception (NEC 250.32(A) Exception): if the separate structure is fed by only a single branch circuit with an EGC, no separate grounding electrode required at the structure
- Branch breakers per loads served
- Load calculation per NEC 220 (typically 220.83 for existing-dwelling load additions)
- Permit + inspection
- Labor: 4–10 hours depending on run length and trenching; longer for trenching through hardscape`,

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
Highly variable scope. Most residential service shops use a trip-charge + hourly-cap-and-confirm model:
- TRIP CHARGE / DISPATCH FEE: fixed (typical $89–$149 in most metros; higher in HCOL) — covers travel + first 30 min on-site; non-refundable
- DIAGNOSTIC LABOR: hourly rate AFTER trip charge consumed; commonly capped at 1–2 hours before "pause and confirm" with customer
- REPAIR SCOPE: quoted separately once fault identified, OR rolled into same invoice if a quick fix (single device replacement)
- Some shops use a flat-rate "book" (price-per-task) model instead of T&M — clarify with the contractor

COMMON RESIDENTIAL TROUBLESHOOTING PATTERNS (use these to scope diagnostic time + likely follow-up work):
- No power to a single outlet → tripped GFCI upstream (LINE/LOAD); broken back-stab; loose neutral; open breaker; failed device
- Lights flickering throughout the whole house → loose neutral at panel/meter (HAZARD, escalate); utility-side issue; loose service connection
- Lights flickering in one room → loose neutral in that branch circuit; failing dimmer; bad LED retrofit driver
- Breaker tripping repeatedly → overload; short to ground; short between conductors; failing breaker; downstream AFCI/GFCI condition
- GFCI nuisance trips → moisture intrusion (outdoor); shared neutral on multiwire branch circuit; downstream LED driver leakage; failing GFCI
- AFCI nuisance trips → older AFCI breakers with vacuums/treadmills/drills; failing AFCI; legitimate arc fault (investigate, don't defeat)
- Burning smell at panel → loose lug / failing breaker / melted bus — STOP and kill power at utility if accessible; safety escalation
- Half the house dead → lost a hot leg; loose connection at meter/weatherhead/service-entrance lug; failed main breaker pole; utility-side leg failure

DIAGNOSTIC EQUIPMENT BASELINE (every service truck should have):
- Digital multimeter (DMM)
- Non-contact voltage tester (NCVT)
- Plug-in receptacle tester (with GFCI test button)
- Clamp ammeter
- Insulation resistance tester (megger) for old wiring / K&T / insulation integrity (500V or 1000V test)
- Tone-and-probe set for tracing unmarked circuits
- Thermal camera (optional, valuable for lug / breaker / splice hot spots)

PERMIT NOTES:
- No permit usually needed for repair-in-place (replace failed breaker, replace failed device, repair splice in existing box)
- Permit IS needed if repair extends to new circuits, new panel, or any service-entrance modification

Confidence should default to "medium" or "low" until clarification narrows the actual fault.`,

  kitchen_rewire: `KITCHEN RENOVATION ELECTRICAL BASELINE:
REQUIRED CIRCUITS (NEC 210.52(B), 210.11(C)(1)):
- Minimum 2 dedicated 20A small-appliance branch circuits serving kitchen/pantry/breakfast/dining receptacles only — no lighting, no fans on these circuits
- Refrigerator: can share a small-appliance circuit OR be on its own dedicated 15A/20A (NEC 210.52(B)(1) Ex. 2); most contractors run a dedicated 20A so a kitchen trip doesn't kill the fridge
- Dishwasher: typically dedicated 15A or 20A (check appliance nameplate); NEC 422.16(B)(2) governs cord-and-plug
- Disposal: typically dedicated 15A or 20A; NEC 422.16(B)(1) governs cord-and-plug. Some installers combine dishwasher + disposal on one 20A circuit with two under-sink receptacles — verify combined load and AHJ
- Microwave: dedicated 20A per most manufacturer specs and NEC 210.23(A) when nameplate >50% of circuit rating
- Range / cooktop / wall oven: dedicated 40A or 50A 240V circuit; 4-WIRE REQUIRED (NEC 250.140) — 8/3 NM-B w/ ground for 40A, 6/3 for 50A; larger cooktops / double ovens may need 50A or larger per nameplate

COUNTERTOP RECEPTACLE PLACEMENT (NEC 210.52(C)):
- No point along the countertop wall line more than 24" from a receptacle (i.e., max 48" between receptacles on a continuous run)
- Receptacle required at any wall countertop space 12" or wider
- Max receptacle height above countertop: 20" (NEC 210.52(C)(5))
- NEC 2023 CHANGE: island / peninsula receptacles are now OPTIONAL. If omitted, must include provisions for future installation (junction box with blank cover labeled "for future receptacle"). Clarify with customer whether they want island outlets or just the future-rough provision — this is a real cost difference.

PROTECTION:
- GFCI on all receptacles serving countertop surfaces (NEC 210.8(A)(6))
- GFCI on any receptacle within 6 ft of a sink (NEC 210.8(A)(7)) — refrigerator inclusive if positioned near sink
- AFCI on most 15A and 20A kitchen branch circuits (NEC 210.12); dual-function AFCI/GFCI common
- NEC 2023 expanded GFCI to dishwashers and ranges under 210.8(D)/(F) — [verify with AHJ — adoption varies]
- Tamper-resistant receptacles in dwelling units (NEC 406.12)

LIGHTING:
- Room lighting on a separate 15A/20A circuit from small-appliance circuits
- Under-cabinet lighting: low-voltage LED tape or 120V hardwired strips; clarify with customer
- Recessed lighting rough-in + finish (homeowner often supplies fixtures — confirm); IC-rated REQUIRED in insulated ceilings

MATERIALS:
- 12/2 NM-B w/ ground for 20A circuits; 14/2 for 15A; 8/3 or 6/3 for range; 10/3 for dryer
- Box fill calculations per NEC 314.16 — verify box depth for device + conductor count
- Misc: wire nuts, staples, box extensions, cover plates

PERMIT + LABOR:
- Permit + inspection if new circuits added
- Labor: 4–16 hours — highly variable; full rewire with new circuits, panel reconfiguration, finish work can exceed 30 hours`,

  bath_rewire: `BATHROOM ELECTRICAL UPDATE BASELINE:
- Dedicated 20A circuit for bathroom receptacles (NEC 210.11(C)(3)) — serves bathroom receptacles only, OR serves only ONE bathroom's receptacles + that bathroom's lighting/fan (NEC 210.11(C)(3) Exception). Cannot serve more than one bathroom plus lighting.
- GFCI on all bathroom receptacles (NEC 210.8(A)(1))
- AFCI per NEC 210.12; combination AFCI/GFCI (dual-function) common
- Lighting circuit: share with bath 20A under 210.11(C)(3) Exception (single bathroom only) OR general lighting circuit
- Vanity light fixtures damp-rated if subject to splashing
- Bath fan + switch: if fan only (<1A), can share lighting; fan/heat or fan/heat/light combo = fixed appliance, likely dedicated 20A [verify against nameplate]
- Recessed lighting over tub/shower: damp- or wet-rated per NEC 410.10(D)
- Tub/shower zone restrictions (NEC 410.10(D)): no cord-and-plug luminaires; no luminaires within 3 ft horizontal and 8 ft vertical of bathtub rim or shower threshold unless damp/wet-listed; no track lighting in the zone
- Tamper-resistant receptacles (NEC 406.12)
- 12/2 NM-B for the 20A circuit; 14/2 for any 15A lighting tie-in
- Permit if new circuits added`,

  gfci_afci_update: `GFCI / AFCI UPDATE BASELINE (no rewiring required):
NEC 406.4(D) allows replacing ungrounded 2-prong outlets with GFCI outlets WITHOUT rewiring; each labeled "GFCI Protected" + "No Equipment Ground."

FEED-THROUGH (LINE/LOAD) STRATEGY — saves money when wiring sequence is known:
- One GFCI device protects downstream receptacles on the same circuit via LOAD terminals; downstream receptacles are standard (cheaper) with "GFCI Protected" labels
- Use feed-through when: multiple required-GFCI receptacles share a circuit and wiring sequence can be identified; outdoor receptacles fed from inside (install GFCI indoors)
- Use one-per-location when: wiring is unmapped, customer wants visible GFCI test/reset at each location, or mixed loads make a single trip too disruptive (e.g., refrigerator on same run)

REPLACEMENT RULES (NEC 406.4(D) + 406.12):
- Grounding-type required where the box has an EGC (3-wire present)
- Non-grounding 2-prong replacement allowed where NO EGC exists (older K&T or 2-wire NM): options are (a) non-grounding receptacle, (b) GFCI labeled "No Equipment Ground," or (c) grounding-type downstream of a GFCI labeled "GFCI Protected" + "No Equipment Ground"
- TAMPER-RESISTANT REQUIRED (NEC 406.4(D)(5)) when replacing in a TR-required location (NEC 406.12)
- WEATHER-RESISTANT (WR) required outdoors (NEC 406.9(A))

OUTDOOR RECEPTACLE CONSIDERATIONS:
- NEC 210.52(E)(1) requires at least one receptacle at the front AND back of every one-/two-family dwelling, readily accessible from grade, ≤6½ ft above grade
- If a customer's current outdoor receptacles violate this (missing one, blocked by landscaping), this is a code-driven add-on worth flagging
- All outdoor receptacles need WR + GFCI + in-use covers (NEC 406.9(B))

LINE ITEMS:
- GFCI outlets per LINE/LOAD strategy
- Standard outlets + cover plates for downstream locations
- WR + TR outlets where applicable
- Outdoor in-use covers (NEC 406.9(B))
- "GFCI Protected" labels at every downstream receptacle
- Misc materials (wire nuts, faceplates, labels)
- Typically NO permit required (straight outlet replacement)
- Labor: ~30 min per receptacle for straightforward swap; longer for outdoor fishing or unmapped-wiring verification`,

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
