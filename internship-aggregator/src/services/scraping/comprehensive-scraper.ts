// Comprehensive $0 Web Scraping Solution
import { RawInternshipData, InternshipSourceType } from '../../types';
import puppeteer from 'puppeteer';

export interface ScrapingTarget {
  name: string;
  url: string;
  type: 'career_page' | 'ats' | 'github' | 'api';
  selectors: {
    jobContainer: string;
    title: string;
    company: string;
    location: string;
    url: string;
    description?: string;
  };
  filters?: {
    keywords: string[];
    excludeKeywords: string[];
    yearFilter: string;
  };
}

export interface ScrapingResult {
  source: string;
  data: RawInternshipData[];
  errors: string[];
  metadata: {
    totalFound: number;
    processed: number;
    skipped: number;
    executionTime: number;
  };
}

export class ComprehensiveScraper {
  private targets: ScrapingTarget[] = [
    // Top Tech Companies - Career Pages
    {
      name: 'Google Careers',
      url: 'https://careers.google.com/jobs/results/?q=intern&employment_type=INTERN',
      type: 'career_page',
      selectors: {
        jobContainer: '[data-testid="search-results"] > div',
        title: 'h3',
        company: '[data-testid="company-name"]',
        location: '[data-testid="location"]',
        url: 'a'
      },
      filters: {
        keywords: ['intern', 'internship', '2026'],
        excludeKeywords: ['full-time', 'senior', 'staff'],
        yearFilter: '2026'
      }
    },
    {
      name: 'Microsoft Careers',
      url: 'https://careers.microsoft.com/us/en/search-results?keywords=intern',
      type: 'career_page',
      selectors: {
        jobContainer: '.ms-List-cell',
        title: '.ms-List-cellTitle',
        company: '.ms-List-cellCompany',
        location: '.ms-List-cellLocation',
        url: 'a'
      },
      filters: {
        keywords: ['intern', 'internship', '2026'],
        excludeKeywords: ['full-time', 'senior'],
        yearFilter: '2026'
      }
    },
    {
      name: 'Meta Careers',
      url: 'https://www.metacareers.com/jobs/?q=intern',
      type: 'career_page',
      selectors: {
        jobContainer: '[data-testid="job-card"]',
        title: '[data-testid="job-title"]',
        company: '[data-testid="company-name"]',
        location: '[data-testid="location"]',
        url: 'a'
      },
      filters: {
        keywords: ['intern', 'internship', '2026'],
        excludeKeywords: ['full-time', 'senior'],
        yearFilter: '2026'
      }
    },
    // ATS Platforms
    {
      name: 'Greenhouse Jobs',
      url: 'https://boards.greenhouse.io/embed/job_board?for=',
      type: 'ats',
      selectors: {
        jobContainer: '.opening',
        title: '.opening-title',
        company: '.opening-company',
        location: '.opening-location',
        url: 'a'
      },
      filters: {
        keywords: ['intern', 'internship', '2026'],
        excludeKeywords: ['full-time', 'senior'],
        yearFilter: '2026'
      }
    },
    {
      name: 'Lever Jobs',
      url: 'https://jobs.lever.co/',
      type: 'ats',
      selectors: {
        jobContainer: '.posting',
        title: '.posting-title',
        company: '.posting-categories',
        location: '.posting-categories',
        url: 'a'
      },
      filters: {
        keywords: ['intern', 'internship', '2026'],
        excludeKeywords: ['full-time', 'senior'],
        yearFilter: '2026'
      }
    }
  ];

  private browser: any = null;

