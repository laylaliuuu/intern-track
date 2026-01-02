<!-- 9da7dd2c-93b0-4394-a1da-05a02312dbd4 02b57659-5104-4fec-94c3-6a95c517744c -->
# Enhanced InternTrack Data Pipeline Implementation

## Overview

Transform InternTrack into a production-ready internship aggregator with intelligent data sourcing, normalization, and quality control that focuses on high-value opportunities without overwhelming students.

## Phase 1: Foundation - Smart Normalization Engine

### 1.1 Create LLM-Based Normalization Engine

Build `src/services/normalization-engine.ts` with:

- **Role extraction**: Map job titles to standardized roles (Software Engineering, PM, Data Science, etc.)
- **Skills extraction**: Parse descriptions for technical skills (Python, React, SQL, etc.)
- **Major matching**: Infer relevant majors from job requirements
- **Eligibility detection**: Extract year requirements (Freshman, Sophomore, etc.)
- **Location parsing**: Standardize locations and detect remote work
- **Deadline extraction**: Parse application deadlines from text
- **Deduplication**: Generate canonical hashes to prevent duplicates across sources
- **Quality scoring**: Score postings based on completeness, recency, and company prestige

**Tech approach**: Use Vercel AI SDK with OpenAI GPT-4o-mini for cost-effective extraction with structured output and streaming support

### 1.2 Company Quality Scoring System (Clay-inspired)

Create `src/services/company-scoring.ts` with Clay-style account scoring approach:

- **Manual whitelist**: Curated list of ~100 top companies (FAANG, unicorns, top finance/consulting)
- **Tier system**: Tier 1 (elite), Tier 2 (strong), Tier 3 (good opportunities)
- **Multi-signal scoring**: Combine company prestige, posting quality, role competitiveness, application difficulty
- **Extensible design**: Prepare for future integration with levels.fyi/Glassdoor APIs
- **Scoring factors**: Company tier, posting freshness, role desirability, clarity of description, student fit score

### 1.3 Setup Vercel AI SDK

Create `src/lib/ai-client.ts`:

- Configure Vercel AI SDK with OpenAI provider
- Helper functions for structured extraction (roles, skills, deadlines)
- Streaming support for future interactive features
- Cost-optimized model selection (GPT-4o-mini for extraction, GPT-4o for complex reasoning)

## Phase 2: Enhanced Exa.ai Integration

### 2.1 Expand Company Targeting

Enhance `src/lib/exa-client.ts`:

- Add whitelist of 100+ high-quality companies across tech, finance, consulting
- Implement tier-based querying (prioritize Tier 1, supplement with Tier 2/3)
- Improve query templates for better precision
- Add retry logic and rate limiting

### 2.2 Optimize Search Strategy

Update `src/services/data-fetcher.ts`:

- Increase quality score threshold (currently 30 → 40+)
- Add company tier weighting to scoring algorithm
- Implement smart batching (fetch by company tier, then role)
- Add more validation filters (exclude expired postings, validate URLs)

## Phase 3: GitHub Curated Lists Integration

### 3.1 Build GitHub Scraper

Create `src/services/github-scraper.ts`:

- Target popular repos: `SimplifyJobs/Summer2025-Internships`, `pittcsc/Summer2025-Internships`
- Parse markdown tables (Company, Role, Location, Application Link)
- Normalize GitHub data to `RawInternshipData` format
- Handle various markdown formats (different repos use different schemas)
- Tag with source confidence: "community_verified"

### 3.2 Add to Ingestion Pipeline

Update `src/services/data-fetcher.ts`:

- Add GitHub as Tier 2 source (high confidence, good coverage)
- Merge with Exa results using deduplication
- Prioritize GitHub data for known-good companies

## Phase 4: ATS Connector Foundation (Prep for Future)

### 4.1 Create ATS Interface

Create `src/services/ats-connectors/base.ts`:

- Define common interface for ATS systems
- Abstract methods: `fetchJobs()`, `parseJobPosting()`, `checkStatus()`

### 4.2 Greenhouse Connector (Phase 4a - Optional for now)

Create `src/services/ats-connectors/greenhouse.ts`:

- Implement Greenhouse board scraping
- Parse structured job data (better quality than Exa)
- Target known companies using Greenhouse

### 4.3 Lever Connector (Phase 4b - Optional for now)

Create `src/services/ats-connectors/lever.ts`:

- Implement Lever API integration
- Similar to Greenhouse approach

## Phase 5: Database & API Enhancements

### 5.1 Add Quality Metadata Columns

Update `supabase/migrations/002_add_quality_fields.sql`:

- Add `company_tier` (1, 2, 3)
- Add `quality_score` (0-100)
- Add `source_confidence` (high, medium, low)
- Add `verification_status` (verified, unverified, flagged)
- Add indexes for new fields

