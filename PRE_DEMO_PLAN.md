# QuoteCraft — Pre-Demo Iteration Plan (v2)

> Project-level mirror of the plan approved on 2026-05-13.
> Lives in the repo so it survives Claude Code sessions and can be iterated on in PRs.
> The same content lives in `~/.claude/plans/review-the-architecture-and-steady-valley.md` on Zach's machine for Claude session continuity.

## Context

It's been ~5 weeks since the last QuoteCraft commit (April 4, 2026; today is 2026-05-13). The Phase 1 MVP is functionally complete: auth, onboarding, scope input, streaming AI clarification chat, AI quote generation with a second-pass review agent, editable line items, mandatory approve-before-export, branded PDF preview/download, dashboard quote list, password reset. Eight PRs merged. The product runs end-to-end today.

**Why we're iterating now:** Zach wants to share the tool with a residential-service electrician friend who will play with it alone and tell him whether the skill is economically viable in his opinion. The desired outcome is either a testimonial (he thinks it works) or coaching (he sees the bones but it needs work). This is **not** a market-validation or sales push — it's one expert's verdict, with a real relationship behind it.

**The bar:** memorable to a 20-year residential service electrician, not marketable to a thousand contractors. The friend should look at the AI's first-draft line items and say "huh, the quantities and labor hours are actually in the ballpark," and at the filters and say "they get my world."

**Friend's work (confirmed):** residential service — panel upgrades, EV chargers, troubleshooting, kitchen/bath rewires, service calls, GFCI updates. Same kinds of jobs in the repo's `5 Residential Electrical Estimates — Study Guide.docx`.

**Demo mechanics:** he plays with it on his own (no live walkthrough). That sets a polish floor — he has to find his way without Zach there.

## Goals (in priority order)

1. **First-draft line items look credible to a residential service electrician.** This is the wow moment.
2. **A canonical "bible" exists** that captures residential service knowledge, category templates, and AI decision rules — and the AI prompts reference it.
3. **Pre-chat filters mirror how he thinks about scoping a job.** Residential vs. commercial, job category, labor pricing mode + rate.
4. **The clarification chat sounds like an estimator, not a chatbot** — sharper trade vocabulary, smarter follow-up questions.
5. **He can get from login to a generated quote without help.** Onboarding, hint text, and password reset must all work end-to-end.

## Non-goals (explicitly OUT of scope this round)

These are real gaps, but they don't move the needle for one expert's verdict and would balloon the work:

