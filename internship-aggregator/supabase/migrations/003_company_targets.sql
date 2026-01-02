CREATE TABLE company_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name VARCHAR(255) NOT NULL UNIQUE,
  category VARCHAR(50) CHECK (category IN ('FAANG', 'Unicorn', 'Fortune500', 'Trading', 'BigTech', 'Finance')),
  priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  scraping_method VARCHAR(50) CHECK (scraping_method IN ('greenhouse_api', 'lever_api', 'ashby_api', 'workday_static', 'puppeteer')),
  career_page_url TEXT,
  greenhouse_board_token VARCHAR(100),
  lever_site VARCHAR(100),
  ashby_company_id VARCHAR(100),
  last_scraped_at TIMESTAMPTZ,
  scrape_frequency_hours INTEGER DEFAULT 24,
  enabled BOOLEAN DEFAULT true,
  scrape_success_count INTEGER DEFAULT 0,
  scrape_error_count INTEGER DEFAULT 0,
  last_error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_company_targets_enabled ON company_targets(enabled) WHERE enabled = true;
CREATE INDEX idx_company_targets_priority ON company_targets(priority);
CREATE INDEX idx_company_targets_method ON company_targets(scraping_method);
CREATE INDEX idx_company_targets_next_scrape ON company_targets(last_scraped_at, scrape_frequency_hours) WHERE enabled = true;

CREATE TRIGGER update_company_targets_updated_at
  BEFORE UPDATE ON company_targets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
