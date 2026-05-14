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
- New meter base (size matches new service; ringless vs. ring-type per utility — PG&E typically ringless)
- New service entrance conductors (SE cable, or SER for combined, or individual XHHW in conduit) — length depends on weatherhead-to-meter-to-panel run; 4/0 AL or 2/0 CU is typical for 200A residential
- New weatherhead (or replacement of mast/riser if damaged)
- Grounding electrode system: bond to ufer (concrete-encased electrode) if accessible AND two 5/8" × 8' ground rods spaced ≥6 ft apart per NEC 250.50/250.52 (most AHJs require BOTH if ufer is present and not just one or the other)
- Grounding electrode conductor (GEC): 4 AWG CU typical for 200A service to rods (NEC 250.66); larger if bonded to ufer or interior water pipe
- Main bonding jumper (factory in most panels, but verify; required per NEC 250.28)
- Bonding of interior metal water piping (NEC 250.104(A)) — sized per Table 250.102(C)(1); connection within 5 ft of point of entry on a city water system
- Bonding of metallic gas piping (NEC 250.104(B)) — typically picked up by EGC of the circuit feeding gas-fired equipment; for CSST flexible gas, a dedicated bonding jumper sized per CSST manufacturer (often #6 AWG) is commonly required by the gas product listing
- **Whole-house surge protective device (Type 1 or Type 2 SPD)** — NEC 230.67 (added 2020 cycle) requires an SPD on services supplying dwelling units; this is now part of every code-compliant new panel install and is a frequent miss in older quote templates
- Branch-circuit breakers to match existing circuits, with AFCI / GFCI / dual-function breakers as required by NEC 210.8 and 210.12 for the rooms each circuit serves (this can substantially change material cost — AFCI/DF breakers are ~$45–60 each vs ~$8–10 for a standard 1-pole)
- Panel directory / circuit labels (often forgotten on the quote; mandatory per NEC 408.4)
- Coordination with utility (e.g., PG&E for shutoff/reconnect) — usually no cost but scheduling required; note in Terms
- Permit fee (separate line, pass-through)
- Inspection (usually included in permit fee or separate fee from AHJ)
- Load calculation per NEC 220.83 (existing dwelling) when adding loads as part of the upgrade (EV, HVAC, etc.) — should be documented even if not a line item
- Labor: typical 6–10 hours for a 200A residential panel swap (varies with conduit, service-entrance complexity, transfer count, exterior vs. interior panel location)

Red-flag panels that should be auto-mentioned by the clarification chat if customer has them: **Federal Pacific Stab-Lok**, **Zinsco**, **Pushmatic**, **Challenger**, **early ITE/Bulldog Pushmatic** — known fire / failure-to-trip hazards, replacement strongly recommended.

**Pitfalls to flag in clarification:**
- Is the existing panel interior or exterior? Exterior panels usually need a rain-tight (NEMA 3R) replacement.
- Is the existing service overhead or underground (lateral)? Underground service work may involve the utility's service lateral, conduit, and trenching — sometimes the utility owns the lateral, sometimes the homeowner.
- Is the mast/riser in good condition, or does it need replacement? A bent or rusted mast adds material and labor.
- Are any sub-feeds from the existing panel feeding subpanels that need to be re-terminated?
- Is the existing grounding electrode system known and accessible? If not, plan for ground rods at minimum.

### B.2 Subpanel Install (separate structure or remote location)

**Required line items:**

- Subpanel enclosure + main breaker or main lugs (sized to feeder; main-breaker subpanel preferred where it serves as the disconnect at a separate structure)
- Feeder breaker in main panel (2-pole, sized to subpanel ampacity)
- Feeder conductors: **4-wire (two hots + neutral + EGC)** — NEVER 3-wire for a separate structure (NEC 2008+ change). Common sizes: 6/3 NM-B + ground for 60A; 4/3 NM-B + ground for 100A (if run length permits ampacity); 2/3 SER for 100A on longer runs
- Conduit (PVC Sch 40 for underground typical; PVC Sch 80 where subject to physical damage; EMT or RMC above-ground per AHJ)
- Trenching if underground — minimum 18" depth for PVC Sch 40 in residential per NEC 300.5; deeper if under driveways
- **Grounding electrode at the separate structure** (NEC 250.32(A)): ground rod (typically two 5/8" × 8' driven ≥6 ft apart) bonded to the subpanel's EGC bus — NOT to neutral
- **Neutral and ground bus ISOLATED at the subpanel** (neutral floats; ground is bonded to enclosure) — this is the #1 mistake on subpanel installs. The main-bonding jumper that's required at the service is PROHIBITED at downstream panels.
- **Exception (NEC 250.32(A) Exception):** if the separate structure is fed by only a single branch circuit (individual or multiwire) with an EGC, no separate grounding electrode is required at the structure
- Branch breakers per loads served
- Load calculation per NEC 220 (whichever applies — usually 220.83 for existing dwellings adding loads)
- Permit + inspection
- Labor: 4–10 hours depending on run length and trenching; longer for trenching through hardscape

### B.3 EV Charger Install (Level 2 — 240V)

- Dedicated 2-pole breaker (typically 40A or 50A; size per charger spec + 125% continuous-load rule, NEC 625.42)
- Conductors sized to circuit AND voltage-drop / length (typical: 6 AWG CU for a 50A circuit; bump to 4 AWG CU on long runs or 6 AWG AL is generally insufficient — verify ampacity table 310.16)
- GFCI protection: REQUIRED for any NEMA 14-50 (or other receptacle) outlet feeding an EVSE per NEC 210.8(A) (kitchen/laundry/garage/outdoor receptacle rules apply) — hardwired EVSEs typically have internal GFCI/CCID20 and do NOT require external GFCI on the branch circuit. A breaker-style GFCI plus an EVSE with internal GFCI can cause nuisance tripping; many electricians prefer to hardwire to avoid this.
- Receptacle (NEMA 14-50 most common — must be a commercial/spec-grade receptacle for continuous EV use; cheap residential 14-50s overheat) OR hardwire to charger unit
- Weatherproof in-use cover if outdoor mount (NEC 406.9(B))
- Disconnect within sight if EVSE is rated >60A or >150V to ground (NEC 625.43); for typical 40A/50A residential EVSE, the branch-circuit breaker that's "within sight or lockable" generally satisfies this
- Cable/conduit per run path (indoor open-joist = NM-B is fine; concealed in finished walls = check AHJ; outdoor / wet location = THWN-2 in conduit — NM-B is NOT permitted in wet or damp locations per NEC 334.12(B))
- Permit + inspection (most jurisdictions require permit for any new 240V circuit)
- Load calculation per NEC 220.83 — verify the existing service has capacity before quoting. If it doesn't, the customer needs a panel upgrade OR an EVSE with load-management (EnergyStar EV Load Management Systems / "smart" splitters) to share an existing circuit
- Labor: 3–6 hours typical install (longer if fishing through finished walls, going through attic, or trenching outside to a detached garage)

**Note:** the customer typically supplies the charger unit itself. Confirm during clarification. Common units to ask about: Tesla Wall Connector (hardwired), ChargePoint Home Flex, Emporia, Wallbox Pulsar Plus, JuiceBox.

### B.4 Service Call / Troubleshooting

This is the most variable category — output structure depends on what's found. Baseline approach:

**Pricing structure (most residential service electricians use this model):**

- **Trip charge / dispatch fee** — fixed dollar amount that covers travel and the first 30 min on-site (typical range $89–$149 in most metros; higher in HCOL areas). This is non-refundable whether or not work is performed.
- **Diagnostic hour(s)** — minimum 1 hr labor at posted hourly rate AFTER trip charge consumed; commonly capped at 1–2 hr before "pause and confirm" with the customer on next steps
- **Repair scope** — quoted separately once the fault is identified, OR rolled into the same invoice if it's a quick fix (e.g., single device replacement)
- Some shops use a flat-rate book (pricing-per-task model) instead of T&M — the AI should clarify which model the contractor uses in `labor_mode` (Section E)

**Common residential troubleshooting patterns:**

| Symptom | Most likely causes |
|---|---|
| No power to a single outlet | Tripped GFCI upstream feeding that outlet (LINE/LOAD); broken back-stab connection; loose neutral; open breaker; failed device |
| Lights flickering throughout house | Loose neutral at panel/meter (HAZARD — escalate); utility-side issue; loose service connection |
| Lights flickering in one room | Loose neutral in that branch circuit; failing dimmer; bad bulb/driver in LED retrofit |
| Breaker tripping repeatedly | Overload (sum of loads > breaker rating); short to ground (insulation failure); short between conductors; failing breaker itself; downstream AFCI/GFCI condition |
| GFCI nuisance trips | Moisture intrusion (outdoor receptacles); shared neutral on multi-wire branch circuit; downstream LED driver with high leakage current; failing GFCI itself |
| AFCI nuisance trips | Older AFCI breakers with vacuum cleaners, treadmills, drills; failing AFCI; legitimate arc fault — investigate before defeating |
| Burning smell at panel | Loose lug, failing breaker, melted bus — STOP, kill power at utility if accessible, do not power back up until corrected (safety escalation) |
| Half the house dead | Lost a hot leg — loose connection at meter, weatherhead, or service-entrance lug; failed main breaker pole; utility-side issue with one of the two legs |

**Diagnostic equipment baseline (every service truck should have):**

- Digital multimeter (DMM) — voltage, continuity, resistance
- Non-contact voltage tester (NCVT) — quick presence check
- Plug-in receptacle tester (with GFCI test button) — wiring polarity, ground continuity, GFCI function
- Clamp ammeter — measure load current on live conductors without disconnecting
- Insulation resistance tester (megohmmeter / "megger") — for old wiring, K&T, or insulation integrity checks; typically 500V or 1000V test
- Thermal camera (optional but valuable) — find hot spots at lugs, breakers, splices
- Tone-and-probe set — trace circuits in unmarked panels

**Permits / scope notes:**
- No permit usually needed for repair-in-place (replace failed breaker, replace failed device, repair splice in existing box)
- Permit IS needed if the repair extends to new circuits, a new panel, or any service-entrance modification
- If you don't know what caused the fault, do NOT close out the call — document, photograph, and follow up

Confidence: should default to `medium` or `low` until clarification narrows the actual fault.

### B.5 Kitchen Rewire / Electrical Renovation

Baseline items for typical kitchen electrical update (matches EST-2025-003):

**Required circuits (NEC 210.52(B), 210.11(C)(1)):**

- **Minimum 2 dedicated 20A small-appliance branch circuits** serving all wall, floor, and countertop receptacles in the kitchen, pantry, breakfast room, and dining room. These circuits serve receptacles only — no lighting, no fan loads.
- **Refrigerator:** can share a small-appliance circuit OR be on its own dedicated 15A or 20A circuit (NEC 210.52(B)(1) Exception No. 2). Most contractors install a dedicated 20A on a separate circuit so a kitchen-circuit trip doesn't kill the fridge.
- **Dishwasher:** typically dedicated 15A or 20A circuit (check appliance nameplate); NEC 422.16(B)(2) governs cord-and-plug connection
- **Disposal:** typically dedicated 15A or 20A circuit; NEC 422.16(B)(1) governs cord-and-plug connection. Some local AHJs and installers combine dishwasher + disposal on a shared 20A circuit with two receptacles under the sink — verify the combined load against the breaker rating and AHJ
- **Microwave (over-range or built-in):** dedicated 20A circuit per most manufacturer instructions and per NEC 210.23(A) when nameplate >50% of circuit rating
- **Range / cooktop / wall oven:** dedicated 40A or 50A 240V circuit; 4-wire (NEC 250.140) — 8/3 NM-B w/ ground for 40A, 6/3 NM-B w/ ground for 50A. Larger cooktops and double ovens may need 50A or larger — verify nameplate.
- **Under-cabinet / accent lighting:** typically tied into the room's general lighting circuit OR a dedicated 15A circuit if extensive LED tape installation

**Countertop receptacle placement (NEC 210.52(C)):**

- No point along the countertop wall line can be more than 24" from a receptacle (effectively: maximum 48" between receptacles along a continuous run)
- Receptacles must be installed at any wall countertop space 12" or wider
- Maximum height above the countertop: 20" (NEC 210.52(C)(5))
- **Island / peninsula countertops (NEC 2023 change):** receptacles on islands and peninsulas are now OPTIONAL. If omitted, the installation must include provisions for future receptacle installation — typically a junction box with a blank cover labeled "for future receptacle." This is a meaningful change for kitchen quotes; clarify with the customer whether they want island outlets or just the future-rough provision.

**Protection requirements:**

- GFCI on all receptacles serving countertop surfaces (NEC 210.8(A)(6))
- GFCI on any receptacle within 6 ft of a sink (NEC 210.8(A)(7)) — including refrigerator if positioned close to sink
- AFCI on most 15A and 20A kitchen branch circuits (NEC 210.12); dual-function AFCI/GFCI common
- NEC 2023: GFCI protection expanded to dishwashers and ranges under 210.8(D)/(F) `[verify with AHJ — adoption varies]`
- Tamper-resistant receptacles in dwelling units (NEC 406.12)

**Lighting:**

- General room lighting on a 15A or 20A circuit separate from the small-appliance circuits
- Under-cabinet lighting: low-voltage LED tape or 120V hardwired strips; clarify with customer
- Recessed lighting rough-in + finish (homeowner often supplies fixtures — confirm); IC-rated REQUIRED if ceiling is insulated
- Switching: single-pole, 3-way for room with two entry points, dimmers per request

**Materials:**

- 12/2 NM-B w/ ground for 20A circuits, 14/2 for 15A circuits (residential typical)
- 8/3 or 6/3 NM-B w/ ground for range circuit; 10/3 for dryer (if relocating)
- Box fill calculations per NEC 314.16 — verify boxes are deep enough for the device count + conductor count
- Wire nuts, staples, box extensions, cover plates (misc lot line)

**Other:**

- Permit + inspection if new circuits added
- Labor: highly variable — 4–16 hours depending on scope; full kitchen rewire with new circuits, panel reconfiguration, and finish work can exceed 30 hours

### B.6 Bath Rewire / Bathroom Electrical Update

Similar pattern to kitchen but smaller scope:

- **Dedicated 20A circuit for receptacles** (NEC 210.11(C)(3)): this circuit serves bathroom receptacles only OR serves only ONE bathroom's receptacles + that bathroom's lighting/fan (NEC 210.11(C)(3) Exception). It cannot serve more than one bathroom's loads AND lighting.
- **GFCI on all bathroom receptacles** (NEC 210.8(A)(1))
- **AFCI per NEC 210.12** in dwelling units — combination AFCI/GFCI (dual-function) is the common single-device solution
- **Lighting circuit:** can share with the bathroom dedicated 20A under NEC 210.11(C)(3) Exception (single bathroom) OR be on the general lighting circuit (often shared with hall). Verify AHJ interpretation.
- **Vanity light fixtures:** must be damp-rated if positioned where they could be splashed; UL listing for damp/wet locations matters
- **Bath fan + switch:** if fan only (no heater) and <1A, can share lighting circuit; if fan/light combo, same; if fan/heat or fan/heat/light combo, treat as a fixed appliance — likely a dedicated 20A circuit `[verify against fan nameplate]`
- **Recessed lighting over tub/shower:** must be rated for damp or wet location (depending on installation height and zone per NEC 410.10(D))
- **Zone restrictions over tub/shower (NEC 410.10(D)):** no luminaires with cord-and-plug, no luminaires within 3 ft horizontally and 8 ft vertically of the bathtub rim or shower threshold unless listed for damp/wet location; no track lighting in the tub/shower zone
- **Tamper-resistant receptacles** (NEC 406.12)
- 12/2 NM-B for the 20A receptacle circuit; 14/2 for any 15A lighting tie-in
- Permit if new circuits added

### B.7 GFCI / AFCI Update (no rewiring)

NEC 406.4(D) allows replacing ungrounded 2-prong outlets with GFCI outlets without rewiring; each must be labeled "GFCI Protected / No Equipment Ground" AND "No Equipment Ground." This is a common job — common enough that it's worth a careful site walk before quoting.

**Feed-through (LINE/LOAD) wiring strategy (saves money on multi-receptacle locations):**

A single GFCI receptacle can protect downstream receptacles on the same circuit by connecting them to the GFCI's LOAD terminals. This means the contractor installs ONE GFCI device per circuit (typically at the first receptacle on the run) and standard receptacles at all downstream locations. Each downstream receptacle gets a "GFCI Protected" label.

When this saves money:
- Multiple required-GFCI receptacles share a circuit AND the wiring sequence is known (e.g., a string of garage outlets where you can identify the first one in the run)
- Outdoor receptacles fed from inside the house — install the GFCI at the indoor end, run regular receptacles outside (still need WR + in-use covers outside per NEC 406.9)

When one-per-location is necessary:
- Wiring is unknown / unmapped — can't reliably identify the first receptacle in the run
- Customer wants visible GFCI test/reset at each location
- Mixed loads where a single GFCI trip would kill too much (e.g., refrigerator on same run)

**Replacement-only rules (NEC 406.4(D) + 406.12):**

- **Grounding-type required where the box has an EGC:** if a 3-wire (with EGC) is present in the box, the replacement must be a grounding-type receptacle properly bonded to the EGC
- **Non-grounding 2-prong replacement allowed where NO EGC exists** (older K&T or 2-wire NM): replacement options are (a) non-grounding receptacle, (b) GFCI labeled "No Equipment Ground," or (c) grounding-type downstream of a GFCI labeled "GFCI Protected" + "No Equipment Ground"
- **Tamper-resistant required (NEC 406.4(D)(5))** — when replacing any receptacle in a TR-required location (NEC 406.12), the replacement must be TR. Exemption: a non-grounding receptacle is allowed to be non-TR ONLY when no replacement TR non-grounding is available `[verify — most distributors stock TR non-grounding receptacles now]`
- **Weather-resistant (WR) required outdoors (NEC 406.9(A))**

**Outdoor receptacle considerations:**

- NEC 210.52(E)(1) requires at least one receptacle at the front AND back of every one-family / two-family dwelling, readily accessible from grade, not more than 6½ ft above grade
- If a customer's current outdoor receptacles violate this (e.g., one missing, or current ones are unreachable behind landscaping), this is a code-driven add-on worth flagging
- All outdoor receptacles need WR + GFCI + in-use covers (NEC 406.9(B))

**Baseline line items:**

- GFCI outlets per LINE/LOAD strategy chosen
- Standard outlet + faceplate replacements for downstream locations
- WR + TR outlets where applicable
- Outdoor in-use covers (NEC 406.9(B))
- "GFCI Protected" labels at every downstream receptacle
- Misc materials (wire nuts, faceplates, labels)
- Typically NO permit required (straight outlet replacement)
- Labor: ~30 min per receptacle for straightforward swap; longer for fishing new circuits to outdoor locations or for verifying line/load runs in unmapped wiring

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
| NM-B | "Romex" (in formal scope) | "Romex" is a Southwire trademark; some AHJs and inspectors prefer the generic "NM-B" in scope documents and permit paperwork |
| Receptacle | "Plug" or "outlet" (in formal scope) | "Outlet" is technically a point in wiring where current is taken to supply equipment; "receptacle" is the device |
| Panel | "Fuse box" or "breaker box" | Modern term; "panel" or "panelboard" |
| Main service disconnect | "Main breaker" or "shutoff" (in formal scope) | "Service disconnect" is the NEC term in NEC 230.70 and applies regardless of whether it's a breaker, fused switch, or molded-case switch |
| Service entrance | "Power feed" | Specific technical meaning |
| Service drop | "Overhead line" | NEC-specific: the utility-owned overhead conductors from the pole to the weatherhead |
| Service lateral | "Underground feed" or "buried service" | NEC-specific: the utility-owned underground conductors from the transformer to the meter |
| Service conductors | "Main wires" | The customer-owned conductors from the point of utility attachment through the meter to the service disconnect |
| 120/240V split-phase | "220V" or "single-phase 240" | Residential US service is split-phase 120/240V (two hots 180° out of phase plus neutral), not 220V. Spec sheets and quotes should reflect this |
| Branch circuit | "Wire run" (when discussing protection) | A branch circuit is conductors + protective device |
| Grounding electrode system (GES) | "Ground rod" (when discussing the system) | The GES includes rod(s), ufer (concrete-encased electrode), bonded metallic water pipe, building steel, etc. |
| Equipment grounding conductor (EGC) | "Ground wire" | EGC has a specific code role and sizing rule (NEC 250.122) |
| Grounded conductor | "Neutral" (when precision matters) | "Neutral" is colloquial; "grounded conductor" is NEC term (and the two aren't always the same — corner-grounded delta systems have a grounded ungrounded conductor) |
| Ungrounded conductor | "Hot" or "live" (when precision matters) | "Hot" is colloquial; NEC uses "ungrounded conductor" |
| Authority Having Jurisdiction (AHJ) | "Inspector" or "the city" | AHJ is the umbrella term; may be city, county, state, or utility |
| Ampacity | "Amps" (loosely) | Ampacity = current-carrying capacity at given conditions |
| Continuous load | "Load that runs a long time" | NEC term (3+ hours), triggers 125% derate for conductor and OCPD sizing |
| In-use cover | "Weatherproof cover" (for outdoor receptacles) | "In-use" covers protect cord-in-plug condition; damp-location covers don't |
| Tamper-resistant (TR) | "Child-safe outlet" | TR is the NEC term |
| Weather-resistant (WR) | "Outdoor outlet" | WR receptacles are required outdoors (NEC 406.9(A)); they're WR, not just GFCI |
| Listed | "Approved" | "Listed" by NRTL (UL, ETL, CSA) — specific meaning |
| EVSE | "EV charger" (when precision matters) | Technically the wall unit is "Electric Vehicle Supply Equipment" (EVSE); "charger" is inside the car. In customer-facing scope, "EV charger" is fine; in permit/inspection paperwork, "EVSE" is preferred |
| Knockout (KO) | "Hole" or "punch-out" | Standard trade term for the removable disc in a panel/box |
| EMT | "Conduit" (when type matters) | EMT = Electrical Metallic Tubing (thin-wall steel); be specific because rigid (RMC) and IMC have different cost, weight, fittings, and bending tools |
| Rigid metal conduit (RMC) | "Rigid" (without context) | Heavy-wall threaded steel; used in wet, exposed-to-damage, or service-entrance applications |
| IMC | "EMT" or "rigid" (when wrong) | Intermediate Metal Conduit — thinner than RMC but threadable; cheaper than RMC, sturdier than EMT |
| PVC schedule 40 / 80 | "Plastic conduit" | Sch 40 for general underground; Sch 80 for exposed-to-damage. Use the schedule number in scope |
| Rough-in | "Wiring" (when before drywall) | The rough-in stage is boxes + cable runs before drywall, prior to rough inspection |
| Trim-out (or "trim") | "Finish work" | The trim-out stage is installing devices, fixtures, cover plates after drywall and paint, prior to final inspection |
| Pull (a wire pull) | "Run wire" | Specific to running conductors through conduit |
| Make-up (box make-up) | "Wire it up" | Specific to terminating conductors at a box |
| GES (grounding electrode system) | "Ground" | The whole system: rods + ufer + bonded water pipe + bonding jumpers + GEC |

### C.2 Reference codes correctly

When citing NEC sections, use the format: **NEC [year] Article.Section** — e.g., "NEC 2023 210.8(A)(1)" for bathroom GFCI. Don't paraphrase code requirements without citation; quote or reference the article.

When discussing local rules, use **AHJ** — never assume the customer's jurisdiction enforces NEC verbatim; many jurisdictions have local amendments.

### C.2a Regional variation in vocabulary

Trade terminology varies by region. Don't "correct" an electrician using their regional term; instead, match what they use:

- **"Service disconnect"** is the NEC term; some Western and Southern regions colloquially use **"main disconnect"** or **"main shutoff"**. The Northeast tends to say **"service switch."**
- **"Romex"** vs **"NM-B"** — both are universal; AHJ paperwork tends to favor NM-B
- **"Mast"** vs **"riser"** — for the service entrance pipe from the roof to the weatherhead. Both common; "mast" more common in the Western US, "riser" more common in the Northeast
- **"Whip"** is universal for a short flexible-conduit appliance connection
- **"Pigtail"** — universally means a short conductor extending from a splice to a device; in some regions also refers to a flexible cord with a plug used to power-test equipment
- **"Three-way switch"** (US) = **"two-way switch"** (UK); we always use the US convention
- **"Service drop"** (overhead) vs **"service lateral"** (underground) — NEC distinguishes; some regions colloquially use "drop" for both
- **"Ufer"** (UFER, Frank Ufer's electrode) = concrete-encased electrode (CEE) — the NEC term is CEE, but "ufer" is universal in the field
- **California (Title 24)** adds layered energy-code requirements on top of NEC for lighting and HVAC controls. AHJs in CA enforce both. Quotes for CA jobs should reference Title 24 where applicable
- **Chicago / Cook County IL** has historic local amendments requiring conduit (EMT) for all branch circuits in dwellings — NM-B is prohibited. Quotes for Chicago need to budget for conduit material and labor on every run, which materially changes pricing

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
- [ ] Grounding electrode system (ufer AND ground rod[s] — most AHJs require both if ufer is present and accessible)
- [ ] Grounding electrode conductor (GEC) sized per NEC 250.66
- [ ] Bonding (water pipe within 5 ft of entry if metallic, NEC 250.104(A); gas line per NEC 250.104(B); CSST flexible gas line gets a dedicated bond per its listing — typically #6 AWG)
- [ ] Whole-house SPD (Type 1 or Type 2) per NEC 230.67 — REQUIRED on all services supplying dwelling units in NEC 2020 cycle and forward; this is the most-missed line item on legacy quote templates
- [ ] AFCI / GFCI / dual-function breakers per the rooms each circuit serves (NEC 210.8 + 210.12) — substantial material-cost line vs. plain breakers
- [ ] Panel directory / circuit labels (NEC 408.4) — mandatory
- [ ] Load calculation per NEC 220.83 when adding loads (EV, HVAC, etc.) — documented even if not a separate line item
- [ ] Permit
- [ ] Inspection
- [ ] Branch breakers (count + sizes from existing or new)
- [ ] Coordination with utility (no cost line but a scheduling line in Terms section)

### D.2 Whole-House Surge Protection (NEC 230.67)

**Universal residential trigger added in NEC 2020 and retained in 2023.** All services supplying dwelling units must include a Type 1 or Type 2 SPD as an integral part of the service equipment or located immediately adjacent. This applies to:

- Single-family dwellings
- Two-family and multi-family dwellings
- Dormitory units
- Guest rooms / guest suites of hotels and motels
- Patient sleeping rooms in nursing homes and limited-care facilities

Practically: every new panel install, every service upgrade, and every panel replacement should include a whole-house SPD as a line item. Quotes that omit it will fail inspection in AHJs enforcing NEC 2020 or 2023.

### D.3 GFCI Required Locations (NEC 2023 210.8(A))

GFCI protection required for 125V single-phase 15A and 20A receptacles in:

- Bathrooms — (A)(1)
- Garages and accessory buildings — (A)(2)
- Outdoors — (A)(3)
- Crawl spaces at or below grade — (A)(4)
- Unfinished basements — (A)(5)
- Kitchens, receptacles serving countertop surfaces — (A)(6)
- Within 6 ft of sinks (any sink) — (A)(7)
- Boathouses — (A)(8)
- Bathtubs / shower stalls — (A)(9)
- Laundry areas — (A)(10)
- Indoor damp / wet locations — (A)(11)

NEC 2023 also extended GFCI requirements for dwelling-unit appliances (e.g., dishwashers, ranges) under 210.8(D) and (F) — `[verify with AHJ]`, since adoption of these expansions varies.

### D.4 AFCI Required Locations (NEC 2023 210.12)

AFCI protection required for all 15A and 20A 120V branch circuits supplying outlets or devices in: kitchens, family rooms, dining rooms, living rooms, parlors, libraries, dens, bedrooms, sunrooms, recreation rooms, closets, hallways, laundry areas, similar rooms. Effectively: nearly all habitable rooms.

**Combination AFCI/GFCI** ("dual-function") covers both requirements with one device — common in kitchens and laundry where both protections are needed.

### D.5 Tamper-Resistant Receptacles (NEC 406.12)

TR required in dwelling units for nearly all 125V, 15A and 20A receptacles. Exceptions include:

- Receptacles located more than 5½ ft above the floor
- Receptacles part of a luminaire or appliance
- Single receptacles or duplex receptacles for two appliances located in a dedicated space (e.g., behind a refrigerator) where the appliance is not easily moved
- Non-grounding receptacles used for replacement under NEC 406.4(D)(2)(a)

**Replacement rule:** when replacing any receptacle in a TR-required location, the replacement must also be TR (NEC 406.4(D)(5)). This means a $0.50 outlet swap turns into a TR outlet swap whether the customer asks or not.

### D.6 Working Space Around Panels (NEC 110.26)

- Width: minimum 30" or width of equipment, whichever is greater
- Depth: 36" (for 0–150V to ground), 42" (151–600V to ground)
- Height: 6'6" or height of equipment, whichever is greater

Workshops, storage rooms, etc. that crowd panel access can fail inspection. **NEC 2023 also extended 110.26 working-space requirements to HVAC disconnects under 440.14** — a disconnect crammed behind a condenser will fail inspection in NEC 2023 AHJs.

### D.7 IC-Rated Recessed Fixtures

If recessed lights are installed in an insulated ceiling, fixtures MUST be IC-rated (Insulation Contact). Non-IC fixtures require insulation to be kept clear, which often isn't practical. For NEC 2023 jobs, also confirm Title 24 (CA) or equivalent energy-code requirements for residential lighting efficacy.

### D.8 Smoke / CO Detector Placement and Interconnect

In new construction and significant remodels, smoke detectors must be hardwired AND interconnected so all sound when one triggers (IRC + NEC). Required placement (IRC R314 / R315; verify against local building code):

- One smoke detector inside every sleeping room (each bedroom)
- One smoke detector outside each separate sleeping area, in the immediate vicinity (typically in the hallway)
- One smoke detector on every level of the dwelling, including basements and habitable attics (but not crawl spaces or uninhabitable attics)
- One CO detector outside each separate sleeping area, in the immediate vicinity (combo smoke/CO units satisfy both)
- One CO detector on every level of dwellings with fuel-burning appliances or attached garages

14/3 NM-B is standard for the interconnect leg. CO detectors should be combined-unit or co-located near sleeping areas.

### D.9 Continuous Load Sizing

Per NEC 210.19 and 215.2, branch-circuit and feeder conductors must be sized at 125% of continuous load (a load operating for 3 hours or more). EV chargers are the classic residential continuous load — a 40A continuous load requires a 50A circuit (40A × 1.25 = 50A). NEC 625.42 specifically calls this out for EVSE.

### D.10 Outdoor / Wet Location Wiring

- Conductors in wet locations must be wet-rated (THWN-2; THHN-2 dual-rated also acceptable; plain THHN is not)
- Boxes in wet locations must be NEMA 3R or better
- Receptacles in wet locations need in-use covers (per NEC 406.9(B)); damp-location covers are not enough for outdoor receptacles where a cord may be plugged in continuously
- NM-B (Romex) is NOT permitted in wet OR damp locations (NEC 334.12(B)) — use THWN-2 in conduit
- Required outdoor receptacles at one-family and two-family dwellings (NEC 210.52(E)(1)): at least one readily accessible from grade at the front AND back of the dwelling, not more than 6½ ft above grade
- Balconies / decks / porches accessible from inside the dwelling require at least one receptacle within the perimeter, not more than 6½ ft above the surface (NEC 210.52(E)(3))

### D.11 Bonding for Pools, Spas, Hot Tubs (NEC 680)

- Equipotential bonding grid around perimeter of pool / spa: #8 AWG solid copper, bonded to all metallic parts (NEC 680.26)
- All metal within 5 ft of water bonded
- GFCI protection on all spa/pool circuits per NEC 680 (some exceptions for specific equipment)
- Disconnect within sight, 5–10 ft from water (NEC 680.12)

### D.12 Water Heater, Pool Pump, and Other Dedicated-Appliance Bonding

- Electric water heaters: bonded via the EGC of the dedicated 240V circuit; no separate bonding jumper required in most installations (the EGC handles it). For continuous-use applications, treat as a continuous load (125% sizing) — NEC 422.13 calls out water heaters of 120 gal or less as continuous loads.
- Pool pumps / spa pumps: bonded to the equipotential grid per NEC 680.26; GFCI per NEC 680
- Disposals and dishwashers: bonded via EGC; if cord-and-plug connected, the cord must terminate in a grounding-type attachment plug (NEC 422.16)

### D.13 Dishwasher and Disposal Connection Rules (NEC 422.16 + 422.31)

- **Dishwasher (built-in):** cord-and-plug connection is permitted with manufacturer-supplied flexible cord 3 ft to 6½ ft long terminating in a grounding-type plug; receptacle must be located in the space adjacent to the dishwasher space (typically under the sink), not in the dishwasher space itself (NEC 422.16(B)(2))
- **Disposal:** cord-and-plug connection is permitted with manufacturer-supplied flexible cord 18" to 36" long terminating in a grounding-type plug; receptacle accessible (NEC 422.16(B)(1))
- **Disconnect requirement:** NEC 422.31 requires a disconnecting means for permanently connected appliances. For dishwashers and disposals, the receptacle itself satisfies this if cord-and-plug connected; if hardwired, an in-sight switch or breaker lock-off is required. GFCI protection per NEC 210.8 typically already applies.
- **GFCI:** NEC 2023 expanded 210.8 GFCI protection to dishwashers in dwelling units `[verify with AHJ — adoption varies]`

### D.14 4-Wire Range and Dryer Circuits (NEC 250.140)

For new range and dryer circuits, **4-wire (two hots + neutral + EGC) is required**. The legacy 3-wire range/dryer cord that used the neutral as the EGC was disallowed in NEC 1996. Existing 3-wire circuits in older homes are grandfathered, but ANY new circuit (or replacement of the branch-circuit conductors) triggers the 4-wire requirement. Typical cable: 8/3 NM-B w/ ground for 40A range; 6/3 NM-B w/ ground for 50A range; 10/3 NM-B w/ ground for 30A dryer.

### D.15 HVAC / Mini-Split Disconnect (NEC 440.14)

The disconnect must be located within sight from, and readily accessible from, the air-conditioning or refrigerating equipment. It may be installed on or within the equipment itself but must not be on a panel that provides access to the equipment or that obscures the nameplate. **NEC 2023 added a requirement that the disconnect meet NEC 110.26(A) working-space rules** — clearance behind a condenser unit now matters.

### D.16 Bathroom Exhaust Fan Circuit Rules

- A bath fan that contains a heater (fan/heat or fan/heat/light combo) is treated as a fixed appliance and typically requires its own dedicated 20A circuit `[verify against fan nameplate]`
- A plain bath fan with a low draw (typically <1A) can share the bathroom lighting circuit
- The bathroom 20A small-appliance circuit (per NEC 210.11(C)(3)) is dedicated to receptacles and cannot serve lighting or fan loads in dwelling units; some AHJs allow a single-bathroom small-appliance circuit to also serve that bathroom's fan/light if the total load is <50% of circuit capacity `[verify with AHJ]`

### D.17 Garage Door Opener Circuit

A garage door opener does not strictly require a dedicated circuit under NEC, but most installers run it as a dedicated 15A or 20A ceiling receptacle. The ceiling receptacle in a garage is now subject to GFCI protection (NEC 210.8(A)(2)) — older "single GDO receptacle exempt from GFCI" allowance was removed in NEC 2020.

### D.18 Generator Transfer Switch and Interlock Listing (NEC 702)

- Permanent generator installations require listed transfer equipment that prevents parallel connection to the utility (NEC 702.5)
- Manual transfer switches and breaker interlock kits both satisfy this, BUT the interlock kit must be **listed for the specific panel brand and model** — universal/aftermarket interlocks are commonly rejected by AHJ
- Service-entrance-rated transfer switches contain the service disconnect and OCPD and replace (rather than supplement) the main panel
- Inlet box typically NEMA L14-30 (30A) or L14-50 (50A) depending on generator output
- NEC 702.7 requires equipment to be marked with a permanent warning sign at the service entrance identifying the optional standby source

### D.19 Aluminum Branch Wiring (1965–1973 era)

Insurance carriers increasingly require remediation. Accepted methods: COPALUM crimps (require certified installer + special tool) OR AlumiConn connectors (purple, easier to install). Antioxidant compound at all aluminum-copper joints. CO/ALR-rated devices at any termination that cannot be pigtailed.

### D.20 Federal Pacific / Zinsco / Pushmatic / Challenger

These panels are known fire hazards. The clarification chat should flag them by name if the customer mentions an old panel or describes a panel that matches their look. Strongly recommend replacement. Add Challenger and early ITE/Bulldog Pushmatic to the watch list.

### D.21 Subpanel at Separate Structure (NEC 250.32)

When feeding a subpanel at a separate building or structure (detached garage, ADU, workshop):

- A 4-wire feeder (2 hots + neutral + EGC) is REQUIRED — the legacy 3-wire feeder with neutral-as-EGC was disallowed for new installations under NEC 2008+
- A grounding electrode system is required AT the separate structure (typically a ground rod or rods per NEC 250.52), connected to the subpanel's EGC bus — NOT to the neutral bus
- Neutral and ground bars in the subpanel must remain ISOLATED (neutral floats; ground is bonded to the enclosure)
- Exception: 250.32(A) exception — if the separate structure is fed by only a single branch circuit with EGC, no separate grounding electrode is required

### D.22 Permit Required vs. Not Required

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
| Generator inlet + interlock | YES |
| Whole-house SPD added at panel | Often no (panel-internal modification) `[verify with AHJ]` |
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
