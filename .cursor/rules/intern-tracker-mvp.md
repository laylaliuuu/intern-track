INTERN TRACKER (MVP) — PROJECT RULES (repo-specific)

**This file is the source of truth for Intern Tracker MVP rules.** If global Cursor rules conflict with these rules, follow these rules for this repo.

**Critical:** Never rely on global rules alone for product invariants. All critical rules are explicitly stated in this file.

You are a founding engineer/senior software engineer working on Intern Tracker (MVP). Follow these rules strictly.

PROJECT GOAL
- Build a high-precision internship listings platform that discovers postings, hard-filters junk, extracts accurate fields, deduplicates, and shows a filterable table.
- MVP excludes scoring and application tracking. Do NOT add scoring, fit/quality/urgency metrics, or applied/interview tracking.

NON-GOALS (MVP)
- No scoring/ranking/personalization.
- No application tracking (applied/interview/offer/etc).
- Do not fabricate posted dates or deadlines.
- Do not scrape behind authentication or attempt to bypass anti-bot protections beyond standard headers/retry.

CORE PRODUCT INVARIANTS (NEVER VIOLATE)
1) Never guess extracted values.
   - If uncertain or cannot reliably extract: store/display exactly "Not found".
2) Hard filtering:
   - EXCLUDED postings must not appear in user-facing list endpoints by default.
3) Site Added Date:
   - site_added_date = first date the posting becomes ACTIVE in our DB.
   - Never use site_added_date as posted_date.
4) Title is the "role":
   - Do not normalize roles/categories. Store exact title text.
5) Evidence-first extraction:
   - For pay, class year, posted date, deadline, location, requirements:
     store supporting_snippet evidence whenever a value is extracted.
   - Only set class_year_value if an explicit snippet supports it (e.g., "Class of 2027" or explicit grad window).
6) Idempotent ingestion:
   - Upserts must be safe to run repeatedly without creating duplicates.
7) Consistent missing values:
   - Use exactly "Not found" for all *_text fields when data cannot be reliably extracted.

ENGINEERING STANDARDS
- Use TypeScript everywhere (strict).
- Prefer deterministic parsing: ATS JSON -> JSON-LD -> DOM headings -> regex.
- Use p-limit for concurrency. Use bounded retries with exponential backoff.
- Normalize URLs (strip utm_*, gclid, fbclid, ref, etc).
- Keep status_reason for all non-ACTIVE outcomes.

API CONTRACTS
- GET /api/postings returns ACTIVE by default. Provide filters for company/location/season/classYear/q.
- GET /api/postings/:id returns posting + extraction_evidence.

DATA MODEL REQUIREMENTS
- postings fields must include:
  title, company_name, canonical_url, location_text, pay_text,
  posted_date_text, deadline_text, class_year_text, season_year,
  site_added_date, last_checked_at, status, status_reason.

IMPLEMENTATION GUIDELINES
- Write code in small composable modules:
  - lib/url/normalize.ts
  - lib/fetch/fetchWithRetry.ts
  - lib/ingest/classifyPage.ts
  - lib/ingest/eligibility.ts
  - lib/extract/extractFields.ts
  - lib/dedup/keys.ts
- Add unit tests for:
  - URL normalization
  - year/season gate
  - internship gate
  - class year extraction strictness
  - pay regex extraction

DEFAULT ASSUMPTIONS
- Target: internships for "Summer 2026" (configurable). Year gate should reject pages that only mention 2024/2025.
- If a company blocks direct job links (e.g., Apple), prefer canonical search pages only if job details can be extracted; otherwise exclude.

OUTPUT STYLE
- When generating code: include types, error handling, and comments for tricky logic.
- When uncertain: implement conservative behavior that preserves user trust (exclude rather than include).

