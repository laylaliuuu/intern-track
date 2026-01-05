# Architecture

## High-level components
1) Ingestion workers
- Collect candidate URLs
- Fetch pages (with retry/backoff)
- Classify URL/page type + accessibility
- Apply hard eligibility filters
- Extract fields + evidence
- Deduplicate + upsert into DB
- Mark active/inactive/excluded with reasons

2) API layer (Next.js route handlers)
- Read-only endpoints for UI:
  - List postings with filters/sorts
  - Get posting detail + evidence
- Admin/ops endpoints (optional, protected):
  - Trigger ingestion run
  - View ingestion stats

3) Frontend (Next.js App Router)
- Table with TanStack Table + Virtual
- Filters using URL query params
- Detail drawer/page per posting

4) Database (Supabase Postgres)
- Core tables: companies, postings, extraction_evidence, posting_sources (optional)
- Constraints for dedup + idempotency

## Data flow
Candidate URLs -> normalize -> fetch -> classify -> eligibility gate -> extract -> dedup/upsert -> publish -> UI reads

## Job scheduling
- MVP:
  - Daily full ingestion run
  - Hourly lightweight re-check of recently added postings (optional)
- Each run is idempotent: same canonical_url should update existing posting, not create duplicates.

## Error handling
- Fetch failures: retry with exponential backoff; record TIMEOUT/BLOCKED.
- Blocked/auth-required: mark excluded; do not show in UI.
- Parsing failures: store "Not found" for missing fields and keep evidence where available.

