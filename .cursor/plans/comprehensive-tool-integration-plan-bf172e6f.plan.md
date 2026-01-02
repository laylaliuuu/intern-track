<!-- bf172e6f-453c-44c6-8e91-6b5cea82931f 1730d3c8-f7a9-4bd4-a99c-5d5e688d5459 -->
# Comprehensive InternTrack Enhancement - Complete Master Plan

## Overview

Transform InternTrack into a production-ready, sophisticated internship discovery platform that combines:

1. **Smart Data Pipeline** - LLM-based normalization, multi-source aggregation (Exa, GitHub, ATS), quality scoring
2. **Ontology System** - Palantir-style structured relationships, graph queries, Clay-inspired account scoring
3. **Hidden Opportunities** - Exa Websets integration for unlisted companies and stealth startups
4. **Complete Tool Utilization** - Full integration of all specified tools (TanStack Table/Virtual, React Query, Shadcn, etc.)
5. **Asymmetric Bet Principles** - Hidden gems detection, personal moat building features

This plan merges two comprehensive approaches into one cohesive implementation roadmap.

## Phase 1: Tool Audit & Documentation

### 1.1 Document Current Tool Usage

Create comprehensive documentation showing where and how each tool is currently used:

- **Exa.ai API**: Already integrated in `src/lib/exa-client.ts` - neural search with p-limit rate limiting
- **p-limit**: Used for concurrency control in Exa API calls (line 5 in exa-client.ts)
- **TanStack Table**: Installed but not yet implemented in InternshipTableTemplate.tsx
- **TanStack Virtual**: Installed but needs implementation for large datasets
- **React Query**: Installed but minimal usage - needs hooks in `src/hooks/use-internships.ts`
- **Supabase**: Configured in `src/lib/supabase.ts` for PostgreSQL + real-time
- **Shadcn**: Partially used (FilterButton) but not fully leveraged
- **Next.js 14**: App router structure in place
- **Tailwind CSS**: Fully integrated

### 1.2 Identify Missing Integrations

- Exa Websets API for company discovery
- Apollo.io (skipped per requirements)
- Vercel AI SDK (skipped per requirements)

## Phase 2: Ontology System (Palantir-Inspired)

### 2.1 Enhanced Data Model

Build structured relationships between entities inspired by Palantir Foundry:

**Core Entities:**

- **Internship** ↔ **Company** (many-to-one)
- **Internship** ↔ **Role** (taxonomy)
- **Company** ↔ **Industry** (classification)
- **Company** ↔ **CompanyMetadata** (size, funding, stage)
- **Internship** ↔ **Skills** (many-to-many)
- **Internship** ↔ **Majors** (relevance scoring)

**New Tables to Add:**

```sql
-- Company metadata for ontology
CREATE TABLE company_metadata (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  size_category TEXT, -- startup, small, medium, large, fortune500
  industry TEXT[],
  founded_year INTEGER,
  funding_stage TEXT, -- seed, series-a, public, etc.
  employee_count_range TEXT,
  glassdoor_rating DECIMAL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Relationship: Company to similar companies
CREATE TABLE company_relationships (
  id UUID PRIMARY KEY,
  company_a_id UUID REFERENCES companies(id),
  company_b_id UUID REFERENCES companies(id),
  relationship_type TEXT, -- competitor, partner, similar, parent, subsidiary
  confidence_score DECIMAL,
  created_at TIMESTAMP
);

-- Skills taxonomy
CREATE TABLE skills (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE,
  category TEXT, -- technical, soft, domain
  parent_skill_id UUID REFERENCES skills(id),
  created_at TIMESTAMP
);

-- Internship to skills mapping
CREATE TABLE internship_skills (
  internship_id UUID REFERENCES internships(id),
  skill_id UUID REFERENCES skills(id),
  importance_score DECIMAL, -- 0-1 how critical this skill is
  PRIMARY KEY (internship_id, skill_id)
);

-- Student profiles (for personalization)
CREATE TABLE student_profiles (
  id UUID PRIMARY KEY,
  user_id UUID, -- link to auth if needed later
  major TEXT[],
  skills TEXT[],
  year_level TEXT,
  target_roles TEXT[],
  preferred_locations TEXT[],
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Internship quality scoring (Clay-inspired)
CREATE TABLE internship_scores (
  id UUID PRIMARY KEY,
  internship_id UUID REFERENCES internships(id),
  quality_score DECIMAL, -- 0-100 overall quality
  competitiveness_score DECIMAL, -- how hard to get
  learning_score DECIMAL, -- educational value
  brand_value_score DECIMAL, -- resume impact
  compensation_score DECIMAL,
  calculated_at TIMESTAMP,
  UNIQUE(internship_id)
);
```

