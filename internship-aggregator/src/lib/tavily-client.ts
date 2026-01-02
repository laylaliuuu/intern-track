// Tavily AI client for diversity programs and niche searches
import { RawInternshipData, InternshipSourceType } from '../types';

export interface TavilySearchOptions {
  query: string;
  numResults?: number;
  includeDomains?: string[];
  excludeDomains?: string[];
  maxResults?: number;
}

export interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
}

export interface TavilySearchResponse {
  results: TavilyResult[];
  query: string;
  answer?: string;
  images?: string[];
  follow_up_questions?: string[];
}

export class TavilyApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'TavilyApiError';
  }
}

export class TavilyClient {
  private apiKey: string;
  private baseUrl = 'https://api.tavily.com';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.TAVILY_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('TAVILY_API_KEY is required. Please set it in your environment variables.');
    }
  }

  /**
   * Search for diversity programs using Tavily AI
   */
  async searchDiversityPrograms(): Promise<RawInternshipData[]> {
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

    const query = `(${diversityPrograms.map(p => `"${p}"`).join(' OR ')}) internship program 2026 "accepting applications" OR "now hiring" OR "apply by"`;

    return this.searchInternships({
      query,
      numResults: 20,
      includeDomains: [
        'careers.google.com',
        'careers.microsoft.com', 
        'careers.meta.com',
        'jobs.apple.com',
        'amazon.jobs',
        'code2040.org',
        'colorstack.org',
        'mlt.org',
        'seocareer.org'
      ],
      excludeDomains: [
        'indeed.com',
        'glassdoor.com',
        'linkedin.com',
        'monster.com'
      ]
    });
  }

  /**
   * Search for niche internship programs
   */
  async searchNichePrograms(programType: string): Promise<RawInternshipData[]> {
    const query = `"${programType}" internship program 2026 "accepting applications" OR "now hiring"`;

    return this.searchInternships({
      query,
      numResults: 15,
      excludeDomains: [
        'indeed.com',
        'glassdoor.com',
        'linkedin.com',
        'monster.com'
      ]
    });
  }

  /**
   * Search for internships with AI-optimized queries
   */
  async searchInternships(options: TavilySearchOptions): Promise<RawInternshipData[]> {
    try {
      const response = await this.makeRequest<TavilySearchResponse>('/search', {
        method: 'POST',
        body: JSON.stringify({
          query: options.query,
          search_depth: 'basic',
          include_answer: true,
          include_images: false,
          include_raw_content: false,
          max_results: options.numResults || 10,
          include_domains: options.includeDomains,
          exclude_domains: options.excludeDomains
        })
      });

      return this.convertTavilyResults(response.results, response.answer);
    } catch (error) {
      console.error('Tavily search failed:', error);
      throw new TavilyApiError(
        `Tavily search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Search for specific company diversity programs
   */
  async searchCompanyDiversityPrograms(company: string): Promise<RawInternshipData[]> {
    const diversityTerms = [
      'diversity',
      'inclusion', 
      'underrepresented',
      'minority',
      'women in tech',
      'STEP',
      'Explore',
      'University',
      'Scholars'
    ];

    const query = `"${company}" (${diversityTerms.join(' OR ')}) internship program 2026`;

    return this.searchInternships({
      query,
      numResults: 10,
      includeDomains: [`careers.${company.toLowerCase().replace(/\s+/g, '')}.com`]
    });
  }

  /**
   * Make HTTP request to Tavily API
   */
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new TavilyApiError(
        data.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        data.code
      );
    }

    return data;
  }

  /**
   * Convert Tavily results to RawInternshipData format
   */
  private convertTavilyResults(results: TavilyResult[], answer?: string): RawInternshipData[] {
    return results
      .filter(result => this.isValidInternshipResult(result))
      .map(result => this.createInternshipData(result, answer));
  }

  /**
   * Check if Tavily result is a valid internship posting
   */
  private isValidInternshipResult(result: TavilyResult): boolean {
    const title = result.title.toLowerCase();
    const content = result.content.toLowerCase();
    const url = result.url.toLowerCase();

    // Must contain internship-related keywords
    const internshipKeywords = ['intern', 'internship', 'co-op', 'coop', 'trainee', 'program'];
    const hasInternshipKeyword = internshipKeywords.some(keyword => 
      title.includes(keyword) || content.includes(keyword)
    );

    // Must be from a career/job site or company page
    const careerSites = [
      'careers.', 'jobs.', 'greenhouse.io', 'lever.co', 'workday.com',
      'myworkdayjobs.com', 'boards.greenhouse.io', 'jobs.lever.co'
    ];
    const isCareerSite = careerSites.some(site => url.includes(site));

    // Exclude job boards
    const jobBoards = ['indeed.com', 'glassdoor.com', 'linkedin.com', 'monster.com', 'ziprecruiter.com'];
    const isJobBoard = jobBoards.some(board => url.includes(board));

    return hasInternshipKeyword && (isCareerSite || url.includes('.com')) && !isJobBoard;
  }

  /**
   * Create internship data from Tavily result
   */
  private createInternshipData(result: TavilyResult, answer?: string): RawInternshipData {
    // Extract company name from title or URL
    const company = this.extractCompanyName(result.title, result.url);
    
    // Extract role from title
    const role = this.extractRoleFromTitle(result.title);
    
    // Extract location from content
    const location = this.extractLocation(result.content);

    return {
      source: 'Tavily AI',
      sourceType: InternshipSourceType.API_FEED,
      url: result.url,
      title: role || result.title,
      company: company,
      description: answer || result.content.substring(0, 500),
      location: location || 'Location TBD',
      postedAt: result.published_date || new Date().toISOString(),
      applicationUrl: result.url,
      rawPayload: {
        tavilyResult: result,
        answer: answer,
        scrapedAt: new Date().toISOString(),
        score: result.score
      }
    };
  }

  /**
   * Extract company name from title or URL
   */
  private extractCompanyName(title: string, url: string): string {
    // Try to extract from URL first
    const urlMatch = url.match(/careers\.([^.]+)\.com|jobs\.([^.]+)\.com/);
    if (urlMatch) {
      return (urlMatch[1] || urlMatch[2]).charAt(0).toUpperCase() + 
             (urlMatch[1] || urlMatch[2]).slice(1);
    }

    // Extract from title (look for patterns like "Company Name - Job Title")
    const titleMatch = title.match(/^([^-]+)\s*-\s*/);
    if (titleMatch) {
      return titleMatch[1].trim();
    }

    // Look for company names in title
    const companyPatterns = [
      /Google/i, /Microsoft/i, /Meta/i, /Apple/i, /Amazon/i,
      /Netflix/i, /Tesla/i, /Salesforce/i, /Uber/i, /Airbnb/i
    ];

    for (const pattern of companyPatterns) {
      const match = title.match(pattern);
      if (match) {
        return match[0];
      }
    }

    // Fallback to first part of title
    const words = title.split(' ');
    if (words.length > 1) {
      return words[0];
    }

    return 'Unknown Company';
  }

  /**
   * Extract role from title
   */
  private extractRoleFromTitle(title: string): string {
    // Look for common internship role patterns
    const rolePatterns = [
      /software\s+engineer\s+intern/i,
      /product\s+manager\s+intern/i,
      /data\s+scientist\s+intern/i,
      /business\s+analyst\s+intern/i,
      /design\s+intern/i,
      /marketing\s+intern/i,
      /finance\s+intern/i,
      /diversity\s+intern/i,
      /inclusion\s+intern/i
    ];

    for (const pattern of rolePatterns) {
      const match = title.match(pattern);
      if (match) {
        return match[0];
      }
    }

    // Fallback to original title
    return title;
  }

  /**
   * Extract location from content
   */
  private extractLocation(content: string): string | null {
    const locationPatterns = [
      /remote/i,
      /hybrid/i,
      /on-site/i,
      /onsite/i,
      /[A-Z][a-z]+,?\s+[A-Z]{2}/, // City, State
      /[A-Z][a-z]+,?\s+[A-Z][a-z]+/ // City, Country
    ];

    for (const pattern of locationPatterns) {
      const match = content.match(pattern);
      if (match) {
        return match[0];
      }
    }

    return null;
  }

  /**
   * Health check for Tavily API
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.searchInternships({
        query: 'test internship program',
        numResults: 1
      });
      return true;
    } catch (error) {
      console.error('Tavily API health check failed:', error);
      return false;
    }
  }
}

// Export default instance
export const tavilyClient = new TavilyClient();


