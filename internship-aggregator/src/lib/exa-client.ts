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
  includeText?: boolean;
  includeHighlights?: boolean;
  includeSummary?: boolean;
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
        const response = await this.makeRequest<ExaSearchResponse>('/search', {
          method: 'POST',
          body: JSON.stringify({
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
            includeText: options.includeText ?? false,
            includeHighlights: options.includeHighlights ?? false,
            includeSummary: options.includeSummary ?? false,
            category: options.category,
          }),
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
        const response = await this.makeRequest<ExaContentsResponse>('/contents', {
          method: 'POST',
          body: JSON.stringify({
            ids: options.ids,
            text: options.text ?? true,
            highlights: options.highlights ?? false,
            summary: options.summary ?? false,
          }),
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

    // Build optimized query for internship discovery
    let query = 'internship';
    
    if (role) {
      query += ` ${role}`;
    }
    
    if (company) {
      query += ` at ${company}`;
    }
    
    if (location) {
      query += ` in ${location}`;
    }
    
    if (cycle) {
      query += ` ${cycle}`;
    }

    // Add common internship-related terms to improve results
    query += ' application deadline apply career opportunities students undergraduate';

    // Default domains for internship searches
    const defaultDomains = [
      'careers.google.com',
      'careers.microsoft.com',
      'careers.meta.com',
      'jobs.apple.com',
      'amazon.jobs',
      'careers.netflix.com',
      'tesla.com',
      'jpmorgan.com',
      'goldmansachs.com',
      'mckinsey.com',
      'greenhouse.io',
      'lever.co',
      'workday.com',
      'indeed.com',
      'linkedin.com',
      'glassdoor.com',
      'handshake.com',
      'simplify.jobs',
      'wayup.com'
    ];

    return this.search({
      query,
      type: 'neural',
      useAutoprompt: true,
      numResults,
      includeDomains: includeDomains || defaultDomains,
      includeText: true,
      includeHighlights: true,
      includeSummary: true,
      // Look for recent postings (last 6 months)
      startPublishedDate: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
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
    const query = 'diversity internship program STEP explore code2040 colorstack "first year" "second year" underrepresented minorities women tech';

    return this.search({
      query,
      type: 'neural',
      useAutoprompt: true,
      numResults,
      includeText: true,
      includeSummary: true,
      startPublishedDate: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString(),
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