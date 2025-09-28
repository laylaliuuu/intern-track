# Database Schema

This directory contains the database schema and migrations for the InternTrack internship aggregator.

## Files

- `migrations/001_initial_schema.sql` - Initial database schema with tables and indexes
- `seed.sql` - Sample data for development and testing

## Schema Overview

### Tables

1. **companies** - Company information and metadata
2. **sources** - Data source tracking (APIs, scrapers, manual entry)
3. **internships** - Main internship data with normalized fields

### Key Features

- **Full-text search** on internship titles and descriptions
- **Optimized indexes** for student-focused filtering (role, major, location, etc.)
- **Automatic timestamps** with updated_at trigger
- **Data integrity** with foreign key constraints and check constraints
- **Deduplication** using canonical_hash field

## Setup Instructions

### For Supabase Cloud

1. Create a new Supabase project
2. Run the migration file in the SQL editor:
   ```sql
   -- Copy and paste contents of migrations/001_initial_schema.sql
   ```
3. Optionally run the seed data:
   ```sql
   -- Copy and paste contents of seed.sql
   ```

### For Local Development

If using Supabase CLI:

```bash
# Initialize Supabase locally
supabase init

# Start local Supabase
supabase start

# Apply migrations
supabase db reset

# Or manually run the setup script
psql -h localhost -p 54322 -U postgres -d postgres -f scripts/setup-database.sql
```

## Environment Variables

Make sure to set these in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Indexes and Performance

The schema includes optimized indexes for common query patterns:

- **Time-based queries**: `idx_internships_posted_at` for recent internships
- **Filtering**: Indexes on role, location, majors, eligibility year
- **Search**: GIN index for full-text search
- **Composite indexes**: For common filter combinations

## Data Model Notes

- **relevant_majors**: Array field mapping internships to bachelor's degree majors
- **eligibility_year**: Array field for targeting specific class years
- **canonical_hash**: Unique identifier for deduplication across sources
- **is_program_specific**: Flag for special programs (STEP, Explore, etc.)
- **source_type**: Tracks whether data came from company pages, APIs, or manual entry