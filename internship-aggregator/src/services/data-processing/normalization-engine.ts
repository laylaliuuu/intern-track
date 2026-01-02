import { RawInternshipData, InternshipSourceType } from '../../types';

export interface NormalizedInternshipData {
  // Core fields
  source: string;
  sourceType: InternshipSourceType;
  url: string;
  title: string;
  company: string;
  description: string;
  location: string;
  postedAt: string;
  applicationUrl: string;
  
  // Normalized fields
  normalizedTitle: string;
  normalizedCompany: string;
  normalizedLocation: string;
  canonicalHash: string;
  
  // Extracted fields
  role: string;
  skills: string[];
  majors: string[];
  eligibility: {
    yearLevel: string[];
    gpa: string | null;
    citizenship: string | null;
  };
  compensation: {
    type: 'hourly' | 'salary' | 'unpaid' | 'unknown';
    amount: string | null;
    currency: string;
  };
  workType: 'remote' | 'hybrid' | 'onsite' | 'unknown';
  internshipCycle: 'summer' | 'fall' | 'spring' | 'year-round' | 'unknown';
  deadline: string | null;
  
  // New quality fields
  exactRole: string;
  graduationYear: string[];
  requirements: string;
  payRateDetails: {
    payRateMin?: number;
    payRateMax?: number;
    payRateCurrency?: string;
    payRateType?: 'hourly' | 'salary' | 'stipend' | 'unpaid' | 'unknown';
  };
  
  // Quality metrics
  qualityScore: number;
  completenessScore: number;
  
  // Raw payload
  rawPayload: any;
}

export interface NormalizationResult {
  success: boolean;
  data?: NormalizedInternshipData;
  errors: string[];
}

export interface NormalizationMetrics {
  totalProcessed: number;
  successful: number;
  failed: number;
  duplicatesSkipped: number;
  executionTime: number;
}

export class NormalizationEngine {
  private processedHashes = new Set<string>();

  reset(): void {
    this.processedHashes.clear();
  }

  async normalizeMany(rawData: RawInternshipData[]): Promise<{
    results: NormalizationResult[];
    metrics: NormalizationMetrics;
  }> {
    const startTime = Date.now();
    const results: NormalizationResult[] = [];
    let successful = 0;
    let failed = 0;
    let duplicatesSkipped = 0;

    for (const raw of rawData) {
      try {
        const normalized = await this.normalize(raw);
        
        // Check for duplicates
        if (this.processedHashes.has(normalized.canonicalHash)) {
          duplicatesSkipped++;
          results.push({
            success: false,
            errors: ['Duplicate internship detected'],
          });
          continue;
        }

        this.processedHashes.add(normalized.canonicalHash);
        successful++;
        results.push({
          success: true,
          data: normalized,
          errors: [],
        });
      } catch (error) {
        failed++;
        results.push({
          success: false,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
        });
      }
    }

    const metrics: NormalizationMetrics = {
      totalProcessed: rawData.length,
      successful,
      failed,
      duplicatesSkipped,
      executionTime: Date.now() - startTime,
    };

    return { results, metrics };
  }
  private roleMappings: Record<string, string[]> = {
    'Software Engineering': ['software engineer', 'software developer', 'swe', 'backend engineer', 'frontend engineer', 'full stack engineer'],
    'Product Management': ['product manager', 'pm', 'product management'],
    'Data Science': ['data scientist', 'data analyst', 'data science'],
    'Quantitative Analysis': ['quantitative analyst', 'quant', 'quantitative analysis'],
    'Research': ['research scientist', 'research'],
    'Design': ['designer', 'ux designer', 'ui designer', 'design'],
    'Marketing': ['marketing', 'marketing intern'],
    'Sales': ['sales', 'sales intern'],
    'Business Analysis': ['business analyst', 'business analysis'],
    'Consulting': ['consultant', 'consulting'],
    'Finance': ['finance', 'financial analyst'],
    'Operations': ['operations', 'operations analyst']
  };

