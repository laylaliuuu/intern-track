// Data fetching service that orchestrates different data sources
import { exaClient, ExaResult } from '../lib/exa-client';
import { RawInternshipData, InternshipSourceType } from '../types';
import { ROLE_KEYWORDS } from '../lib/constants';

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
  type: 'exa' | 'api' | 'scrape';
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
      name: 'Exa.ai Search',
      type: 'exa',
      enabled: true,
      config: {
        maxResults: 50,
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
   * Fetch general internship postings
   */
  private async fetchGeneralInternships(options: FetchOptions): Promise<RawInternshipData[]> {
    const results: RawInternshipData[] = [];
    const maxResults = Math.min(options.maxResults || 30, 50);

    // Search for current cycle internships
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    const cycles = [`Summer ${nextYear}`, `Fall ${currentYear}`, `Spring ${nextYear}`];

    for (const cycle of cycles) {
      try {
        const searchResults = await exaClient.searchInternships({
          cycle,
          numResults: Math.floor(maxResults / cycles.length),
        });

        for (const result of searchResults.results) {
          const rawData = this.convertExaResultToRawData(result, InternshipSourceType.API_FEED);
          if (rawData) {
            results.push(rawData);
          }
        }
      } catch (error) {
        console.warn(`Failed to search for ${cycle} internships:`, error);
      }
    }

    return results;
  }

  /**
   * Fetch company-specific internships
   */
  private async fetchCompanyInternships(company: string, options: FetchOptions): Promise<RawInternshipData[]> {
    const results: RawInternshipData[] = [];

    try {
      const searchResults = await exaClient.searchCompanyPrograms(company);

      for (const result of searchResults.results) {
        const rawData = this.convertExaResultToRawData(result, InternshipSourceType.COMPANY_CAREER_PAGE);
        if (rawData) {
          results.push(rawData);
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch ${company} internships:`, error);
    }

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
      // Extract company name from URL or title
      const company = this.extractCompanyName(result.url, result.title);
      if (!company) {
        return null;
      }

      // Extract location from text if available
      const location = this.extractLocation(result.text || result.title);

      return {
        source: 'Exa.ai',
        sourceType,
        url: result.url,
        title: result.title,
        company,
        description: result.text || result.summary || '',
        location,
        postedAt: result.publishedDate,
        applicationUrl: result.url, // Default to same URL
        rawPayload: {
          exaId: result.id,
          score: result.score,
          highlights: result.highlights,
          summary: result.summary,
          author: result.author
        }
      };
    } catch (error) {
      console.warn('Failed to convert Exa result:', error);
      return null;
    }
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

      // Try to extract from title
      const titleMatch = title.match(/(?:at|@)\s+([A-Z][a-zA-Z\s&]+?)(?:\s|$|,|-)/);
      if (titleMatch) {
        return titleMatch[1].trim();
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
    // TODO: Implement web scraping for career pages
    return {
      source: source.name,
      sourceType: InternshipSourceType.COMPANY_CAREER_PAGE,
      data: [],
      errors: ['Web scraping not yet implemented'],
      metadata: {
        totalFound: 0,
        processed: 0,
        skipped: 0,
        executionTime: 0
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

    // TODO: Add health checks for other sources

    return results;
  }
}

// Export default instance
export const dataFetcher = new DataFetcherService();