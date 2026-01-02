# InternTrack Codebase Guide

This document provides a comprehensive overview of the InternTrack codebase, explaining what each file does and how it contributes to the website.

## 📁 Project Structure Overview

```
internship-aggregator/
├── src/
│   ├── app/                    # Next.js 14 App Router pages and API routes
│   ├── components/             # React components
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Utility libraries and clients
│   ├── providers/              # React context providers
│   ├── services/               # Business logic and data services
│   └── types/                  # TypeScript type definitions
├── supabase/                   # Database migrations and schema
└── public/                     # Static assets
```

---

## 🎯 Core Application Files

### `/src/app/page.tsx` - Main Homepage
**Purpose**: The main landing page for the internship aggregator  
**Contribution**: 
- Displays the internship search interface with filters
- Shows the table of internships with pagination and sorting
- Includes the "Hidden Gems" section for underrated opportunities
- Handles real-time updates via WebSocket subscriptions

**Key Features**:
- Modern filter bar with role, location, major, work type, and eligibility filters
- Real-time connection status indicator
- Error handling and loading states
- Responsive design with Tailwind CSS

---

### `/src/app/layout.tsx` - Root Layout
**Purpose**: Root layout wrapper for the entire application  
**Contribution**:
- Wraps all pages with necessary providers (React Query, Realtime, Notifications)
- Sets up global error handling
- Configures metadata for SEO
- Handles browser extension integration

**Key Providers**:
- `QueryProvider`: React Query for data fetching and caching
- `RealtimeProvider`: Supabase real-time subscriptions
- `NotificationProvider`: Toast notifications for user feedback
- `ClientErrorBoundary`: Error boundary for graceful error handling

---

## 🔌 API Routes (`/src/app/api/`)

### `/api/internships/route.ts` - Fetch Internships
**Purpose**: Main API endpoint for fetching internships with filters  
**Contribution**: Returns paginated, filtered, and sorted internship listings

**Query Parameters**:
- `roles[]`: Filter by role (e.g., "software-engineering")
- `majors[]`: Filter by relevant major
- `locations[]`: Filter by location
- `isRemote`: Filter remote/hybrid/onsite
- `workType[]`: Filter by compensation type
- `eligibilityYear[]`: Filter by class year
- `internshipCycle`: Filter by season (e.g., "summer-2026")
- `search`: Full-text search across title, company, description
- `limit`, `offset`: Pagination
- `sortBy`, `sortOrder`: Sorting options

---

### `/api/internships/[id]/route.ts` - Single Internship
**Purpose**: Fetch details for a specific internship by ID  
**Contribution**: Provides full internship details including company info, requirements, and application URL

---

### `/api/ingestion/route.ts` - Data Ingestion
**Purpose**: Trigger the data ingestion pipeline to fetch new internships  
**Contribution**: Manually trigger scraping and ingestion of new internship data

**Process**:
1. Fetch raw data from various sources (GitHub, Exa.ai, web scraping)
2. Normalize and clean the data
3. Store in Supabase database
4. Return ingestion metrics

---

### `/api/filters/*` - Filter Options
**Purpose**: Provide available filter options dynamically  
**Contribution**: Powers the filter dropdowns with actual data from the database

**Endpoints**:
- `/api/filters/roles`: Available role categories
- `/api/filters/locations`: Available locations
- `/api/filters/majors`: Relevant majors
- `/api/filters/route`: All filter options at once

---

### `/api/hidden-gems/*` - Hidden Gems
**Purpose**: Identify and serve "hidden gem" internships  
**Contribution**: Surfaces underrated opportunities at smaller companies

**Endpoints**:
- `/api/hidden-gems/route`: Get all hidden gems
- `/api/hidden-gems/category/route`: Get by category
- `/api/hidden-gems/trending/route`: Get trending hidden gems
- `/api/hidden-gems/stats/route`: Get statistics

**Algorithm**: Scores companies based on:
- Application volume (lower is better for hidden gems)
- Company size and funding
- Recent growth metrics
- Engineering quality indicators

---

### `/api/ontology/*` - Skill Ontology
**Purpose**: Skill-based recommendation and mapping  
**Contribution**: Helps users discover internships based on skill requirements

