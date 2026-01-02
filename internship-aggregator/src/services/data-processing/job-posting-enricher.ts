import * as cheerio from 'cheerio';
import { RawInternshipData, InternshipSourceType } from '../../types';

interface EnrichedJobData {
  title: string;
  company: string;
  location: string;
  salary?: string;
  description: string;
  requirements?: string;
  deadline?: string;
  postedDate?: string;
  graduationYear?: string[];
  payRateMin?: number;
  payRateMax?: number;
  payRateCurrency?: string;
  payRateType?: 'hourly' | 'salary' | 'stipend' | 'unpaid' | 'unknown';
  confidenceScore?: number;
  isLive?: boolean;
}

interface ValidationResult {
  isValid: boolean;
  confidenceScore: number;
  reason?: string;
  isLive: boolean;
}

export class JobPostingEnricher {
  // Only block obvious aggregators and job boards
  private readonly BLOCKED_DOMAINS = [
    'indeed.com', 'glassdoor.com', 'linkedin.com', 'monster.com',
    'ziprecruiter.com', 'internships.com', 'builtin.com', 'wayup.com',
    'simplyhired.com', 'careerbuilder.com', 'snagajob.com',
    'angel.co', 'crunchbase.com', 'techcrunch.com', 'venturebeat.com'
  ];

  // Company-specific headers for better success rates
  private readonly COMPANY_HEADERS = {
    'jobs.apple.com': {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://www.apple.com/careers/',
    },
    'metacareers.com': {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Referer': 'https://www.metacareers.com/jobs/',
    },
    'lifeattiktok.com': {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Referer': 'https://www.tiktok.com/careers',
      'Origin': 'https://www.tiktok.com',
    },
    'amazon.jobs': {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Referer': 'https://www.amazon.jobs/',
    }
  };

  async enrichFromUrl(url: string, fallbackData: Partial<RawInternshipData>): Promise<RawInternshipData | null> {
    try {
      // First validate URL is official and accessible
      const validation = await this.validateUrl(url);
      if (!validation.isValid || validation.confidenceScore < 90) {
        console.log(`Rejected URL ${url}: ${validation.reason} (confidence: ${validation.confidenceScore})`);
        return null;
      }

      if (!validation.isLive) {
        console.log(`URL ${url} is not live: ${validation.reason}`);
        return null;
      }

      // Detect platform and use appropriate extractor
      let enrichedData: EnrichedJobData;
      if (url.includes('greenhouse.io')) {
        enrichedData = await this.extractFromGreenhouse(url, fallbackData);
      } else if (url.includes('lever.co')) {
        enrichedData = await this.extractFromLever(url, fallbackData);
      } else if (url.includes('myworkdayjobs.com') || url.includes('workday.com')) {
        enrichedData = await this.extractFromWorkday(url, fallbackData);
      } else if (url.includes('ashbyhq.com')) {
        enrichedData = await this.extractFromAshby(url, fallbackData);
      } else {
        // Generic extraction for other sites
        enrichedData = await this.extractGeneric(url, fallbackData);
      }

      // Set confidence score and live status
      enrichedData.confidenceScore = validation.confidenceScore;
      enrichedData.isLive = validation.isLive;

      return this.convertToRawInternshipData(enrichedData, fallbackData);
    } catch (error) {
      console.warn(`Failed to enrich ${url}:`, error);
      return null; // Return null if enrichment fails
    }
  }

  /**
   * Validate URL is accessible and job is live (flexible approach)
   */
  public async validateUrl(url: string): Promise<ValidationResult> {
    let confidenceScore = 50; // Start with neutral score
    let reason = '';

    try {
      // Check if URL is from blocked domains
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      if (this.BLOCKED_DOMAINS.some(domain => hostname.includes(domain))) {
        return {
          isValid: false,
          confidenceScore: 0,
          reason: 'Blocked aggregator domain',
          isLive: false
        };
      }

      // Check if URL looks like a job posting (more flexible)
      const jobIndicators = [
        '/job/', '/jobs/', '/position/', '/posting/', '/career/', '/careers/',
        'job-id', 'req-id', 'apply', 'intern', 'internship', 'co-op', 'coop'
      ];
      
      const hasJobIndicator = jobIndicators.some(pattern => url.toLowerCase().includes(pattern));
      if (hasJobIndicator) {
        confidenceScore += 20;
      } else {
        // Still allow if it's from a company domain
        const companyDomains = [
          '.com/careers', '.com/jobs', '.com/opportunities', 
          '.com/positions', '.com/apply', '.com/internships'
        ];
        const isCompanyDomain = companyDomains.some(pattern => url.toLowerCase().includes(pattern));
        if (!isCompanyDomain) {
          confidenceScore -= 10; // Reduce confidence but don't reject
        }
      }

      // Get company-specific headers
      const headers = this.getHeadersForUrl(url);
      
      // Make HEAD request to check accessibility
      const response = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(10000),
        headers
      });