  private skillKeywords: Record<string, string[]> = {
    'Python': ['python', 'django', 'flask', 'pandas', 'numpy'],
    'JavaScript': ['javascript', 'js', 'node.js', 'react', 'vue', 'angular'],
    'Java': ['java', 'spring', 'hibernate'],
    'C++': ['c++', 'cpp'],
    'SQL': ['sql', 'mysql', 'postgresql', 'mongodb'],
    'React': ['react', 'reactjs', 'jsx'],
    'AWS': ['aws', 'amazon web services', 's3', 'ec2', 'lambda'],
    'Machine Learning': ['machine learning', 'ml', 'tensorflow', 'pytorch', 'scikit-learn'],
    'Data Analysis': ['data analysis', 'statistics', 'r', 'matlab'],
    'Git': ['git', 'github', 'gitlab'],
    'Docker': ['docker', 'kubernetes', 'k8s'],
    'TypeScript': ['typescript', 'ts']
  };

  private majorMappings: Record<string, string[]> = {
    'Computer Science': ['computer science', 'cs', 'computer engineering', 'ce', 'software engineering'],
    'Data Science': ['data science', 'statistics', 'applied mathematics', 'analytics'],
    'Business': ['business', 'economics', 'finance', 'marketing', 'management'],
    'Engineering': ['engineering', 'mechanical', 'electrical', 'civil', 'chemical'],
    'Mathematics': ['mathematics', 'math', 'applied math', 'statistics'],
    'Physics': ['physics', 'applied physics'],
    'Design': ['design', 'graphic design', 'ux design', 'ui design', 'industrial design']
  };

  async normalize(rawData: RawInternshipData): Promise<NormalizedInternshipData> {
    const normalized = {
      // Copy core fields
      source: rawData.source,
      sourceType: rawData.sourceType,
      url: rawData.url,
      title: rawData.title,
      company: rawData.company,
      description: rawData.description,
      location: rawData.location || 'Not specified',
      postedAt: rawData.postedAt || new Date().toISOString(),
      applicationUrl: rawData.applicationUrl || rawData.url,
      rawPayload: rawData.rawPayload,
      
      // Normalize fields
      normalizedTitle: this.normalizeTitle(rawData.title),
      normalizedCompany: this.normalizeCompany(rawData.company),
      normalizedLocation: this.normalizeLocation(rawData.location || ''),
      canonicalHash: this.generateCanonicalHash(rawData),
      
      // Extract fields
      role: this.extractRole(rawData.title, rawData.description),
      skills: this.extractSkills(rawData.description),
      majors: this.extractMajors(rawData.description),
      eligibility: this.extractEligibility(rawData.description),
      compensation: this.extractCompensation(rawData.description, rawData.rawPayload),
      workType: this.extractWorkType(rawData.description, rawData.location || ''),
      internshipCycle: this.extractInternshipCycle(rawData.description, rawData.title),
      deadline: this.extractDeadline(rawData.description),
      
      // New quality fields
      exactRole: this.extractExactRole(rawData.title),
      graduationYear: this.extractGraduationYear(rawData.description),
      requirements: this.extractRequirements(rawData.description),
      payRateDetails: this.extractPayRateDetails(rawData.description),
      
      // Quality metrics
      qualityScore: this.calculateQualityScore(rawData),
      completenessScore: this.calculateCompletenessScore(rawData)
    };

    return normalized;
  }

  private normalizeTitle(title: string): string {
    if (!title) return '';
    
    // Remove common prefixes/suffixes
    let normalized = title
      .replace(/^(intern|internship|co-op|coop)\s*/i, '')
      .replace(/\s*(intern|internship|co-op|coop)$/i, '')
      .replace(/\s*-\s*(summer|fall|spring)\s*202[0-9]/i, '')
      .trim();
    
    // Capitalize properly
    normalized = normalized.replace(/\b\w/g, l => l.toUpperCase());
    
    return normalized;
  }