**Endpoints**:
- `/api/ontology/skills/route`: Get required skills for roles
- `/api/ontology/similar/route`: Find similar roles based on skills

---

### `/api/scoring/route.ts` - Internship Scoring
**Purpose**: Score internships based on various quality metrics  
**Contribution**: Helps prioritize high-quality opportunities

**Scoring Factors**:
- Company prestige and reputation
- Compensation and benefits
- Role clarity and description quality
- Application requirements (easier = higher score)
- Recency of posting

---

### `/api/health/route.ts` - Health Check
**Purpose**: Monitor application health  
**Contribution**: Verifies database connection and service status

---

### `/api/websets/discover/route.ts` - Company Discovery
**Purpose**: Discover new companies to track  
**Contribution**: Automatically finds new companies hiring interns using Exa.ai

---

### `/api/personal-moat/route.ts` - Personal Moat Analysis
**Purpose**: Analyze user's unique strengths  
**Contribution**: Provides personalized career advice based on skills and interests

---

## 🧩 Components (`/src/components/`)

### `InternshipTableTemplate.tsx` - Main Table
**Purpose**: Virtualized table component for displaying internships  
**Contribution**: 
- Efficient rendering of large datasets using TanStack Virtual
- Sortable columns
- Click-to-expand for details
- Responsive design

**Tech Stack**: TanStack Table + TanStack Virtual for performance

---

### `ModernFilterBar.tsx` - Filter Interface
**Purpose**: Advanced filtering UI  
**Contribution**:
- Multi-select filters for roles, majors, locations
- Toggle filters for remote/hybrid/onsite
- Year level and cycle filters
- Search input
- Clear filters button
- Shows active filter count

---

### `HiddenGemsSection.tsx` - Hidden Gems UI
**Purpose**: Display hidden gem internships  
**Contribution**: Showcases underrated opportunities in a visually distinct section

---

### `RealtimeProvider.tsx` - Real-time Updates
**Purpose**: WebSocket connection to Supabase  
**Contribution**: 
- Subscribes to database changes
- Automatically updates UI when new internships are added
- Shows connection status

---

### `NotificationSystem.tsx` - Toast Notifications
**Purpose**: User feedback system  
**Contribution**: Shows success/error/info messages to users

---

### `ClientErrorBoundary.tsx` - Error Handling
**Purpose**: Catches and displays React errors gracefully  
**Contribution**: Prevents entire app from crashing due to component errors

---

### `BrowserExtensionHandler.tsx` - Extension Integration
**Purpose**: Handles communication with browser extension  
**Contribution**: Allows users to save internships from anywhere on the web

---

### `FilterButton.tsx` - Reusable Filter Button
**Purpose**: Styled button component for filters  
**Contribution**: Consistent filter UI across the app

---

### UI Components (`/src/components/ui/`)
**Purpose**: Shadcn UI components (badge, button, card, tabs)  
**Contribution**: Consistent, accessible UI components built on Radix UI

---

## 🎣 Hooks (`/src/hooks/`)

### `use-internships.ts` - Data Fetching Hooks
**Purpose**: Custom React hooks for fetching data with React Query  
**Contribution**:

**Hooks**:
- `useInternships(filters)`: Fetch internships with filters
- `useFilterOptions()`: Fetch available filter options (roles, locations, majors)
- `useInternship(id)`: Fetch single internship by ID

**Benefits**:
- Automatic caching and deduplication
- Loading and error states
- Automatic refetching on window focus
- Optimistic updates

---

## 📚 Libraries (`/src/lib/`)

### `supabase.ts` - Database Client
**Purpose**: Supabase client configuration  
**Contribution**: Provides authenticated access to PostgreSQL database

**Exports**:
- `supabase`: Browser client (row-level security)
- `getSupabaseAdmin()`: Server-side admin client (bypasses RLS)

---

### `exa-client.ts` - Exa.ai Search Client
**Purpose**: AI-powered web search for finding internships  
**Contribution**: Discovers new internship postings across the web

**Methods**:
- `searchByRole()`: Search for internships by role
- `searchCompanyPrograms()`: Find company-specific programs
- `searchDiversityPrograms()`: Find diversity and inclusion programs
- `healthCheck()`: Verify API connectivity