### 2.2 Scoring Engine (Clay-Style Account Scoring)

Create `src/services/scoring-engine.ts`:

- Quality scoring algorithm (already partially in data-fetcher.ts)
- Competitiveness estimation (based on company prestige, requirements)
- Learning potential scoring (based on role, company size, mentorship signals)
- Brand value scoring (Fortune 500, FAANG, unicorns get higher scores)
- Personalized match scoring (student profile ↔ internship requirements)

### 2.3 Ontology Query Service

Create `src/services/ontology-service.ts`:

- Graph-like queries across relationships
- "Show me internships at companies similar to Google"
- "Find roles requiring skills I have"
- "Discover opportunities at companies backed by [VC firm]"

## Phase 3: Exa Websets Integration - Hidden Opportunities

### 3.1 Company Discovery Pipeline

Create `src/services/websets-discovery.ts`:

- Use Exa Websets API to discover companies that DON'T post on job boards
- Find startups in stealth mode with potential internship opportunities
- Identify growing companies before they appear on mainstream boards
- Target: 100+ "hidden gem" companies per quarter

**Implementation:**

```typescript
// Discover companies from Websets
async discoverHiddenCompanies() {
  // Query Websets for:
  // - YC companies with <50 employees
  // - Series A/B startups in target verticals
  // - Companies hiring in specific tech stacks
  // - Fast-growing companies (Wellfound signals)
}
```

### 3.2 Proactive Outreach Data

Even though we're skipping Apollo integration, prepare data structures:

- Store company employee data (future: for cold emailing)
- Track hiring manager names/titles from Websets
- Store "signals" that company might hire (growth, funding news)

## Phase 3.5: Instagram Stories Integration (Limited Implementation)

### 3.5.1 Instagram API Limitations Assessment

**Current Reality (2024):**

- Instagram Basic Display API does NOT provide access to other users' stories
- No official API endpoint for downloading stories from other accounts
- Third-party tools exist but violate Instagram's Terms of Service
- Manual methods (screenshots/recordings) are the only compliant approaches

### 3.5.2 Alternative Social Media Job Discovery

Since Instagram stories access is not feasible via API, implement alternative approaches:

**LinkedIn Integration (Recommended):**

```typescript
// src/services/linkedin-discovery.ts
async discoverJobsFromLinkedIn() {
  // Use LinkedIn API to find:
  // - Job posts from companies
  // - Employee posts about hiring
  // - Company updates about internships
  // - Recruiter activity signals
}
```

**Twitter/X Integration:**

```typescript
// src/services/twitter-discovery.ts
async discoverJobsFromTwitter() {
  // Monitor Twitter for:
  // - #hiring hashtags
  // - Company job announcements
  // - Recruiter tweets about opportunities
  // - Startup funding announcements (hiring signals)
}
```

### 3.5.3 Manual Instagram Story Monitoring (User-Initiated)

Create a feature for users to manually input job information they find:

