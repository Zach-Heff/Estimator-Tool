# QuoteCraft

AI-powered quoting tool for small electrical contracting teams.

## What is QuoteCraft?

QuoteCraft helps electricians create professional, accurate quotes faster by using AI to parse scope descriptions, suggest line items and pricing, and generate polished PDF quotes.

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Database & Auth:** Supabase
- **AI:** Anthropic Claude API

## Getting Started

1. Clone the repo
2. Install dependencies: `bun install`
3. Copy `.env.local` and fill in your Supabase and Anthropic API keys
4. Run the dev server: `bun dev`
5. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
app/          → Pages and API routes (Next.js App Router)
components/   → Reusable UI components
lib/          → Utility functions and shared logic
  supabase/   → Supabase client configuration
  modules/    → Standalone modules (pricing, input, export)
types/        → TypeScript type definitions
supabase/     → Database migrations
```