  private normalizeCompany(company: string): string {
    if (!company) return '';
    
    // Remove common suffixes
    let normalized = company
      .replace(/\s*(inc|llc|ltd|corp|corporation|company|co)\.?$/i, '')
      .trim();
    
    // Handle special cases
    const specialCases: Record<string, string> = {
      'google': 'Google',
      'microsoft': 'Microsoft',
      'meta': 'Meta',
      'facebook': 'Meta',
      'amazon': 'Amazon',
      'apple': 'Apple',
      'netflix': 'Netflix',
      'tesla': 'Tesla'
    };
    
    const lowerCompany = normalized.toLowerCase();
    if (specialCases[lowerCompany]) {
      return specialCases[lowerCompany];
    }
    
    return normalized;
  }

  private normalizeLocation(location: string): string {
    if (!location) return '';
    
    // Standardize common location formats
    let normalized = location
      .replace(/\s*,\s*/g, ', ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Handle remote indicators
    if (normalized.toLowerCase().includes('remote')) {
      return 'Remote';
    }
    
    // Handle multiple locations
    if (normalized.includes(',')) {
      const locations = normalized.split(',').map(l => l.trim());
      if (locations.length > 3) {
        return locations.slice(0, 3).join(', ') + ' + more';
      }
    }
    
    return normalized;
  }

  private generateCanonicalHash(data: RawInternshipData): string {
    // Create a hash based on company + normalized title + location
    const normalizedTitle = this.normalizeTitle(data.title);
    const normalizedCompany = this.normalizeCompany(data.company);
    const normalizedLocation = this.normalizeLocation(data.location || '');
    
    const hashString = `${normalizedCompany}|${normalizedTitle}|${normalizedLocation}`;
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < hashString.length; i++) {
      const char = hashString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  private extractRole(title: string, description: string): string {
    const text = `${title} ${description}`.toLowerCase();
    
    for (const [role, keywords] of Object.entries(this.roleMappings)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return role;
      }
    }
    
    return 'Other';
  }

  /**
   * Extract exact role title (cleaned but exact)
   */
  private extractExactRole(title: string): string {
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

  private extractSkills(description: string): string[] {
    if (!description) return [];
    
    const text = description.toLowerCase();
    const foundSkills: string[] = [];
    
    for (const [skill, keywords] of Object.entries(this.skillKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        foundSkills.push(skill);
      }
    }
    
    return foundSkills;
  }

  private extractMajors(description: string): string[] {
    if (!description) return [];
    
    const text = description.toLowerCase();
    const foundMajors: string[] = [];
    
    for (const [major, keywords] of Object.entries(this.majorMappings)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        foundMajors.push(major);
      }
    }
    
    return foundMajors;
  }

  private extractEligibility(description: string): { yearLevel: string[]; gpa: string | null; citizenship: string | null } {
    if (!description) return { yearLevel: [], gpa: null, citizenship: null };
    
    const text = description.toLowerCase();
    const yearLevel: string[] = [];
    
    // Extract year level
    if (text.includes('freshman') || text.includes('1st year')) yearLevel.push('Freshman');
    if (text.includes('sophomore') || text.includes('2nd year')) yearLevel.push('Sophomore');
    if (text.includes('junior') || text.includes('3rd year')) yearLevel.push('Junior');
    if (text.includes('senior') || text.includes('4th year')) yearLevel.push('Senior');
    if (text.includes('graduate') || text.includes('masters') || text.includes('phd')) yearLevel.push('Graduate');
    
    // Extract GPA
    const gpaMatch = text.match(/gpa[:\s]*(\d+\.?\d*)/i);
    const gpa = gpaMatch ? gpaMatch[1] : null;
    
    // Extract citizenship
    let citizenship: string | null = null;
    if (text.includes('us citizen') || text.includes('citizen')) citizenship = 'US Citizen';
    if (text.includes('authorized to work') || text.includes('work authorization')) citizenship = 'Authorized to Work';
    
    return { yearLevel, gpa, citizenship };
  }

  private extractCompensation(description: string, rawPayload: any): { type: 'hourly' | 'salary' | 'unpaid' | 'unknown'; amount: string | null; currency: string } {
    const text = description.toLowerCase();
    
    // Check for unpaid
    if (text.includes('unpaid') || text.includes('no pay') || text.includes('volunteer')) {
      return { type: 'unpaid', amount: null, currency: 'USD' };
    }
    
    // Extract hourly rates
    const hourlyMatch = text.match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:per\s+)?(?:hour|hr)/i);
    if (hourlyMatch) {
      return { type: 'hourly', amount: hourlyMatch[1], currency: 'USD' };
    }
    