```typescript
// src/components/ManualJobInput.tsx
interface ManualJobInput {
  source: 'instagram_story' | 'linkedin_post' | 'twitter' | 'other';
  content: string;
  company?: string;
  role?: string;
  deadline?: string;
  user_notes?: string;
}
```

**Implementation:**

- Form for users to submit job info they found on social media
- OCR text extraction from uploaded screenshots
- Integration with existing normalization engine
- Credit system for users who contribute valuable job leads

### 3.5.4 Ethical Considerations

**Privacy & Legal Compliance:**

- Never automate Instagram story access (violates ToS)
- Focus on publicly available information only
- Implement user consent for any data collection
- Provide clear attribution for job sources
- Respect content creators' rights

**Alternative Data Sources:**

- Company career pages (scraping with robots.txt compliance)
- Public job board APIs
- RSS feeds from company blogs
- GitHub job postings
- Discord/Slack community job channels

## Phase 4: Complete React Query Integration

### 4.1 Enhanced Hooks

Update `src/hooks/use-internships.ts`:

```typescript
// Queries
- useInternships(filters) - paginated list
- useInternshipDetail(id) - single internship
- useCompanySuggestions() - for search autocomplete
- useFilterOptions() - dynamic filter options
- useSimilarInternships(id) - ontology-based recommendations

// Mutations
- useSaveInternship() - bookmark
- useUpdateApplicationStatus()
- useReportIssue()
```

### 4.2 Optimistic Updates & Caching

- Implement React Query devtools
- Configure stale times, cache times
- Prefetch on hover for internship details

## Phase 5: TanStack Table + Virtual Implementation

### 5.1 Replace InternshipTableTemplate.tsx

Current implementation uses basic grid layout. Upgrade to:

- TanStack Table with sorting, filtering, column resizing
- TanStack Virtual for 10,000+ row performance
- Row selection, bulk actions
- Export functionality (CSV)

### 5.2 Advanced Table Features

- Column visibility toggles
- Saved filter presets
- Custom column ordering
- Sticky header on scroll

## Phase 6: Missing Normalization Engine

The ingestion-service.ts references `normalization-engine` but the file doesn't exist!

### 6.1 Create Normalization Engine

Create `src/services/normalization-engine.ts`:

- Parse raw job descriptions into structured fields
- Extract skills, requirements, eligibility criteria
- Detect internship cycle (Summer 2025, Fall 2025)
- Standardize location formats
- Generate canonical hash for deduplication
- Infer missing fields (remote status, work type)

### 6.2 NLP Enhancements

- Keyword extraction for skills
- Sentiment analysis for company culture signals
- Compensation parsing (e.g., "$35-40/hr" → structured data)
- Deadline extraction using date parsing

## Phase 7: Real-time & Notifications

### 7.1 Supabase Real-time Subscriptions

Enhance `src/components/RealtimeProvider.tsx`:

- Subscribe to new internships matching user filters
- Notify when saved internships are updated
- Alert when application deadlines approach

### 7.2 Notification System

Enhance `src/components/NotificationSystem.tsx`:

- Toast notifications for new matches
- Email digest (future)
- Browser notifications for deadline reminders

## Phase 8: Shadcn Component Library Expansion

### 8.1 Replace Custom Components

Current custom implementations to replace with Shadcn:

- FilterButton → Shadcn Button + Dropdown
- ModernFilterBar → Shadcn Popover + Command
- InternshipDetail → Shadcn Dialog + Card

### 8.2 Add Missing Shadcn Components

Install and configure:

- Command palette for search
- Data table component
- Toast notifications
- Badge components for tags
- Tabs for different views
- Calendar for deadline visualization

## Phase 9: API Completeness

### 9.1 Missing API Routes

Current APIs: filters, health, ingestion, internships

Add:

- `/api/companies` - company search and details
- `/api/ontology/similar` - ontology-based recommendations
- `/api/scoring` - quality and match scores
- `/api/websets/discover` - trigger discovery jobs
- `/api/analytics` - usage metrics