---

### `logger.ts` - Logging System
**Purpose**: Structured logging for debugging and monitoring  
**Contribution**: Tracks application behavior and errors

**Levels**: info, warn, error, debug

---

### `error-handling.ts` - Error Utilities
**Purpose**: Centralized error handling  
**Contribution**: 
- `asyncHandler()`: Wraps async API routes with try-catch
- `handleApiError()`: Formats error responses
- `setupGlobalErrorHandling()`: Catches unhandled errors

---

### `circuit-breaker.ts` - Circuit Breaker Pattern
**Purpose**: Prevent cascading failures  
**Contribution**: Temporarily disables failing external services

---

### `validation.ts` - Zod Schemas
**Purpose**: Runtime type validation  
**Contribution**: Validates API inputs and outputs

---

### `utils.ts` - Utility Functions
**Purpose**: Helper functions (e.g., `cn()` for className merging)  
**Contribution**: Common utilities used across the app

---

### `react-query.ts` - React Query Config
**Purpose**: React Query default configuration  
**Contribution**: Sets up caching, retry, and stale time settings

---

### External API Clients:
- `serper-client.ts`: Google search API client
- `tavily-client.ts`: AI-powered search client

---

## 🚀 Services (`/src/services/`)

### Core Services

#### `ingestion-service.ts` - Data Ingestion Pipeline
**Purpose**: Orchestrates the complete data ingestion process  
**Contribution**: Fetches → Normalizes → Stores internship data

**Pipeline**:
1. **Fetch**: Pull data from multiple sources
2. **Normalize**: Clean and standardize data
3. **Store**: Insert into Supabase database

**Methods**:
- `ingest(options)`: Run full pipeline
- `ingestCompanies(companies)`: Ingest specific companies
- `ingestDiversityPrograms()`: Ingest diversity programs
- `healthCheck()`: Verify service health

---

#### `data-fetcher.ts` - Data Source Orchestrator
**Purpose**: Fetches data from multiple sources  
**Contribution**: Aggregates internships from various platforms

**Data Sources**:
1. **GitHub Scraper**: Curated lists (SimplifyJobs, pittcsc, etc.)
2. **Exa.ai Search**: AI-powered web search
3. **Comprehensive Scraper**: Direct company career pages (Puppeteer)
4. **Company Orchestrator**: ATS systems (Greenhouse, Lever, etc.)

**Process**:
- Runs enabled sources in parallel
- Deduplicates results
- Scores and ranks by quality
- Filters out expired/invalid postings

---

#### `hidden-gems-service.ts` - Hidden Gem Discovery
**Purpose**: Identifies underrated internship opportunities  
**Contribution**: Surfaces high-quality internships at less-known companies

**Algorithm**:
- Analyzes application volume
- Considers company metrics (funding, size, growth)
- Identifies trending opportunities
- Categories by industry/role

---

#### `ontology-service.ts` - Skill Mapping
**Purpose**: Maps skills to roles and vice versa  
**Contribution**: Enables skill-based recommendations

**Features**:
- Skill extraction from job descriptions
- Role similarity scoring
- Skill requirement analysis

---

### Data Processing (`/src/services/data-processing/`)

#### `normalization-engine.ts` - Data Normalization
**Purpose**: Cleans and standardizes raw internship data  
**Contribution**: Ensures data consistency and quality

**Normalization Steps**:
1. Extract and clean title
2. Normalize location (city, state, remote status)
3. Extract work type (remote/hybrid/onsite)
4. Parse compensation
5. Extract requirements and skills
6. Determine eligibility (class year, graduation year)
7. Extract application deadline
8. Identify internship cycle (summer/fall/spring)
9. Calculate canonical hash for deduplication

**Key Methods**:
- `normalize(raw)`: Normalize single internship
- `normalizeMany(raw[])`: Batch normalization
- `extractRole()`: Determine role category
- `extractMajors()`: Extract relevant majors
- `extractCompensation()`: Parse pay information

---

#### `scoring-engine.ts` - Quality Scoring
**Purpose**: Scores internships based on multiple quality factors  
**Contribution**: Helps prioritize best opportunities

