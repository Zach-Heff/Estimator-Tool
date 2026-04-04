# QuoteCraft — MEMORY.md

> This file tracks what has been done, what's in progress, and important decisions made along the way. Update this file at the end of each Claude Code session.

---

## Current Phase

**Phase 1 — Core Loop (Weeks 1–6)**
Goal: One user can input a scope, chat with the AI, review a quote, and download a branded PDF.

## What's Been Completed

### Session 1 — Foundation Setup (Date: March 2026)
- [x] Initialized Next.js project with App Router and TypeScript
- [x] Installed and configured shadcn/ui and Tailwind CSS
- [x] Created project folder structure (/app, /components, /lib, /types, etc.)
- [x] Created Supabase client configuration
- [x] Created database migration file (001_initial_schema.sql) with all 7 tables
- [x] Created TypeScript type definitions
- [x] Set up .gitignore and README.md
- [x] Supabase project created and .env.local populated with real keys
- [x] Database migration applied to Supabase (all 7 tables + RLS policies)
- [x] Row-level security policies active on all tables

### Session 2 — Auth & Onboarding (Date: March 27, 2026)
- [x] Verified foundation setup is complete and working
- [x] Fixed schema: made zip_code nullable (collected in onboarding, not signup)
- [x] Added INSERT RLS policies for companies and users (needed for signup flow)
- [x] Replaced hand-written Database types with auto-generated Supabase types
- [x] Set up Supabase SSR auth (browser client, server client, admin client)
- [x] Auth middleware protecting all routes (redirect to /login if unauthenticated)
- [x] Signup page with email/password + company name (creates auth user + company + admin profile)
- [x] Login page with onboarding completion check
- [x] 3-step onboarding wizard (company details, quoting defaults, price list upload)
- [x] Placeholder dashboard with welcome message and logout
- [x] Merged foundation-setup branch into main
- [x] PR #1 created: auth-and-onboarding → main
- [x] Fixed: renamed middleware.ts to proxy.ts (Next.js 16 convention)
- [x] Fixed: added /api/auth to public routes (signup API was being blocked)
- [x] Fixed: added storage policies for company-logos and price-lists buckets
- [x] Tested full flow: signup → onboarding → dashboard → logout → login → dashboard

