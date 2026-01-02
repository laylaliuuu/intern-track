-- FAANG (5 companies)
INSERT INTO company_targets (company_name, category, priority, scraping_method, career_page_url, greenhouse_board_token) VALUES
('Google', 'FAANG', 1, 'puppeteer', 'https://careers.google.com/jobs/results/?q=intern', NULL),
('Apple', 'FAANG', 1, 'puppeteer', 'https://jobs.apple.com/en-us/search?team=internships-STDNT-INTRN', NULL),
('Meta', 'FAANG', 1, 'puppeteer', 'https://www.metacareers.com/jobs?categories=internships', NULL),
('Amazon', 'FAANG', 1, 'workday_static', 'https://www.amazon.jobs/en/search?base_query=intern', NULL),
('Netflix', 'FAANG', 1, 'lever_api', NULL, 'netflix');

-- Top Tech with Greenhouse (20 companies)
INSERT INTO company_targets (company_name, category, priority, scraping_method, greenhouse_board_token) VALUES
('Stripe', 'Unicorn', 1, 'greenhouse_api', 'stripe'),
('Airbnb', 'Unicorn', 1, 'greenhouse_api', 'airbnb'),
('Coinbase', 'Unicorn', 1, 'greenhouse_api', 'coinbase'),
('Roblox', 'Unicorn', 1, 'greenhouse_api', 'roblox'),
('Databricks', 'Unicorn', 1, 'greenhouse_api', 'databricks'),
('Snowflake', 'Unicorn', 1, 'greenhouse_api', 'snowflake'),
('Plaid', 'Unicorn', 1, 'greenhouse_api', 'plaid'),
('Scale AI', 'Unicorn', 1, 'greenhouse_api', 'scaleai'),
('Anthropic', 'Unicorn', 1, 'greenhouse_api', 'anthropic'),
('OpenAI', 'Unicorn', 1, 'greenhouse_api', 'openai'),
('MongoDB', 'Unicorn', 1, 'greenhouse_api', 'mongodb'),
('Datadog', 'Unicorn', 1, 'greenhouse_api', 'datadog'),
('Brex', 'Unicorn', 1, 'greenhouse_api', 'brex'),
('Navan', 'Unicorn', 1, 'greenhouse_api', 'navan'),
('Grammarly', 'Unicorn', 1, 'greenhouse_api', 'grammarly'),
('Webflow', 'Unicorn', 1, 'greenhouse_api', 'webflow'),
('Airtable', 'Unicorn', 1, 'greenhouse_api', 'airtable'),
('Discord', 'Unicorn', 1, 'greenhouse_api', 'discord'),
('Canva', 'Unicorn', 1, 'greenhouse_api', 'canva'),
('Instacart', 'Unicorn', 1, 'greenhouse_api', 'instacart');

-- Top Tech with Lever (15 companies)
INSERT INTO company_targets (company_name, category, priority, scraping_method, lever_site) VALUES
('Figma', 'Unicorn', 1, 'lever_api', 'figma'),
('Notion', 'Unicorn', 1, 'lever_api', 'notion'),
('Spotify', 'BigTech', 1, 'lever_api', 'spotify'),
('Twitch', 'BigTech', 1, 'lever_api', 'twitch'),
('Reddit', 'BigTech', 1, 'lever_api', 'reddit'),
('Pinterest', 'BigTech', 1, 'lever_api', 'pinterest'),
('Dropbox', 'BigTech', 1, 'lever_api', 'dropbox'),
('Asana', 'Unicorn', 1, 'lever_api', 'asana'),
('DoorDash', 'Unicorn', 1, 'lever_api', 'doordash'),
('Faire', 'Unicorn', 1, 'lever_api', 'faire'),
('Flexport', 'Unicorn', 1, 'lever_api', 'flexport'),
('Robinhood', 'Unicorn', 1, 'lever_api', 'robinhood'),
('Cruise', 'Unicorn', 1, 'lever_api', 'cruise'),
('Rippling', 'Unicorn', 1, 'lever_api', 'rippling'),
('Carta', 'Unicorn', 1, 'lever_api', 'carta');

