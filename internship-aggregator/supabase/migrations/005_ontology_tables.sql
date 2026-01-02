-- Company metadata for ontology
CREATE TABLE company_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  size_category TEXT CHECK (size_category IN ('startup', 'small', 'medium', 'large', 'fortune500')),
  industry TEXT[],
  founded_year INTEGER,
  funding_stage TEXT CHECK (funding_stage IN ('seed', 'series-a', 'series-b', 'series-c', 'public', 'private')),
  employee_count_range TEXT,
  glassdoor_rating DECIMAL(3,2),
  headquarters_location TEXT,
  website TEXT,
  linkedin_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id)
);

-- Relationship: Company to similar companies
CREATE TABLE company_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_a_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  company_b_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  relationship_type TEXT CHECK (relationship_type IN ('competitor', 'partner', 'similar', 'parent', 'subsidiary')),
  confidence_score DECIMAL(3,2) CHECK (confidence_score BETWEEN 0 AND 1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_a_id, company_b_id, relationship_type)
);

-- Skills taxonomy
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  category TEXT CHECK (category IN ('technical', 'soft', 'domain', 'language')),
  parent_skill_id UUID REFERENCES skills(id),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Internship to skills mapping
CREATE TABLE internship_skills (
  internship_id UUID REFERENCES internships(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  importance_score DECIMAL(3,2) CHECK (importance_score BETWEEN 0 AND 1),
  PRIMARY KEY (internship_id, skill_id)
);

-- Student profiles (for personalization)
CREATE TABLE student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, -- link to auth if needed later
  major TEXT[],
  skills TEXT[],
  year_level TEXT CHECK (year_level IN ('freshman', 'sophomore', 'junior', 'senior', 'graduate')),
  target_roles TEXT[],
  preferred_locations TEXT[],
  gpa DECIMAL(3,2),
  graduation_year INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Internship quality scoring (Clay-inspired)
CREATE TABLE internship_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internship_id UUID REFERENCES internships(id) ON DELETE CASCADE,
  quality_score DECIMAL(5,2) CHECK (quality_score BETWEEN 0 AND 100),
  competitiveness_score DECIMAL(5,2) CHECK (competitiveness_score BETWEEN 0 AND 100),
  learning_score DECIMAL(5,2) CHECK (learning_score BETWEEN 0 AND 100),
  brand_value_score DECIMAL(5,2) CHECK (brand_value_score BETWEEN 0 AND 100),
  compensation_score DECIMAL(5,2) CHECK (compensation_score BETWEEN 0 AND 100),
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(internship_id)
);

-- Enhanced internships table with normalized fields
ALTER TABLE internships ADD COLUMN IF NOT EXISTS normalized_title TEXT;
ALTER TABLE internships ADD COLUMN IF NOT EXISTS normalized_company TEXT;
ALTER TABLE internships ADD COLUMN IF NOT EXISTS normalized_location TEXT;
ALTER TABLE internships ADD COLUMN IF NOT EXISTS canonical_hash TEXT;
ALTER TABLE internships ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE internships ADD COLUMN IF NOT EXISTS work_type TEXT CHECK (work_type IN ('remote', 'hybrid', 'onsite', 'unknown'));
ALTER TABLE internships ADD COLUMN IF NOT EXISTS internship_cycle TEXT CHECK (internship_cycle IN ('summer', 'fall', 'spring', 'year-round', 'unknown'));
ALTER TABLE internships ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;
ALTER TABLE internships ADD COLUMN IF NOT EXISTS quality_score DECIMAL(5,2);
ALTER TABLE internships ADD COLUMN IF NOT EXISTS completeness_score DECIMAL(5,2);
ALTER TABLE internships ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Indexes for performance
CREATE INDEX idx_company_metadata_company_id ON company_metadata(company_id);
CREATE INDEX idx_company_metadata_size_category ON company_metadata(size_category);
CREATE INDEX idx_company_metadata_funding_stage ON company_metadata(funding_stage);
CREATE INDEX idx_company_metadata_industry ON company_metadata USING gin(industry);

CREATE INDEX idx_company_relationships_company_a ON company_relationships(company_a_id);
CREATE INDEX idx_company_relationships_company_b ON company_relationships(company_b_id);
CREATE INDEX idx_company_relationships_type ON company_relationships(relationship_type);

CREATE INDEX idx_skills_name ON skills(name);
CREATE INDEX idx_skills_category ON skills(category);
CREATE INDEX idx_skills_parent ON skills(parent_skill_id);

CREATE INDEX idx_internship_skills_internship ON internship_skills(internship_id);
CREATE INDEX idx_internship_skills_skill ON internship_skills(skill_id);

CREATE INDEX idx_student_profiles_user_id ON student_profiles(user_id);
CREATE INDEX idx_student_profiles_major ON student_profiles USING gin(major);
CREATE INDEX idx_student_profiles_skills ON student_profiles USING gin(skills);

CREATE INDEX idx_internship_scores_internship ON internship_scores(internship_id);
CREATE INDEX idx_internship_scores_quality ON internship_scores(quality_score);

CREATE INDEX idx_internships_canonical_hash ON internships(canonical_hash);
CREATE INDEX idx_internships_role ON internships(role);
CREATE INDEX idx_internships_work_type ON internships(work_type);
CREATE INDEX idx_internships_quality_score ON internships(quality_score);
CREATE INDEX idx_internships_search ON internships USING gin(search_vector);

-- Full-text search function
CREATE OR REPLACE FUNCTION update_internship_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.company, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.location, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update search vector
CREATE TRIGGER update_internships_search_vector
  BEFORE INSERT OR UPDATE ON internships
  FOR EACH ROW
  EXECUTE FUNCTION update_internship_search_vector();

-- Update existing records
UPDATE internships SET search_vector = 
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(company, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(location, '')), 'D');

-- Triggers for updated_at
CREATE TRIGGER update_company_metadata_updated_at
  BEFORE UPDATE ON company_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_profiles_updated_at
  BEFORE UPDATE ON student_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
