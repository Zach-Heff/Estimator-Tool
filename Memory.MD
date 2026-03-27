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
- [ ] Supabase project created and .env.local populated with real keys — NEEDS VERIFICATION
- [ ] Database migration has been run against Supabase — NEEDS VERIFICATION
- [ ] Row-level security policies are active — NEEDS VERIFICATION

## What's In Progress

### Session 2 — Auth & Onboarding
- [ ] Verify foundation setup is complete and working
- [ ] Supabase Auth with email/password
- [ ] Signup page (creates company + admin user)
- [ ] Login page
- [ ] Auth middleware (protect routes, redirect if not logged in)
- [ ] Onboarding wizard (3 steps: company details, quoting defaults, price list upload)
- [ ] Basic dashboard placeholder (welcome message + logout)

## What's Coming Next

### Session 3 — Scope Input + AI Chat
- [ ] Scope input screen (text field with paste support)
- [ ] AI chat interface
- [ ] System prompt for clarification agent
- [ ] Real-time message saving to chat_messages table
- [ ] Soft limit logic (8–10 questions, then offer to generate draft)

### Session 4 — Quote Generation + Table
- [ ] AI generates structured JSON bill of materials
- [ ] Render as editable quote table
- [ ] Edit quantity, unit cost, description, margin per row
- [ ] Add/delete rows
- [ ] Auto-calculate billable prices and totals
- [ ] Visual distinction for AI-estimated rows
- [ ] Capture edit diffs (original AI values vs. electrician corrections)
- [ ] Mandatory review step

### Session 5 — PDF Export
- [ ] React-PDF branded template
- [ ] Company logo, name, address, phone, license number
- [ ] Client info, quote number, date, expiration
- [ ] Line items with billable prices only (no cost/margin)
- [ ] Payment terms
- [ ] Download button (gated behind review approval)

### Session 6 — Polish & Testing
- [ ] Auto-save implementation
- [ ] Offline detection and banner
- [ ] Connection recovery
- [ ] API cost logging
- [ ] End-to-end testing with real electrical scopes
- [ ] Bug fixes from testing

## Key Decisions Made

| Decision | Choice | Date |
|----------|--------|------|
| Frontend framework | Next.js 14+ with App Router | March 2026 |
| UI components | shadcn/ui | March 2026 |
| Database | Supabase (PostgreSQL) with RLS | March 2026 |
| AI chat model | Claude Sonnet (cheaper, conversational) | March 2026 |
| AI quote generation model | Claude Opus (stronger reasoning) | March 2026 |
| Git workflow | GitHub Flow (branch → PR → merge) | March 2026 |
| User roles | Admin + Estimator | March 2026 |
| Quote ownership | Single owner, admin can override | March 2026 |
| Price matching | AI-assisted normalization (no SKUs required) | March 2026 |
| Fallback pricing display | Very obvious — colored row with label | March 2026 |
| Chat question limit | Soft limit at 8–10, confidence-based | March 2026 |
| Review step | Mandatory before export | March 2026 |
| Monetization | TBD before launch (likely tiered subscription) | March 2026 |
| Development tool | Claude Code | March 2026 |

## Known Issues / Tech Debt

- Price list upload in onboarding just stores the file — AI normalization not built yet (Phase 2)
- Email verification enabled but not enforced (enforce in Phase 2)
- No team invitation flow yet (Phase 2)
- No rate limiting on API calls yet (Phase 2)
- Prompt injection defense is basic — needs hardening before launch

## Supabase Project Details

- Project URL: (stored in .env.local)
- Region: (note which region you selected)
- Database password: (stored securely, not in this file)

## GitHub Repository

- URL: https://github.com/Zach-Heff/Estimator-Tool.git
- Branch protection: Not yet configured on main (do this before launching)