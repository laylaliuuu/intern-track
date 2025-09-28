-- Database setup script for local development
-- Run this script to set up the database schema and seed data

-- First, run the initial schema migration
\i supabase/migrations/001_initial_schema.sql

-- Then, populate with seed data
\i supabase/seed.sql

-- Verify the setup
SELECT 'Companies created:' as info, count(*) as count FROM companies
UNION ALL
SELECT 'Sources created:', count(*) FROM sources  
UNION ALL
SELECT 'Internships created:', count(*) FROM internships;

-- Show sample data
SELECT 
  i.title,
  c.name as company,
  i.location,
  i.normalized_role,
  i.posted_at,
  i.internship_cycle
FROM internships i
JOIN companies c ON i.company_id = c.id
ORDER BY i.posted_at DESC
LIMIT 5;