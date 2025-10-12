// Exa.ai API client for internship data fetching
import pLimit from 'p-limit';

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
   * Search for internship-related content using Exa.ai
   */
  async search(options: ExaSearchOptions): Promise<ExaSearchResponse> {
    return limit(async () => {
      try {
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

        const response = await this.makeRequest<ExaSearchResponse>('/search', {
          method: 'POST',
          body: JSON.stringify(requestBody),
        });

        return response;
      } catch (error) {
        if (error instanceof ExaApiError) {
          throw error;
        }
        throw new ExaApiError(
          `Search request failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
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

        const response = await this.makeRequest<ExaContentsResponse>('/contents', {
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
      cycle: cycle || 'summer 2025'
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
        'ziprecruiter.com'
      ],
      includeText: true,
      includeHighlights: true,
      includeSummary: true,
      // Look for very recent postings (last 3 months for freshness)
      startPublishedDate: new Date(Date.now() - 3 * 30 * 24 * 60 * 60 * 1000).toISOString(),
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
    
    // Base query components for active postings
    const activeIndicators = [
      '"now hiring"',
      '"accepting applications"',
      '"apply by"',
      '"deadline"',
      '"position available"',
      '"req id"',
      '"job id"'
    ];

    // Undergraduate/student-specific terms
    const internshipTerms = [
      'intern',
      'internship',
      'co-op',
      'student position',
      'undergraduate',
      'college student'
    ];

    // Terms to exclude full-time/senior positions
    const excludeTerms = [
      '-"full time"',
      '-"full-time"',
      '-"senior"',
      '-"staff"',
      '-"principal"',
      '-"lead"',
      '-"manager" (unless "product manager")',
      '-"director"',
      '-"VP"',
      '-"graduate"',
      '-"PhD"',
      '-"postdoc"',
      '-"experienced"',
      '-"5+ years"',
      '-"3+ years"'
    ];

    // Student level indicators to include
    const studentLevelTerms = [
      '"undergraduate"',
      '"college student"',
      '"bachelor"',
      '"freshman"',
      '"sophomore"',
      '"junior"',
      '"senior year"',
      '"student"'
    ];

    // Build query based on specificity
    if (company) {
      // Company-specific: Target their career pages with specific job indicators
      const companyQuery = `site:careers.${company.toLowerCase().replace(/\s+/g, '')}.com OR site:jobs.${company.toLowerCase().replace(/\s+/g, '')}.com`;
      const roleQuery = role ? `"${role}"` : '"software engineer" OR "product manager" OR "data scientist"';
      const cycleQuery = `"${cycle}"`;
      const activeQuery = activeIndicators.slice(0, 3).join(' OR ');
      const studentQuery = `(${internshipTerms.join(' OR ')}) (${studentLevelTerms.join(' OR ')})`;
      const excludeQuery = excludeTerms.join(' ');
      
      return `${companyQuery} ${studentQuery} ${roleQuery} ${cycleQuery} (${activeQuery}) ${excludeQuery}`;
    } else {
      // General search: Focus on specific job posting patterns
      const roleQuery = role ? `"${role} intern"` : '"software engineer intern" OR "product manager intern" OR "data scientist intern"';
      const cycleQuery = `"${cycle}"`;
      const locationQuery = location ? `"${location}"` : '';
      const activeQuery = activeIndicators.slice(0, 4).join(' OR ');
      const studentQuery = `(${studentLevelTerms.join(' OR ')})`;
      
      // Require specific job posting indicators
      const jobPostingIndicators = [
        '"job description"',
        '"responsibilities"',
        '"qualifications"',
        '"requirements"'
      ].join(' OR ');

      const excludeQuery = excludeTerms.join(' ');

      return `${roleQuery} ${cycleQuery} ${locationQuery} ${studentQuery} (${activeQuery}) (${jobPostingIndicators}) -"how to apply" -"application tips" -"career advice" ${excludeQuery}`;
    }
  }

  /**
   * Search for company-specific internship programs
   */
  async searchCompanyPrograms(company: string, numResults = 10): Promise<ExaSearchResponse> {
    const query = `${company} internship program student opportunities undergraduate graduate application`;

    return this.search({
      query,
      type: 'neural',
      useAutoprompt: true,
      numResults,
      includeDomains: [`careers.${company.toLowerCase().replace(/\s+/g, '')}.com`],
      includeText: true,
      includeSummary: true,
      startPublishedDate: new Date(Date.now() - 3 * 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
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

    const query = `(${diversityPrograms.map(p => `"${p}"`).join(' OR ')}) internship program 2025 (${activeTerms.join(' OR ')}) -"past cohort" -"alumni" -"previous year"`;

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
   * Search for internships by specific role with enhanced targeting
   */
  async searchByRole(role: string, options: {
    location?: string;
    cycle?: string;
    numResults?: number;
    experienceLevel?: 'freshman' | 'sophomore' | 'junior' | 'senior' | 'any';
  } = {}): Promise<ExaSearchResponse> {
    const { location, cycle = 'summer 2025', numResults = 20, experienceLevel } = options;

    // Role-specific query optimization for undergraduate positions
    const roleQueries: Record<string, string> = {
      'software engineer': '"software engineer intern" OR "software development intern" OR "SDE intern" OR "software engineering internship"',
      'product manager': '"product manager intern" OR "PM intern" OR "product management intern" OR "associate product manager"',
      'data scientist': '"data science intern" OR "data scientist intern" OR "ML intern" OR "machine learning intern" OR "data analyst intern"',
      'quantitative research': '"quant intern" OR "quantitative research intern" OR "trading intern" OR "quantitative analyst intern"',
      'business analyst': '"business analyst intern" OR "strategy intern" OR "consulting intern" OR "business development intern"',
      'design': '"design intern" OR "UX intern" OR "UI intern" OR "product design intern" OR "graphic design intern"'
    };

    const roleQuery = roleQueries[role.toLowerCase()] || `"${role} intern" OR "${role} internship"`;
    
    // Undergraduate/student targeting
    const undergraduateTerms = [
      '"undergraduate"',
      '"college student"',
      '"bachelor"',
      '"university student"',
      '"student"'
    ];

    // Experience level targeting
    let experienceQuery = '';
    if (experienceLevel && experienceLevel !== 'any') {
      const experienceTerms: Record<string, string> = {
        'freshman': '"freshman" OR "first year" OR "1st year"',
        'sophomore': '"sophomore" OR "second year" OR "2nd year"',
        'junior': '"junior" OR "third year" OR "3rd year"',
        'senior': '"senior year" OR "fourth year" OR "4th year"'
      };
      experienceQuery = ` (${experienceTerms[experienceLevel]})`;
    } else {
      // If no specific level, include general undergraduate terms
      experienceQuery = ` (${undergraduateTerms.join(' OR ')})`;
    }

    const locationQuery = location ? ` "${location}"` : '';
    const cycleQuery = `"${cycle}"`;
    
    const activeIndicators = [
      '"now hiring"',
      '"accepting applications"',
      '"apply by"',
      '"deadline"',
      '"position available"',
      '"currently seeking"'
    ].join(' OR ');

    const jobPostingIndicators = [
      '"job description"',
      '"responsibilities"',
      '"qualifications"',
      '"requirements"'
    ].join(' OR ');

    // Exclude full-time and senior positions
    const excludeTerms = [
      '-"full time"',
      '-"full-time"',
      '-"senior engineer"',
      '-"staff engineer"',
      '-"principal"',
      '-"lead engineer"',
      '-"engineering manager"',
      '-"director"',
      '-"VP"',
      '-"graduate program"',
      '-"PhD"',
      '-"postdoc"',
      '-"experienced"',
      '-"5+ years"',
      '-"3+ years"',
      '-"minimum 3 years"',
      '-"minimum 5 years"'
    ].join(' ');

    const query = `${roleQuery} ${cycleQuery}${locationQuery}${experienceQuery} (${activeIndicators}) (${jobPostingIndicators}) -"how to apply" -"tips" -"advice" ${excludeTerms}`;

    return this.search({
      query,
      type: 'neural',
      useAutoprompt: false,
      numResults,
      excludeDomains: [
        'indeed.com',
        'glassdoor.com',
        'linkedin.com',
        'monster.com',
        'ziprecruiter.com'
      ],
      includeText: true,
      includeHighlights: true,
      includeSummary: true,
      startPublishedDate: new Date(Date.now() - 3 * 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
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
}

// Export a default instance
export const exaClient = new ExaClient();