      if (response.status === 404) {
        return {
          isValid: false,
          confidenceScore: 0,
          reason: '404 Not Found',
          isLive: false
        };
      }

      if (response.status === 410) {
        return {
          isValid: false,
          confidenceScore: 0,
          reason: '410 Gone',
          isLive: false
        };
      }

      if (!response.ok) {
        return {
          isValid: false,
          confidenceScore: 0,
          reason: `HTTP ${response.status}`,
          isLive: false
        };
      }

      confidenceScore += 20; // URL is accessible

      // Get page content to check if job is live
      const contentResponse = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(15000),
        headers
      });

      const html = await contentResponse.text();
      const lowerHtml = html.toLowerCase();

      // Check for "job not found" or similar indicators
      const notFoundIndicators = [
        'job not found',
        'page not found',
        'job may have been taken down',
        'this job isn\'t available',
        'job has been removed',
        'no results that match',
        'role does not exist',
        'temporarily unavailable',
        'unexpected error',
        'no longer available',
        'doesn\'t exist',
        'not found',
        'taken down',
        'removed',
        'unavailable',
        'position is no longer available',
        'job is no longer available',
        'this position has been filled',
        'applications are closed',
        'posting has expired',
        'position has been removed',
        'no longer accepting applications',
        'position filled',
        'hiring complete'
      ];

      const isNotFound = notFoundIndicators.some(indicator => lowerHtml.includes(indicator));
      if (isNotFound) {
        return {
          isValid: false,
          confidenceScore: 0,
          reason: 'Job posting not found or removed',
          isLive: false
        };
      }

      // Check for PhD-level positions (should be excluded)
      // But allow Master's if it also mentions Bachelor's/undergraduate
      const phdOnlyIndicators = [
        'phd',
        'ph.d',
        'doctorate',
        'doctoral',
        'phd summer',
        'phd intern'
      ];
      
      const masterIndicators = [
        'master\'s degree',
        'ms degree',
        'mba',
        'graduate degree',
        'graduate intern'
      ];
      
      // Check for PhD-only indicators (always exclude)
      const hasPhdOnlyIndicator = phdOnlyIndicators.some(indicator => lowerHtml.includes(indicator));
      if (hasPhdOnlyIndicator) {
        return {
          isValid: false,
          confidenceScore: 0,
          reason: 'PhD-level position - not undergraduate internship',
          isLive: false
        };
      }
      
      // Check for Master's indicators
      const hasMasterIndicator = masterIndicators.some(indicator => lowerHtml.includes(indicator));
      if (hasMasterIndicator) {
        // If it mentions Master's, check if it also mentions Bachelor's/undergraduate
        const undergraduateIndicators = [
          'bachelor\'s degree',
          'bs degree',
          'undergraduate',
          'bachelor or master',
          'bachelor\'s or master\'s',
          'bs or ms',
          'undergraduate or graduate',
          'pursuing a bachelor',
          'pursuing a master'
        ];
        
        const hasUndergraduateIndicator = undergraduateIndicators.some(indicator => lowerHtml.includes(indicator));
        if (!hasUndergraduateIndicator) {
          return {
            isValid: false,
            confidenceScore: 0,
            reason: 'Master\'s-only position - not undergraduate internship',
            isLive: false
          };
        }
        // If it has both Master's and Bachelor's indicators, it's acceptable
      }

      // Check if it's a generic search page (not a specific job)
      const searchPageIndicators = [
        'search results',
        'find jobs',
        'browse jobs',
        'all jobs',
        'job search',
        'filter jobs',
        'sort by',
        'no results that match',
        'jobs matched',
        'follow life at',
        'more about us',
        'equal opportunity',
        'privacy policy',
        'terms of use'
      ];
      
      const isSearchPage = searchPageIndicators.some(indicator => lowerHtml.includes(indicator));
      if (isSearchPage) {
        return {
          isValid: false,
          confidenceScore: 0,
          reason: 'Generic job search page - not specific job posting',
          isLive: false
        };
      }

      // Check for actual job content indicators (undergraduate internships)
      const jobContentIndicators = [
        'job description',
        'responsibilities',
        'requirements',
        'qualifications',
        'apply now',
        'application deadline',
        'internship program',
        'summer internship',
        'co-op program',
        'undergraduate',
        'bachelor\'s degree',
        'bs degree',
        'class of 202',
        'graduating in 202',
        'internship opportunity',
        'submit application',
        'apply for this position',
        'join our team',
        'currently hiring',
        'accepting applications',
        'bachelor or master',
        'bachelor\'s or master\'s',
        'bs or ms',
        'undergraduate or graduate',
        'pursuing a bachelor',
        'pursuing a master',
        'must be pursuing',
        'enrolled in',
        'current student',
        'student intern'
      ];
      
      const hasJobContent = jobContentIndicators.some(indicator => lowerHtml.includes(indicator));
      if (hasJobContent) {
        confidenceScore += 30;
      } else {
        confidenceScore -= 20; // Reduce confidence if no job content found
      }

      return {
        isValid: confidenceScore >= 60,
        confidenceScore: Math.min(100, confidenceScore),
        reason: confidenceScore >= 60 ? 'Valid job posting found' : 'Insufficient job content indicators',
        isLive: true
      };

    } catch (error) {
      return {
        isValid: false,
        confidenceScore: 0,
        reason: error instanceof Error ? error.message : 'Unknown error',
        isLive: false
      };
    }
  }

  private async extractFromGreenhouse(url: string, fallback: Partial<RawInternshipData>): Promise<EnrichedJobData> {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    const title = $('h1.app-title').text().trim() || fallback.title || 'Unknown';
    const description = $('div#content').text().trim() || '';
    const location = $('div.location').text().trim() || fallback.location || 'Unknown';

    return {
      title: this.cleanExactRole(title),
      company: $('span.company-name').text().trim() || fallback.company || 'Unknown',
      location: this.cleanLocation(location),
      description,
      requirements: this.extractRequirements(description),
      deadline: this.extractDeadline(description),
      postedDate: $('time').attr('datetime') || fallback.postedAt,
      graduationYear: this.extractGraduationYear(description),
      ...this.extractPayRate(description),
      salary: this.extractSalary(description)
    };
  }

  private async extractFromLever(url: string, fallback: Partial<RawInternshipData>): Promise<EnrichedJobData> {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    const title = $('h2.posting-headline').text().trim() || fallback.title || 'Unknown';
    const description = $('div.section-wrapper').text().trim() || '';
    const location = $('div.location').text().trim() || fallback.location || 'Unknown';

    return {
      title: this.cleanExactRole(title),
      company: $('div.main-header-text-company-name').text().trim() || fallback.company || 'Unknown',
      location: this.cleanLocation(location),
      description,
      requirements: this.extractRequirements(description),
      deadline: this.extractDeadline(description),
      postedDate: fallback.postedAt,
      graduationYear: this.extractGraduationYear(description),
      ...this.extractPayRate(description),
      salary: this.extractSalary(description)
    };
  }

  private async extractFromWorkday(url: string, fallback: Partial<RawInternshipData>): Promise<EnrichedJobData> {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    const title = $('h2[data-automation-id="jobPostingHeader"]').text().trim() || fallback.title || 'Unknown';
    const description = $('div[data-automation-id="jobPostingDescription"]').text().trim() || '';
    const location = $('div[data-automation-id="locations"]').text().trim() || fallback.location || 'Unknown';

    return {
      title: this.cleanExactRole(title),
      company: fallback.company || 'Unknown',
      location: this.cleanLocation(location),
      description,
      requirements: this.extractRequirements(description),
      deadline: this.extractDeadline(description),
      postedDate: $('time').text().trim() || fallback.postedAt,
      graduationYear: this.extractGraduationYear(description),
      ...this.extractPayRate(description),
      salary: this.extractSalary(description)
    };
  }

  private async extractFromAshby(url: string, fallback: Partial<RawInternshipData>): Promise<EnrichedJobData> {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    const title = $('h1').first().text().trim() || fallback.title || 'Unknown';
    const description = $('div[data-testid="job-description"]').text().trim() || '';
    const location = $('div[data-testid="location"]').text().trim() || fallback.location || 'Unknown';

    return {
      title: this.cleanExactRole(title),
      company: fallback.company || 'Unknown',
      location: this.cleanLocation(location),
      description,
      requirements: this.extractRequirements(description),
      deadline: this.extractDeadline(description),
      postedDate: fallback.postedAt,
      graduationYear: this.extractGraduationYear(description),
      ...this.extractPayRate(description),
      salary: this.extractSalary(description)
    };
  }

  private async extractGeneric(url: string, fallback: Partial<RawInternshipData>): Promise<EnrichedJobData> {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    // Try common selectors
    const title = $('h1').first().text().trim() || 
                  $('title').text().trim() || 
                  fallback.title || 'Unknown';
    const description = $('body').text().substring(0, 1000) || '';
    const location = fallback.location || 'Unknown';

    return {
      title: this.cleanExactRole(title),
      company: fallback.company || 'Unknown',
      location: this.cleanLocation(location),
      description,
      requirements: this.extractRequirements(description),
      deadline: this.extractDeadline(description),
      postedDate: fallback.postedAt,
      graduationYear: this.extractGraduationYear(description),
      ...this.extractPayRate(description),
      salary: this.extractSalary(description)
    };
  }

  private extractSalary(text: string): string | undefined {
    const patterns = [
      /\$(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:per\s+)?(?:hour|hr|hourly)/i,
      /\$(\d+(?:,\d{3})*)-\$?(\d+(?:,\d{3})*)\s*(?:per\s+)?(?:hour|hr)/i,
      /\$(\d+(?:,\d{3})*k?)\s*-\s*\$?(\d+(?:,\d{3})*k?)\s*(?:per\s+)?(?:year|annually)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[0];
    }
    return undefined;
  }

  /**
   * Clean exact role title by removing artifacts but keeping the full title
   */
  private cleanExactRole(title: string): string {
    if (!title) return '';
    
    return title
      // Remove seasonal/year indicators
      .replace(/\s*-\s*(summer|fall|spring|winter)\s*202[0-9]/i, '')
      .replace(/\s*(summer|fall|spring|winter)\s*202[0-9]/i, '')
      // Remove degree requirements
      .replace(/\s*\(bs\/ms\)/i, '')
      .replace(/\s*\(bachelor's\)/i, '')
      .replace(/\s*\(master's\)/i, '')
      // Remove class year indicators
      .replace(/\s*class\s+of\s+202[0-9]/i, '')
      .replace(/\s*graduating\s+in\s+202[0-9]/i, '')
      // Remove emojis
      .replace(/🛂\s*/, '')
      .replace(/📍\s*/, '')
      .replace(/💰\s*/, '')
      // Clean up whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Clean location string
   */
  private cleanLocation(location: string): string {
    if (!location) return 'Not specified';
    
    const cleaned = location
      .replace(/\s*,\s*/g, ', ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Handle remote indicators
    if (cleaned.toLowerCase().includes('remote')) {
      return 'Remote';
    }
    
    return cleaned || 'Not specified';
  }

  /**
   * Extract requirements/qualifications from job description
   */
  private extractRequirements(description: string): string {
    if (!description) return '';
    
    const text = description.toLowerCase();
    
    // Look for requirements sections
    const requirementPatterns = [
      /requirements?[:\s]*([^.]*(?:\.[^.]*)*)/i,
      /qualifications?[:\s]*([^.]*(?:\.[^.]*)*)/i,
      /what\s+we\s+look\s+for[:\s]*([^.]*(?:\.[^.]*)*)/i,
      /you\s+should\s+have[:\s]*([^.]*(?:\.[^.]*)*)/i,
      /minimum\s+requirements?[:\s]*([^.]*(?:\.[^.]*)*)/i
    ];
    
    for (const pattern of requirementPatterns) {
      const match = description.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return '';
  }

  /**
   * Extract graduation year from job description
   */
  private extractGraduationYear(description: string): string[] {
    if (!description) return [];
    
    const text = description.toLowerCase();
    const years: string[] = [];
    
    // Comprehensive patterns for graduation year
    const patterns = [
      // Standard patterns
      /class\s+of\s+(\d{4})/gi,
      /graduating\s+in\s+(\d{4})/gi,
      /(\d{4})\s+graduate/gi,
      /graduation\s+year[:\s]*(\d{4})/gi,
      /expected\s+graduation[:\s]*(\d{4})/gi,
      
      // Bachelor's degree patterns
      /bachelor['']?s\s+degree\s+in\s+(\d{4})/gi,
      /bachelor['']?s\s+in\s+(\d{4})/gi,
      /bs\s+in\s+(\d{4})/gi,
      /bachelor['']?s\s+class\s+of\s+(\d{4})/gi,
      /bachelor['']?s\s+graduating\s+in\s+(\d{4})/gi,
      
      // Note: Removed Master's and PhD patterns - focusing on undergraduate internships only
      
      // Academic year patterns
      /academic\s+year\s+(\d{4})/gi,
      /school\s+year\s+(\d{4})/gi,
      /academic\s+session\s+(\d{4})/gi,
      
      // Enrollment patterns
      /enrolled\s+in\s+(\d{4})/gi,
      /currently\s+enrolled\s+in\s+(\d{4})/gi,
      /enrollment\s+year\s+(\d{4})/gi,
      
      // Degree completion patterns
      /degree\s+completion\s+in\s+(\d{4})/gi,
      /completing\s+degree\s+in\s+(\d{4})/gi,
      /degree\s+by\s+(\d{4})/gi,
      /graduate\s+by\s+(\d{4})/gi,
      
      // Program-specific patterns
      /program\s+completion\s+in\s+(\d{4})/gi,
      /program\s+graduation\s+in\s+(\d{4})/gi,
      /course\s+completion\s+in\s+(\d{4})/gi,
      
      // International patterns
      /graduation\s+date[:\s]*(\d{4})/gi,
      /completion\s+date[:\s]*(\d{4})/gi,
      /finish\s+in\s+(\d{4})/gi,
      /complete\s+in\s+(\d{4})/gi,
      
      // Range patterns
      /graduating\s+between\s+(\d{4})\s+and\s+(\d{4})/gi,
      /class\s+of\s+(\d{4})\s+or\s+(\d{4})/gi,
      /(\d{4})\s+or\s+(\d{4})\s+graduate/gi,
      
      // Year level patterns (undergraduate only)
      /(\d{4})\s+undergraduate/gi,
      /(\d{4})\s+student/gi,
      
      // Summer internship specific
      /summer\s+(\d{4})\s+intern/gi,
      /(\d{4})\s+summer\s+intern/gi,
      /internship\s+for\s+(\d{4})/gi,
      
      // Fall/Spring patterns
      /fall\s+(\d{4})\s+graduate/gi,
      /spring\s+(\d{4})\s+graduate/gi,
      /(\d{4})\s+fall\s+graduate/gi,
      /(\d{4})\s+spring\s+graduate/gi
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        // Handle single year patterns
        if (match[1] && !match[2]) {
          const year = match[1];
          if (year && !years.includes(year)) {
            years.push(year);
          }
        }
        // Handle range patterns (e.g., "graduating between 2025 and 2026")
        else if (match[1] && match[2]) {
          const year1 = match[1];
          const year2 = match[2];
          if (year1 && !years.includes(year1)) {
            years.push(year1);
          }
          if (year2 && !years.includes(year2)) {
            years.push(year2);
          }
        }
      }
    }
    
    return years;
  }

  /**
   * Get appropriate headers for a URL based on the domain
   */
  private getHeadersForUrl(url: string): Record<string, string> {
    const hostname = new URL(url).hostname.toLowerCase();
    
    // Find matching company headers
    for (const [domain, headers] of Object.entries(this.COMPANY_HEADERS)) {
      if (hostname.includes(domain)) {
        return headers;
      }
    }
    
    // Default browser headers
    return {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    };
  }

  /**
   * Extract pay rate information
   */
  private extractPayRate(description: string): {
    payRateMin?: number;
    payRateMax?: number;
    payRateCurrency?: string;
    payRateType?: 'hourly' | 'salary' | 'stipend' | 'unpaid' | 'unknown';
  } {
    if (!description) return { payRateType: 'unknown' };
    
    const text = description.toLowerCase();
    
    // Check for unpaid
    if (text.includes('unpaid') || text.includes('no pay') || text.includes('volunteer')) {
      return { payRateType: 'unpaid' };
    }
    
    // Extract hourly rates
    const hourlyPatterns = [
      /\$(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:per\s+)?(?:hour|hr)/i,
      /\$(\d+(?:,\d{3})*(?:\.\d{2})?)\s*-\s*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:per\s+)?(?:hour|hr)/i
    ];
    
    for (const pattern of hourlyPatterns) {
      const match = text.match(pattern);
      if (match) {
        if (match[2]) {
          return {
            payRateMin: parseFloat(match[1].replace(/,/g, '')),
            payRateMax: parseFloat(match[2].replace(/,/g, '')),
            payRateCurrency: 'USD',
            payRateType: 'hourly'
          };
        } else {
          return {
            payRateMin: parseFloat(match[1].replace(/,/g, '')),
            payRateCurrency: 'USD',
            payRateType: 'hourly'
          };
        }
      }
    }
    
    // Extract salary ranges
    const salaryPatterns = [
      /\$(\d+(?:,\d{3})*k?)\s*(?:per\s+)?(?:year|annually)/i,
      /\$(\d+(?:,\d{3})*k?)\s*-\s*\$?(\d+(?:,\d{3})*k?)\s*(?:per\s+)?(?:year|annually)/i
    ];
    
    for (const pattern of salaryPatterns) {
      const match = text.match(pattern);
      if (match) {
        if (match[2]) {
          return {
            payRateMin: parseFloat(match[1].replace(/[k,]/g, '')) * (match[1].includes('k') ? 1000 : 1),
            payRateMax: parseFloat(match[2].replace(/[k,]/g, '')) * (match[2].includes('k') ? 1000 : 1),
            payRateCurrency: 'USD',
            payRateType: 'salary'
          };
        } else {
          return {
            payRateMin: parseFloat(match[1].replace(/[k,]/g, '')) * (match[1].includes('k') ? 1000 : 1),
            payRateCurrency: 'USD',
            payRateType: 'salary'
          };
        }
      }
    }
    
    return { payRateType: 'unknown' };
  }

  /**
   * Extract deadline from job description
   */
  private extractDeadline(description: string): string | undefined {
    if (!description) return undefined;
    
    const patterns = [
      /(?:deadline|apply by|due)[:\s]*([a-z]+\s+\d{1,2},?\s+\d{4})/i,
      /(?:deadline|due)[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
      /(?:deadline|due)[:\s]*(\d{4}-\d{2}-\d{2})/i
    ];
    
    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match && match[1]) {
        try {
          const date = new Date(match[1]);
          if (!isNaN(date.getTime())) {
            return date.toISOString();
          }
        } catch {}
      }
    }
    
    // Check for "rolling" explicitly
    if (description.toLowerCase().includes('rolling')) {
      return 'Rolling';
    }
    
    return undefined;
  }

  /**
   * Convert enriched data to RawInternshipData format
   */
  private convertToRawInternshipData(enriched: EnrichedJobData, fallback: Partial<RawInternshipData>): RawInternshipData {
    return {
      source: fallback.source || 'Enriched',
      sourceType: fallback.sourceType!,
      url: fallback.url || '',
      title: enriched.title,
      company: enriched.company,
      description: enriched.description,
      location: enriched.location,
      postedAt: enriched.postedDate || fallback.postedAt || new Date().toISOString(),
      applicationUrl: fallback.url || '',
      rawPayload: {
        enrichedFrom: 'job-posting-enricher',
        confidenceScore: enriched.confidenceScore,
        isLive: enriched.isLive,
        graduationYear: enriched.graduationYear,
        requirements: enriched.requirements,
        payRateMin: enriched.payRateMin,
        payRateMax: enriched.payRateMax,
        payRateCurrency: enriched.payRateCurrency,
        payRateType: enriched.payRateType,
        deadline: enriched.deadline
      }
    };
  }
}

export const jobPostingEnricher = new JobPostingEnricher();