### 5.2 Update API Filters

Enhance `src/app/api/internships/route.ts`:

- Add `minQualityScore` filter
- Add `companyTier` filter
- Default to quality score >= 50 for balanced results
- Add sorting by quality score + recency

### 5.3 Manual Ingestion Improvements

Update `src/app/api/ingestion/route.ts`:

- Add source selection parameter (exa, github, all)
- Add company tier targeting
- Add verbose logging for debugging
- Return detailed metrics per source

## Phase 6: Frontend Integration

### 6.1 Update Filter UI

Enhance `src/components/ModernFilterBar.tsx`:

- Add "Show only top companies" toggle (filters by tier 1+2)
- Add quality score filter (hidden by default, power users only)
- Add source badges (Exa, GitHub, ATS) next to listings
- Visual indicators for company tier (★★★ for tier 1, ★★ for tier 2)

### 6.2 Table Enhancements

Update `src/components/InternshipTableTemplate.tsx`:

- Add company tier badges
- Add "Verified" badges for high-confidence sources
- Sort by quality score by default (high to low)
- Add hover tooltips showing quality factors

## Phase 7: Testing & Validation

### 7.1 Data Quality Tests

Create `src/services/__tests__/`:

- Test normalization accuracy (sample 50 postings)
- Test deduplication (ensure same job from multiple sources = 1 entry)
- Test company scoring consistency
- Test GitHub parsing across different repo formats

### 7.2 Integration Testing

- Run full ingestion pipeline with dry-run mode
- Validate ~500-1000 quality results with balanced filter
- Check for false positives (full-time jobs, expired postings)
- Verify filter system works with new fields

## Implementation Order

**Immediate (Week 1-2)**:

1. Normalization engine (Phase 1.1)
2. Company scoring system (Phase 1.2)
3. Enhanced Exa integration (Phase 2)

**Short-term (Week 3-4)**:

4. GitHub scraper (Phase 3)
5. Database updates (Phase 5.1-5.2)
6. API enhancements (Phase 5.3)

**Medium-term (Week 5-6)**:

7. Frontend updates (Phase 6)
8. Testing & validation (Phase 7)

**Long-term (Future)**:

9. ATS connectors (Phase 4)
10. Automated scheduling (cron jobs)
11. Real-time updates (webhooks)

## Key Files to Create/Modify

**New Files**:

- `src/services/normalization-engine.ts` (core intelligence)
- `src/services/company-scoring.ts` (quality system)
- `src/services/github-scraper.ts` (Tier 2 source)
- `src/services/ats-connectors/base.ts` (future prep)
- `src/lib/openai-client.ts` (LLM helper)
- `supabase/migrations/002_add_quality_fields.sql` (schema update)

**Modified Files**:

- `src/lib/exa-client.ts` (better queries, company whitelist)
- `src/services/data-fetcher.ts` (multi-source orchestration)
- `src/services/ingestion-service.ts` (integrate new normalization)
- `src/app/api/internships/route.ts` (quality filters)
- `src/app/api/ingestion/route.ts` (source selection)
- `src/components/ModernFilterBar.tsx` (tier filters)
- `src/components/InternshipTableTemplate.tsx` (quality indicators)
- `src/types/index.ts` (new types for tiers, quality scores)

## Success Metrics

After implementation, InternTrack should deliver:

- **Quality**: 80%+ of listings are relevant undergraduate internships
- **Freshness**: Listings updated within 48 hours of posting
- **Coverage**: 500-2000 high-quality listings across roles/companies
- **No Overwhelm**: Smart defaults show best ~200 opportunities
- **Precision**: <10% false positives (full-time, expired, or irrelevant posts)
- **Deduplication**: <5% duplicate listings across sources

### To-dos

- [ ] Build LLM-based normalization engine with role extraction, skills parsing, major matching, eligibility detection, and deduplication
- [ ] Create company quality scoring system with manual whitelist (100+ companies) and tier classification
- [ ] Create OpenAI client helper for structured LLM extraction with proper error handling
- [ ] Expand Exa.ai company whitelist and optimize search queries with tier-based targeting
- [ ] Update data fetcher with higher quality thresholds and company tier weighting
- [ ] Build GitHub curated lists scraper for SimplifyJobs and pittcsc repos
- [ ] Integrate GitHub scraper into data fetcher as Tier 2 source with deduplication
- [ ] Create migration to add quality fields (company_tier, quality_score, source_confidence, verification_status)
- [ ] Add quality score and company tier filters to internships API endpoint
- [ ] Update ingestion API with source selection and detailed metrics
- [ ] Add company tier toggle and quality indicators to filter bar
- [ ] Add tier badges, verified badges, and quality-based sorting to internship table
- [ ] Run end-to-end ingestion pipeline test and validate quality metrics