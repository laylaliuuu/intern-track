---
name: Enhanced InternTrack Data Pipeline Implementation
overview: ""
todos:
  - id: 30f4b9be-8089-4c9d-b07d-08e5362173a9
    content: Build LLM-based normalization engine with role extraction, skills parsing, major matching, eligibility detection, and deduplication
    status: pending
  - id: df3cd28e-ea80-430e-b7e7-d09887402261
    content: Create company quality scoring system with manual whitelist (100+ companies) and tier classification
    status: pending
  - id: 7a337669-78f4-45f6-9c11-a44adf8cc395
    content: Create OpenAI client helper for structured LLM extraction with proper error handling
    status: pending
  - id: 2c683067-7fee-440c-b5d9-331613c77767
    content: Expand Exa.ai company whitelist and optimize search queries with tier-based targeting
    status: pending
  - id: 3616df71-ce2e-4688-967c-896ed734e358
    content: Update data fetcher with higher quality thresholds and company tier weighting
    status: pending
  - id: eace26b9-2407-4513-bf58-246e9521ecd9
    content: Build GitHub curated lists scraper for SimplifyJobs and pittcsc repos
    status: pending
  - id: 6112b833-18a0-48b7-92b5-1b82848c8ea0
    content: Integrate GitHub scraper into data fetcher as Tier 2 source with deduplication
    status: pending
  - id: 7a45744a-25df-4fcf-b0e6-9bd0df819339
    content: Create migration to add quality fields (company_tier, quality_score, source_confidence, verification_status)
    status: pending
  - id: b94ac095-21ef-4575-9048-8a123656f93d
    content: Add quality score and company tier filters to internships API endpoint
    status: pending
  - id: 2494684c-e444-49b3-b959-6cccbf4c38b8
    content: Update ingestion API with source selection and detailed metrics
    status: pending
  - id: 05504686-9e2e-480a-af74-35fd12c5c20e
    content: Add company tier toggle and quality indicators to filter bar
    status: pending
  - id: 01fc457d-e64c-496a-aa7d-182c90fa7f4a
    content: Add tier badges, verified badges, and quality-based sorting to internship table
    status: pending
  - id: 50c6bc6c-75ce-45bf-b511-c03b20055ee4
    content: Run end-to-end ingestion pipeline test and validate quality metrics
    status: pending
---

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