-- Trading Firms (10 companies)
INSERT INTO company_targets (company_name, category, priority, scraping_method, career_page_url) VALUES
('Jane Street', 'Trading', 1, 'puppeteer', 'https://www.janestreet.com/join-jane-street/internships/'),
('Citadel', 'Trading', 1, 'greenhouse_api', 'citadel'),
('Two Sigma', 'Trading', 1, 'greenhouse_api', 'twosigma'),
('HRT', 'Trading', 1, 'greenhouse_api', 'hudsonrivertrading'),
('Optiver', 'Trading', 1, 'greenhouse_api', 'optiver'),
('IMC Trading', 'Trading', 1, 'greenhouse_api', 'imc'),
('Jump Trading', 'Trading', 1, 'puppeteer', 'https://www.jumptrading.com/careers/'),
('Akuna Capital', 'Trading', 1, 'greenhouse_api', 'akunacapital'),
('DRW', 'Trading', 1, 'greenhouse_api', 'drw'),
('Susquehanna (SIG)', 'Trading', 1, 'greenhouse_api', 'sig');

-- Finance (10 companies) 
INSERT INTO company_targets (company_name, category, priority, scraping_method, career_page_url) VALUES
('Goldman Sachs', 'Finance', 1, 'workday_static', 'https://www.goldmansachs.com/careers/students/programs/'),
('JPMorgan Chase', 'Finance', 1, 'workday_static', 'https://careers.jpmorgan.com/us/en/students/programs'),
('Morgan Stanley', 'Finance', 1, 'workday_static', 'https://morganstanley.tal.net/vx/candidate/search'),
('BlackRock', 'Finance', 1, 'workday_static', 'https://careers.blackrock.com/early-careers'),
('Vanguard', 'Finance', 2, 'workday_static', 'https://www.vanguardjobs.com/students'),
('Capital One', 'Finance', 1, 'greenhouse_api', 'capitalone'),
('Visa', 'Finance', 2, 'workday_static', 'https://usa.visa.com/careers/students-and-recent-grads.html'),
('Mastercard', 'Finance', 2, 'workday_static', 'https://careers.mastercard.com/us/en/university'),
('PayPal', 'Finance', 2, 'greenhouse_api', 'paypal'),
('Square', 'Finance', 2, 'greenhouse_api', 'square');

-- Big Tech (20 companies)
INSERT INTO company_targets (company_name, category, priority, scraping_method, career_page_url) VALUES
('Microsoft', 'BigTech', 1, 'workday_static', 'https://careers.microsoft.com/students'),
('Tesla', 'BigTech', 1, 'puppeteer', 'https://www.tesla.com/careers/search/?type=3&site=US'),
('Uber', 'BigTech', 1, 'greenhouse_api', 'uber'),
('Salesforce', 'BigTech', 1, 'workday_static', 'https://salesforce.wd1.myworkdayjobs.com/Futureforce_Internships'),
('IBM', 'BigTech', 2, 'workday_static', 'https://www.ibm.com/employment/entrylevel/'),
('Oracle', 'BigTech', 2, 'workday_static', 'https://www.oracle.com/corporate/careers/students-grads/'),
('SAP', 'BigTech', 2, 'workday_static', 'https://jobs.sap.com/search/?q=intern'),
('Cisco', 'BigTech', 2, 'workday_static', 'https://jobs.cisco.com/jobs/SearchJobs/intern'),
('Intel', 'BigTech', 2, 'workday_static', 'https://jobs.intel.com/en/search-jobs/intern'),
('NVIDIA', 'BigTech', 1, 'greenhouse_api', 'nvidia'),
('AMD', 'BigTech', 2, 'workday_static', 'https://careers.amd.com/students'),
('Qualcomm', 'BigTech', 2, 'workday_static', 'https://www.qualcomm.com/company/careers/university-relations'),
('VMware', 'BigTech', 2, 'greenhouse_api', 'vmware'),
('Adobe', 'BigTech', 2, 'workday_static', 'https://www.adobe.com/careers/university.html'),
('ServiceNow', 'BigTech', 2, 'greenhouse_api', 'servicenow'),
('Atlassian', 'BigTech', 2, 'greenhouse_api', 'atlassian'),
('Splunk', 'BigTech', 2, 'greenhouse_api', 'splunk'),
('Palo Alto Networks', 'BigTech', 2, 'greenhouse_api', 'paloaltonetworks'),
('Workday', 'BigTech', 2, 'workday_static', 'https://workday.wd5.myworkdayjobs.com/Workday_University_Careers'),
('Zoom', 'BigTech', 2, 'greenhouse_api', 'zoom');
