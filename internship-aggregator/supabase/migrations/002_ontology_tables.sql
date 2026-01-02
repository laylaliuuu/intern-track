-- Ontology tables for enhanced internship discovery and scoring
-- Creates company metadata, relationships, skills, and scoring tables

-- Company metadata for ontology
CREATE TABLE company_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  size_category TEXT CHECK (size_category IN ('startup', 'small', 'medium', 'large', 'fortune500')),
  industry TEXT[],
  founded_year INTEGER,
  funding_stage TEXT CHECK (funding_stage IN ('seed', 'series-a', 'series-b', 'series-c', 'series-d', 'public', 'acquired')),
  employee_count_range TEXT,
  glassdoor_rating DECIMAL(3,2),
  linkedin_url TEXT,
  website_url TEXT,
  headquarters_location TEXT,
  is_public BOOLEAN DEFAULT false,
  market_cap DECIMAL(15,2),
  revenue_range TEXT,
  growth_stage TEXT CHECK (growth_stage IN ('early', 'growth', 'mature', 'declining')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Relationship: Company to similar companies
CREATE TABLE company_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_a_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  company_b_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  relationship_type TEXT CHECK (relationship_type IN ('competitor', 'partner', 'similar', 'parent', 'subsidiary', 'supplier', 'customer')),
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  similarity_factors TEXT[], -- ['industry', 'size', 'location', 'tech_stack']
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_a_id, company_b_id)
);

