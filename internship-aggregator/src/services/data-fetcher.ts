// Data fetching service that orchestrates different data sources
import { exaClient, ExaResult } from '../lib/exa-client';
import { RawInternshipData, InternshipSourceType } from '../types';
// Removed import for deleted constants

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
          numResults: Math.floor(maxResults / cycles.length) * 2, // Fetch more to filter
        });

        // Filter and rank results by quality
        const qualityResults = this.filterAndRankResults(searchResults.results);

        for (const result of qualityResults.slice(0, Math.floor(maxResults / cycles.length))) {
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
      // Validate URL - skip generic pages
      if (!this.isValidJobPostingUrl(result.url)) {
        console.log(`Skipping generic URL: ${result.url}`);
        return null;
      }

      // Extract company name from URL or title
      const company = this.extractCompanyName(result.url, result.title);
      if (!company) {
        return null;
      }

      // Validate title - skip if it's too generic
      if (!this.isValidJobTitle(result.title)) {
        console.log(`Skipping generic title: ${result.title}`);
        return null;
      }

      // Check if position is specifically for undergraduates/interns
      if (!this.isUndergraduatePosition(result.title, result.text || result.summary || '')) {
        console.log(`Skipping non-undergraduate position: ${result.title}`);
        return null;
      }

      // Check if job posting is still active
      if (!this.isJobPostingActive(result.text || result.summary || '', result.title)) {
        console.log(`Skipping inactive job posting: ${result.title}`);
        return null;
      }

      // Extract location from text if available
      const location = this.extractLocation(result.text || result.title);

      // Try to find a more specific application URL
      const applicationUrl = this.extractApplicationUrl(result.text || '', result.url);

      return {
        source: 'Exa.ai',
        sourceType,
        url: result.url,
        title: result.title,
        company,
        description: result.text || result.summary || '',
        location,
        postedAt: result.publishedDate,
        applicationUrl,
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
   * Score job posting quality based on various factors
   */
  private scoreJobPosting(result: ExaResult): number {
    let score = 0;
    const content = `${result.title} ${result.text || result.summary || ''}`.toLowerCase();

    // URL quality indicators (0-30 points)
    if (result.url.includes('/job/') || result.url.includes('/position/')) score += 15;
    if (result.url.includes('job-id') || result.url.includes('req-id')) score += 10;
    if (result.url.includes('greenhouse.io') || result.url.includes('lever.co')) score += 5;

    // Title quality indicators (0-30 points)
    if (content.includes('intern') || content.includes('internship')) score += 15;
    if (content.includes('undergraduate') || content.includes('college student')) score += 10;
    if (content.includes('summer 2025') || content.includes('2025')) score += 8;
    if (content.includes('software engineer') || content.includes('product manager')) score += 7;
    
    // Undergraduate level indicators (0-15 points)
    if (content.includes('freshman') || content.includes('sophomore') || content.includes('junior') || content.includes('senior year')) score += 10;
    if (content.includes('bachelor') || content.includes('university student')) score += 5;

    // Active posting indicators (0-25 points)
    if (content.includes('now hiring') || content.includes('accepting applications')) score += 15;
    if (content.includes('apply by') || content.includes('deadline')) score += 10;

    // Content quality indicators (0-20 points)
    if (content.includes('responsibilities') || content.includes('qualifications')) score += 10;
    if (content.includes('requirements') || content.includes('job description')) score += 10;

    // Penalty for generic content (-15 to 0 points)
    if (content.includes('how to apply') || content.includes('career advice')) score -= 5;
    if (content.includes('overview') || content.includes('general information')) score -= 5;
    
    // Heavy penalty for full-time positions (-20 to 0 points)
    if (content.includes('full time') || content.includes('full-time')) score -= 15;
    if (content.includes('senior engineer') || content.includes('staff engineer') || content.includes('principal')) score -= 10;
    if (content.includes('5+ years') || content.includes('3+ years') || content.includes('experienced')) score -= 10;

    // Recency bonus (0-10 points)
    if (result.publishedDate) {
      const publishedDate = new Date(result.publishedDate);
      const daysSincePublished = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSincePublished <= 7) score += 10;
      else if (daysSincePublished <= 30) score += 5;
    }

    return Math.max(0, Math.min(100, score)); // Clamp between 0-100
  }

  /**
   * Filter and rank results by quality score
   */
  private filterAndRankResults(results: ExaResult[]): ExaResult[] {
    return results
      .map(result => ({
        ...result,
        qualityScore: this.scoreJobPosting(result)
      }))
      .filter(result => result.qualityScore >= 30) // Only keep results with decent quality
      .sort((a, b) => b.qualityScore - a.qualityScore) // Sort by quality score descending
      .slice(0, 50); // Limit to top 50 results
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