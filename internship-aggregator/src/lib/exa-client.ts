// Exa.ai API client for internship data fetching
import pLimit from 'p-limit';
import { exaCircuitBreaker } from './circuit-breaker';

// Rate limiting - Exa.ai allows up to 3 concurrent requests
const limit = pLimit(3);

export interface ExaSearchOptions {
  query: string;
  type?: 'neural' | 'keyword';
  useAutoprompt?: boolean;
  numResults?: number;
  includeDomains?: string[];
  excludeDomains?: string[];
  startCrawlDate?: string;
  endCrawlDate?: string;
  startPublishedDate?: string;
  endPublishedDate?: string;
  includeText?: string[] | boolean; // Can be array of fields or boolean for backwards compatibility
  includeHighlights?: string[] | boolean;
  includeSummary?: string[] | boolean;
  category?: string;
}

export interface ExaResult {
  id: string;
  url: string;
  title: string;
  score: number;
  publishedDate?: string;
  author?: string;
  text?: string;
  highlights?: string[];
  highlightScores?: number[];
  summary?: string;
}

export interface ExaSearchResponse {
  results: ExaResult[];
  autopromptString?: string;
  requestId: string;
}

export interface ExaContentsOptions {
  ids: string[];
  text?: boolean;
  highlights?: boolean;
  summary?: boolean;
}

export interface ExaContentsResponse {
  results: Array<{
    id: string;
    url: string;
    title: string;
    text?: string;
    highlights?: string[];
    summary?: string;
  }>;
  requestId: string;
}

export class ExaApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public requestId?: string
  ) {
    super(message);
    this.name = 'ExaApiError';
  }
}