-- Skills taxonomy
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  category TEXT CHECK (category IN ('technical', 'soft', 'domain', 'tool', 'language', 'framework')),
  parent_skill_id UUID REFERENCES skills(id),
  description TEXT,
  aliases TEXT[], -- Alternative names for the skill
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Internship to skills mapping
CREATE TABLE internship_skills (
  internship_id UUID REFERENCES internships(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  importance_score DECIMAL(3,2) CHECK (importance_score >= 0 AND importance_score <= 1),
  is_required BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
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
  gpa_range TEXT CHECK (gpa_range IN ('3.0-3.5', '3.5-3.7', '3.7-4.0', '4.0+')),
  work_experience_years INTEGER DEFAULT 0,
  has_previous_internships BOOLEAN DEFAULT false,
  preferred_company_size TEXT[],
  preferred_industries TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Internship quality scoring (Clay-inspired)
CREATE TABLE internship_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internship_id UUID REFERENCES internships(id) ON DELETE CASCADE,
  quality_score DECIMAL(5,2) CHECK (quality_score >= 0 AND quality_score <= 100), -- 0-100 overall quality
  competitiveness_score DECIMAL(5,2) CHECK (competitiveness_score >= 0 AND competitiveness_score <= 100), -- how hard to get
  learning_score DECIMAL(5,2) CHECK (learning_score >= 0 AND learning_score <= 100), -- educational value
  brand_value_score DECIMAL(5,2) CHECK (brand_value_score >= 0 AND brand_value_score <= 100), -- resume impact
  compensation_score DECIMAL(5,2) CHECK (compensation_score >= 0 AND compensation_score <= 100),
  mentorship_score DECIMAL(5,2) CHECK (mentorship_score >= 0 AND mentorship_score <= 100),
  growth_potential_score DECIMAL(5,2) CHECK (growth_potential_score >= 0 AND growth_potential_score <= 100),
  work_life_balance_score DECIMAL(5,2) CHECK (work_life_balance_score >= 0 AND work_life_balance_score <= 100),
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  scoring_version TEXT DEFAULT '1.0',
  UNIQUE(internship_id)
);

-- Personalized match scores for students
CREATE TABLE student_internship_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_profile_id UUID REFERENCES student_profiles(id) ON DELETE CASCADE,
  internship_id UUID REFERENCES internships(id) ON DELETE CASCADE,
  match_score DECIMAL(5,2) CHECK (match_score >= 0 AND match_score <= 100),
  match_factors TEXT[], -- ['major_alignment', 'skill_match', 'location_preference', 'company_preference']
  is_saved BOOLEAN DEFAULT false,
  is_applied BOOLEAN DEFAULT false,
  application_status TEXT CHECK (application_status IN ('not_applied', 'applied', 'interview', 'offer', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_profile_id, internship_id)
);

-- Company discovery sources (for tracking hidden opportunities)
CREATE TABLE discovery_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('websets', 'linkedin', 'github', 'twitter', 'manual', 'api')),
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Discovered companies (hidden opportunities)
CREATE TABLE discovered_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discovery_source_id UUID REFERENCES discovery_sources(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  domain TEXT,
  linkedin_url TEXT,
  description TEXT,
  industry TEXT[],
  size_estimate TEXT,
  funding_stage TEXT,
  growth_signals TEXT[], -- ['hiring', 'funding', 'expansion', 'partnerships']
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  is_verified BOOLEAN DEFAULT false,
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_company_metadata_company_id ON company_metadata(company_id);
CREATE INDEX idx_company_metadata_size_category ON company_metadata(size_category);
CREATE INDEX idx_company_metadata_industry ON company_metadata USING gin(industry);
CREATE INDEX idx_company_metadata_funding_stage ON company_metadata(funding_stage);
CREATE INDEX idx_company_metadata_glassdoor_rating ON company_metadata(glassdoor_rating);

CREATE INDEX idx_company_relationships_company_a ON company_relationships(company_a_id);
CREATE INDEX idx_company_relationships_company_b ON company_relationships(company_b_id);
CREATE INDEX idx_company_relationships_type ON company_relationships(relationship_type);
CREATE INDEX idx_company_relationships_confidence ON company_relationships(confidence_score);

CREATE INDEX idx_skills_name ON skills(name);
CREATE INDEX idx_skills_category ON skills(category);
CREATE INDEX idx_skills_parent ON skills(parent_skill_id);
CREATE INDEX idx_skills_active ON skills(is_active);

CREATE INDEX idx_internship_skills_internship ON internship_skills(internship_id);
CREATE INDEX idx_internship_skills_skill ON internship_skills(skill_id);
CREATE INDEX idx_internship_skills_importance ON internship_skills(importance_score);
CREATE INDEX idx_internship_skills_required ON internship_skills(is_required);

CREATE INDEX idx_student_profiles_user_id ON student_profiles(user_id);
CREATE INDEX idx_student_profiles_major ON student_profiles USING gin(major);
CREATE INDEX idx_student_profiles_skills ON student_profiles USING gin(skills);
CREATE INDEX idx_student_profiles_year_level ON student_profiles(year_level);

CREATE INDEX idx_internship_scores_internship ON internship_scores(internship_id);
CREATE INDEX idx_internship_scores_quality ON internship_scores(quality_score);
CREATE INDEX idx_internship_scores_competitiveness ON internship_scores(competitiveness_score);
CREATE INDEX idx_internship_scores_calculated ON internship_scores(calculated_at);

CREATE INDEX idx_student_matches_student ON student_internship_matches(student_profile_id);
CREATE INDEX idx_student_matches_internship ON student_internship_matches(internship_id);
CREATE INDEX idx_student_matches_score ON student_internship_matches(match_score);
CREATE INDEX idx_student_matches_saved ON student_internship_matches(is_saved);

CREATE INDEX idx_discovered_companies_source ON discovered_companies(discovery_source_id);
CREATE INDEX idx_discovered_companies_industry ON discovered_companies USING gin(industry);
CREATE INDEX idx_discovered_companies_confidence ON discovered_companies(confidence_score);
CREATE INDEX idx_discovered_companies_verified ON discovered_companies(is_verified);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_company_metadata_updated_at 
    BEFORE UPDATE ON company_metadata 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_profiles_updated_at 
    BEFORE UPDATE ON student_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_matches_updated_at 
    BEFORE UPDATE ON student_internship_matches 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate company similarity
CREATE OR REPLACE FUNCTION calculate_company_similarity(
  company_a_id UUID,
  company_b_id UUID
) RETURNS DECIMAL(3,2) AS $$
DECLARE
  similarity_score DECIMAL(3,2) := 0;
  industry_match BOOLEAN := false;
  size_match BOOLEAN := false;
  location_match BOOLEAN := false;
BEGIN
  -- Check industry overlap
  SELECT EXISTS(
    SELECT 1 FROM company_metadata cm1, company_metadata cm2
    WHERE cm1.company_id = company_a_id 
    AND cm2.company_id = company_b_id
    AND cm1.industry && cm2.industry
  ) INTO industry_match;
  
  -- Check size similarity
  SELECT EXISTS(
    SELECT 1 FROM company_metadata cm1, company_metadata cm2
    WHERE cm1.company_id = company_a_id 
    AND cm2.company_id = company_b_id
    AND cm1.size_category = cm2.size_category
  ) INTO size_match;
  
  -- Calculate similarity score
  IF industry_match THEN similarity_score := similarity_score + 0.4; END IF;
  IF size_match THEN similarity_score := similarity_score + 0.3; END IF;
  -- Location matching would require additional logic
  
  RETURN LEAST(similarity_score, 1.0);
END;
$$ LANGUAGE plpgsql;

-- Function to get similar companies
CREATE OR REPLACE FUNCTION get_similar_companies(
  target_company_id UUID,
  similarity_threshold DECIMAL(3,2) DEFAULT 0.5,
  limit_count INTEGER DEFAULT 10
) RETURNS TABLE(
  company_id UUID,
  company_name TEXT,
  similarity_score DECIMAL(3,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    calculate_company_similarity(target_company_id, c.id) as similarity
  FROM companies c
  WHERE c.id != target_company_id
  AND calculate_company_similarity(target_company_id, c.id) >= similarity_threshold
  ORDER BY similarity DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;