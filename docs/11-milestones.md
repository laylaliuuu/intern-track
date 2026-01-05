# Milestones

## M0 Repo + DB scaffolding (Day 1)
- Create Next.js app
- Create Supabase tables + indexes
- Add docs + .cursorrules

## M1 Minimal ingestion (Days 2–3)
- Exa discovery -> candidate URLs
- Fetch + classify + hard filter
- Store ACTIVE postings with site_added_date
- Basic extraction: title, company, url, status

## M2 Extraction accuracy pass (Days 4–6)
- Location extraction + fallback
- Pay extraction + evidence
- Posted date / deadline strict rules
- Class year strict rules
- Requirements extraction (only labeled sections)

## M3 Dedup + provenance (Days 7–8)
- Canonicalization + upsert
- posting_sources table
- conflict policy

## M4 UI table (Days 9–11)
- Table + filters + virtualization
- Detail view with evidence
- API routes

## M5 Cron + recheck (Days 12–13)
- Scheduled runs
- Mark closed postings inactive
- Basic ops logs

## Exit criteria
- Platform reliably publishes clean internship postings with correct season/year and accurate extracted fields.

