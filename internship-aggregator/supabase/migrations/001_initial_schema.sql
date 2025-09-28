-- Initial schema for InternTrack internship aggregator
-- Creates companies, sources, and internships tables with proper indexes

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies table
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  domain TEXT,
  linkedin_url TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sources table for tracking data sources
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('api', 'scrape', 'manual')),
  base_url TEXT,
  is_active BOOLEAN DEFAULT true,
  last_checked TIMESTAMPTZ,
  error_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Main internships table
CREATE TABLE internships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  application_url TEXT,
  description TEXT,
  location TEXT,
  is_remote BOOLEAN DEFAULT false,
  work_type TEXT CHECK (work_type IN ('paid', 'unpaid', 'unknown')) DEFAULT 'unknown',
  posted_at TIMESTAMPTZ NOT NULL,
  application_deadline TIMESTAMPTZ,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  normalized_role TEXT,
  relevant_majors TEXT[], -- ['Computer Science', 'Business', 'Finance', 'Any']
  skills TEXT[],
  eligibility_year TEXT[], -- ['Freshman', 'Sophomore', 'Junior', 'Senior']
  internship_cycle TEXT, -- 'Summer 2025', 'Fall 2024', etc.
  is_program_specific BOOLEAN DEFAULT false,
  source_type TEXT CHECK (source_type IN ('company_career_page', 'program_page', 'api_feed')),
  canonical_hash TEXT UNIQUE NOT NULL,
  is_archived BOOLEAN DEFAULT false,
  raw_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for student-focused filtering and performance
CREATE INDEX idx_internships_posted_at ON internships(posted_at DESC);
CREATE INDEX idx_internships_normalized_role ON internships(normalized_role);
CREATE INDEX idx_internships_relevant_majors ON internships USING gin(relevant_majors);
CREATE INDEX idx_internships_location ON internships(location);
CREATE INDEX idx_internships_is_remote ON internships(is_remote);
CREATE INDEX idx_internships_work_type ON internships(work_type);
CREATE INDEX idx_internships_eligibility_year ON internships USING gin(eligibility_year);
CREATE INDEX idx_internships_internship_cycle ON internships(internship_cycle);
CREATE INDEX idx_internships_is_program_specific ON internships(is_program_specific);
CREATE INDEX idx_internships_canonical_hash ON internships(canonical_hash);
CREATE INDEX idx_internships_is_archived ON internships(is_archived);
CREATE INDEX idx_internships_company_id ON internships(company_id);
CREATE INDEX idx_internships_source_id ON internships(source_id);

-- Full-text search index
CREATE INDEX idx_internships_search ON internships USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Composite indexes for common query patterns
CREATE INDEX idx_internships_active_recent ON internships(is_archived, posted_at DESC) WHERE is_archived = false;
CREATE INDEX idx_internships_role_location ON internships(normalized_role, location) WHERE is_archived = false;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at on internships table
CREATE TRIGGER update_internships_updated_at 
    BEFORE UPDATE ON internships 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();