- Settings page to edit company defaults post-onboarding (Zach pre-configures friend's account)
- Email-to-client (he's not sending real quotes)
- Quote status transitions: sent / accepted / declined (no real-client workflow)
- Tax rate math (not used today)
- Quote versioning UI
- Team invitations
- Price list parser / product catalog matching
- Resend integration
- Historical pricing lookup
- Real supplier API
- Pre-seeded sample quote on dashboard (friend will build his own — Zach's call)

If the friend comes back with "these matter," we revisit. Not now.

## Assessment: is the Study Guide a good "bible"?

**Short answer: it's a great seed, not a complete bible.**

The repo's `5 Residential Electrical Estimates — Study Guide.docx` contains five realistic, fully-detailed estimates that are squarely in the friend's wheelhouse (EV charger install, 100A→200A panel upgrade, kitchen renovation electrical, whole-home outlet & GFCI safety update, ADU conversion). It also has a "study guide" section explaining every field that appears in residential estimates and why.

**Strengths:** real line items with realistic pricing (San Jose, CA), correct NEC code references (NEC 2023, NEC 406.4), correct labor vs. materials split per line, permit fees as separate pass-through, 30-day validity, 50% deposit standard, plain-language scope of work, exclusions section.

**Weaknesses as a bible the AI can lean on:**
- It's a *snapshot of one contractor's style* in one region — not a framework of decision rules
- No per-category line-item templates (no "every panel upgrade MUST include these baseline items")
- No vocabulary guide ("use 'conductor' not 'wire' when talking spec; use 'cable' for assemblies like NM-B")
- No common-pitfall catalog (e.g., "always check for available breaker space," "always include weatherhead on panel upgrades," "GFCI required within 6 ft of sink")
- No friend-specific context (his region, his typical labor rate, his job mix)
- Doesn't model the labor pricing toggle (rate × hours vs. margin % vs. flat fee)
- Doesn't capture how the AI should decide confidence (when to flag `low`)

**Solution:** create a NEW companion document — the **Residential Service Knowledge Base** at `docs/residential-service-knowledge-base.md` — that:

1. Embeds or references the 5 estimates as ground-truth examples
2. Adds: canonical list of residential service job categories the AI should recognize, with a baseline line-item template per category
3. Adds: AI vocabulary guide and common pitfalls
4. Adds: pricing framework (rate × hours, margin %, flat fee — when each applies)
5. Adds: confidence-flagging rules
6. Adds: friend-specific notes (region, zip, typical labor rate, his job mix) — filled in by Zach before the demo
7. Becomes the document the prompts reference and that gets updated based on friend's feedback

## The Plan

### Step 0: Mirror this plan into the project (DONE)

This document. Created so the plan lives with the code, survives Claude sessions, and is reviewable in PRs.

### Step 1: Build the Residential Service Knowledge Base

Create `docs/residential-service-knowledge-base.md`.

Structure:

- **Section A — Ground Truth Examples** — link to / quote the 5 sample estimates
- **Section B — Job Category Templates** — for each canonical category, list the baseline line items the AI should expect
- **Section C — Vocabulary & Style** — terms the AI should use vs. avoid
- **Section D — Common Pitfalls & Code Triggers** — NEC references and frequently-missed items
- **Section E — Pricing Framework** — how the three labor modes work (rate × hours, margin %, flat fee)
- **Section F — Confidence Rules** — when AI flags `low`
- **Section G — Friend's Profile** — placeholders Zach fills in before the demo

This document is the bible. It's iterable. Friend's feedback edits it.

### Step 2: Upgrade the AI prompts to reference the Knowledge Base

Three prompts to revise:

- **`lib/prompts/quote-generator.ts`** — Anchor labor-hour estimates to Knowledge Base Section B templates. Use Section C vocabulary. Apply Section E pricing framework based on the quote's labor mode. Flag per Section F confidence rules.
- **`lib/prompts/quote-reviewer.ts`** — Add residential-service-specific checks from Section D pitfalls.
- **`lib/prompts/clarification-agent.ts`** — Sharper residential trade vocabulary. Ask in the style of a real estimator using Section D pitfalls as the question backbone.

**Implementation note:** prompts embed Knowledge Base content directly for now. Refactor to read-at-request-time only if the doc grows past ~2K tokens.

### Step 3: Add pre-chat filters/inputs (data + UI + AI wiring)

Each is passed into the AI prompts as system-message context.

**a. Residential vs. Commercial toggle**
- UI: above the scope textarea on the quote edit page (Phase A)
- DB: new column `job_type` on `quotes` table (text: `residential` | `commercial`, default `residential`)

**b. Job category preset (dropdown)**
- Options (residential service focus, with escape hatch):
  - Panel Upgrade (100A → 200A or similar)
  - Subpanel Install
  - EV Charger Install
  - Service Call / Troubleshooting
  - Kitchen Rewire
  - Bath Rewire
  - GFCI / AFCI Update
  - Lighting (interior or exterior)
  - Outlet & Switch Work
  - Generator Interlock / Tie-In
  - HVAC / Mini-Split Dedicated Circuit
  - Hot Tub / Spa Dedicated Circuit
  - Whole-House Surge Protector
  - Smoke / CO Detector Hardwire
  - Aluminum or Knob-and-Tube Remediation
  - Remodel (multi-category)
  - New Construction
  - Other (describe in scope)
- DB: new column `job_category` on `quotes` table (text, nullable)

**c. Labor pricing toggle (THREE modes)**
- Modes:
  - **Hourly:** `labor_rate_per_hour × hours_estimated`. Margin % does not apply to labor.
  - **Margin on cost:** existing behavior — AI outputs `unit_cost`, system applies `default_labor_margin %`.
  - **Flat fee per task:** AI outputs a single dollar amount per labor line item; owner edits freely.
- Company default: new column `default_labor_mode` on `companies` table (default `margin_on_cost` for safe migration)
- Per-quote: new columns `labor_mode` and `labor_rate_per_hour` on `quotes` table, inherited from company defaults on create

**Files to modify:**
- `app/quotes/[quote_id]/edit/page.tsx` — render new fields, save to DB
- `app/api/quotes/route.ts` — inherit company defaults on quote create
- `app/api/chat/route.ts` — pass new fields into clarification prompt context
- `app/api/generate-quote/route.ts` — pass new fields into generator + reviewer context
- New migration: `supabase/migrations/003_add_job_type_category_and_labor_pricing.sql`
- Regenerate Supabase types via MCP `generate_typescript_types` (never hand-write)

### Step 4: Self-service polish (he plays alone)

These are NOT light polish — they're load-bearing because he has no walkthrough.

- **Hint text under the scope textarea** — "Describe the job like you'd tell a coworker on the phone. The AI will ask follow-up questions to fill in the gaps." Plus a one-line example.
- **First-quote hint on the dashboard** — friendly empty-state explaining the workflow in 3 bullets (scope → chat → quote).
- **Onboarding copy review** — re-read each step's microcopy. Anything that assumes Zach is there to explain gets rewritten.
- **Password reset end-to-end test** — never been tested with a real email since Session 5. Send a real reset, click the link, set password, log in. Confirm Supabase auth email template is enabled and redirect URL is allowlisted.
- **Logout works cleanly** — verify the dashboard logout button clears session and redirects to login.

> **Note:** the middleware fix for password reset shipped in PR #9 (`fix-reset-password-middleware`) is a prerequisite for this step's password reset test to work.

### Step 5: Pre-seed friend's demo account (manual, Zach does)

- Zach signs up an account with friend's email
- Completes onboarding with friend's real company info: company name, friend's address, friend's zip code (critical for regional pricing), reasonable margins, friend's typical labor rate IF Zach can find it out, friend's preferred labor pricing mode IF Zach can find it out (otherwise default to `margin_on_cost`)
- Updates the Friend's Profile section of the Knowledge Base (Section G) with the same info
- Sends friend the login credentials + a short note: "Account's set up. Go to the dashboard, click New Quote, paste in a job you've quoted recently. Tell me what feels off."

## Open decisions to resolve during implementation

1. **Labor mode default** — `margin_on_cost` (current behavior) is the safest migration default. Confirm this is what Zach wants for the friend's account specifically.
2. **Knowledge Base embed vs. runtime read** — embed for now; revisit if the doc grows past ~2K tokens.
3. **Job category — pre-seed line items or just steer the AI?** Recommend steering only (option a) for simplicity; escalate to pre-seeding stubs (option b) only if first-draft accuracy is still weak.

## Verification (test before sending to friend)

### Code-level
- Run `bun dev`, confirm it boots clean
- Apply migration 003 to Supabase via MCP `apply_migration`
- Regenerate types via MCP `generate_typescript_types`
- `bunx tsc --noEmit` — clean
- `bun run lint` — clean

### End-to-end (manual, in dev)
Create a fresh quote and verify:
1. Job type defaults to "Residential" — toggleable
2. Job category dropdown is populated, defaults to nothing selected
3. Labor pricing mode shows three options with hint text; labor rate field appears only when "Hourly" is selected
4. After picking "Panel Upgrade" + typing a one-sentence scope, the clarification chat asks panel-upgrade-specific questions (weatherhead, grounding, permits, AHJ jurisdiction, available breaker space)
5. After `[READY_TO_GENERATE]`, the generated quote includes typical panel-upgrade line items per Knowledge Base Section B template
6. Labor line items respect the chosen labor mode
7. The review agent catches missing items if you intentionally vague the scope

### Knowledge Base sanity test
Take 2–3 of the sample estimates from `5 Residential Electrical Estimates — Study Guide.docx` (recommend EV charger install and 100A→200A panel upgrade). Type each scope into the tool. Compare AI output to the document's estimate. Are line items present? Are quantities close? Are labor hours close? Zach should do this before sending to friend.

### Self-service flow
- Sign up a fresh test account
- Walk through onboarding without help, noting any moment of confusion
- Log out, log back in
- Use "Forgot password?" with the test email
- Confirm reset email arrives, link works, new password works
- Create a quote with only the on-screen hint text as your guide
- Fix anything unclear before sending the link to friend

### Pre-send checklist
- Friend's demo account created with his real zip code, labor rate, labor pricing mode (where known)
- Knowledge Base Section G filled in with friend's profile
- Password reset email tested end-to-end (this is the bug-likeliest path)
- Logout tested
- Short note ready for friend: what to try, what feedback Zach wants, how long it should take

## Branch strategy

The plan is being executed across two main branches plus a small fix branch:

- **`fix-reset-password-middleware`** (PR #9) — the middleware bug fix that unblocks Step 4's password reset test. Shipped 2026-05-14.
- **`residential-service-knowledge-base`** (this branch) — Step 0 (this doc), Step 1 (Knowledge Base), Step 2 (prompt upgrades). One PR.
- **`pre-chat-filters-and-polish`** (future) — Step 3 (DB migration + filters), Step 4 (self-service polish). Branched off main after the Knowledge Base PR merges. One PR.

Step 5 is a manual checklist, not a branch.

## Estimated scope

- **Knowledge Base v1** (Step 1): ~half a day of writing + 1–2 hours iterating with Zach
- **Prompt rewrites** referencing Knowledge Base (Step 2): ~half a day of careful iteration against the study guide
- **Migration + form fields + prompt context wiring** (Step 3): ~full day
- **Self-service polish** (Step 4): ~half a day including the real-email password reset test
- **Pre-seed friend's account** (Step 5): manual, ~30 minutes
- **Verification + side-by-side sanity test**: ~half day

Realistic total: **2–3 focused sessions** before the friend is ready to receive a link.

## Files this plan will touch (summary)

**New files:**
- `PRE_DEMO_PLAN.md` — this document (DONE)
- `docs/residential-service-knowledge-base.md` — the AI's bible
- `supabase/migrations/003_add_job_type_category_and_labor_pricing.sql`

**Modified files:**
- `lib/prompts/clarification-agent.ts`
- `lib/prompts/quote-generator.ts`
- `lib/prompts/quote-reviewer.ts`
- `app/quotes/[quote_id]/edit/page.tsx`
- `app/api/quotes/route.ts`
- `app/api/chat/route.ts`
- `app/api/generate-quote/route.ts`
- `app/dashboard/page.tsx`
- `app/onboarding/page.tsx`
- Supabase types (regenerated, not hand-edited)
- `Memory.MD` (project root) — log Session 7 work when done

## How to iterate on this plan

When the friend comes back with feedback, edit:

1. **This document** — adjust the goals, non-goals, or steps based on what he says actually matters.
2. **`docs/residential-service-knowledge-base.md`** — fold in any vocabulary, pitfalls, or category templates he corrects or adds. Section G especially.
3. The AI prompts that embed Knowledge Base content — re-sync them after the doc changes.

This document is a living plan, not a one-shot. Commit changes to it in a PR so the reasoning is reviewable.
