# Testing & Quality

## Unit tests
- URL normalization (strip tracking params)
- Eligibility gates:
  - wrong year detection
  - internship vs non-internship patterns
  - closed indicators
- Extraction:
  - pay regex correctness
  - class year strict parsing
- Dedup signature generation

## Integration tests
- Known sample URLs per source type (Greenhouse/Lever/Company page)
- Snapshot expected extracted fields

## QA acceptance checks (MVP)
- No generic careers pages in UI results
- No obvious non-internship pages in UI results
- "Site Added Date" always populated
- Missing values consistently show "Not found"
- Duplicates merged (no same posting repeated across queries)

## Operational safety
- Rate limit concurrency (p-limit)
- Retries bounded
- Idempotent upserts

