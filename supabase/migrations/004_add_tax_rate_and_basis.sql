-- Add tax rate + tax basis as proper stored fields, with company-level
-- defaults and per-quote overrides. Previously `quotes.tax_rate` existed
-- but had no UI and no default, so it was always null → 0% on every PDF.
--
-- Why `tax_basis`? Sales tax rules vary by state — CA labor isn't taxed
-- but WA/HI/NM/SD labor IS. Hardcoding "materials only" would be a silent
-- correctness bug for contractors outside CA. Storing the basis explicitly
-- means future state-aware lookups can flip this field without code changes.
--
-- See PRE_DEMO_PLAN.md (Demo Polish v4) for the full design rationale.

-- ─── Company-level defaults ────────────────────────────────────────────────
ALTER TABLE companies
  ADD COLUMN default_tax_rate DECIMAL,
  ADD COLUMN default_tax_basis TEXT DEFAULT 'materials'
    CHECK (default_tax_basis IN ('materials', 'subtotal', 'none'));

-- ─── Per-quote (tax_rate column already exists from migration 001) ─────────
-- tax_basis is new; mirrors the company default at create time but can be
-- overridden per quote (e.g., contractor doing a one-off out-of-state job).
ALTER TABLE quotes
  ADD COLUMN tax_basis TEXT DEFAULT 'materials'
    CHECK (tax_basis IN ('materials', 'subtotal', 'none'));