### 9.2 Enhanced Internship API

Update `/api/internships/route.ts`:

- Add full-text search with Supabase
- Implement relationship expansion (include company metadata)
- Add scoring in responses
- Optimize queries with proper indexes

## Phase 10: Database Migrations

### 10.1 Create New Migrations

Add to `supabase/migrations/`:

- `002_ontology_tables.sql` - company_metadata, relationships, skills
- `003_scoring_tables.sql` - internship_scores, student_profiles
- `004_indexes.sql` - performance indexes
- `005_functions.sql` - PostgreSQL functions for scoring

### 10.2 Add Full-Text Search

```sql
-- Add tsvector column for fast search
ALTER TABLE internships ADD COLUMN search_vector tsvector;
CREATE INDEX internships_search_idx ON internships USING gin(search_vector);
```

## Phase 11: Asymmetric Bet Features (Inspired by Articles)

### 11.1 "Hidden Gems" Section

Highlight high-potential, low-competition opportunities:

- Early-stage startups with strong backing
- Programs with high return-to-offer rates
- Less-known companies with excellent learning opportunities

### 11.2 "Personal Moat" Builder

Help students build unique positioning:

- Recommend non-obvious skill combinations
- Suggest undersubscribed internship categories
- Identify emerging roles before they become saturated

## Phase 12: Testing & Quality

### 12.1 Expand Test Coverage

Add tests in `__tests__/`:

- Normalization engine unit tests
- Scoring algorithm tests
- Ontology query tests
- API route integration tests
- Component tests for new UI

### 12.2 E2E Testing

Add Playwright or Cypress for:

- Complete user flows
- Filter and search functionality
- Real-time update behavior

## Implementation Order

**Priority 1 (Critical Path):**

1. Create normalization-engine.ts (Phase 6) - BLOCKING ingestion
2. Complete React Query hooks (Phase 4)
3. Implement TanStack Table (Phase 5)
4. Document current tool usage (Phase 1)

**Priority 2 (Core Features):**

5. Build ontology tables and service (Phase 2)
6. Add scoring engine (Phase 2.2)
7. Integrate Exa Websets (Phase 3)
8. Implement manual job input system (Phase 3.5.3)
9. Create database migrations (Phase 10)

**Priority 3 (Polish):**

9. Replace with Shadcn components (Phase 8)
10. Add missing APIs (Phase 9)
11. Real-time enhancements (Phase 7)
12. Asymmetric bet features (Phase 11)
13. Testing expansion (Phase 12)

## Success Metrics

- **Tool Coverage**: 100% of specified tools documented and utilized
- **Data Quality**: Ontology covering 500+ companies with metadata
- **Hidden Opportunities**: 100+ companies discovered via Websets
- **Performance**: <100ms p95 query time, virtualization handles 10k+ rows
- **User Value**: Personalized scoring matches user profiles
- **Code Quality**: 80%+ test coverage on core services

### To-dos

- [ ] Audit and document all current tool usage across the codebase
- [ ] Create normalization-engine.ts to fix broken ingestion service
- [ ] Design and create ontology database schema (company_metadata, relationships, skills)
- [ ] Write Supabase migrations for ontology and scoring tables
- [ ] Build Clay-style scoring engine for internship quality and personalization
- [ ] Implement ontology-service.ts for graph-like relationship queries
- [ ] Integrate Exa Websets API for hidden company discovery
- [ ] Build company discovery pipeline to find unlisted opportunities
- [ ] Complete React Query hooks for queries and mutations
- [ ] Replace InternshipTableTemplate with TanStack Table + Virtual
- [ ] Replace custom components with Shadcn UI equivalents
- [ ] Add missing API routes (companies, ontology, scoring, websets)
- [ ] Enhance real-time subscriptions and notification system
- [ ] Build Hidden Gems and Personal Moat Builder features
- [ ] Expand test coverage for all new services and components