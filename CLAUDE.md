# QuoteCraft — CLAUDE.md

## What This Project Is

QuoteCraft is an AI-powered quoting tool for small electrical contracting teams (2–5 people per company account). It converts a spoken or typed scope of work into a professional, branded quote that can be downloaded as a PDF or emailed to a client.

## Core Workflow

1. User inputs a scope of work (typed or pasted from voice-to-text transcription)
2. AI agent conducts a multi-turn clarification chat to fill in gaps (behaves like a 20-year electrical estimator)
3. Agent generates a detailed quote table with line items, quantities, and pricing
4. Electrician reviews, edits, and approves the quote (mandatory review step — quote cannot be exported without approval)
5. Quote is exported as a branded PDF or emailed to the client

## Tech Stack

- **Frontend:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API routes
- **Database:** Supabase (PostgreSQL) with Row-Level Security enabled on ALL tables
- **AI:** Anthropic Claude API (Sonnet for clarification chat, Opus for quote generation)
- **PDF:** React-PDF
- **Email:** Resend
- **Hosting:** Vercel
- **Payments (future):** Stripe

## Project Structure

```
/app                    → Pages and API routes (Next.js App Router)
/components             → Reusable UI components
/lib                    → Utility functions and shared logic
/lib/supabase           → Supabase client configuration
/lib/modules            → Standalone modules (pricing, input, export)
/types                  → TypeScript type definitions
/supabase/migrations    → Database migration SQL files
```

## Architecture Rules — ALWAYS FOLLOW THESE

### Module Independence
The pricing module, input module, and export module must be completely standalone. They communicate through defined interfaces (standard input/output contracts), never by reaching into each other's internals. The rest of the app calls the pricing module with a line item and receives back: `{ unit_price, source, confidence, near_matches[] }`. It never knows or cares how the price was determined.

### Data Isolation (Row-Level Security)
Every database query must respect company boundaries. RLS policies are enabled on all tables. A user must never be able to see, edit, or access data belonging to a different company, even if the application code has a bug. The database enforces this independently.

### API Keys Are Server-Side Only
The Anthropic API key must NEVER appear in frontend/client-side code. All Claude API calls must go through Next.js API routes (server-side), which attach the key. The key lives in .env.local and is only accessible in server-side code.

### Auto-Save Everything
Every meaningful user action triggers a save to the database. There is no "Save" button. Specifically:
- Chat messages: saved immediately when sent/received
- Quote table edits: saved 1–2 seconds after user stops typing (debounced)
- Row additions/deletions: saved immediately
- Margin changes: saved immediately

### Edit Diffs for Training Data
When an electrician edits an AI-generated line item, store the original AI values (ai_original_description, ai_original_quantity, ai_original_unit_cost) alongside the edited values. Never overwrite the originals. This data trains the model over time.

### API Cost Tracking
Every Claude API call must be logged to the api_usage_log table with: company_id, quote_id, user_id, endpoint_type, model_used, input_tokens, output_tokens, and estimated_cost_usd. No exceptions.

### Quote Ownership
- Each quote has a single creator (created_by field)
- Only the creator can edit their quote
- Admin role users can edit any quote in their company
- All team members can view all quotes in their company (read-only)

### Mandatory Review Before Export
A quote cannot be exported as PDF or emailed until the review_completed_at timestamp is set. The electrician must explicitly click a review/approve action.

### Visual Distinction for AI Estimates
Any line item with price_source = 'ai_estimate' must be visually distinct in the UI — colored background with a label like "Estimated — not from your price list." This is a trust and accuracy feature, not optional styling.

## User Roles

- **Admin:** Creates the company account. Can manage company settings (logo, margins, address), invite/remove team members, upload price lists, and create/edit any quote.
- **Estimator:** Invited by admin. Can create and manage their own quotes. Can view (read-only) other team members' quotes. Cannot change company settings or manage the team.

## Pricing Module — Priority Cascade

When a line item needs a price, the pricing module checks in this order:
1. Contractor's uploaded price list (matched via normalized product catalog)
2. Historical job data from the company's past quotes
3. Claude AI estimate (flagged for review, never silent)
4. [Future] Real-time supplier API

The module always returns the same structure regardless of source.

## AI Agent Behavior

- Persona: 20-year electrical estimator who prioritizes accuracy over speed
- Never guesses on unknowns that could materially affect quote accuracy
- Asks targeted clarifying questions about wire gauge, run lengths, breaker amperage, circuit count, indoor/outdoor, conduit type, etc.
- Suggests 2–3 close matches for ambiguous items instead of just asking "what do you mean?"
- Soft limit: after 8–10 questions, offers to generate a draft. If critical unknowns remain, flags those items as estimates.
- Company zip code is included in context for regional pricing
- Output: structured JSON bill of materials, not prose

## Quote Lifecycle

Draft → Sent → Accepted → Declined → Expired

## Quote Versioning

Editing a sent quote creates a new version (same quote_number, incremented version field). Previous versions are preserved as snapshots.

## Database Tables

companies, users, quotes, quote_line_items, chat_messages, product_catalog, api_usage_log

See /supabase/migrations/ for full schema.

## Git Workflow

- NEVER push directly to main
- Always create a feature branch (e.g., build-quote-table, fix-margin-calc)
- Make clean, descriptive commits
- Push and create a pull request
- Main branch = live/deployed version via Vercel

## Environment Variables Required

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
```

## Important Context

- Built by non-technical co-founders using AI-assisted development
- Two-person team — keep things simple and well-documented
- When in doubt, ask rather than assume
- Explain technical decisions in comments so the team can learn

## MEMORY.md — Automatic Updates

After completing any task, update MEMORY.md with:
- What was accomplished (check off completed items, add new ones)
- Any new decisions made
- Any issues or bugs encountered
- Any tech debt created (shortcuts taken that need to be revisited)

Do this automatically without being asked. At the end of every session, prompt the user to review the MEMORY.md updates before closing the terminal.

## Code Comments

Write clear code comments that explain WHY something is done, not just what it does. These co-founders are learning — comments are a teaching tool. For example:

```
// BAD:
// Set margin to 20
const margin = 20;

// GOOD:
// Default labor margin is 20% — inherited from company settings during onboarding.
// Electricians can override this per line item in the quote table.
const margin = company.default_labor_margin;
```

## Commits

Make small, descriptive commits after each meaningful piece of work. Never save everything for one giant commit at the end. Good commit messages describe WHAT changed and WHY:
- Good: "Add role-based access check to quote edit endpoint"
- Bad: "Update files"
- Bad: "Work in progress"