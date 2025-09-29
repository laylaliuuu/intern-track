# Implementation Plan

- [x] 1. Set up project foundation and core infrastructure
  - Initialize Next.js project with TypeScript strict mode and required dependencies
  - Configure Shadcn UI, Tailwind CSS, and project structure
  - Set up Supabase project and database connection
  - _Requirements: 7.3, 7.5_

- [x] 2. Create database schema and core data models
  - [x] 2.1 Implement Supabase database schema
    - Create internships, companies, and sources tables with proper indexes
    - Set up database migrations and seed data structure
    - _Requirements: 4.3, 5.4_
  
  - [x] 2.2 Create TypeScript interfaces and types
    - Define core data types (Internship, Company, FilterState, etc.)
    - Implement Zod schemas for runtime validation
    - Create enum definitions for roles and majors
    - _Requirements: 5.1, 5.2, 7.4_

- [x] 3. Build ingestion and normalization system
  - [x] 3.1 Implement Exa.ai API integration
    - Create API client for Exa.ai with proper error handling
    - Implement p-limit concurrency control for rate limiting
    - Write unit tests for API integration
    - _Requirements: 4.1, 4.2, 4.5_
  
  - [x] 3.2 Create ontology-based normalization engine
    - Build role type extraction and normalization logic
    - Implement major mapping from job descriptions to bachelor's degrees
    - Create skill extraction and location normalization
    - Add canonical hashing for deduplication
    - _Requirements: 5.1, 5.2, 5.3, 5.5_
  
  - [x] 3.3 Implement ingestion worker with scheduling
    - Create serverless function for scheduled data ingestion
    - Integrate Exa.ai API calls with normalization pipeline
    - Add structured logging and error handling
    - _Requirements: 4.1, 4.4, 6.1, 6.5_

- [ ] 4. Create API layer and data access
  - [x] 4.1 Build Next.js API routes for internship data
    - Implement GET /api/internships with filtering and pagination
    - Add search functionality with full-text search
    - Create GET /api/internships/[id] for detailed views
    - _Requirements: 2.1, 2.3, 2.4_
  
  - [ ] 4.2 Implement React Query integration
    - Set up React Query client with caching configuration
    - Create custom hooks for internship data fetching
    - Add optimistic updates for real-time functionality
    - _Requirements: 1.3, 2.2, 2.5_

- [ ] 5. Build core frontend components
  - [ ] 5.1 Create InternshipTable component with virtualization
    - Implement TanStack Table with TanStack Virtual for performance
    - Add sorting, filtering, and search functionality
    - Ensure smooth scrolling with large datasets
    - _Requirements: 1.1, 1.5, 2.5, 7.3_
  
  - [ ] 5.2 Build FilterPanel component
    - Create filters for roles, majors, locations, work type, and eligibility year
    - Implement real-time filter updates with immediate results
    - Add clear visual indicators for active filters
    - _Requirements: 2.1, 2.2, 2.4_
  
  - [ ] 5.3 Implement InternshipDetail component
    - Create expandable detail view with full job descriptions
    - Add application links, deadline countdowns, and skill tags
    - Implement proper ARIA labels and keyboard navigation
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 7.1, 7.2_

- [ ] 6. Add real-time updates and time-sensitive features
  - [ ] 6.1 Implement Supabase real-time subscriptions
    - Set up real-time listeners for new internship postings
    - Integrate with React Query for cache invalidation
    - Add visual indicators for new postings
    - _Requirements: 1.3, 1.2_
  
  - [ ] 6.2 Create time-sensitive UI features
    - Implement "time ago" formatting for posting dates
    - Add deadline countdown timers and urgency indicators
    - Create archive logic for internships older than 30 days
    - Prioritize display of internships from last 7 days
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 3.5_

- [ ] 7. Implement search and advanced filtering
  - [ ] 7.1 Add full-text search functionality
    - Implement real-time search on titles, companies, and descriptions
    - Add search highlighting and result ranking
    - Create search suggestions and autocomplete
    - _Requirements: 2.3, 2.4_
  
  - [ ] 7.2 Build major-based filtering system
    - Create major-to-internship mapping logic
    - Implement UI for selecting bachelor's degree majors
    - Add "Show all internships for my major" functionality
    - _Requirements: 2.1, 5.1, 5.2_

- [ ] 8. Add monitoring and error handling
  - [ ] 8.1 Implement comprehensive error handling
    - Add error boundaries for React components
    - Create graceful fallbacks for API failures
    - Implement user-friendly error messages
    - _Requirements: 6.5, 7.5_
  
  - [ ] 8.2 Add logging and monitoring system
    - Implement structured logging with correlation IDs
    - Create health check endpoints for system monitoring
    - Add metrics tracking for ingestion and API performance
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 9. Optimize performance and accessibility
  - [ ] 9.1 Implement accessibility features
    - Add proper ARIA labels and semantic HTML structure
    - Ensure keyboard navigation works for all interactive elements
    - Test with screen readers and add focus management
    - _Requirements: 7.1, 7.2_
  
  - [ ] 9.2 Optimize table performance and user experience
    - Fine-tune virtualization for smooth scrolling with large datasets
    - Add loading states and skeleton components
    - Implement progressive loading and infinite scroll
    - _Requirements: 7.3, 2.5_

- [ ] 10. Deploy and configure production environment
  - [ ] 10.1 Set up Vercel deployment pipeline
    - Configure automatic deployments from main branch
    - Set up environment variables and API keys securely
    - Create production and preview environments
    - _Requirements: 6.1, 7.4_
  
  - [ ] 10.2 Configure Supabase production database
    - Set up production database with proper security rules
    - Configure real-time subscriptions for production
    - Add database backup and monitoring
    - _Requirements: 4.3, 6.2, 7.4_

- [ ] 11. Create comprehensive test suite
  - [ ] 11.1 Write unit tests for core functionality
    - Test normalization engine and data processing logic
    - Create tests for API routes and data validation
    - Add tests for React components and user interactions
    - _Requirements: 5.5, 6.4, 7.5_
  
  - [ ] 11.2 Implement integration and end-to-end tests
    - Test ingestion pipeline with real API data
    - Create E2E tests for critical user flows with Playwright
    - Add performance tests for table virtualization
    - _Requirements: 1.5, 2.5, 4.1, 7.3_