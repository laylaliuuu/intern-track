# API Spec (MVP)

Base: Next.js Route Handlers under `/api`

## GET /api/postings
Query params:
- q: string (title keyword search)
- company: string
- location: string
- season: string (e.g., "Summer 2026")
- classYear: number (e.g., 2027)
- status: ACTIVE (default) | INACTIVE | ALL

Pagination:
- limit (default 100)
- cursor (optional; or use offset in MVP)

Sorting:
- sort=site_added_date_desc (default)
- sort=posted_date_desc
- sort=company_asc

Response:
- items: PostingListItem[]
- nextCursor?: string

PostingListItem includes:
- id, title, company_name, canonical_url
- location_text, pay_text
- class_year_text, season_year
- posted_date_text, deadline_text
- site_added_date
- last_checked_at

## GET /api/postings/:id
Returns:
- posting: full posting record
- evidence: ExtractionEvidence[] filtered to key fields

## POST /api/admin/ingest (optional)
Protected endpoint (env secret)
Body:
- mode: "full" | "recent"
Response:
- run_id + summary

Note: MVP can trigger ingestion only via cron; admin endpoint optional.