### Session 3 — Scope Input + AI Chat (Date: March 28, 2026)
- [x] Merged auth-and-onboarding PR (#2) into main
- [x] Installed @anthropic-ai/sdk
- [x] Created clarification agent system prompt (lib/prompts/clarification-agent.ts)
- [x] Built /api/chat route with SSE streaming, message saving, and API cost logging
- [x] Built /api/quotes route with auto-generated quote numbers (Q-1001+) and company defaults
- [x] Built quote workspace page (/quotes/[quote_id]/edit) with:
  - Collapsible client info section (auto-saves on blur)
  - Scope input text area (Phase A)
  - Chat interface with streaming responses, typing indicator, message bubbles (Phase B)
  - [READY_TO_GENERATE] detection with "Generate Quote" button placeholder
  - Resume support (loads existing messages on page load)
- [x] Added "New Quote" button to dashboard
- [x] PR #3 created: scope-input-and-ai-chat → main

### Session 4 — Quote Generation + Table (Date: March 28 – April 2, 2026)
- [x] Created quote generation system prompt (lib/prompts/quote-generator.ts)
- [x] Built /api/generate-quote route with JSON parsing + retry
- [x] Switched from Opus to Sonnet for quote generation (faster, 3-5 sec vs 30+)
- [x] Line items saved with margins applied, AI originals preserved for training data
- [x] API usage logged to api_usage_log (cost tracking)
- [x] Built editable QuoteTable component (components/quote-table.tsx) with:
  - Editable description, quantity, unit cost, margin fields
  - Auto-calculated billable price per row and totals in footer
  - Amber background + "AI Estimate" badge for AI-estimated rows
  - Warning icon for low-confidence items
  - Auto-save with 1.5s debounce, was_edited flag set on edit
  - Add Row (manual) and Delete Row support
  - Fixed description column truncation (min-w-[300px])
- [x] Wired "Generate Quote" button with loading state (replaces placeholder)
- [x] Added review section: "Back to Chat" + "Approve & Continue" buttons
- [x] Mandatory review gate: review_completed_at must be set before export
- [x] Approved state shows disabled "Download PDF — coming soon" button
- [x] Page loads existing line items on mount (resume support)
- [x] Built quote review agent (lib/prompts/quote-reviewer.ts) — second AI pass that:
  - Compares generated line items against the full conversation
  - Catches quantity mismatches, missing items, material substitutions
  - Verifies every device has a box and every box has a cover
  - Applies corrections automatically before showing the quote
- [x] Improved clarification agent: adaptive question count (0 for detailed scopes, 6-10 for vague)
- [x] Improved generator prompt: explicit item counting rules, fixture inclusion rules
- [x] Removed AI model references from user-facing loading UI
- [x] Tested with real electrical scopes — review agent catches all errors
- [x] PR #4 created and updated: quote-generation-and-table → main

### Session 5 — PDF Export + Quote Polish (Date: April 2–4, 2026)
- [x] Installed @react-pdf/renderer for server-side PDF generation
- [x] Installed shadcn Dialog component for preview modal
- [x] Built PDF document template (lib/pdf/quote-document.tsx) — bold & modern design with:
  - Deep blue accent header/footer bands
  - Company logo (fetched from Supabase Storage, converted to base64)
  - Company name, address, phone (formatted ###-###-####), license number
  - "Performed By" field tied to the quote creator's name from auth/users table
  - Quote Totals summary box (top-right) with Subtotal, Tax, Total
  - Client info and job site (hidden when same as client address)
  - Line items grouped by category with section headers
  - Materials and labor consolidated per category (client-friendly, not every nut/bolt)
  - Margin baked into "Unit Price" — client never sees raw cost or margin %
  - Signature lines for both client and estimator
  - Fixed header/footer on every page for multi-page quotes
- [x] Built /api/generate-pdf route with:
  - Cookie-based auth (respects RLS)
  - 403 gate: quote must be approved before PDF export
  - Fetches quote, company, line items, estimator name, and logo
  - Handles both legacy full-URL and new storage-path logo_url formats
  - Returns PDF as binary application/pdf response
- [x] Built PDF preview modal (components/pdf-preview-modal.tsx):
  - Nearly full-screen overlay (95vh x 95vw)
  - Fetches PDF blob from API, displays in iframe
  - Download button saves file locally
  - Loading spinner + error handling with retry
  - Cleans up blob URLs on close
- [x] Wired "Preview & Download PDF" button on edit page (replaces disabled placeholder)
- [x] Fixed logo not showing: onboarding was storing full public URL, PDF route expected storage path — fixed both sides with backward compatibility
- [x] Fixed phone formatting: added ###-###-#### formatter for PDF
- [x] Added category column to quote_line_items (migration 002)
- [x] Updated quote generator prompt to output granular task-level categories
  - Good: "Weatherhead Replacement", "Small Appliance Circuits (2x 20A)", "Recessed Lighting (6 lights)"
  - Bad: "Kitchen Rewire" (too broad), "12/2 Wire" (too narrow)
- [x] Added editable Category column to quote table UI (AI suggests, user can edit)
- [x] Updated clarification agent prompt: can now signal [READY_TO_GENERATE] on first response when scope is fully detailed (no forced question round)
- [x] Fixed zip code for regional pricing: now extracts from job site/client address, falls back to company zip
- [x] PR pending: all changes on main branch, ready for feature branch + PR

## What's In Progress

(Nothing currently in progress)

## What's Coming Next

### Session 6 — Polish & Testing
- [ ] Create feature branch and PR for Session 5 work
- [ ] Auto-save implementation
- [ ] Offline detection and banner
- [ ] Connection recovery
- [ ] End-to-end testing with real electrical scopes
- [ ] Bug fixes from testing

## Key Decisions Made

| Decision | Choice | Date |
|----------|--------|------|
| Frontend framework | Next.js 14+ with App Router | March 2026 |
| UI components | shadcn/ui | March 2026 |
| Database | Supabase (PostgreSQL) with RLS | March 2026 |
| AI chat model | Claude Sonnet (cheaper, conversational) | March 2026 |
| AI quote generation model | Claude Sonnet (switched from Opus for speed) | March 2026 |
| Git workflow | GitHub Flow (branch → PR → merge) | March 2026 |
| User roles | Admin + Estimator | March 2026 |
| Quote ownership | Single owner, admin can override | March 2026 |
| Price matching | AI-assisted normalization (no SKUs required) | March 2026 |
| Fallback pricing display | Very obvious — colored row with label | March 2026 |
| Chat question limit | Soft limit at 8–10, confidence-based | March 2026 |
| Review step | Mandatory before export | March 2026 |
| Monetization | TBD before launch (likely tiered subscription) | March 2026 |
| Development tool | Claude Code | March 2026 |
| PDF library | @react-pdf/renderer (server-side, React JSX API) | April 2026 |
| PDF preview UX | Full-screen modal overlay with iframe | April 2026 |
| PDF line item detail | Materials + labor consolidated per task category (not every part) | April 2026 |
| PDF margin display | Margin baked into unit price — client never sees raw cost or % | April 2026 |
| Category assignment | AI suggests granular task-level categories, electrician can edit | April 2026 |
| Auth package | @supabase/ssr for Next.js App Router SSR auth | March 2026 |
| Admin operations | Service role key via createAdminClient() bypasses RLS | March 2026 |
| Onboarding check | company.address being set = onboarding complete | March 2026 |
| AI chat streaming | SSE (Server-Sent Events) for real-time token streaming | March 2026 |
| Quote numbering | Sequential Q-1001, Q-1002... per company | March 2026 |

## Known Issues / Tech Debt

- Price list upload in onboarding just stores the file — AI normalization not built yet (Phase 2)
- Email verification enabled but not enforced (enforce in Phase 2)
- No team invitation flow yet (Phase 2)
- No rate limiting on API calls yet (Phase 2)
- Prompt injection defense is basic — needs hardening before launch

## Supabase Project Details

- Project name: Estimator-Tool
- Project ID: dvcvvauzalxckcsteoiu
- Region: us-east-1
- Project URL and keys: stored in .env.local (never commit these)

## GitHub Repository

- URL: https://github.com/Zach-Heff/Estimator-Tool.git
- Branch protection: Not yet configured on main (do this before launching)