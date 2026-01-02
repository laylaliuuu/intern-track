// Data fetching service that orchestrates different data sources
import { exaClient, ExaResult } from '../lib/exa-client';
import { githubScraper } from './scraping/github-scraper';
import { comprehensiveScraper } from './scraping/comprehensive-scraper';
import { companyOrchestrator } from './scraping/company-scraping-orchestrator';
import { RawInternshipData, InternshipSourceType } from '../types';

export interface FetchOptions {
  sources?: DataSource[];
  roles?: string[];
  companies?: string[];
  locations?: string[];
  maxResults?: number;
  includePrograms?: boolean;
}

export interface DataSource {
  name: string;
  type: 'exa' | 'api' | 'scrape' | 'comprehensive';
  enabled: boolean;
  config?: Record<string, unknown>;
}

export interface FetchResult {
  source: string;
  sourceType: InternshipSourceType;
  data: RawInternshipData[];
  errors: string[];
  metadata: {
    totalFound: number;
    processed: number;
    skipped: number;
    executionTime: number;
  };
}

export class DataFetcherService {
  private defaultSources: DataSource[] = [
    {
      name: 'GitHub Curated Lists',
      type: 'scrape',
      enabled: true,
      config: {
        maxResults: 10000, // Increased to get all 2026 internships
        repos: [
          'pittcsc/Summer2026-Internships' // Only use the 2026 repo
        ]
      }
    },
    {
      name: 'Comprehensive Web Scraper',
      type: 'comprehensive',
      enabled: false, // DISABLED - too slow for testing
      config: {
        maxResults: 100,
        companies: [
          'Google', 'Microsoft', 'Meta', 'Apple', 'Amazon',
          'Netflix', 'Tesla', 'Salesforce', 'Uber', 'Airbnb',
          'Robinhood', 'Stripe', 'Notion', 'Figma', 'Canva',
          'Spotify', 'Discord', 'Twitch', 'Reddit', 'Pinterest',
          'Palantir', 'Databricks', 'Snowflake', 'MongoDB', 'Elastic',
          'Atlassian', 'Slack', 'Zoom', 'Dropbox', 'Box',
          'Square', 'PayPal', 'Visa', 'Mastercard', 'Goldman-Sachs',
          'JP-Morgan', 'Morgan-Stanley', 'BlackRock', 'Bloomberg', 'Two-Sigma'
        ]
      }
    },
    {
      name: 'Exa.ai Search',
      type: 'exa',
      enabled: process.env.ENABLE_EXA === 'true',
      config: {
        maxResults: 100,
        includeDomains: [
          'careers.google.com',
          'careers.microsoft.com',
          'careers.meta.com',
          'jobs.apple.com',
          'amazon.jobs',
          'careers.netflix.com',
          'tesla.com'
        ]
      }
    },
    {
      name: 'Direct Company Scraping',
      type: 'api',
      enabled: false, // TEMPORARILY DISABLED - too slow
      config: {
        priorityLevel: 1,
        maxCompanies: 50
      }
    }
  ];

