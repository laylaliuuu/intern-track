-- Add validation fields to internships table
ALTER TABLE internships 
ADD COLUMN IF NOT EXISTS validation_status TEXT CHECK (validation_status IN ('valid', 'expired', 'dead', 'pending', 'maybe_valid')),
ADD COLUMN IF NOT EXISTS validation_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS validation_http_code INTEGER,
ADD COLUMN IF NOT EXISTS validation_final_url TEXT,
ADD COLUMN IF NOT EXISTS validation_redirects JSONB,
ADD COLUMN IF NOT EXISTS validation_reason TEXT,
ADD COLUMN IF NOT EXISTS validation_last_checked TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Index for filtering by validation status
CREATE INDEX IF NOT EXISTS idx_internships_validation_status ON internships(validation_status);
CREATE INDEX IF NOT EXISTS idx_internships_is_active ON internships(is_active);
CREATE INDEX IF NOT EXISTS idx_internships_validation_score ON internships(validation_score);

-- Composite index for active valid internships
CREATE INDEX IF NOT EXISTS idx_internships_active_valid ON internships(is_active, validation_status) 
WHERE is_active = true AND validation_status = 'valid';


