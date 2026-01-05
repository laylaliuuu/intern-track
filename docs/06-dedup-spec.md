# Dedup Spec

## Goal
Prevent duplicate postings from:
- identical URLs returned across multiple queries
- different URLs pointing to same job (tracking params, mirrored pages)
- same job found via Exa and ATS directly

## Canonical URL normalization
- Remove tracking params (utm_*, gclid, fbclid, ref, etc)
- Normalize http/https where safe
- Trim trailing slash consistency

## Identity keys (priority order)
1) ATS job ID (Greenhouse/Lever/Workday identifiers if extractable)
2) JSON-LD identifier
3) Fuzzy signature:
   - normalized(company_name) + normalized(title) + normalized(location_text) + hash(first N chars of description/requirements)

## Merge behavior
- The canonical posting record owns:
  - canonical_url
  - best extracted fields
  - stable site_added_date
- Provenance:
  - store all discovered URLs in posting_sources
  - keep discovery_source + discovered_at

## Field conflict policy
When merging, prefer:
- structured ATS fields over regex/DOM
- non-"Not found" over "Not found"
- newer last_checked_at fields only if they have evidence
Never overwrite a high-confidence/evidenced field with a low-confidence one.