  /**
   * Fetch internship data from all enabled sources
   */
  async fetchInternships(options: FetchOptions = {}): Promise<FetchResult[]> {
    const startTime = Date.now();
    const sources = options.sources || this.defaultSources;
    const results: FetchResult[] = [];

    console.log(`Starting data fetch with ${sources.length} sources...`);

    for (const source of sources.filter(s => s.enabled)) {
      try {
        console.log(`Fetching from source: ${source.name}`);
        
        let result: FetchResult;
        
        switch (source.type) {
          case 'exa':
            result = await this.fetchFromExa(source, options);
            break;
          case 'api':
            result = await this.fetchFromApi(source, options);
            break;
          case 'scrape':
            result = await this.fetchFromScraper(source, options);
            break;
          case 'comprehensive':
            result = await this.fetchFromComprehensiveScraper(source, options);
            break;
          case 'api':
            result = await this.fetchFromCompanyOrchestrator(source, options);
            break;
          default:
            throw new Error(`Unsupported source type: ${source.type}`);
        }

        results.push(result);
        console.log(`Completed ${source.name}: ${result.data.length} internships found`);
        
      } catch (error) {
        console.error(`Error fetching from ${source.name}:`, error);
        results.push({
          source: source.name,
          sourceType: InternshipSourceType.API_FEED,
          data: [],
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          metadata: {
            totalFound: 0,
            processed: 0,
            skipped: 0,
            executionTime: Date.now() - startTime
          }
        });
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`Data fetch completed in ${totalTime}ms. Total internships: ${results.reduce((sum, r) => sum + r.data.length, 0)}`);

    return results;
  }

  /**
   * Fetch data using Exa.ai search
   */
  private async fetchFromExa(source: DataSource, options: FetchOptions): Promise<FetchResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const rawData: RawInternshipData[] = [];

    try {
      // Fetch general internships
      const generalResults = await this.fetchGeneralInternships(options);
      rawData.push(...generalResults);

      // Fetch company-specific internships if companies specified
      if (options.companies && options.companies.length > 0) {
        for (const company of options.companies) {
          try {
            const companyResults = await this.fetchCompanyInternships(company, options);
            rawData.push(...companyResults);
          } catch (error) {
            errors.push(`Failed to fetch ${company} internships: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      // Fetch diversity programs if enabled
      if (options.includePrograms) {
        try {
          const programResults = await this.fetchDiversityPrograms(options);
          rawData.push(...programResults);
        } catch (error) {
          errors.push(`Failed to fetch diversity programs: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Remove duplicates based on URL
      const uniqueData = this.deduplicateByUrl(rawData);

      return {
        source: source.name,
        sourceType: InternshipSourceType.API_FEED,
        data: uniqueData,
        errors,
        metadata: {
          totalFound: rawData.length,
          processed: uniqueData.length,
          skipped: rawData.length - uniqueData.length,
          executionTime: Date.now() - startTime
        }
      };

    } catch (error) {
      throw new Error(`Exa.ai fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch general internship postings with role-based searches
   */
  private async fetchGeneralInternships(options: FetchOptions): Promise<RawInternshipData[]> {
    const results: RawInternshipData[] = [];
    const maxResults = Math.min(options.maxResults || 200, 500); // Increased from 30 to 200

    // Focus on the most popular internship roles
    const roles = [
      'software engineer',
      'data scientist', 
      'product manager',
      'business analyst',
      'design',
      'marketing',
      'finance',
      'operations',
      'research',
      'quantitative analyst',
      'trading analyst',
      'AI engineer',
      'ML engineer',
      'data analyst'
    ];

    console.log(`🚀 Starting comprehensive search across ${roles.length} roles with ${maxResults} max results`);

    // Search for each role with increased result limits
    for (const role of roles) {
      try {
        console.log(`🔍 Searching Exa.ai for ${role} internships...`);
        const searchResults = await exaClient.searchByRole(role, {
          cycle: 'summer 2026',
          numResults: 50, // Increased to get more results
        });

        console.log(`📊 Exa.ai returned ${searchResults.results.length} results for ${role}`);

        // Filter and rank results by quality
        const qualityResults = this.filterAndRankResults(searchResults.results);
        console.log(`✅ ${qualityResults.length} results passed quality filter for ${role}`);

        // Take up to 20 results per role (14 roles × 20 = 280 max, but we'll dedupe later)
        for (const result of qualityResults.slice(0, 20)) {
          const rawData = this.convertExaResultToRawData(result, InternshipSourceType.API_FEED);
          if (rawData) {
            console.log(`✓ Converted: ${rawData.title} at ${rawData.company}`);
            results.push(rawData);
          } else {
            console.log(`✗ Failed to convert: ${result.title}`);
          }
        }

        // Add delay between API calls to avoid rate limiting (reduced for efficiency)
        if (roles.indexOf(role) < roles.length - 1) {
          console.log(`⏳ Waiting 1 second before next search...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.warn(`Failed to search for ${role} internships:`, error);
      }
    }

    // Deduplicate results by URL and company+title combination
    const deduplicatedResults = this.deduplicateResults(results);
    console.log(`🎯 Final results: ${deduplicatedResults.length} unique internships (from ${results.length} total)`);

    return deduplicatedResults.slice(0, maxResults);
  }

  /**
   * Fetch company-specific internships
   */
  private async fetchCompanyInternships(company: string, options: FetchOptions): Promise<RawInternshipData[]> {
    const results: RawInternshipData[] = [];
    const maxResults = Math.min(options.maxResults || 100, 200); // Use options maxResults

    try {
      console.log(`🏢 Fetching ${company} internships with maxResults: ${maxResults}`);
      const searchResults = await exaClient.searchCompanyPrograms(company, maxResults);

      console.log(`📊 ${company} search returned ${searchResults.results.length} results`);

      for (const result of searchResults.results) {
        const rawData = this.convertExaResultToRawData(result, InternshipSourceType.COMPANY_CAREER_PAGE);
        if (rawData) {
          console.log(`✓ Converted ${company}: ${rawData.title}`);
          results.push(rawData);
        } else {
          console.log(`✗ Failed to convert ${company}: ${result.title}`);
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch ${company} internships:`, error);
    }

    console.log(`✅ ${company} final results: ${results.length}`);
    return results;
  }

  /**
   * Fetch diversity and inclusion programs
   */
  private async fetchDiversityPrograms(options: FetchOptions): Promise<RawInternshipData[]> {
    const results: RawInternshipData[] = [];

    try {
      const searchResults = await exaClient.searchDiversityPrograms();

      for (const result of searchResults.results) {
        const rawData = this.convertExaResultToRawData(result, InternshipSourceType.PROGRAM_PAGE);
        if (rawData) {
          results.push(rawData);
        }
      }
    } catch (error) {
      console.warn('Failed to fetch diversity programs:', error);
    }

    return results;
  }

  /**
   * Convert Exa.ai result to RawInternshipData format
   */
  private convertExaResultToRawData(
    result: ExaResult, 
    sourceType: InternshipSourceType
  ): RawInternshipData | null {
    try {
      // Reject generic pages (no specific job posting)
      const lowerUrl = result.url.toLowerCase();
      const genericPagePatterns = [
        /\/careers\/?$/i,
        /\/jobs\/?$/i,
        /\/internships\/?$/i,
        /\/students\/?$/i,
        /\/university\/?$/i,
        /how-to-apply/i,
        /career-advice/i,
        /faq/i,
        /overview/i
      ];
      if (genericPagePatterns.some(pattern => pattern.test(lowerUrl))) {
        console.log(`Skipping generic page: ${result.url}`);
        return null;
      }

      // Must have job identifier in URL patterns to be a specific posting
      const hasJobId = ['/job/', '/jobs/', '/position/', '/posting/', 'job-id', 'req-id', 'jobid'].some(
        pattern => lowerUrl.includes(pattern)
      );
      if (!hasJobId) {
        console.log(`No job ID in URL: ${result.url}`);
        return null;
      }

      // Filter out third-party scrapers
      const scraperDomains = [
        'topjobstoday.com', 'jointaro.com', 'dailyremote.com',
        'naukri.com', 'cse.noticebard.com', 'skyline.tw',
        'content.techgig.com', 'sites.google.com', 'medium.com'
      ];
      
      const urlDomain = new URL(result.url).hostname.toLowerCase();
      if (scraperDomains.some(domain => urlDomain.includes(domain))) {
        console.log(`Skipping third-party scraper: ${result.url}`);
        return null;
      }

      // Extract company name
      const company = this.extractCompanyName(result.url, result.title);
      if (!company) {
        console.log(`No company name: ${result.title}`);
        return null;
      }

      // Extract location
      const location = this.extractLocation(result.text || result.title);

      // Extract application URL
      const finalApplicationUrl = this.extractApplicationUrl(result.text || '', result.url);

      // Enhanced URL validation with authority checking
      const urlValidation = this.validateAndScoreUrl(finalApplicationUrl);
      if (!urlValidation.valid) {
        console.log(`Invalid URL: ${finalApplicationUrl} - ${urlValidation.reason}`);
        return null;
      }

      // Check if posting is still active/accepting applications (with year checks)
      const isActive = this.isPostingStillActive(result.text || result.title, result.publishedDate);
      if (!isActive) {
        console.log(`Inactive/expired posting: ${result.title}`);
        return null;
      }

      // Calculate confidence score
      const score = this.calculateInternshipScore(result);
      
      // Add URL authority score to overall confidence
      const urlScore = urlValidation.score / 100; // Normalize to 0-1
      const finalScore = (score + urlScore) / 2; // Average content and URL scores
      
      if (finalScore < 0.3) {
        console.log(`Low confidence (${finalScore.toFixed(2)}): ${result.title}`);
        return null;
      }

      // Clean title
      const cleanTitle = this.cleanTitle(result.title);

      console.log(`✓ Accepted (content: ${score.toFixed(2)}, URL: ${urlScore.toFixed(2)}, final: ${finalScore.toFixed(2)}): ${cleanTitle}`);

      // Parse posted date properly
      let postedAt: string;
      if (result.publishedDate) {
        try {
          const parsedDate = new Date(result.publishedDate);
          if (!isNaN(parsedDate.getTime())) {
            postedAt = parsedDate.toISOString();
          } else {
            // If parsing fails, use a reasonable default (7 days ago)
            const defaultDate = new Date();
            defaultDate.setDate(defaultDate.getDate() - 7);
            postedAt = defaultDate.toISOString();
          }
        } catch (error) {
          // If parsing fails, use a reasonable default
          const defaultDate = new Date();
          defaultDate.setDate(defaultDate.getDate() - 7);
          postedAt = defaultDate.toISOString();
        }
      } else {
        // No published date, use a reasonable default (7 days ago)
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() - 7);
        postedAt = defaultDate.toISOString();
      }

      return {
        source: 'Exa.ai',
        sourceType,
        url: finalApplicationUrl,
        title: cleanTitle,
        company,
        description: result.text || result.summary || '',
        location,
        postedAt: postedAt,
        applicationUrl: finalApplicationUrl,
        rawPayload: {
          exaScore: result.score,
          exaId: result.id,
          confidenceScore: score,
          scrapedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error converting Exa result:', error);
      return null;
    }
  }

  /**
   * Check if URL points to a specific job posting (not a general page)
   */
  private isValidJobPostingUrl(url: string): boolean {
    const genericPatterns = [
      '/students',
      '/careers',
      '/jobs$',
      '/internships$',
      '/programs$',
      '/overview',
      '/how-it-works',
      '/search',
      '/apply$'
    ];

    const specificPatterns = [
      '/job/',
      '/jobs/',
      '/position/',
      '/posting/',
      '/apply/',
      '/details/',
      'job-id',
      'position-id',
      'req-id'
    ];

    // Check if URL has specific job indicators
    const hasSpecificPattern = specificPatterns.some(pattern => 
      url.toLowerCase().includes(pattern)
    );

    // Check if URL is too generic
    const isGeneric = genericPatterns.some(pattern => 
      new RegExp(pattern + '/?$').test(url.toLowerCase())
    );

    return hasSpecificPattern && !isGeneric;
  }

  /**
   * Check if title indicates a specific job posting
   */
  private isValidJobTitle(title: string): boolean {
    const genericTitles = [
      'careers',
      'students',
      'overview',
      'programs',
      'how it works',
      'search',
      'jobs search',
      'find jobs'
    ];

    const internshipIndicators = [
      'intern',
      'internship',
      'co-op',
      'student position',
      'undergraduate'
    ];

    const roleIndicators = [
      'software engineer',
      'product manager',
      'data scientist',
      'business analyst',
      'design',
      'marketing',
      'finance'
    ];

    const lowerTitle = title.toLowerCase();
    
    // Skip if title is too generic
    if (genericTitles.some(generic => lowerTitle.includes(generic) && lowerTitle.length < 50)) {
      return false;
    }

    // Must have internship indicators
    const hasInternshipTerm = internshipIndicators.some(indicator => lowerTitle.includes(indicator));
    
    // Or have role + student context
    const hasRoleAndStudentContext = roleIndicators.some(role => lowerTitle.includes(role)) && 
      (lowerTitle.includes('student') || lowerTitle.includes('college') || lowerTitle.includes('university'));

    return hasInternshipTerm || hasRoleAndStudentContext;
  }

  /**
   * Check if job posting is specifically for undergraduates/interns (not full-time)
   */
  private isUndergraduatePosition(title: string, content: string): boolean {
    const fullText = `${title} ${content}`.toLowerCase();

    // Full-time/senior position indicators (exclude these)
    const fullTimeIndicators = [
      'full time',
      'full-time',
      'permanent position',
      'senior engineer',
      'staff engineer',
      'principal engineer',
      'lead engineer',
      'engineering manager',
      'senior developer',
      'senior analyst',
      'senior consultant',
      'director',
      'vice president',
      'vp ',
      'experienced professional',
      '5+ years experience',
      '3+ years experience',
      'minimum 3 years',
      'minimum 5 years',
      'graduate program',
      'phd program',
      'postdoc',
      'post-doctoral'
    ];

    // Undergraduate/intern indicators (include these)
    const undergraduateIndicators = [
      'intern',
      'internship',
      'co-op',
      'student position',
      'undergraduate',
      'college student',
      'university student',
      'bachelor',
      'freshman',
      'sophomore',
      'junior year',
      'senior year',
      'student program',
      'summer program',
      'academic year',
      'school year'
    ];

    // Check for full-time indicators (should exclude)
    const hasFullTimeIndicators = fullTimeIndicators.some(indicator => 
      fullText.includes(indicator)
    );

    if (hasFullTimeIndicators) {
      return false;
    }

    // Check for undergraduate indicators (should include)
    const hasUndergraduateIndicators = undergraduateIndicators.some(indicator => 
      fullText.includes(indicator)
    );

    return hasUndergraduateIndicators;
  }

  /**
   * Check if job posting is still active and accepting applications
   */
  private isJobPostingActive(content: string, title: string): boolean {
    if (!content && !title) return true; // Default to active if no content to analyze

    const fullText = `${title} ${content}`.toLowerCase();

    // Indicators that job is closed/inactive
    const closedIndicators = [
      'position filled',
      'no longer accepting',
      'applications closed',
      'deadline passed',
      'position has been filled',
      'this job is no longer available',
      'expired',
      'closed position',
      'hiring complete',
      'application period ended',
      'recruitment closed'
    ];

    // Indicators that job is active
    const activeIndicators = [
      'now hiring',
      'accepting applications',
      'apply now',
      'submit application',
      'deadline',
      'apply by',
      'applications due',
      'position available',
      'currently seeking',
      'open position',
      'join our team'
    ];

    // Check for closed indicators first (higher priority)
    const isClosed = closedIndicators.some(indicator => fullText.includes(indicator));
    if (isClosed) {
      return false;
    }

    // Check for active indicators
    const hasActiveIndicators = activeIndicators.some(indicator => fullText.includes(indicator));
    
    // If we have active indicators, it's definitely active
    if (hasActiveIndicators) {
      return true;
    }

    // Check for deadline dates
    const deadlinePattern = /deadline[:\s]*([a-z]+ \d{1,2},? \d{4}|january|february|march|april|may|june|july|august|september|october|november|december)/i;
    const hasDeadline = deadlinePattern.test(fullText);
    
    if (hasDeadline) {
      // Try to parse the deadline and check if it's in the future
      const deadlineMatch = fullText.match(deadlinePattern);
      if (deadlineMatch) {
        try {
          const deadlineText = deadlineMatch[0];
          const now = new Date();
          
          // Simple check for current year deadlines
          const currentYear = now.getFullYear();
          const nextYear = currentYear + 1;
          
          if (deadlineText.includes(currentYear.toString()) || deadlineText.includes(nextYear.toString())) {
            return true; // Assume active if deadline mentions current/next year
          }
        } catch (error) {
          // If parsing fails, assume active
          return true;
        }
      }
    }

    // Default to active if we can't determine status
    // Better to include potentially active jobs than miss real opportunities
    return true;
  }

  /**
   * Extract real application URL from third-party scraper content
   */
  private extractRealApplicationUrl(text: string, title: string): string | null {
    // Look for direct company career page URLs
    const companyUrlPatterns = [
      /https?:\/\/careers\.google\.com\/[^\s\)]+/gi,
      /https?:\/\/careers\.microsoft\.com\/[^\s\)]+/gi,
      /https?:\/\/careers\.meta\.com\/[^\s\)]+/gi,
      /https?:\/\/jobs\.apple\.com\/[^\s\)]+/gi,
      /https?:\/\/amazon\.jobs\/[^\s\)]+/gi,
      /https?:\/\/careers\.netflix\.com\/[^\s\)]+/gi,
      /https?:\/\/tesla\.com\/careers\/[^\s\)]+/gi,
      /https?:\/\/careers\.salesforce\.com\/[^\s\)]+/gi,
      /https?:\/\/jobs\.uber\.com\/[^\s\)]+/gi,
      /https?:\/\/careers\.airbnb\.com\/[^\s\)]+/gi,
      /https?:\/\/boards\.greenhouse\.io\/[^\s\)]+/gi,
      /https?:\/\/jobs\.lever\.co\/[^\s\)]+/gi,
      /https?:\/\/myworkdayjobs\.com\/[^\s\)]+/gi,
      /https?:\/\/workday\.com\/[^\s\)]+/gi
    ];

    for (const pattern of companyUrlPatterns) {
      const match = text.match(pattern);
      if (match && match[0]) {
        return match[0];
      }
    }

    // Look for "Apply" or "View Job" links
    const applyPatterns = [
      /\[Apply\]\(([^)]+)\)/gi,
      /\[View Job\]\(([^)]+)\)/gi,
      /\[View Details and Apply\]\(([^)]+)\)/gi,
      /href="([^"]*careers[^"]*)"[^>]*>Apply/gi,
      /href="([^"]*jobs[^"]*)"[^>]*>Apply/gi
    ];

    for (const pattern of applyPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Validate that a URL is properly formatted and potentially accessible
   */
  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      
      // Check for obviously invalid domains
      const invalidDomains = [
        'localhost',
        '127.0.0.1',
        'example.com',
        'test.com',
        'placeholder.com'
      ];
      
      if (invalidDomains.some(domain => urlObj.hostname.includes(domain))) {
        return false;
      }
      
      // Check for malformed URLs
      if (url.includes('undefined') || url.includes('null') || url.includes('not-found')) {
        return false;
      }
      
      // Must be HTTP or HTTPS
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if URL points to an authoritative job posting (Stage 2 validation)
   */
  private isAuthoritativeJobPage(url: string): boolean {
    const atsPatterns = [
      /greenhouse\.io/,
      /myworkdayjobs\.com/,
      /lever\.co/,
      /ashbyhq\.com/,
      /smartrecruiters\.com/,
      /boards\.greenhouse\.io/,
      /career(s)?\./,
      /jobs\./,
      /workday\.com/
    ];
    
    return atsPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Check if URL is from a trusted company domain
   */
  private isTrustedCompanyDomain(url: string): boolean {
    const trustedCompanyDomains = [
      'careers.google.com',
      'careers.microsoft.com',
      'careers.meta.com',
      'jobs.apple.com',
      'amazon.jobs',
      'careers.netflix.com',
      'tesla.com',
      'careers.salesforce.com',
      'jobs.uber.com',
      'careers.airbnb.com',
      'careers.nvidia.com',
      'jobs.stripe.com',
      'careers.palantir.com',
      'careers.snowflake.com'
    ];
    
    return trustedCompanyDomains.some(domain => url.includes(domain));
  }

  /**
   * Enhanced URL validation with authority checking
   */
  private validateAndScoreUrl(url: string): { valid: boolean; score: number; reason?: string } {
    if (!this.isValidUrl(url)) {
      return { valid: false, score: 0, reason: 'Invalid URL format' };
    }

    let score = 0;
    
    // High authority sources (ATS systems)
    if (this.isAuthoritativeJobPage(url)) {
      score += 20;
    }
    
    // Trusted company domains
    if (this.isTrustedCompanyDomain(url)) {
      score += 15;
    }
    
    // Job-specific URL patterns
    if (url.includes('/job/') || url.includes('/position/') || url.includes('/jobs/')) {
      score += 10;
    }
    
    // Application-specific patterns
    if (url.includes('apply') || url.includes('application')) {
      score += 5;
    }
    
    // Penalty for aggregator domains
    const aggregatorDomains = [
      'indeed.com', 'glassdoor.com', 'linkedin.com', 'monster.com',
      'ziprecruiter.com', 'internships.com', 'builtin.com', 'wayup.com'
    ];
    
    if (aggregatorDomains.some(domain => url.includes(domain))) {
      score -= 10;
    }
    
    return {
      valid: score >= 0,
      score: Math.max(0, score),
      reason: score < 0 ? 'Aggregator domain' : undefined
    };
  }

  /**
   * Clean up job title to remove artifacts and improve readability
   */
  private cleanTitle(title: string): string {
    if (!title) return 'Unknown Position';
    
    return title
      // Remove markdown formatting
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      
      // Remove HTML tags
      .replace(/<[^>]+>/g, '')
      
      // Remove common artifacts
      .replace(/🛂\s*/, '') // Remove emoji
      .replace(/at \*\*\[([^\]]+)\]\([^)]+\)\*\*/g, 'at $1') // Clean up company links
      .replace(/at \*\*([^*]+)\*\*/g, 'at $1') // Clean up bold company names
      
      // Remove trailing artifacts
      .replace(/\s*in\s*<details>.*$/, '') // Remove location details
      .replace(/\s*at \*\*\[.*$/, '') // Remove malformed company links
      
      // Clean up whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extract application URL from content
   */
  private extractApplicationUrl(text: string, fallbackUrl: string): string {
    if (!text) return fallbackUrl;

    // Look for "apply" links in the text
    const applyLinkPatterns = [
      /https?:\/\/[^\s]+\/apply[^\s]*/gi,
      /https?:\/\/[^\s]+application[^\s]*/gi,
      /https?:\/\/[^\s]+job[^\s]*apply[^\s]*/gi
    ];

    for (const pattern of applyLinkPatterns) {
      const matches = text.match(pattern);
      if (matches && matches[0]) {
        return matches[0].replace(/[.,;)]$/, ''); // Remove trailing punctuation
      }
    }

    return fallbackUrl;
  }

  /**
   * Extract company name from URL or title
   */
  private extractCompanyName(url: string, title: string): string | null {
    try {
      // Try to extract from URL domain
      const urlObj = new URL(url);
      const domain = urlObj.hostname;

      // Common company domain patterns
      const domainMappings: Record<string, string> = {
        'careers.google.com': 'Google',
        'careers.microsoft.com': 'Microsoft',
        'careers.meta.com': 'Meta',
        'jobs.apple.com': 'Apple',
        'amazon.jobs': 'Amazon',
        'careers.netflix.com': 'Netflix',
        'tesla.com': 'Tesla',
        'jpmorgan.com': 'JPMorgan Chase',
        'goldmansachs.com': 'Goldman Sachs',
        'mckinsey.com': 'McKinsey & Company'
      };

      if (domainMappings[domain]) {
        return domainMappings[domain];
      }

      // Try to extract from title - improved patterns
      const titlePatterns = [
        /(?:at|@)\s+([A-Z][a-zA-Z\s&]+?)(?:\s|$|,|-)/,
        /^([A-Z][a-zA-Z\s&]+?)\s+(?:Intern|Engineer|Manager|Analyst)/,
        /^([A-Z][a-zA-Z\s&]+?)\s+in\s+/,
        /^([A-Z][a-zA-Z\s&]+?)\s*$/,
        /\[([A-Z][a-zA-Z\s&]+?)\]/
      ];
      
      for (const pattern of titlePatterns) {
        const match = title.match(pattern);
        if (match && match[1]) {
          const company = match[1].trim();
          // Clean up common artifacts
          const cleaned = company
            .replace(/^\*\*/, '') // Remove markdown bold
            .replace(/\*\*$/, '') // Remove markdown bold
            .replace(/\[([^\]]+)\]\([^)]+\)/, '$1') // Remove markdown links
            .replace(/https?:\/\/[^\s]+/, '') // Remove URLs
            .trim();
          
          if (cleaned && cleaned.length > 1 && cleaned.length < 50) {
            return cleaned;
          }
        }
      }

      // Fallback: use domain without subdomain
      const mainDomain = domain.split('.').slice(-2, -1)[0];
      return mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1);

    } catch (error) {
      return null;
    }
  }

  /**
   * Extract location from text
   */
  private extractLocation(text: string): string | undefined {
    if (!text) return undefined;

    // Common location patterns
    const locationPatterns = [
      /(?:in|at|located in)\s+([A-Z][a-zA-Z\s,]+(?:CA|NY|WA|TX|MA|IL|CO|GA|FL))/i,
      /([A-Z][a-zA-Z\s]+,\s*(?:CA|NY|WA|TX|MA|IL|CO|GA|FL))/g,
      /\b(Remote|Work from home|Distributed)\b/i,
      /\b(San Francisco|New York|Seattle|Boston|Chicago|Austin|Denver|Atlanta|Los Angeles|Mountain View|Redmond|Menlo Park)\b/i
    ];

    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1] || match[0];
      }
    }

    return undefined;
  }

  /**
   * Remove duplicate entries based on URL
   */
  private deduplicateByUrl(data: RawInternshipData[]): RawInternshipData[] {
    const seen = new Set<string>();
    return data.filter(item => {
      if (seen.has(item.url)) {
        return false;
      }
      seen.add(item.url);
      return true;
    });
  }

  /**
   * Score job posting quality based on various factors (soft scoring system)
   */
  private scoreJobPosting(result: ExaResult): number {
    let score = 0;
    const content = `${result.title} ${result.text || result.summary || ''}`.toLowerCase();

    // URL quality indicators (0-30 points)
    if (result.url.includes('/job/') || result.url.includes('/position/')) score += 15;
    if (result.url.includes('job-id') || result.url.includes('req-id')) score += 10;
    if (result.url.includes('greenhouse.io') || result.url.includes('lever.co')) score += 5;
    if (result.url.includes('myworkdayjobs.com') || result.url.includes('ashbyhq.com')) score += 5;

    // Title quality indicators (0-30 points)
    if (content.includes('intern') || content.includes('internship')) score += 15;
    if (content.includes('undergraduate') || content.includes('college student')) score += 10;
    if (content.includes('summer 2026') || content.includes('2026')) score += 8;
    if (content.includes('software engineer') || content.includes('product manager')) score += 7;
    
    // Undergraduate level indicators (0-15 points)
    if (content.includes('freshman') || content.includes('sophomore') || content.includes('junior') || content.includes('senior year')) score += 10;
    if (content.includes('bachelor') || content.includes('university student')) score += 5;

    // Active posting indicators (0-30 points) - Enhanced for better detection
    if (content.includes('now hiring') || content.includes('accepting applications')) score += 15;
    if (content.includes('apply by') || content.includes('deadline')) score += 10;
    if (content.includes('applications open') || content.includes('currently accepting')) score += 12;
    if (content.includes('apply now') || content.includes('submit application')) score += 8;
    if (content.includes('position available') || content.includes('currently seeking')) score += 10;
    
    // Early career program indicators (0-15 points)
    if (content.includes('sophomore') || content.includes('freshman') || content.includes('early insight')) score += 10;
    if (content.includes('undergraduate') || content.includes('college student')) score += 8;
    if (content.includes('campus program') || content.includes('student program')) score += 7;

    // Content quality indicators (0-20 points)
    if (content.includes('responsibilities') || content.includes('qualifications')) score += 10;
    if (content.includes('requirements') || content.includes('job description')) score += 10;

    // Strong penalties for expired/closed postings (-20 to 0 points)
    if (content.includes('application closed') || content.includes('no longer accepting')) score -= 20;
    if (content.includes('deadline passed') || content.includes('expired')) score -= 15;
    if (content.includes('position filled') || content.includes('hiring complete')) score -= 15;
    if (content.includes('applications closed') || content.includes('not accepting')) score -= 12;
    
    // Soft penalties for generic content (-10 to 0 points)
    if (content.includes('how to apply') || content.includes('career advice')) score -= 3;
    if (content.includes('overview') || content.includes('general information')) score -= 3;
    
    // Soft penalties for full-time positions (reduce score but don't block)
    if (content.includes('full time') || content.includes('full-time')) score -= 8;
    if (content.includes('senior engineer') || content.includes('staff engineer') || content.includes('principal')) score -= 5;
    if (content.includes('5+ years') || content.includes('3+ years') || content.includes('experienced')) score -= 5;

    // Recency bonus (0-10 points)
    if (result.publishedDate) {
      const publishedDate = new Date(result.publishedDate);
      const daysSincePublished = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSincePublished <= 7) score += 10;
      else if (daysSincePublished <= 30) score += 5;
      else if (daysSincePublished <= 90) score += 2; // Still give some points for recent posts
    }

    // Authority bonus for trusted domains (0-15 points)
    const trustedDomains = [
      'careers.google.com', 'careers.microsoft.com', 'careers.meta.com',
      'jobs.apple.com', 'amazon.jobs', 'careers.netflix.com',
      'greenhouse.io', 'lever.co', 'myworkdayjobs.com', 'ashbyhq.com'
    ];
    
    const isTrustedDomain = trustedDomains.some(domain => result.url.includes(domain));
    if (isTrustedDomain) score += 15;

    return Math.max(0, Math.min(100, score)); // Clamp between 0-100
  }

  /**
   * Check if a posting appears to be still active/accepting applications
   * Very permissive - only filter out clear "no longer exists" indicators
   */
  private isPostingStillActive(content: string, publishedDate?: string): boolean {
    const text = content.toLowerCase();
    
    // Only filter out very clear "no longer exists" indicators
    const clearClosedIndicators = [
      'no longer exists',
      'position no longer available',
      'this role is no longer available',
      'we are no longer accepting applications',
      'this position has been filled',
      'position filled',
      'hiring complete',
      'applications closed',
      'application closed',
      'deadline passed',
      'expired'
    ];
    
    if (clearClosedIndicators.some(indicator => text.includes(indicator))) {
      return false;
    }
    
    // Check if posting is extremely old (more than 18 months for internships)
    if (publishedDate) {
      const published = new Date(publishedDate);
      const eighteenMonthsAgo = new Date();
      eighteenMonthsAgo.setMonth(eighteenMonthsAgo.getMonth() - 18);
      
      if (published < eighteenMonthsAgo) {
        return false;
      }
    }
    
    // Year checks: reject wrong years and require 2026
    if (text.includes('2024') || text.includes('2025')) {
      return false;
    }
    if (!/(2026|summer\s*2026|spring\s*2026)/i.test(text)) {
      return false;
    }

    // Be moderately permissive otherwise
    return true;
  }

  /**
   * Deduplicate results by URL and company+title combination
   */
  private deduplicateResults(results: RawInternshipData[]): RawInternshipData[] {
    const seen = new Set<string>();
    const deduplicated: RawInternshipData[] = [];

    for (const result of results) {
      // Create a unique key based on URL and company+title combination
      const urlKey = result.url;
      const contentKey = `${result.company.toLowerCase().trim()}-${result.title.toLowerCase().trim()}`;
      
      if (!seen.has(urlKey) && !seen.has(contentKey)) {
        seen.add(urlKey);
        seen.add(contentKey);
        deduplicated.push(result);
      }
    }

    return deduplicated;
  }

  /**
   * Filter and rank results by quality score (improved with lower threshold)
   */
  private filterAndRankResults(results: ExaResult[]): ExaResult[] {
    return results
      .map(result => ({
        ...result,
        qualityScore: this.scoreJobPosting(result)
      }))
      .filter(result => result.qualityScore >= 1) // Very low threshold to get maximum results
      .sort((a, b) => b.qualityScore - a.qualityScore) // Sort by quality score descending
      .slice(0, 100); // Increased limit from 50 to 100 results
  }

  /**
   * Placeholder for API-based fetching (Greenhouse, Lever, etc.)
   */
  private async fetchFromApi(source: DataSource, options: FetchOptions): Promise<FetchResult> {
    // TODO: Implement API-based fetching for Greenhouse, Lever, Workday APIs
    return {
      source: source.name,
      sourceType: InternshipSourceType.API_FEED,
      data: [],
      errors: ['API fetching not yet implemented'],
      metadata: {
        totalFound: 0,
        processed: 0,
        skipped: 0,
        executionTime: 0
      }
    };
  }

  /**
   * Placeholder for web scraping
   */
  private async fetchFromScraper(source: DataSource, options: FetchOptions): Promise<FetchResult> {
    const startTime = Date.now();
    
    try {
      // Import GitHub scraper
      const { githubScraper } = await import('./scraping/github-scraper');
      
      const maxResults = (source.config?.maxResults as number) || options.maxResults || 50;
      const repos = source.config?.repos as string[] || [];
      
      if (repos.length === 0) {
        throw new Error('No repositories configured for GitHub scraper');
      }
      
      const rawData = await githubScraper.scrapeInternships(maxResults);
      
            return {
              source: source.name,
              sourceType: InternshipSourceType.PROGRAM_PAGE,
              data: rawData,
              errors: [],
              metadata: {
                totalFound: rawData.length,
                processed: rawData.length,
                skipped: 0,
                executionTime: Date.now() - startTime
              }
            };
    } catch (error) {
      return {
        source: source.name,
        sourceType: InternshipSourceType.PROGRAM_PAGE,
        data: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
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
   * Fetch data using comprehensive web scraper
   */
  private async fetchFromComprehensiveScraper(source: DataSource, options: FetchOptions): Promise<FetchResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const rawData: RawInternshipData[] = [];

    try {
      console.log(`Comprehensive scraping from ${source.name}...`);
      
      const maxResults = (source.config?.maxResults as number) || options.maxResults || 50;
      const companies = source.config?.companies as string[] || ['Google', 'Microsoft', 'Meta'];
      
      // Scrape specific companies
      const scrapingResults = await comprehensiveScraper.scrapeCompanyPages(companies);
      
      // Collect all results
      for (const result of scrapingResults) {
        rawData.push(...result.data);
        errors.push(...result.errors);
      }

      console.log(`Completed ${source.name}: ${rawData.length} internships found`);

      return {
        source: source.name,
        sourceType: InternshipSourceType.PROGRAM_PAGE,
        data: rawData,
        errors,
        metadata: {
          totalFound: rawData.length,
          processed: rawData.length,
          skipped: 0,
          executionTime: Date.now() - startTime
        }
      };

    } catch (error) {
      console.error(`Error comprehensive scraping from ${source.name}:`, error);
      return {
        source: source.name,
        sourceType: InternshipSourceType.PROGRAM_PAGE,
        data: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
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
   * Calculate confidence score for internship (0-1)
   * Uses fuzzy, contextual signals instead of strict keywords
   */
  private calculateInternshipScore(result: ExaResult): number {
    const title = result.title.toLowerCase();
    const content = (result.text || result.summary || '').toLowerCase();
    const combined = title + ' ' + content;
    
    let score = 0;
    
    // +0.4: Strong internship indicators
    const internKeywords = [
      'intern', 'internship', 'co-op', 'coop',
      'summer analyst', 'summer associate',
      'campus program', 'early careers',
      'sophomore program', 'junior program'
    ];
    if (internKeywords.some(k => combined.includes(k))) {
      score += 0.4;
    }
    
    // +0.4: Seasonal pattern (Summer 2026, Fall 2025, etc.)
    const seasonalPattern = /(summer|fall|spring|winter)\s*20\d{2}/i;
    if (seasonalPattern.test(combined)) {
      score += 0.4;
    }
    
    // +0.2: Undergraduate/student context
    const studentKeywords = [
      'undergraduate', 'student', 'college',
      'university', 'bachelor', 'bs/ms',
      'freshman', 'sophomore', 'junior', 'senior'
    ];
    if (studentKeywords.some(k => combined.includes(k))) {
      score += 0.2;
    }
    
    // +0.2: Trusted domain (career sites, ATS)
    const trustedDomains = [
      'careers.', 'jobs.', 'greenhouse.io', 'lever.co',
      'myworkdayjobs.com', 'workday.com', 'ashbyhq.com'
    ];
    const url = result.url.toLowerCase();
    if (trustedDomains.some(d => url.includes(d))) {
      score += 0.2;
    }
    
    // -0.5: Exclude senior/full-time roles
    const excludeKeywords = [
      'senior', 'staff', 'principal', 'lead',
      'manager', 'director', 'vp ', 'vice president',
      'full-time', 'full time', 'experienced professional',
      '5+ years', '3+ years'
    ];
    if (excludeKeywords.some(k => combined.includes(k))) {
      score -= 0.5;
    }
    
    // -0.3: Inactive posting signals (but allow some noise)
    const inactiveSignals = [
      'no longer available',
      'position has been filled',
      'applications closed',
      'posting expired',
      'position closed'
    ];
    const inactiveCount = inactiveSignals.reduce((c, s) => 
      c + (combined.includes(s) ? 1 : 0), 0
    );
    if (inactiveCount >= 2) {  // Only penalize if multiple signals
      score -= 0.3;
    }
    
    return Math.max(0, Math.min(1, score));  // Clamp to [0, 1]
  }

  /**
   * Validate URL is accessible and not a 404/closed job
   * Uses improved validation logic from job-posting-enricher
   */
  private async validateUrlAccessible(url: string): Promise<{ valid: boolean; reason?: string }> {
    try {
      // Import the job posting enricher for improved validation
      const { jobPostingEnricher } = await import('./data-processing/job-posting-enricher');
      
      // Use the improved validation logic
      const validation = await jobPostingEnricher.validateUrl(url);
      
      return {
        valid: validation.isValid,
        reason: validation.reason
      };
      
    } catch (error) {
      // Fallback to basic validation if job posting enricher fails
      console.warn(`Job posting enricher failed for ${url}, falling back to basic validation:`, error);
      
      try {
        // Basic HTTP status check as fallback
        const response = await fetch(url, {
          method: 'HEAD',
          redirect: 'follow',
          signal: AbortSignal.timeout(5000),
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; InternshipBot/1.0)'
          }
        });
        
        if (response.status === 404) {
          return { valid: false, reason: '404 Not Found' };
        }
        
        if (response.status === 410) {
          return { valid: false, reason: '410 Gone' };
        }
        
        if (response.status >= 500) {
          return { valid: false, reason: `Server error: ${response.status}` };
        }
        
        if (!response.ok) {
          return { valid: false, reason: `HTTP ${response.status}` };
        }
        
        return { valid: true };
        
      } catch (fallbackError) {
        if (fallbackError instanceof Error) {
          if (fallbackError.name === 'AbortError') {
            return { valid: false, reason: 'Timeout' };
          }
          return { valid: false, reason: fallbackError.message };
        }
        return { valid: false, reason: 'Unknown error' };
      }
    }
  }

  /**
   * Batch validate URLs with concurrency control
   */
  async batchValidateUrls(urls: string[]): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    const concurrency = 5; // Validate 5 URLs at a time
    
    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency);
      const validations = await Promise.all(
        batch.map(async (url) => {
          const result = await this.validateUrlAccessible(url);
          if (!result.valid) {
            console.log(`Invalid URL: ${url} - ${result.reason}`);
          }
          return { url, valid: result.valid };
        })
      );
      
      validations.forEach(({ url, valid }) => {
        results.set(url, valid);
      });
    }
    
    return results;
  }

  /**
   * Fetch from company orchestrator
   */
  private async fetchFromCompanyOrchestrator(source: DataSource, options: FetchOptions): Promise<FetchResult> {
    const startTime = Date.now();
    const priorityLevel = (source.config?.priorityLevel as number) || 1;
    
    const rawData = await companyOrchestrator.scrapeByPriority(priorityLevel);
    
    return {
      source: source.name,
      sourceType: InternshipSourceType.COMPANY_CAREER_PAGE,
      data: rawData,
      errors: [],
      metadata: {
        totalFound: rawData.length,
        processed: rawData.length,
        skipped: 0,
        executionTime: Date.now() - startTime
      }
    };
  }

  /**
   * Health check for all data sources
   */
  async healthCheck(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    // Check Exa.ai
    results['exa'] = await exaClient.healthCheck();
    
    // Check comprehensive scraper
    results['comprehensive'] = await comprehensiveScraper.healthCheck();

    // TODO: Add health checks for other sources

    return results;
  }
}

// Export default instance
export const dataFetcher = new DataFetcherService();