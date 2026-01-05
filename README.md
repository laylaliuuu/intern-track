# Internship Intel (MVP)

A high-precision internship listing platform for top AI/tech companies.

## MVP goals
- Discover internship postings from multiple sources (Exa, ATS, company career pages, curated link pages)
- Hard-filter to only show eligible postings (real internship, correct season/year, active/available)
- Extract core fields accurately with consistent fallbacks ("Not found")
- Deduplicate near-identical postings
- Present a fast filterable table UI
- Track "Site Added Date" (date posting first appears on our platform)

## Non-goals (MVP)
- No scoring (fit/quality/urgency)
- No application tracking (applied/interview/etc)
- No notifications

## Key product behavior
This product behaves like a trusted internship curator:
- Only show postings that pass strict eligibility checks
- Preserve evidence snippets for critical extracted fields (pay/class year/deadline/posted date/location)

## Tech stack
- Next.js (App Router)
- shadcn/ui
- TanStack Table + TanStack Virtual
- React Query
- Supabase Postgres
- Background ingestion via cron (Vercel cron or Supabase scheduled)
- Concurrency via p-limit + retry/backoff fetch

## Docs
See `docs/00-overview.md` for the complete design.
