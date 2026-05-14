# Residential Service Knowledge Base

> **What this is:** the AI's "bible" for generating residential service electrical quotes. The clarification, generation, and review prompts in `lib/prompts/` reference this document for vocabulary, category templates, code triggers, pricing framework, and confidence rules.
>
> **Status:** v1, drafted 2026-05-14. Iterable. Friend's feedback updates it.
>
> **Verification disclaimer:** the technical claims below — line-item templates, NEC code references, typical labor hours, common pitfalls — were drafted by Claude from the `5 Residential Electrical Estimates — Study Guide.docx` plus general residential electrical knowledge. **They have NOT been reviewed by a licensed electrician.** Before relying on any specific claim for real client work, verify against:
> - A current NEC handbook (NEC 2023 is what the sample estimates reference)
> - The local Authority Having Jurisdiction (AHJ) for permit and inspection rules
> - A trusted residential service electrician (e.g., the friend we're showing this to)
>
> Treat this v1 as a *starting structure*, not as authoritative source-of-truth on electrical code.

---

## Section A — Ground Truth Examples

The repository contains five fully-detailed sample estimates in `5 Residential Electrical Estimates — Study Guide.docx`. They are the canonical examples for what a high-quality residential service quote looks like. All five are San Jose, CA jobs from a contractor licensed CA C-10.

| # | Estimate ID | Job Type | Grand Total |
|---|---|---|---|
| 1 | EST-2025-001 | EV Charger Installation (Level 2 — 240V / 50A) | $1,122.50 |
| 2 | EST-2025-002 | Panel Upgrade — 100A to 200A | $2,330.00 |
| 3 | EST-2025-003 | Kitchen Renovation Electrical | $1,665.00 |
| 4 | EST-2025-004 | Whole-Home Outlet & GFCI Safety Update | $1,666.00 |
| 5 | EST-2025-005 | Detached Garage ADU Conversion | $3,005.00 |

When the AI needs an example of "what a finished residential quote looks like," these five are the reference. They demonstrate:

- Plain-language scope-of-work paragraphs (no jargon-dump, but trade-accurate)
- Line items broken down by component with separate labor and material columns per line
- Permit + inspection as a separate line (pass-through cost, not marked up)
- Terms & Notes section that explicitly states what is NOT included (drywall patching, fixture supply, etc.)
- 30-day validity, 50% deposit standard, NEC 2023 compliance referenced where relevant

---

## Section B — Job Category Templates

For each canonical residential service job category, this section lists the *baseline* line items the AI should expect to include. These are starting templates, not exhaustive — the clarification chat fills in specifics, and the final quote may add or remove items based on the actual scope.

> **AI instruction:** when a quote's `job_category` matches one of these templates, treat the listed items as a checklist. Confirm each is either included in the generated quote OR explicitly ruled out by the clarification conversation. Missing items without explicit exclusion is a review-agent flag.

### B.1 Panel Upgrade (e.g., 100A → 200A)

Baseline items (every panel upgrade should have these unless explicitly excluded):

- New main panel + main breaker (sized to new service)
- New meter base (size matches new service)
- New service entrance conductors (SE cable) — length depends on weatherhead-to-meter-to-panel run
- New weatherhead
- Grounding electrode system: ufer (concrete-encased electrode) OR two 5/8" × 8' ground rods spaced ≥6 ft apart, bonded
- Equipment grounding and bonding (bond ground rod(s), bond water pipe within 5 ft of entry if metallic, bond gas line at point of attachment)
- Branch-circuit breakers to match existing circuits (count + sizes from clarification)
- Coordination with utility (e.g., PG&E for shutoff/reconnect) — usually no cost but scheduling required
- Permit fee (separate line, pass-through)
- Inspection (usually included in permit fee or separate fee from AHJ)
- Labor: typical 6–10 hours for a 200A residential panel swap (varies with conduit, service-entrance complexity, transfer count)

Red-flag panels that should be auto-mentioned by the clarification chat if customer has them: **Federal Pacific Stab-Lok**, **Zinsco**, **Pushmatic** — known fire hazards, replacement strongly recommended.

### B.2 Subpanel Install (separate structure or remote location)

- Subpanel + main breaker (sized to feeder)
- Feeder breaker in main panel (2-pole, sized to subpanel ampacity)
- Feeder conductors: 4-wire (two hots + neutral + equipment grounding conductor) — NEVER 3-wire to a separate structure under NEC 2008+
- Conduit (PVC schedule 40 for underground, EMT or rigid for above-ground depending on AHJ)
- Trenching if underground (typical 18" depth for PVC schedule 40 per NEC 300.5)
- Grounding electrode at separate structure (separate building) — ground rod + bond
- Branch breakers per loads served
- Permit + inspection
- Labor: 4–10 hours depending on run length and trenching

### B.3 EV Charger Install (Level 2 — 240V)

- Dedicated 2-pole breaker (typically 40A or 50A; size to charger spec and continuous-load rule)
- Conductors sized to circuit + length (typical: 6 AWG copper for 50A; bump to 4 AWG for long runs)
- Outlet (NEMA 14-50 most common) OR hardwire to charger unit
- Weatherproof in-use cover if outdoor mount
- Disconnect within sight if required by AHJ (some jurisdictions require)
- Cable/conduit per run path (indoor open-joist = NM-B is fine; concealed in finished walls = check AHJ; outdoor or wet location = THHN in conduit)
- Permit + inspection (most jurisdictions require permit for new 240V circuit)
- Labor: 3–6 hours typical install

**Note:** the customer typically supplies the charger unit itself. Confirm during clarification.

### B.4 Service Call / Troubleshooting

This is the most variable category — output structure depends on what's found. Baseline approach:

- Diagnostic hour(s): minimum 1 hr labor at posted rate, often capped at 2 hr before pause-and-confirm
- Materials only as identified (could be a single GFCI replacement, could be a partial rewire)
- If issue not resolvable within the diagnostic window, generate a follow-up quote for the actual repair scope
- No permit usually needed for minor repair/replace; permit needed for new circuits

Confidence: should default to `medium` or `low` until clarification narrows the actual fault.

### B.5 Kitchen Rewire / Electrical Renovation

Baseline items for typical kitchen electrical update (matches EST-2025-003):

- Dedicated 20A circuits per code (NEC requires minimum 2 dedicated 20A small-appliance branch circuits for kitchen countertop + dining; plus separate dedicated 20A for refrigerator, microwave, dishwasher, disposal as applicable)
- GFCI protection on all countertop receptacles within 6 ft of sink edge (NEC 210.8(A)(6))
- AFCI protection on most kitchen 15A and 20A circuits (NEC 210.12)
- Under-cabinet lighting / strips (if scope)
- Recessed lighting rough-in + finish (homeowner often supplies fixtures)
- Tamper-resistant receptacles in dwelling units (NEC 406.12)
- 12/2 NM-B for 20A circuits, 14/2 for 15A circuits (residential typical)
- Wire nuts, staples, box extensions, faceplates (misc lot line)
- Permit + inspection if new circuits added
- Labor: highly variable — 4–16 hours depending on scope

### B.6 Bath Rewire / Bathroom Electrical Update

Similar pattern to kitchen but smaller scope:

- Dedicated 20A circuit for receptacles (NEC requires)
- GFCI on all bathroom receptacles (NEC 210.8(A)(1))
- AFCI per NEC 210.12 in dwelling
- Lighting circuit (often shared with hall, but bathroom lighting can be on same circuit as receptacles in some jurisdictions — verify AHJ)
- Bath fan + switch (heat-rated if fan/light combo or fan/heat)
- Tamper-resistant receptacles
- Permit if new circuits

### B.7 GFCI / AFCI Update (no rewiring)

NEC 406.4(D) allows replacing ungrounded 2-prong outlets with GFCI outlets without rewiring; each must be labeled "GFCI Protected / No Equipment Ground." This is a common job. Baseline:

- GFCI outlet per location (multiple GFCIs OR a single GFCI feeding downstream receptacles via LINE/LOAD terminals)
- Standard outlet/faceplate replacements for non-GFCI locations
- Outdoor GFCIs in weatherproof in-use covers (NEC 406.9(B))
- GFCI test labels per code
- Misc materials
- Usually no permit required (straight outlet replacement)
- Labor: ~30 min per receptacle for straightforward replacement; longer for fishing new circuits to outdoor locations

### B.8 Lighting (interior or exterior)

- Fixtures (homeowner-supplied or contractor-supplied — clarify)
- Switching: single-pole, 3-way, 4-way, dimmer, smart — clarify
- Boxes (deep boxes for fan-rated locations; shallow boxes for chandelier weight limits)
- Cable (14/2 for lighting circuits, 14/3 for 3-way)
- Recessed lights: IC-rated if in insulated ceiling (REQUIRED if ceiling has insulation)
- Outdoor lighting: weatherproof boxes, weatherproof covers, photocell or motion if specified
- Labor varies widely — fixture swap is ~30 min each; new run + fixture is 1–2 hr per location

### B.9 Outlet & Switch Work

- Receptacles (15A or 20A — match circuit; 20A required on 20A small-appliance branches)
- Switches (single-pole, 3-way, 4-way, dimmer)
- USB-integrated receptacles if requested
- Smart switches/receptacles if requested
- Box upgrades if existing box is too shallow
- Tamper-resistant in dwelling units
- Labor: ~15–30 min per device for straightforward replacement

### B.10 Generator Interlock / Tie-In

- Interlock kit specific to panel brand/model (Square D HomeLine, GE PowerMark, Siemens, etc. — get exact panel model first)
- Generator inlet box (typically L14-30 or L14-50 depending on generator)
- 2-pole breaker for inlet
- Cable from inlet to breaker (gauge per breaker size)
- Labor: 2–4 hours typical

**Pitfall:** make sure the interlock kit is *listed for the specific panel*. UL listing matters for AHJ acceptance. Universal/aftermarket interlocks may be rejected.

### B.11 HVAC / Mini-Split Dedicated Circuit

- Dedicated breaker sized to unit (typically 20A or 30A, 240V)
- Conductor sized to circuit
- Disconnect within sight of unit (REQUIRED by NEC 440.14 for HVAC equipment)
- Whip from disconnect to unit (often supplied by HVAC contractor; clarify)
- Permit if new circuit
- Labor: 2–4 hours

### B.12 Hot Tub / Spa Dedicated Circuit

- Dedicated 50A or 60A 240V GFCI-protected circuit (NEC 680 requires GFCI protection for spas)
- Disconnect within sight, 5–10 ft from spa, accessible (NEC 680.12)
- Conductor: 6 AWG copper typical for 50A; 4 AWG for 60A
- Equipotential bonding grid around perimeter of spa (NEC 680.26) — required even for above-ground spas in some interpretations
- Permit + inspection (required for new spa circuit)
- Labor: 4–8 hours

### B.13 Whole-House Surge Protector (SPD)

- Type 2 SPD (listed for residential service-panel installation)
- 2-pole breaker (typically 15A or 20A) for SPD mounting
- Mounting in or adjacent to main panel
- Labor: 1–2 hours

### B.14 Smoke / CO Detector Hardwire

- Smoke detectors (UL-listed, photoelectric or ionization or combined)
- CO detectors (UL-listed; combined smoke/CO common)
- 14/3 NM-B cable for interconnect (required so all alarm when one triggers, per IRC + NEC)
- Battery backup (most modern hardwired detectors have built-in 10-yr lithium backup)
- Permit if new circuit; not always required for replacement on existing wiring
- Labor: 30–45 min per detector if existing wiring; longer if new runs

### B.15 Aluminum / Knob-and-Tube Remediation

Two distinct jobs:

**Aluminum branch wiring (1965–1973 era):**
- Pigtailing to copper at each receptacle and switch with COPALUM crimps OR purple-twist AlumiConn connectors (insurance-accepted methods)
- CO/ALR-rated devices at any termination that cannot be pigtailed
- Antioxidant compound at all aluminum-to-copper joints
- Significant labor — every device in the house

**Knob-and-tube (pre-1950 era):**
- Full rewire is standard; partial K&T replacement is sometimes done but insurance often disallows
- Replace with NM-B Romex
- Old fuse panel typically replaced as part of scope
- Permit + inspection (large job, multi-day)
- Labor: tens of hours; quote per-room or per-circuit

### B.16 Remodel (multi-category)

Use the appropriate sub-templates above based on what's in scope. Examples: kitchen + bath = combine B.5 + B.6; whole-home rewire = K&T-style remediation + multiple panel sub-circuits.

### B.17 New Construction

Out of scope for "residential service" but supported. Items typically include: rough-in (boxes, runs to panel, no fixtures), trim-out (devices, fixtures, covers), service equipment, grounding, multiple permits/inspections at rough and final stages.

### B.18 Other (describe in scope)

Free-form. The AI must rely on clarification to discover what the job actually is.

---

## Section C — Vocabulary & Style

### C.1 Prefer (technical accuracy)

| Use | Instead of | Why |
|---|---|---|
| Conductor | "Wire" (when spec matters) | Conductors have ampacity, insulation class, voltage rating |
| Cable | "Wire" (when referring to assembly like NM-B / Romex) | NM-B is a cable assembly of multiple conductors + sheath |
| Receptacle | "Plug" or "outlet" (in formal scope) | "Outlet" is technically a point in wiring where current is taken to supply equipment; "receptacle" is the device |
| Panel | "Fuse box" or "breaker box" | Modern term; "panel" or "panelboard" |
| Service entrance | "Power feed" | Specific technical meaning |
| Branch circuit | "Wire run" (when discussing protection) | A branch circuit is conductors + protective device |
| Grounding electrode | "Ground rod" (when discussing the system) | Rod is one type of electrode; system includes rod, ufer, water pipe bond, etc. |
| Equipment grounding conductor (EGC) | "Ground wire" | EGC has specific code role |
| Grounded conductor | "Neutral" (when precision matters) | "Neutral" colloquial; "grounded conductor" is NEC term |
| Authority Having Jurisdiction (AHJ) | "Inspector" or "the city" | AHJ is the umbrella term; may be city, county, state, or utility |
| Ampacity | "Amps" (loosely) | Ampacity = current-carrying capacity at given conditions |
| Continuous load | "Load that runs a long time" | NEC term, triggers 125% derate for breaker sizing |
| In-use cover | "Weatherproof cover" (for outdoor receptacles) | "In-use" covers protect cord-in-plug condition |
| Tamper-resistant (TR) | "Child-safe outlet" | TR is the NEC term |
| Listed | "Approved" | "Listed" by NRTL (UL, ETL, CSA) — specific meaning |

### C.2 Reference codes correctly

When citing NEC sections, use the format: **NEC [year] Article.Section** — e.g., "NEC 2023 210.8(A)(1)" for bathroom GFCI. Don't paraphrase code requirements without citation; quote or reference the article.

When discussing local rules, use **AHJ** — never assume the customer's jurisdiction enforces NEC verbatim; many jurisdictions have local amendments.

### C.3 Tone

- Direct, trade-aware, no marketing language
- Don't apologize for asking questions; ask them
- Don't pad answers with disclaimers if the customer's scope is clear
- If a clarification question has 2–3 likely interpretations, surface them as options rather than asking open-ended

### C.4 Do NOT

- Use "wire" when the spec matters (always say conductor or cable)
- Recommend specific brand of equipment unless asked
- Assert local code requirements without flagging "verify with your AHJ"
- Imply guarantees or warranty terms
- Reference 2008 / 2014 / 2017 NEC unless the AHJ is known to enforce that version — default to NEC 2023

---

## Section D — Common Pitfalls & Code Triggers

These are mistakes the review agent should specifically watch for, and questions the clarification agent should specifically ask.

### D.1 Panel Upgrade Missing Items

The single most common review-failure mode. Verify every panel upgrade quote includes:

- [ ] Weatherhead
- [ ] Meter base
- [ ] Service entrance conductors (length stated)
- [ ] Main breaker
- [ ] Grounding electrode system (ufer OR ground rod[s])
- [ ] Bonding (water pipe within 5 ft of entry if metallic; gas line per NEC 250.104)
- [ ] Permit
- [ ] Inspection
- [ ] Branch breakers (count + sizes from existing or new)
- [ ] Coordination with utility (no cost line but a scheduling line in Terms section)

### D.2 GFCI Required Locations (NEC 2023 210.8)

GFCI protection required for 125V, single-phase 15A and 20A receptacles in:

- Bathrooms (A)(1)
- Garages, accessory buildings (A)(2)
- Outdoors (A)(3)
- Crawl spaces at or below grade (A)(4)
- Unfinished basements (A)(5)
- Kitchens, where receptacles serve countertop surfaces (A)(6)
- Within 6 ft of sinks (A)(7)
- Boathouses (A)(8)
- Bathtubs / shower stalls (A)(9)
- Laundry areas (A)(10)
- Indoor damp / wet locations (A)(11)

### D.3 AFCI Required Locations (NEC 2023 210.12)

AFCI protection required for all 15A and 20A 120V branch circuits supplying outlets or devices in: kitchens, family rooms, dining rooms, living rooms, parlors, libraries, dens, bedrooms, sunrooms, recreation rooms, closets, hallways, laundry areas, similar rooms. Effectively: nearly all habitable rooms.

**Combination AFCI/GFCI** ("dual-function") covers both requirements with one device.

### D.4 Tamper-Resistant Receptacles (NEC 406.12)

TR required in dwelling units for nearly all 125V, 15A and 20A receptacles. There are limited exceptions (e.g., receptacles ≥5.5 ft above floor in dwelling units, certain appliance-only receptacles).

### D.5 Working Space Around Panels (NEC 110.26)

- Width: minimum 30" or width of equipment, whichever is greater
- Depth: 36" (for 0–150V to ground), 42" (151–600V to ground)
- Height: 6'6" or height of equipment, whichever is greater

Workshops, storage rooms, etc. that crowd panel access can fail inspection.

### D.6 IC-Rated Recessed Fixtures

If recessed lights are installed in an insulated ceiling, fixtures MUST be IC-rated (Insulation Contact). Non-IC fixtures require insulation to be kept clear, which often isn't practical.

### D.7 Smoke Detector Interconnect

In new construction and significant remodels, smoke detectors must be hardwired AND interconnected so all sound when one triggers (IRC + NEC). 14/3 NM-B is standard for the interconnect leg. CO detectors should be combined-unit or co-located near sleeping areas.

### D.8 Continuous Load Sizing

Per NEC 210.19, branch circuit conductors must be sized at 125% of continuous load. EV chargers are continuous loads — a 40A continuous load requires a 50A circuit (40A × 1.25 = 50A).

### D.9 Outdoor / Wet Location Wiring

- Conductors in wet locations must be wet-rated (THWN-2, not just THHN — though THHN-2 is dual-rated)
- Boxes in wet locations must be NEMA 3R or better
- Receptacles in wet locations need in-use covers (per NEC 406.9(B))
- NM-B (Romex) NOT permitted in wet locations — use THWN-2 in conduit

### D.10 Bonding for Pools, Spas, Hot Tubs (NEC 680)

- Equipotential bonding grid around perimeter of pool / spa (#8 AWG solid copper, bonded to all metallic parts)
- All metal within 5 ft of water bonded
- GFCI protection on all spa/pool circuits (some exceptions)
- Disconnect within sight, 5–10 ft from water

### D.11 Aluminum Branch Wiring (1965–1973 era)

Insurance carriers increasingly require remediation. Accepted methods: COPALUM crimps (require certified installer + special tool) OR AlumiConn connectors (purple, easier to install). Antioxidant compound at all aluminum-copper joints.

### D.12 Federal Pacific / Zinsco / Pushmatic

These panels are known fire hazards. The clarification chat should flag them by name if the customer mentions an old panel or describes a panel that matches their look. Strongly recommend replacement.

### D.13 Permit Required vs. Not Required

General rule (varies by AHJ):

| Job | Permit? |
|---|---|
| Panel swap or upgrade | YES |
| New circuit / new outlet location | YES |
| Replace existing outlet at same location | Usually no |
| Replace switch at same location | Usually no |
| Replace fixture (same location, same circuit) | Usually no |
| EV charger new circuit | YES |
| Spa / hot tub circuit | YES |
| Subpanel | YES |
| Service call / troubleshooting (repair) | Usually no, but if repair includes new circuits or panel work, YES |

When uncertain, the clarification chat should default to "check with your AHJ" rather than asserting "no permit needed."

---

## Section E — Pricing Framework

The owner picks one of three labor pricing modes per quote (with a company-level default that auto-fills).

### E.1 Mode: Hourly (`labor_mode = 'hourly'`)

- Each labor line item is output as: `hours × labor_rate_per_hour = labor_total`
- AI estimates `hours` from category template (Section B) and clarification details
- `labor_rate_per_hour` comes from the quote (which inherits from `companies.default_labor_rate_per_hour`)
- Margin % is NOT applied to labor line items in this mode
- Material line items still apply `default_material_margin %` as usual

**AI output format example:**
```json
{
  "item_type": "labor",
  "description": "Panel swap — full removal and reinstall, transfer circuits, testing",
  "quantity": 8,
  "unit": "hr",
  "unit_cost": 95.00,
  "billable_price": 760.00
}
```

### E.2 Mode: Margin on Cost (`labor_mode = 'margin_on_cost'`)

- This is the existing behavior. AI estimates a `unit_cost` (the contractor's raw hourly cost, e.g., wholesale labor)
- System applies `default_labor_margin %` to compute `billable_price`
- This is the safe migration default — matches what the app does today

**AI output format example:**
```json
{
  "item_type": "labor",
  "description": "Panel swap — full removal and reinstall, transfer circuits, testing",
  "quantity": 8,
  "unit": "hr",
  "unit_cost": 75.00,
  "billable_price": 90.00 // after 20% margin
}
```

### E.3 Mode: Flat Fee (`labor_mode = 'flat_fee'`)

- AI outputs a single dollar amount per labor line item, no rate × hours math
- `quantity = 1`, `unit = "task"`, `unit_cost = billable_price = the flat fee`
- AI pulls flat-fee estimates from regional norms (typical residential service work in the customer's zip)

**AI output format example:**
```json
{
  "item_type": "labor",
  "description": "Panel swap (full job) — labor",
  "quantity": 1,
  "unit": "task",
  "unit_cost": 1200.00,
  "billable_price": 1200.00
}
```

### E.4 Materials Pricing (all modes)

Materials line items are unaffected by `labor_mode`. Pricing flow:

1. Check uploaded price list (NOT WIRED YET — Phase 2)
2. Check historical job data (NOT WIRED YET — Phase 2)
3. AI estimate based on national averages adjusted for `companies.zip_code`
4. System applies `default_material_margin %` (typically 30%)

### E.5 Permit Fees (all modes)

Permit fees are pass-through cost — NO margin applied. Line item should be flagged so the system doesn't accidentally mark it up.

```json
{
  "item_type": "material",
  "category": "Permit & Inspection",
  "description": "City permit + electrical inspection",
  "quantity": 1,
  "unit": "ea",
  "unit_cost": 150.00,
  "billable_price": 150.00, // no margin
  "is_passthrough": true
}
```

*(Note: `is_passthrough` is a future field; for now, just don't markup permit lines.)*

---

## Section F — Confidence Rules

Every line item gets a confidence flag: `high`, `medium`, or `low`. The flag is shown to the owner (amber background, "AI Estimate" label) so they know which items need their eyeball.

### F.1 Flag `low` when

- Service entrance conductor length is unknown (impacts ampacity and material cost)
- AHJ permit requirements unknown
- Existing panel condition unknown (or red-flag brand suspected: Federal Pacific, Zinsco, Pushmatic, ITE Pushmatic)
- Available breaker space unknown
- Wall / ceiling material unknown when work requires fishing or concealing wire
- Outdoor vs. indoor location not specified when it affects materials (NM-B vs. THWN, weatherproof vs. standard)
- Wire-run length unknown beyond a 10-foot bound
- Number of branch circuits in scope is ambiguous

### F.2 Flag `medium` when

- General job type is clear but specific specs not given (e.g., breaker brand, fixture type, receptacle style)
- Quantity is approximate ("a few outlets" → AI assumes 4–6)
- Regional pricing in the customer's zip has limited recent comparables

### F.3 Flag `high` when

- All specs are given and standard
- Job type matches a category template (Section B) and clarification filled in all gaps
- Quantities are explicit
- Materials are standard residential (NM-B, common breaker brands, standard fixtures)

### F.4 Aggregate confidence

If any line item is `low`, the overall quote should display a banner: "This quote includes one or more low-confidence estimates. Review the highlighted items carefully before sending."

---

## Section G — Friend's Profile

> **Fill in before pre-seeding his demo account.** This section is the AI's context about WHO is using the tool — used to bias regional pricing, vocabulary, and example line items.

- **Friend's name:** _[TBD — fill before demo]_
- **Region / metro:** _[TBD]_
- **Zip code:** _[TBD — critical for regional pricing]_
- **License jurisdiction:** _[TBD — e.g., CA C-10, TX Master Electrician, etc.]_
- **Years in the trade:** _[TBD]_
- **Typical labor rate:** _[TBD] $/hr (only used when `labor_mode = 'hourly'`)_
- **Preferred labor pricing mode:** _[TBD — `hourly`, `margin_on_cost`, or `flat_fee`]_
- **Typical job mix:** _[TBD — e.g., "60% panel upgrades and EV chargers, 30% troubleshooting and outlet work, 10% other"]_
- **Quoting style preferences:** _[TBD — e.g., "groups line items by room", "lists labor and materials separately per item"]_
- **Common pitfalls in his work to flag:** _[TBD — e.g., "always trace existing K&T before quoting partial rewires"]_
- **Anything to avoid in the AI's tone:** _[TBD — e.g., "doesn't like NEC name-dropping when it's not necessary"]_

---

## How to iterate on this document

When the friend gives feedback:

1. **Section A** — add new example estimates if he provides them (anonymized)
2. **Section B** — add or refine category templates (his job mix may reveal categories we missed, e.g., "panel relocate" or "service mast repair")
3. **Section C** — fold in vocabulary he uses (or corrects). His regional slang may matter
4. **Section D** — add code triggers he catches that we missed
5. **Section E** — adjust pricing framework if he prefers a mode we haven't modeled
6. **Section F** — sharpen confidence rules based on his "this should have been flagged" calls
7. **Section G** — update with everything he tells us about his work

After editing this document, re-sync the AI prompts in `lib/prompts/` to embed the latest content. Commit the doc + prompt changes together so the source-of-truth and the consumers move in lockstep.