**Scoring Factors** (0-100):
- **Company Prestige** (25%): Brand recognition
- **Compensation** (25%): Pay competitiveness  
- **Role Quality** (20%): Description clarity
- **Requirements** (15%): Application difficulty
- **Recency** (15%): How recently posted

---

### Scraping (`/src/services/scraping/`)

#### `github-scraper.ts` - GitHub Scraper
**Purpose**: Scrapes curated internship lists from GitHub  
**Contribution**: Reliable source of verified internships

**Repositories Scraped**:
- SimplifyJobs/Summer2026-Internships
- pittcsc/Summer2026-Internships
- SimplifyJobs/New-Grad-Positions
- ReaVNaiL/New-Grad-2026
- coderQuad/New-Grad-Positions

**Process**:
1. Fetch README markdown
2. Parse tables and lists
3. Extract URLs, companies, locations
4. Filter for 2026 internships
5. Validate URLs

---

#### `comprehensive-scraper.ts` - Web Scraper
**Purpose**: Scrapes company career pages using Puppeteer  
**Contribution**: Direct scraping when APIs are unavailable

**Targets**:
- Google, Microsoft, Meta, Apple, Amazon, Netflix, Tesla
- Greenhouse, Lever (ATS platforms)

**Tech**: Puppeteer (headless Chrome)

---

#### `company-scraping-orchestrator.ts` - Company Orchestrator
**Purpose**: Routes scraping to appropriate method per company  
**Contribution**: Handles company-specific scraping strategies

**Methods Supported**:
- `greenhouse_api`: Greenhouse ATS
- `lever_api`: Lever ATS
- `ashby_api`: Ashby ATS
- `workday_static`: Workday scraping
- `puppeteer`: Fallback web scraping

---

#### `scrapers/workday-scraper.ts` - Workday Scraper
**Purpose**: Scrapes Workday-based career pages  
**Contribution**: Many large companies use Workday

**Status**: Currently disabled due to compatibility issues

---

### API Clients (`/src/services/api-clients/ats/`)

#### `greenhouse-client.ts` - Greenhouse API
**Purpose**: Fetches jobs from Greenhouse ATS  
**Contribution**: Access to thousands of companies using Greenhouse

**API**: `https://boards-api.greenhouse.io/v1/boards/{token}/jobs`

---

#### `lever-client.ts` - Lever API
**Purpose**: Fetches jobs from Lever ATS  
**Contribution**: Access to companies using Lever

**API**: `https://api.lever.co/v0/postings/{site}`

---

#### `ashby-client.ts` - Ashby API
**Purpose**: Fetches jobs from Ashby ATS  
**Contribution**: Access to companies using Ashby (newer ATS)

---

### Company Discovery

#### `company-discovery-pipeline.ts` - Company Discovery
**Purpose**: Discovers new companies to track  
**Contribution**: Automatically expands company database

**Process**:
1. Search for companies hiring interns
2. Identify ATS system used
3. Extract board tokens/identifiers
4. Add to company_targets table

---

## 📊 Types (`/src/types/`)

### `index.ts` - Core Types
**Purpose**: TypeScript interfaces and Zod schemas  
**Contribution**: Type safety across the entire application

**Key Types**:
- `RawInternshipData`: Unprocessed data from sources
- `NormalizedInternship`: Cleaned and standardized data
- `Internship`: Database representation
- `FilterOptions`: Available filter values
- `InternshipFilters`: User-selected filters

---

### `database.ts` - Database Types
**Purpose**: Supabase-generated database types  
**Contribution**: Type-safe database queries

---

## 🗄️ Database (`/supabase/migrations/`)

### `001_initial_schema.sql`
**Purpose**: Creates core tables  
**Tables**:
- `internships`: Main internship data
- `companies`: Company information
- `sources`: Data sources (Exa, GitHub, etc.)

---

### `002_ontology_tables.sql` & `005_ontology_tables.sql`
**Purpose**: Skill and role ontology  
**Tables**:
- `skills`: Skill definitions
- `role_skill_requirements`: Required skills per role
- `internship_skills`: Skills extracted from postings

