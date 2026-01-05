# Requirements

## Functional requirements (MVP)

### R1 Discovery
- Collect candidate URLs from:
  - Exa search (breadth)
  - ATS sources (Greenhouse/Lever/Workday where feasible)
  - Company career search pages (canonical search pages for brittle companies)
  - Curated public sources (e.g., link-in-bio pages, newsletters, public boards)
  - Optional seed allowlist for known fragile companies (Meta/Apple)

### R2 Eligibility filtering (hard gate)
A posting is eligible for display only if:
- It represents an internship (not full-time/new grad)
- It is active/available (not closed/removed/dead)
- It matches target season/year rules (e.g., Summer 2026) OR passes configured year gate
- It is a job detail page with sufficient content (not a generic careers landing page)

### R3 Field extraction (accuracy-first)
Extract and display the following fields:
- Title (exact; used as "role")
- Company
- Canonical URL
- Location (or "Not found")
- Pay (raw pay_text; or "Not found")
- Posted date (only if explicitly present; else "Not found")
- Deadline (only if explicitly present; else "Not found")
- Class year (only if explicitly present; else "Not found")
- Requirements/Qualifications bullets (only if reliably extractable; else "Not found")
- Season/Target year (if explicitly present; else "Not found")
- Site Added Date (always present; DB insertion date for first publish)
- Last checked timestamp
- Status (ACTIVE/INACTIVE/EXCLUDED) and reason

### R4 Deduplication
- Merge duplicates into one canonical posting.
- Preserve multiple discovery sources/provenance.

### R5 UI
- Table UI supports:
  - Filters: company, title keyword search, location, season/year, class year (and optional major tags later)
  - Sorting: site_added_date, posted_date, company
  - Column hide/show
  - Pagination or virtualization for large lists
- Detail view per posting shows extracted fields + evidence snippets for high-risk fields.

## Non-functional requirements
- Reliability: ingestion jobs must be retry-safe and idempotent.
- Observability: store status_reason + http_status + last_checked_at for ops/debug.
- Performance: table should remain smooth for 10k+ rows (virtualization).
- Security: store secrets in env, no client exposure.
- Compliance: do not scrape behind authentication; respect robots/legal constraints in practice.

## Explicit non-goals (MVP)
- No scoring systems
- No application pipeline tracking
- No personalized recommendations
- No notifications

