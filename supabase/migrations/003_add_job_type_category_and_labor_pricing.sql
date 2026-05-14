-- Step 3 of the pre-demo iteration plan: add pre-chat filters that the owner
-- picks BEFORE the AI clarification chat starts. These filters get passed
-- into all three AI prompts (clarification, generation, review) so the AI
-- has trade-specific context from the first message.
--
-- See:
--   - PRE_DEMO_PLAN.md (Step 3 section)
--   - lib/prompts/knowledge-base.ts (JobType, JobCategory, LaborMode types)
--   - docs/residential-service-knowledge-base.md (Section E — Pricing Framework)

-- ─── Company-level defaults for labor pricing ──────────────────────────────
-- The owner picks one of three labor pricing modes (default `margin_on_cost`
-- to match the app's behavior before this migration — safe default for any
-- existing companies). The per-hour rate is only used when mode = 'hourly'.
ALTER TABLE companies
  ADD COLUMN default_labor_mode TEXT DEFAULT 'margin_on_cost'
    CHECK (default_labor_mode IN ('hourly', 'margin_on_cost', 'flat_fee')),
  ADD COLUMN default_labor_rate_per_hour DECIMAL;

-- ─── Per-quote filters (set by the owner before the clarification chat) ────
--
-- job_type: residential vs commercial — drives AI vocabulary, code-citation
--   defaults, and pricing assumptions. Default 'residential' since the friend
--   we're showing this to is a residential service electrician.
--
-- job_category: pre-chat preset that maps to one of the 18 categories in
--   knowledge-base.ts (panel_upgrade, ev_charger, etc.) plus 'other'.
--   Nullable so the owner can leave it unset for free-form scopes.
--   No CHECK constraint here — the TS layer (JobCategory type) is the source
--   of truth so we can add new categories without schema migrations.
--
-- labor_mode: copied from the company default at quote creation time;
--   editable per quote in case the owner prices a specific job differently.
--
-- labor_rate_per_hour: copied from the company default at quote creation;
--   only used when labor_mode = 'hourly'.
ALTER TABLE quotes
  ADD COLUMN job_type TEXT DEFAULT 'residential'
    CHECK (job_type IN ('residential', 'commercial')),
  ADD COLUMN job_category TEXT,
  ADD COLUMN labor_mode TEXT DEFAULT 'margin_on_cost'
    CHECK (labor_mode IN ('hourly', 'margin_on_cost', 'flat_fee')),
  ADD COLUMN labor_rate_per_hour DECIMAL;