---

### `003_company_targets.sql` & `004_seed_companies.sql`
**Purpose**: Company tracking  
**Tables**:
- `company_targets`: Companies to scrape
- Seeds initial high-priority companies

---

### `006_add_quality_fields.sql`
**Purpose**: Enhanced data quality  
**Fields**:
- `graduation_year`: Target graduation years
- `exact_role`: Precise role title
- `requirements`: Extracted requirements
- `pay_rate_*`: Detailed compensation

---

## 🧪 Tests (`/src/__tests__/`)

### `services/normalization-engine.test.ts`
**Purpose**: Tests data normalization logic  
**Coverage**: Location parsing, role extraction, compensation parsing

---

### `services/scoring-engine.test.ts`
**Purpose**: Tests internship scoring algorithm  
**Coverage**: Score calculation, factor weighting

---

## 📝 Configuration Files

### `package.json`
**Purpose**: Dependency management and scripts  
**Key Dependencies**:
- Next.js 14: React framework
- React Query: Data fetching
- Supabase: Database and auth
- TanStack Table/Virtual: Table rendering
- Puppeteer: Web scraping
- Zod: Schema validation

---

### `tsconfig.json`
**Purpose**: TypeScript configuration  
**Key Settings**: Strict mode, path aliases (`@/*`)

---

### `tailwind.config.ts`
**Purpose**: Tailwind CSS configuration  
**Customizations**: Color palette, Shadcn UI integration

---

### `next.config.ts`
**Purpose**: Next.js configuration  
**Settings**: Image domains, API routes, environment variables

---

## 🔄 Data Flow

```
User visits homepage
    ↓
React Query fetches data via /api/internships
    ↓
API route queries Supabase database
    ↓
Data is rendered in InternshipTableTemplate
    ↓
Real-time updates via RealtimeProvider
    ↓
UI updates automatically when new data arrives
```

---

## 🔧 Ingestion Pipeline Flow

```
Trigger /api/ingestion
    ↓
ingestion-service.ingest()
    ↓
data-fetcher.fetchInternships()
    ├── GitHub Scraper
    ├── Exa.ai Search
    ├── Comprehensive Scraper
    └── Company Orchestrator
    ↓
normalization-engine.normalizeMany()
    ↓
ingestion-service.storeInternships()
    ↓
Data saved to Supabase
    ↓
Real-time updates pushed to connected clients
```

---

## 🎯 Key Features

1. **Real-time Updates**: WebSocket subscriptions keep data fresh
2. **Advanced Filtering**: Multi-dimensional filtering (role, location, major, etc.)
3. **Intelligent Scoring**: Quality-based ranking of opportunities
4. **Hidden Gems**: Surface underrated companies
5. **Skill Matching**: Find internships based on your skills
6. **Comprehensive Search**: Full-text search across all fields
7. **Virtual Scrolling**: Efficient rendering of thousands of rows
8. **Responsive Design**: Works on desktop and mobile
9. **Error Resilience**: Circuit breakers and graceful degradation

---

## 🚀 Getting Started

1. **Install dependencies**: `npm install`
2. **Set up environment**: Copy `.env.example` to `.env.local`
3. **Run migrations**: `npm run migrate`
4. **Start dev server**: `npm run dev`
5. **Trigger ingestion**: POST to `/api/ingestion`

---

## 📈 Performance Optimizations

1. **React Query**: Automatic caching and deduplication
2. **TanStack Virtual**: Virtualized table rendering
3. **Database Indexing**: Optimized queries on common filters
4. **CDN**: Static assets served via Vercel CDN
5. **Code Splitting**: Next.js automatic route-based splitting

---

## 🔒 Security

1. **Row-Level Security**: Supabase RLS for data access control
2. **Environment Variables**: Sensitive keys stored securely
3. **Rate Limiting**: Circuit breakers prevent API abuse
4. **Input Validation**: Zod schemas validate all inputs
5. **CORS**: Configured to allow only trusted origins

---

## 📚 Further Reading

- [Next.js Documentation](https://nextjs.org/docs)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TanStack Table Documentation](https://tanstack.com/table/latest)

---

**Last Updated**: October 2025