  /**
   * Scrape all targets for 2026 internships
   */
  async scrapeAllTargets(maxResults: number = 100): Promise<ScrapingResult[]> {
    const results: ScrapingResult[] = [];
    
    try {
      // Initialize browser
      console.log('Initializing Puppeteer browser...');
      console.log('Executable path:', process.env.PUPPETEER_EXECUTABLE_PATH || '/opt/homebrew/bin/chromium');
      
      this.browser = await puppeteer.launch({
        headless: true,
        // Let Puppeteer use its bundled Chromium for better compatibility
        // executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/opt/homebrew/bin/chromium',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-extensions'
        ]
      });
      
      if (!this.browser) {
        throw new Error('Failed to initialize Puppeteer browser');
      }
      
      console.log('Puppeteer browser initialized successfully');

      // Scrape each target
      for (const target of this.targets) {
        try {
          console.log(`Scraping ${target.name}...`);
          const result = await this.scrapeTarget(target, Math.floor(maxResults / this.targets.length));
          results.push(result);
        } catch (error) {
          console.error(`Failed to scrape ${target.name}:`, error);
          results.push({
            source: target.name,
            data: [],
            errors: [error instanceof Error ? error.message : 'Unknown error'],
            metadata: {
              totalFound: 0,
              processed: 0,
              skipped: 0,
              executionTime: 0
            }
          });
        }
      }

      return results;
    } finally {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    }
  }

  /**
   * Scrape a specific target
   */
  private async scrapeTarget(target: ScrapingTarget, maxResults: number): Promise<ScrapingResult> {
    const startTime = Date.now();
    const data: RawInternshipData[] = [];
    const errors: string[] = [];

    try {
      if (!this.browser) {
        throw new Error('Browser not initialized');
      }
      
      const page = await this.browser.newPage();
      
      // Set user agent to avoid detection
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
      
      // Navigate to target URL with better error handling
      try {
        await page.goto(target.url, { 
          waitUntil: 'domcontentloaded',
          timeout: 15000 
        });
      } catch (error) {
        errors.push(`Navigation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return {
          source: target.name,
          data: [],
          errors,
          metadata: {
            totalFound: 0,
            processed: 0,
            skipped: 0,
            executionTime: Date.now() - startTime
          }
        };
      }
      
      // Wait for job listings to load with better error handling
      try {
        await page.waitForSelector(target.selectors.jobContainer, { timeout: 10000 });
      } catch (error) {
        errors.push(`No job listings found: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Continue anyway - maybe the page structure is different
      }
      
      // Extract job data
      const jobs = await page.evaluate((selectors, filters) => {
        const jobElements = document.querySelectorAll(selectors.jobContainer);
        const jobs: any[] = [];
        
        jobElements.forEach((element) => {
          try {
            const title = element.querySelector(selectors.title)?.textContent?.trim();
            const company = element.querySelector(selectors.company)?.textContent?.trim();
            const location = element.querySelector(selectors.location)?.textContent?.trim();
            const url = element.querySelector(selectors.url)?.getAttribute('href');
            
            if (title && company) {
              // Apply filters
              const titleLower = title.toLowerCase();
              const hasKeywords = filters.keywords.some(keyword => 
                titleLower.includes(keyword.toLowerCase())
              );
              const hasExcludeKeywords = filters.excludeKeywords.some(keyword => 
                titleLower.includes(keyword.toLowerCase())
              );
              
              if (hasKeywords && !hasExcludeKeywords) {
                jobs.push({
                  title,
                  company,
                  location: location || 'Location TBD',
                  url: url ? (url.startsWith('http') ? url : `https://${window.location.hostname}${url}`) : '',
                  description: element.textContent?.trim().substring(0, 500) || ''
                });
              }
            }
          } catch (error) {
            console.error('Error parsing job element:', error);
          }
        });
        
        return jobs;
      }, target.selectors, target.filters);

      // Convert to RawInternshipData format
      for (const job of jobs.slice(0, maxResults)) {
        const internshipData: RawInternshipData = {
          source: `Direct Scrape: ${target.name}`,
          sourceType: InternshipSourceType.PROGRAM_PAGE,
          url: job.url,
          title: job.title,
          company: job.company,
          description: job.description,
          location: job.location,
          postedAt: new Date().toISOString(),
          applicationUrl: job.url,
          rawPayload: {
            scrapedAt: new Date().toISOString(),
            source: target.name,
            targetUrl: target.url
          }
        };
        
        data.push(internshipData);
      }

      await page.close();
      
      return {
        source: target.name,
        data,
        errors,
        metadata: {
          totalFound: jobs.length,
          processed: data.length,
          skipped: jobs.length - data.length,
          executionTime: Date.now() - startTime
        }
      };

    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error');
      return {
        source: target.name,
        data,
        errors,
        metadata: {
          totalFound: 0,
          processed: 0,
          skipped: 0,
          executionTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Scrape specific company career pages
   */
  async scrapeCompanyPages(companies: string[]): Promise<ScrapingResult[]> {
    const results: ScrapingResult[] = [];
    
    try {
      // Initialize browser
      console.log('Initializing Puppeteer browser for company pages...');
      console.log('Executable path:', process.env.PUPPETEER_EXECUTABLE_PATH || '/opt/homebrew/bin/chromium');
      
      this.browser = await puppeteer.launch({
        headless: true,
        // Let Puppeteer use its bundled Chromium for better compatibility
        // executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/opt/homebrew/bin/chromium',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-extensions'
        ]
      });
      
      if (!this.browser) {
        throw new Error('Failed to initialize Puppeteer browser');
      }
      
      console.log('Puppeteer browser initialized successfully for company pages');
      
      for (const company of companies) {
        const target: ScrapingTarget = {
          name: `${company} Careers`,
          url: this.getCompanyCareerUrl(company),
          type: 'career_page',
          selectors: this.getCompanySelectors(company),
          filters: {
            keywords: ['intern', 'internship', '2026'],
            excludeKeywords: ['full-time', 'senior', 'staff'],
            yearFilter: '2026'
          }
        };
        
        const result = await this.scrapeTarget(target, 20);
        results.push(result);
      }
      
    } finally {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    }
    
    return results;
  }

  /**
   * Get company career page URL
   */
  private getCompanyCareerUrl(company: string): string {
    const companyUrls: Record<string, string> = {
      'Google': 'https://careers.google.com/jobs/results/?q=intern',
      'Microsoft': 'https://careers.microsoft.com/us/en/search-results?keywords=intern',
      'Meta': 'https://www.metacareers.com/jobs/?q=intern',
      'Apple': 'https://jobs.apple.com/en-us/search?search=intern',
      'Amazon': 'https://www.amazon.jobs/en/search?base_query=intern',
      'Netflix': 'https://jobs.netflix.com/search?q=intern',
      'Tesla': 'https://www.tesla.com/careers/search/?keyword=intern',
      'Salesforce': 'https://salesforce.wd1.myworkdayjobs.com/en-US/External_Career_Site?q=intern',
      'Uber': 'https://www.uber.com/careers/list/?q=intern',
      'Airbnb': 'https://careers.airbnb.com/positions/?search=intern',
      'Robinhood': 'https://robinhood.com/careers/openings/?search=intern',
      'Stripe': 'https://stripe.com/jobs/search?q=intern',
      'Notion': 'https://www.notion.so/careers?search=intern',
      'Figma': 'https://www.figma.com/careers/?search=intern',
      'Canva': 'https://www.canva.com/careers/jobs/?search=intern',
      'Spotify': 'https://www.lifeatspotify.com/jobs?search=intern',
      'Discord': 'https://discord.com/careers?search=intern',
      'Twitch': 'https://careers.twitch.tv/jobs?search=intern',
      'Reddit': 'https://www.redditinc.com/careers?search=intern',
      'Pinterest': 'https://careers.pinterest.com/careers?search=intern',
      'Palantir': 'https://www.palantir.com/careers/openings/?search=intern',
      'Databricks': 'https://www.databricks.com/company/careers/open-positions?search=intern',
      'Snowflake': 'https://careers.snowflake.com/jobs?search=intern',
      'MongoDB': 'https://www.mongodb.com/careers/jobs?search=intern',
      'Elastic': 'https://www.elastic.co/careers?search=intern',
      'Atlassian': 'https://www.atlassian.com/company/careers/all-jobs?search=intern',
      'Slack': 'https://slack.com/careers?search=intern',
      'Zoom': 'https://careers.zoom.us/jobs?search=intern',
      'Dropbox': 'https://www.dropbox.com/jobs/all-jobs?search=intern',
      'Box': 'https://www.box.com/careers/jobs?search=intern',
      'Square': 'https://careers.squareup.com/us/en/jobs?search=intern',
      'PayPal': 'https://www.paypal.com/us/webapps/mpp/jobs?search=intern',
      'Visa': 'https://jobs.smartrecruiters.com/Visa?search=intern',
      'Mastercard': 'https://careers.mastercard.com/us/en/jobs?search=intern',
      'Goldman-Sachs': 'https://www.goldmansachs.com/careers/search/?search=intern',
      'JP-Morgan': 'https://careers.jpmorgan.com/us/en/search-results?search=intern',
      'Morgan-Stanley': 'https://www.morganstanley.com/careers/search?search=intern',
      'BlackRock': 'https://careers.blackrock.com/jobs?search=intern',
      'Bloomberg': 'https://careers.bloomberg.com/jobs?search=intern',
      'Two-Sigma': 'https://careers.twosigma.com/careers?search=intern'
    };
    
    return companyUrls[company] || `https://careers.${company.toLowerCase()}.com/jobs?q=intern`;
  }

  /**
   * Get company-specific selectors
   */
  private getCompanySelectors(company: string): ScrapingTarget['selectors'] {
    const selectorMap: Record<string, ScrapingTarget['selectors']> = {
      'Google': {
        jobContainer: '[data-testid="search-results"] > div',
        title: 'h3',
        company: '[data-testid="company-name"]',
        location: '[data-testid="location"]',
        url: 'a'
      },
      'Microsoft': {
        jobContainer: '.ms-List-cell',
        title: '.ms-List-cellTitle',
        company: '.ms-List-cellCompany',
        location: '.ms-List-cellLocation',
        url: 'a'
      },
      'Meta': {
        jobContainer: '[data-testid="job-card"]',
        title: '[data-testid="job-title"]',
        company: '[data-testid="company-name"]',
        location: '[data-testid="location"]',
        url: 'a'
      }
    };
    
    return selectorMap[company] || {
      jobContainer: '.job-listing, .job-item, .position',
      title: 'h3, .title, .job-title',
      company: '.company, .employer',
      location: '.location, .city',
      url: 'a'
    };
  }

  /**
   * Health check for scraping service
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Test with a simple page
      const browser = await puppeteer.launch({ 
        headless: true,
        // Let Puppeteer use its bundled Chromium for better compatibility
        // executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/opt/homebrew/bin/chromium',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-extensions'
        ]
      });
      const page = await browser.newPage();
      await page.goto('https://httpbin.org/get', { waitUntil: 'networkidle2' });
      await browser.close();
      return true;
    } catch (error) {
      console.error('Comprehensive scraper health check failed:', error);
      return false;
    }
  }
}

// Export default instance
export const comprehensiveScraper = new ComprehensiveScraper();
