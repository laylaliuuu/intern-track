// Serper API client for Google Search fallback
import { RawInternshipData, InternshipSourceType } from '../types';

export interface SerperSearchOptions {
  query: string;
  numResults?: number;
  location?: string;
  dateRestrict?: string;
}

export interface SerperResult {
  title: string;
  link: string;
  snippet: string;
  position?: number;
}

export interface SerperSearchResponse {
  organic: SerperResult[];
  searchInformation: {
    totalResults: string;
    timeTaken: number;
  };
}

export class SerperApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'SerperApiError';
  }
}

export class SerperClient {
  private apiKey: string;
  private baseUrl = 'https://google.serper.dev';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.SERPER_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('SERPER_API_KEY is required. Please set it in your environment variables.');
    }
  }

  /**
   * Search for internships using Google Search via Serper
   */
  async searchInternships(options: SerperSearchOptions): Promise<RawInternshipData[]> {
    try {
      const response = await this.makeRequest<SerperSearchResponse>('/search', {
        method: 'POST',
        body: JSON.stringify({
          q: options.query,
          num: options.numResults || 10,
          gl: options.location || 'us',
          hl: 'en',
          dateRestrict: options.dateRestrict || 'm3', // Last 3 months
          safe: 'off'
        })
      });

      return this.convertSerperResults(response.organic);
    } catch (error) {
      console.error('Serper search failed:', error);
      throw new SerperApiError(
        `Serper search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Search for company-specific internships
   */
  async searchCompanyInternships(company: string, role?: string): Promise<RawInternshipData[]> {
    const query = role 
      ? `"${company}" "${role} intern" "summer 2026" site:careers. OR site:jobs. OR site:greenhouse.io OR site:lever.co`
      : `"${company}" "intern" "summer 2026" site:careers. OR site:jobs. OR site:greenhouse.io OR site:lever.co`;

    return this.searchInternships({
      query,
      numResults: 15,
      dateRestrict: 'm3'
    });
  }

  /**
   * Search for diversity programs
   */
  async searchDiversityPrograms(): Promise<RawInternshipData[]> {
    const diversityPrograms = [
      'Google STEP',
      'Microsoft Explore', 
      'Meta University',
      'Apple Scholars',
      'Amazon Future Engineer',
      'Code2040',
      'ColorStack'
    ];

    const query = `(${diversityPrograms.map(p => `"${p}"`).join(' OR ')}) "internship" "2026" "accepting applications" OR "now hiring"`;

    return this.searchInternships({
      query,
      numResults: 20,
      dateRestrict: 'm6' // Last 6 months for diversity programs
    });
  }

  /**
   * Search by role with 2026 focus
   */
  async searchByRole(role: string, location?: string): Promise<RawInternshipData[]> {
    const query = `"${role} intern" "summer 2026" "accepting applications" site:careers. OR site:jobs. OR site:greenhouse.io OR site:lever.co OR site:workday.com`;

    return this.searchInternships({
      query,
      numResults: 15,
      location,
      dateRestrict: 'm3'
    });
  }

  /**
   * Make HTTP request to Serper API
   */
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': this.apiKey,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new SerperApiError(
        data.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        data.code
      );
    }

    return data;
  }

  /**
   * Convert Serper results to RawInternshipData format
   */
  private convertSerperResults(results: SerperResult[]): RawInternshipData[] {
    return results
      .filter(result => this.isValidInternshipResult(result))
      .map(result => this.createInternshipData(result));
  }

  /**
   * Check if Serper result is a valid internship posting
   */
  private isValidInternshipResult(result: SerperResult): boolean {
    const title = result.title.toLowerCase();
    const snippet = result.snippet.toLowerCase();
    const link = result.link.toLowerCase();

    // Must contain internship-related keywords
    const internshipKeywords = ['intern', 'internship', 'co-op', 'coop', 'trainee'];
    const hasInternshipKeyword = internshipKeywords.some(keyword => 
      title.includes(keyword) || snippet.includes(keyword)
    );

    // Must be from a career/job site
    const careerSites = [
      'careers.', 'jobs.', 'greenhouse.io', 'lever.co', 'workday.com',
      'myworkdayjobs.com', 'boards.greenhouse.io', 'jobs.lever.co'
    ];
    const isCareerSite = careerSites.some(site => link.includes(site));

    // Exclude job boards
    const jobBoards = ['indeed.com', 'glassdoor.com', 'linkedin.com', 'monster.com', 'ziprecruiter.com'];
    const isJobBoard = jobBoards.some(board => link.includes(board));

    return hasInternshipKeyword && isCareerSite && !isJobBoard;
  }

  /**
   * Create internship data from Serper result
   */
  private createInternshipData(result: SerperResult): RawInternshipData {
    // Extract company name from title or URL
    const company = this.extractCompanyName(result.title, result.link);
    
    // Extract role from title
    const role = this.extractRoleFromTitle(result.title);
    
    // Extract location from snippet or title
    const location = this.extractLocation(result.snippet, result.title);

    return {
      source: 'Serper API (Google Search)',
      sourceType: InternshipSourceType.API_FEED,
      url: result.link,
      title: role || result.title,
      company: company,
      description: result.snippet,
      location: location || 'Location TBD',
      postedAt: new Date().toISOString(), // Serper doesn't provide posting dates
      applicationUrl: result.link,
      rawPayload: {
        serperResult: result,
        scrapedAt: new Date().toISOString()
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
      /finance\s+intern/i
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
   * Extract location from snippet or title
   */
  private extractLocation(snippet: string, title: string): string | null {
    const locationPatterns = [
      /remote/i,
      /hybrid/i,
      /on-site/i,
      /onsite/i,
      /[A-Z][a-z]+,?\s+[A-Z]{2}/, // City, State
      /[A-Z][a-z]+,?\s+[A-Z][a-z]+/ // City, Country
    ];

    const text = `${snippet} ${title}`;
    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0];
      }
    }

    return null;
  }

  /**
   * Health check for Serper API
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.searchInternships({
        query: 'test internship',
        numResults: 1
      });
      return true;
    } catch (error) {
      console.error('Serper API health check failed:', error);
      return false;
    }
  }
}

// Export default instance
export const serperClient = new SerperClient();


