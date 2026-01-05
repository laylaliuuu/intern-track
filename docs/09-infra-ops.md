# Infra & Ops

## Hosting
- Vercel for Next.js

## Database
- Supabase Postgres
- Use server-side Supabase client for DB access (service key in server env only)

## Cron / Scheduling
Option A: Vercel Cron hitting /api/admin/ingest (protected)
Option B: Supabase scheduled function calling ingestion logic

MVP schedule suggestion:
- Daily full ingest (e.g., 6:00 AM PT)
- Optional: every 6 hours re-check ACTIVE postings added in last 14 days

## Secrets
- EXA_API_KEY (server-only)
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY (server-only)
- INGEST_ADMIN_TOKEN (if admin endpoint exists)

## Observability
At minimum store in DB:
- status_reason
- http_status
- last_checked_at

Optional logs:
- ingestion_runs table for run metrics (later)

