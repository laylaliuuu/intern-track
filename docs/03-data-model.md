# Data Model

## Guiding rules
- Fields must be accurate; never guess.
- Use consistent fallback string: "Not found" for display text fields.
- Keep raw text evidence for high-risk fields.
- Keep both structured (date) and raw text fields when helpful for debugging.

## Tables

### companies
- id (uuid, pk)
- name (text, unique, not null)
- company_type (text, nullable)  // "big tech", "AI lab", "startup", etc
- career_base_urls (text[], nullable)
- created_at (timestamptz, default now())

### postings
Core identity + display fields
- id (uuid, pk)
- company_id (uuid, fk -> companies.id, nullable at ingest time if unknown)
- company_name (text, not null)  // denormalized for quick ingest; later backfill company_id
- title (text, not null)
- canonical_url (text, unique, not null)

Source/provenance
- source_type (text, not null)   // exa | greenhouse | lever | workday | company | curator
- discovered_via (text, nullable) // e.g., "exa:query=..."; "curator:instagram:..."

Eligibility + status
- status (text, not null)        // ACTIVE | INACTIVE | EXCLUDED
- status_reason (text, nullable) // WRONG_YEAR | CLOSED | NOT_INTERNSHIP | GENERIC | DEAD | BLOCKED | AUTH_REQUIRED | PARSE_FAILED | ...
- http_status (int, nullable)
- last_checked_at (timestamptz, not null)
- site_added_date (date, not null) // first publish date in our system

Targeting fields
- season_year (text, not null, default 'Not found') // e.g., "Summer 2026"
- class_year_value (int, nullable)   // 2027
- class_year_text (text, not null, default 'Not found')

Extracted fields (display-first)
- location_text (text, not null, default 'Not found')
- pay_text (text, not null, default 'Not found')
- posted_date (date, nullable)
- posted_date_text (text, not null, default 'Not found')
- deadline_date (date, nullable)
- deadline_text (text, not null, default 'Not found')
- requirements_text (text, not null, default 'Not found')

Timestamps
- created_at (timestamptz, default now())
- updated_at (timestamptz, default now())

### extraction_evidence
High-risk field auditing
- id (uuid, pk)
- posting_id (uuid, fk -> postings.id, not null)
- field_name (text, not null)  // pay | class_year | posted_date | deadline | location | requirements
- extracted_value (text, not null)
- supporting_snippet (text, not null)
- source_url (text, not null)
- extracted_at (timestamptz, default now())

### posting_sources (optional but recommended)
- id (uuid, pk)
- posting_id (uuid, fk -> postings.id)
- discovered_url (text, not null)
- discovery_source (text, not null) // exa | ats | curator | manual
- discovered_at (timestamptz, default now())

## Indexes (recommended)
- postings(canonical_url) unique
- postings(site_added_date desc)
- postings(status, site_added_date desc)
- postings(company_name)
- postings(title) (optional gin/trgm if doing fast search)

