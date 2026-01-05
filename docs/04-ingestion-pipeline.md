# Ingestion Pipeline

## Pipeline stages

### Stage A: Candidate collection
Inputs:
- Exa queries (role-title based, year/season constrained)
- ATS discovery queries (site:greenhouse.io / site:lever.co)
- Company career entry URLs (canonical search pages for brittle companies)
- Curator source pages (public link pages that contain job posting links)

Output:
- candidate_urls[] with metadata:
  - discovered_via
  - source_type
  - query/context
  - discovered_at

### Stage B: URL normalization + pre-filter
Normalize:
- strip tracking params (utm_*, gclid, etc)
- normalize trailing slashes
- canonicalize known ATS patterns when possible

Pre-filter (exclude immediately):
- shopping/store domains
- FAQ/how-to pages known patterns
- education discounts

### Stage C: Fetch with retry/backoff
Rules:
- browser-like headers (UA, Accept-Language)
- timeout per request (e.g., 10s)
- retry 3 times with exponential backoff (2s, 4s, 8s)
- concurrency limited via p-limit

Store:
- http_status
- fetch_error type (timeout, dns, etc)

### Stage D: Page classification
Classify into:
- JOB_DETAIL
- JOB_SEARCH_RESULTS
- GENERIC_CAREERS
- NON_JOB_CONTENT
- BLOCKED/AUTH_REQUIRED/DEAD

Heuristics (MVP, deterministic):
- Presence of schema.org JobPosting JSON-LD -> likely JOB_DETAIL
- Presence of ATS markers (lever, greenhouse job JSON) -> JOB_DETAIL
- Title + description sections with headings -> JOB_DETAIL
- Minimal text + nav links only -> GENERIC

### Stage E: Eligibility filter (hard gate)
A URL passes only if:
- internship gate passes:
  - contains "intern" / "internship" OR ATS category indicates internship
  - reject explicit full-time/new-grad patterns
- target year/season gate passes:
  - must contain explicit "2026" or "Summer 2026" (configurable)
  - if contains 2024/2025 but not 2026 -> reject WRONG_YEAR
- active gate passes:
  - not closed indicators
  - not 404/410
  - not "position no longer available"

Failures are saved as EXCLUDED with reason but not shown in UI.

### Stage F: Extraction
Extract fields using priority:
1) Structured (ATS JSON, JSON-LD)
2) DOM headings sections (Location, Compensation, Qualifications, etc)
3) Regex fallback

For each high-risk field extracted:
- write extraction_evidence record with supporting snippet.

### Stage G: Dedup + upsert
- compute canonical_url
- compute dedup keys (ATS job_id if available, else fuzzy signature)
- upsert into postings:
  - if new: set site_added_date = today
  - if existing: keep site_added_date unchanged, update last_checked_at and fields

### Stage H: Post-run maintenance
- Recheck ACTIVE postings periodically
- If newly closed: status -> INACTIVE, reason -> CLOSED

## Output invariants
- No UI-visible posting is EXCLUDED.
- All UI-visible postings have site_added_date set.
- Missing fields show "Not found" consistently.

