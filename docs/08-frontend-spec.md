# Frontend Spec (MVP)

## Pages
- / (main table)
- /postings/[id] (detail view) OR a drawer modal

## Main table requirements
- TanStack Table + TanStack Virtual for performance
- Filters sidebar/topbar:
  - company (select)
  - location (text)
  - season/year (select)
  - class year (select)
  - keyword search (title)
- Sorting controls
- Column visibility toggle
- Row click opens detail

## Detail view
Show:
- canonical URL
- all extracted fields
- status + reason
- evidence blocks (field_name + snippet + extracted_at)
- last_checked_at
- site_added_date

## Data fetching
- React Query:
  - query key includes filter params
  - caching per filter set
- Use server-side filtering via API

## UI constraints
- Always display missing fields as "Not found" (exact string)
- Never show EXCLUDED postings in default views