    // Extract salary ranges
    const salaryMatch = text.match(/\$(\d+(?:,\d{3})*)\s*(?:-\s*\$?(\d+(?:,\d{3})*))?\s*(?:per\s+)?(?:year|annually)/i);
    if (salaryMatch) {
      const amount = salaryMatch[2] ? `${salaryMatch[1]}-${salaryMatch[2]}` : salaryMatch[1];
      return { type: 'salary', amount, currency: 'USD' };
    }
    
    // Check raw payload for salary info
    if (rawPayload?.salary) {
      return { type: 'hourly', amount: rawPayload.salary, currency: 'USD' };
    }
    
    return { type: 'unknown', amount: null, currency: 'USD' };
  }

  /**
   * Extract detailed pay rate information
   */
  private extractPayRateDetails(description: string): {
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

  private extractWorkType(description: string, location: string): 'remote' | 'hybrid' | 'onsite' | 'unknown' {
    const text = `${description} ${location}`.toLowerCase();
    
    // Check for remote work indicators
    if (text.includes('remote') || text.includes('work from home') || text.includes('distributed')) {
      return 'remote';
    }
    
    // Check for hybrid work indicators
    if (text.includes('hybrid') || text.includes('flexible') || text.includes('part remote')) {
      return 'hybrid';
    }
    
    // Check for onsite indicators
    if (text.includes('onsite') || text.includes('on-site') || text.includes('in-person')) {
      return 'onsite';
    }
    
    // If location is empty or just says "remote", assume remote
    if (!location || location.toLowerCase().includes('remote')) {
      return 'remote';
    }
    
    return 'unknown';
  }

  private extractInternshipCycle(description: string, title: string): 'summer' | 'fall' | 'spring' | 'year-round' | 'unknown' {
    const text = `${title} ${description}`.toLowerCase();
    
    if (text.includes('summer')) return 'summer';
    if (text.includes('fall')) return 'fall';
    if (text.includes('spring')) return 'spring';
    if (text.includes('year-round') || text.includes('year round')) return 'year-round';
    
    return 'unknown';
  }

  private extractDeadline(description: string): string | null {
    if (!description) return null;
    
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
    
    return null;
  }

  private calculateQualityScore(data: RawInternshipData): number {
    let score = 0;
    
    // Title quality (0-20 points)
    if (data.title && data.title.length > 10) score += 10;
    if (data.title && data.title.toLowerCase().includes('intern')) score += 10;
    
    // Company quality (0-20 points)
    if (data.company && data.company.length > 2) score += 10;
    const topCompanies = ['google', 'microsoft', 'meta', 'apple', 'amazon', 'netflix', 'tesla'];
    if (topCompanies.some(company => data.company?.toLowerCase().includes(company))) score += 10;
    
    // Description quality (0-20 points)
    if (data.description && data.description.length > 100) score += 10;
    if (data.description && data.description.length > 500) score += 10;
    
    // URL quality (0-20 points)
    if (data.url && data.url.startsWith('http')) score += 10;
    if (data.url && !data.url.includes('indeed') && !data.url.includes('linkedin')) score += 10;
    
    // Location quality (0-10 points)
    if (data.location && data.location.length > 2) score += 10;
    
    // Application URL (0-10 points)
    if (data.applicationUrl && data.applicationUrl !== data.url) score += 10;
    
    return Math.min(score, 100);
  }

  private calculateCompletenessScore(data: RawInternshipData): number {
    const fields = [
      'title', 'company', 'description', 'location', 
      'url', 'applicationUrl', 'postedAt'
    ];
    
    const filledFields = fields.filter(field => {
      const value = data[field as keyof RawInternshipData];
      return value && value.toString().trim().length > 0;
    });
    
    return Math.round((filledFields.length / fields.length) * 100);
  }
}

export const normalizationEngine = new NormalizationEngine();