export class ExaClient {
  private apiKey: string;
  private baseUrl = 'https://api.exa.ai';
  private lastRequestTime: number = 0;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.EXA_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('EXA_API_KEY is required. Please set it in your environment variables.');
    }
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ExaApiError(
        data.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        data.code,
        data.requestId
      );
    }

    return data;
  }

  /**
   * Rate limiting to avoid overwhelming the API
   */
  private async rateLimitDelay(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minDelay = 1500; // 1.5 seconds between requests
    
    if (timeSinceLastRequest < minDelay) {
      const delay = minDelay - timeSinceLastRequest;
      console.log(`⏳ Rate limiting: waiting ${delay}ms before next Exa.ai request...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Make request with retry logic and exponential backoff
   */
  private async makeRequestWithRetry<T>(endpoint: string, options: RequestInit = {}, maxRetries = 3): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Add rate limiting delay before each request
        await this.rateLimitDelay();
        
        return await this.makeRequest<T>(endpoint, options);
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry 400 errors (bad request won't fix itself)
        if (error instanceof ExaApiError && error.status === 400) {
          throw error;
        }
        
        // Don't retry on last attempt
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Calculate delay with exponential backoff (1s, 2s, 4s)
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`Exa API request failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`, error);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }

  /**
   * Search for internship-related content using Exa.ai
   */
  async search(options: ExaSearchOptions): Promise<ExaSearchResponse> {
    return limit(async () => {
      return exaCircuitBreaker.execute(async () => {
        try {
          // Validate request parameters
          this.validateSearchOptions(options);
          
          // Convert boolean options to proper format for Exa API
          const requestBody: any = {
            query: options.query,
            type: options.type || 'neural',
            useAutoprompt: options.useAutoprompt ?? true,
            numResults: options.numResults || 10,
            includeDomains: options.includeDomains,
            excludeDomains: options.excludeDomains,
            startCrawlDate: options.startCrawlDate,
            endCrawlDate: options.endCrawlDate,
            startPublishedDate: options.startPublishedDate,
            endPublishedDate: options.endPublishedDate,
            category: options.category,
          };

          // Handle includeText - convert boolean to array format if needed
          if (options.includeText === true) {
            requestBody.contents = { text: true };
          } else if (Array.isArray(options.includeText)) {
            requestBody.contents = { text: true };
          } else if (options.includeText === false || options.includeText === undefined) {
            // Don't include contents field
          }

          // Handle includeHighlights
          if (options.includeHighlights === true) {
            requestBody.contents = { ...requestBody.contents, highlights: true };
          }

          // Handle includeSummary  
          if (options.includeSummary === true) {
            requestBody.contents = { ...requestBody.contents, summary: true };
          }

          const response = await this.makeRequestWithRetry<ExaSearchResponse>('/search', {
            method: 'POST',
            body: JSON.stringify(requestBody),
          });

          return response;
        } catch (error) {
          // Enhanced error logging
          console.error('Exa search failed:', {
            query: options.query,
            type: options.type,
            numResults: options.numResults,
            includeDomains: options.includeDomains,
            excludeDomains: options.excludeDomains,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
          });
          
          if (error instanceof ExaApiError) {
            throw error;
          }
          throw new ExaApiError(
            `Search request failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      });
    });
  }

  /**
   * Get full content for specific Exa result IDs
   */
  async getContents(options: ExaContentsOptions): Promise<ExaContentsResponse> {
    return limit(async () => {
      try {
        // Build contents request body
        const requestBody: any = {
          ids: options.ids
        };

        // Add contents options if any are requested
        const contents: any = {};
        if (options.text) contents.text = true;
        if (options.highlights) contents.highlights = true;
        if (options.summary) contents.summary = true;
        
        if (Object.keys(contents).length > 0) {
          requestBody.contents = contents;
        }

        const response = await this.makeRequestWithRetry<ExaContentsResponse>('/contents', {
          method: 'POST',
          body: JSON.stringify(requestBody),
        });

        return response;
      } catch (error) {
        if (error instanceof ExaApiError) {
          throw error;
        }
        throw new ExaApiError(
          `Contents request failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });
  }

  /**
   * Search for internships with predefined queries optimized for internship discovery
   */
  async searchInternships(options: {
    role?: string;
    company?: string;
    location?: string;
    cycle?: string;
    numResults?: number;
    includeDomains?: string[];
  }): Promise<ExaSearchResponse> {
    const { role, company, location, cycle, numResults = 20, includeDomains } = options;

    // Build highly specific query for active job postings
    let query = this.buildSpecificInternshipQuery({
      role,
      company,
      location,
      cycle: cycle || 'summer 2026'
    });

    // Optimized domains for direct job postings (removed job boards)
    const defaultDomains = [
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
      'greenhouse.io',
      'lever.co',
      'workday.com',
      'myworkdayjobs.com',
      'jobs.lever.co',
      'boards.greenhouse.io'
      // Removed: indeed.com, glassdoor.com, linkedin.com (job boards, not direct applications)
    ];

    return this.search({
      query,
      type: 'neural',
      useAutoprompt: false, // Disable autoprompt to maintain query precision
      numResults,
      includeDomains: includeDomains || defaultDomains,
      excludeDomains: [
        'indeed.com',
        'glassdoor.com',
        'linkedin.com',
        'monster.com',
        'ziprecruiter.com',
        'topjobstoday.com',
        'jointaro.com',
        'dailyremote.com',
        'naukri.com',
        'cse.noticebard.com',
        'skyline.tw',
        'content.techgig.com',
        'sites.google.com',
        'medium.com',
        // Shopping/product pages
        'amazon.com',
        'amazon.ca',
        'amazon.co.uk',
        'microsoft.com/store',
        'store.google.com'
      ],
      includeText: true,
      includeHighlights: true,
      includeSummary: true,
      // Look for very recent postings (last 3 months for freshness)
      startPublishedDate: new Date('2025-06-01').toISOString(),
    });
  }

  /**
   * Build highly specific queries that target active job postings
   */
  private buildSpecificInternshipQuery(options: {
    role?: string;
    company?: string;
    location?: string;
    cycle: string;
  }): string {
    const { role, company, location, cycle } = options;
    
    // Very simple query construction
    let query = '';
    
    if (company) {
      query = `${company} internship ${cycle}`;
    } else {
      query = `internship ${cycle}`;
    }
    
    if (role) {
      query = `${role} ${query}`;
    }
    
    if (location) {
      query = `${query} ${location}`;
    }
    
    return query;
  }

  /**
   * Search for company-specific internship programs with enhanced coverage
   */
  async searchCompanyPrograms(company: string, numResults = 100): Promise<ExaSearchResponse> {
    // Ultra-simple, broad queries for company-specific searches
    const queryVariations = [
      `${company} intern`,
      `${company} internship`,
      `${company} student`
    ].slice(0, 6); // Increased to 6 queries per company to include all grade levels

    console.log(`🔍 Searching ${company} with ${queryVariations.length} query variations...`);

    // Run all queries in parallel
    const searchPromises = queryVariations.map(query => 
      this.search({
      query,
      type: 'neural',
      useAutoprompt: true,
        numResults: Math.ceil(numResults / queryVariations.length),
        includeText: true,
        includeSummary: true,
        includeHighlights: true,
        // Tight time range to avoid stale results
        startPublishedDate: new Date('2025-06-01').toISOString(),
        // Broader domain coverage - don't restrict to just careers.company.com
        excludeDomains: [
          'indeed.com', 'glassdoor.com', 'linkedin.com', 'monster.com',
          'ziprecruiter.com', 'internships.com', 'builtin.com', 'wayup.com',
          'amazon.com', 'amazon.ca', 'amazon.co.uk', 'microsoft.com/store', 'store.google.com'
        ]
      })
    );

    try {
      // Execute all searches in parallel
      const results = await Promise.all(searchPromises);
      
      // Combine and deduplicate results
      const combinedResults = this.combineAndDeduplicateResults(results);
      
      console.log(`✅ Combined ${combinedResults.length} unique results for ${company}`);
      
      return {
        results: combinedResults.slice(0, numResults),
        requestId: `company_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
    } catch (error) {
      console.error(`Failed to search for ${company} internships:`, error);
      // Fallback to single query
      return this.search({
        query: `${company} internship program student opportunities`,
        type: 'neural',
        useAutoprompt: true,
        numResults: Math.min(numResults, 50),
      includeText: true,
      includeSummary: true,
        includeHighlights: true,
        startPublishedDate: new Date('2025-06-01').toISOString(),
    });
    }
  }

  /**
   * Search for diversity and inclusion programs
   */
  async searchDiversityPrograms(numResults = 15): Promise<ExaSearchResponse> {
    // Build more specific query for diversity programs with active indicators
    const diversityPrograms = [
      'Google STEP',
      'Microsoft Explore',
      'Meta University',
      'Apple Scholars',
      'Amazon Future Engineer',
      'Code2040',
      'ColorStack',
      'MLT Career Prep',
      'SEO Career'
    ];

    const activeTerms = [
      '"now accepting"',
      '"applications open"',
      '"apply by"',
      '"deadline"',
      '"cohort"'
    ];

    const query = `(${diversityPrograms.map(p => `"${p}"`).join(' OR ')}) internship program 2026 (${activeTerms.join(' OR ')}) -"past cohort" -"alumni" -"previous year"`;

    return this.search({
      query,
      type: 'neural',
      useAutoprompt: false, // Maintain query precision
      numResults,
      includeText: true,
      includeSummary: true,
      excludeDomains: [
        'indeed.com',
        'glassdoor.com',
        'linkedin.com'
      ],
      startPublishedDate: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  /**
   * Search for internships by specific role with enhanced targeting and multiple query variations
   */
  async searchByRole(role: string, options: {
    location?: string;
    cycle?: string;
    numResults?: number;
    experienceLevel?: 'freshman' | 'sophomore' | 'junior' | 'senior' | 'any';
  } = {}): Promise<ExaSearchResponse> {
    const { location, cycle = 'summer 2026', numResults = 100, experienceLevel } = options;

    // Generate multiple query variations for broader coverage
    const queryVariations = this.generateRoleQueryVariations(role, cycle, location).slice(0, 5);
    
    console.log(`🔍 Searching ${role} with ${queryVariations.length} query variations (credit-optimized):`);
    queryVariations.forEach((query, index) => {
      console.log(`  ${index + 1}. "${query}"`);
    });

    // Run all queries in parallel with rate limiting
    const searchPromises = queryVariations.map(query => 
      this.search({
        query,
        type: 'neural',
        useAutoprompt: true,
        numResults: Math.ceil(numResults / queryVariations.length), // Distribute results across queries
        includeText: true,
        includeSummary: true,
        includeHighlights: true,
        // Tight time range to avoid stale results
        startPublishedDate: new Date('2025-06-01').toISOString(),
        // Broader domain coverage - let Exa find more sources
        excludeDomains: [
          'indeed.com',
          'glassdoor.com',
          'linkedin.com',
          'monster.com',
          'ziprecruiter.com',
          'topjobstoday.com',
          'jointaro.com',
          'dailyremote.com',
          'naukri.com',
          'cse.noticebard.com',
          'skyline.tw',
          'content.techgig.com',
          'sites.google.com',
          'medium.com',
          'internships.com',
          'builtin.com',
          'wayup.com',
          'handshake.com',
          'amazon.com', 'amazon.ca', 'amazon.co.uk', 'microsoft.com/store', 'store.google.com'
        ]
      })
    );

    try {
      // Execute all searches in parallel
      console.log(`🔄 Executing ${searchPromises.length} parallel searches for ${role}...`);
      const results = await Promise.all(searchPromises);
      
      // Log individual results for debugging
      results.forEach((result, index) => {
        console.log(`  Query ${index + 1}: ${result.results.length} results`);
      });
      
      // Combine and deduplicate results
      const combinedResults = this.combineAndDeduplicateResults(results);
      
      console.log(`✅ Combined ${combinedResults.length} unique results for ${role}`);
      
      return {
        results: combinedResults.slice(0, numResults), // Limit to requested number
        requestId: `combined_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
    } catch (error) {
      console.error(`❌ Failed to search for ${role} internships:`, error);
      console.log(`🔄 Falling back to single query for ${role}...`);
      // Fallback to single query if parallel search fails
    return this.search({
        query: `${role} internship ${cycle}`,
      type: 'neural',
      useAutoprompt: true,
        numResults: Math.min(numResults, 50),
      includeText: true,
      includeSummary: true,
      includeHighlights: true,
        startPublishedDate: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }
  }

  /**
   * Generate multiple query variations for a role to increase coverage
   */
  private generateRoleQueryVariations(role: string, cycle: string, location?: string): string[] {
    // Focused, role-specific queries for 2026 internships
    const baseQueries = [
      `${role} internship 2026`,
      `${role} intern ${cycle}`,
      `${role} undergraduate internship`,
      `${role} BS intern 2026`,
      `entry level ${role} internship ${cycle}`
    ];

    // Add location-specific variations if location is provided
    if (location) {
      const locationQueries = [
        `${role} internship ${location}`,
        `${role} intern ${location}`,
        `${role} ${location} summer`
      ];
      baseQueries.push(...locationQueries);
    }

    // Add role-specific variations
    const roleSpecificVariations = this.getRoleSpecificVariations(role, cycle);
    baseQueries.push(...roleSpecificVariations);

    return baseQueries;
  }

  /**
   * Get role-specific query variations
   */
  private getRoleSpecificVariations(role: string, cycle: string): string[] {
    const roleVariations: Record<string, string[]> = {
      'software engineer': [
        'software development intern',
        'SDE intern',
        'software engineering internship',
        'backend intern',
        'frontend intern',
        'full stack intern',
        'mobile developer intern',
        'software engineer early insight',
        'SDE sophomore program',
        'software engineering freshman'
      ],
      'product manager': [
        'PM intern',
        'product management intern',
        'associate product manager',
        'product intern',
        'product strategy intern',
        'product manager early insight',
        'PM sophomore program',
        'product management freshman'
      ],
      'data scientist': [
        'data science intern',
        'ML intern',
        'machine learning intern',
        'data analyst intern',
        'AI intern',
        'analytics intern',
        'data science early insight',
        'ML sophomore program',
        'data science freshman'
      ],
      'quantitative analyst': [
        'quant intern',
        'quantitative research intern',
        'trading intern',
        'quantitative analyst intern',
        'risk analyst intern',
        'financial analyst intern'
      ],
      'business analyst': [
        'strategy intern',
        'consulting intern',
        'business development intern',
        'operations intern',
        'management consulting intern'
      ],
      'design': [
        'UX intern',
        'UI intern',
        'product design intern',
        'graphic design intern',
        'visual design intern',
        'interaction design intern'
      ],
      'marketing': [
        'marketing intern',
        'digital marketing intern',
        'growth marketing intern',
        'content marketing intern',
        'social media intern'
      ],
      'finance': [
        'finance intern',
        'investment banking intern',
        'corporate finance intern',
        'accounting intern',
        'financial analyst intern'
      ]
    };

    return roleVariations[role.toLowerCase()] || [];
  }

  /**
   * Combine results from multiple searches and deduplicate by URL
   */
  private combineAndDeduplicateResults(searchResponses: ExaSearchResponse[]): ExaResult[] {
    const urlSet = new Set<string>();
    const combinedResults: ExaResult[] = [];

    for (const response of searchResponses) {
      for (const result of response.results) {
        if (!urlSet.has(result.url)) {
          urlSet.add(result.url);
          combinedResults.push(result);
        }
      }
    }

    // Sort by score (highest first) to maintain quality
    return combinedResults.sort((a, b) => b.score - a.score);
  }

  /**
   * Validate search options before making API call
   */
  private validateSearchOptions(options: ExaSearchOptions): void {
    if (!options.query || options.query.trim().length === 0) {
      throw new ExaApiError('Query is required and cannot be empty');
    }
    
    if (options.query.length > 1000) {
      throw new ExaApiError('Query is too long (max 1000 characters)');
    }
    
    if (options.numResults && (options.numResults < 1 || options.numResults > 100)) {
      throw new ExaApiError('numResults must be between 1 and 100');
    }
    
    if (options.type && !['neural', 'keyword'].includes(options.type)) {
      throw new ExaApiError('type must be either "neural" or "keyword"');
    }
    
    // Validate date formats if provided
    if (options.startPublishedDate && !this.isValidISODate(options.startPublishedDate)) {
      throw new ExaApiError('startPublishedDate must be a valid ISO date string');
    }
    
    if (options.endPublishedDate && !this.isValidISODate(options.endPublishedDate)) {
      throw new ExaApiError('endPublishedDate must be a valid ISO date string');
    }
    
    if (options.startCrawlDate && !this.isValidISODate(options.startCrawlDate)) {
      throw new ExaApiError('startCrawlDate must be a valid ISO date string');
    }
    
    if (options.endCrawlDate && !this.isValidISODate(options.endCrawlDate)) {
      throw new ExaApiError('endCrawlDate must be a valid ISO date string');
    }
  }
  
  /**
   * Check if a string is a valid ISO date
   */
  private isValidISODate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime()) && dateString === date.toISOString();
  }

  /**
   * Reset circuit breaker to allow new requests
   */
  resetCircuitBreaker() {
    exaCircuitBreaker.reset();
    console.log('Exa circuit breaker manually reset');
  }

  /**
   * Health check to verify API connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.search({
        query: 'test',
        numResults: 1,
      });
      return true;
    } catch (error) {
      console.error('Exa.ai health check failed:', error);
      return false;
    }
  }

  /**
   * Discover companies using Exa Websets API
   * Finds companies that don't post on mainstream job boards
   */
  async discoverHiddenCompanies(options: {
    categories?: string[];
    companySize?: 'startup' | 'small' | 'medium' | 'large';
    fundingStage?: 'seed' | 'series-a' | 'series-b' | 'series-c' | 'public';
    limit?: number;
  } = {}): Promise<{
    companies: Array<{
      name: string;
      domain: string;
      description: string;
      industry: string;
      fundingStage?: string;
      employeeCount?: number;
      signals: string[];
    }>;
    totalFound: number;
  }> {
    const { categories = [], companySize, fundingStage, limit = 50 } = options;

    try {
      // Query for YC companies with <50 employees
      const ycQuery = 'site:ycombinator.com "founded" "employees" "hiring" -"100+" -"500+"';
      const ycResults = await this.search({ 
        query: ycQuery,
        numResults: 20,
        includeDomains: ['ycombinator.com'],
        startPublishedDate: '2024-01-01'
      });

      // Query for Series A/B startups in tech
      const seriesQuery = 'site:techcrunch.com "series A" OR "series B" "hiring" "engineers" "interns"';
      const seriesResults = await this.search({
        query: seriesQuery,
        numResults: 20,
        includeDomains: ['techcrunch.com', 'crunchbase.com'],
        startPublishedDate: '2024-01-01'
      });

      // Query for fast-growing companies
      const growthQuery = '"hiring" "growing team" "expanding" "new engineers" startup';
      const growthResults = await this.search({
        query: growthQuery,
        numResults: 20,
        excludeDomains: ['indeed.com', 'linkedin.com', 'glassdoor.com'],
        startPublishedDate: '2024-06-01'
      });

      // Combine and process results
      const allResults = [...ycResults.results, ...seriesResults.results, ...growthResults.results];
      const companies = this.processCompanyDiscoveryResults(allResults);

      return {
        companies: companies.slice(0, limit),
        totalFound: companies.length
      };

    } catch (error) {
      console.error('Company discovery failed:', error);
      return { companies: [], totalFound: 0 };
    }
  }

  /**
   * Process raw search results into structured company data
   */
  private processCompanyDiscoveryResults(results: any[]): Array<{
    name: string;
    domain: string;
    description: string;
    industry: string;
    fundingStage?: string;
    employeeCount?: number;
    signals: string[];
  }> {
    const companies = new Map<string, any>();

    results.forEach(result => {
      const companyData = this.extractCompanyFromContent(result);
      if (companyData) {
        const key = companyData.domain || companyData.name;
        if (companies.has(key)) {
          // Merge signals
          const existing = companies.get(key);
          existing.signals = [...new Set([...existing.signals, ...companyData.signals])];
        } else {
          companies.set(key, companyData);
        }
      }
    });

    return Array.from(companies.values());
  }

  /**
   * Extract company information from search result content
   */
  private extractCompanyFromContent(result: any): any | null {
    const content = result.text || result.title || '';
    const url = result.url || '';

    // Extract company name
    const companyNameMatch = content.match(/([A-Z][a-zA-Z\s&]+(?:Inc|LLC|Corp|Ltd|Company)?)/);
    if (!companyNameMatch) return null;

    const name = companyNameMatch[1].trim();
    
    // Extract domain
    const domainMatch = url.match(/https?:\/\/(?:www\.)?([^\/]+)/);
    const domain = domainMatch ? domainMatch[1] : '';

    // Extract signals
    const signals: string[] = [];
    if (content.toLowerCase().includes('hiring')) signals.push('hiring');
    if (content.toLowerCase().includes('growing')) signals.push('growing');
    if (content.toLowerCase().includes('series a')) signals.push('series-a');
    if (content.toLowerCase().includes('series b')) signals.push('series-b');
    if (content.toLowerCase().includes('yc')) signals.push('yc-backed');
    if (content.toLowerCase().includes('engineers')) signals.push('tech-hiring');
    if (content.toLowerCase().includes('interns')) signals.push('internship-program');

    // Extract employee count
    const employeeMatch = content.match(/(\d+)\s*(?:employees?|people|team members?)/i);
    const employeeCount = employeeMatch ? parseInt(employeeMatch[1]) : undefined;

    // Extract funding stage
    let fundingStage: string | undefined;
    if (content.toLowerCase().includes('seed')) fundingStage = 'seed';
    else if (content.toLowerCase().includes('series a')) fundingStage = 'series-a';
    else if (content.toLowerCase().includes('series b')) fundingStage = 'series-b';
    else if (content.toLowerCase().includes('series c')) fundingStage = 'series-c';

    // Extract industry
    const industries = ['fintech', 'healthtech', 'edtech', 'saas', 'ai', 'blockchain', 'cybersecurity'];
    const industry = industries.find(ind => content.toLowerCase().includes(ind)) || 'technology';

    return {
      name,
      domain,
      description: content.substring(0, 200) + '...',
      industry,
      fundingStage,
      employeeCount,
      signals
    };
  }

  /**
   * Find companies by specific criteria using Websets
   */
  async findCompaniesByCriteria(criteria: {
    industry?: string;
    location?: string;
    techStack?: string[];
    companyStage?: string;
    hiringSignals?: string[];
  }): Promise<any[]> {
    const { industry, location, techStack = [], companyStage, hiringSignals = [] } = criteria;

    let query = '';
    
    // Build query based on criteria
    if (industry) query += `"${industry}" `;
    if (location) query += `"${location}" `;
    if (techStack.length > 0) {
      query += techStack.map(tech => `"${tech}"`).join(' OR ') + ' ';
    }
    if (companyStage) query += `"${companyStage}" `;
    if (hiringSignals.length > 0) {
      query += hiringSignals.map(signal => `"${signal}"`).join(' OR ') + ' ';
    }

    query += 'hiring engineers interns startup';

    try {
      const results = await this.search({
        query,
        numResults: 30,
        excludeDomains: ['indeed.com', 'linkedin.com', 'glassdoor.com', 'monster.com'],
        startPublishedDate: '2024-06-01'
      });

      return this.processCompanyDiscoveryResults(results.results);
    } catch (error) {
      console.error('Company search by criteria failed:', error);
      return [];
    }
  }
}

// Export a default instance
export const exaClient = new ExaClient();