// Ontology-based normalization engine for internship data
import { 
  RawInternshipData, 
  NormalizedInternship, 
  InternshipRole, 
  WorkType, 
  EligibilityYear, 
  BachelorMajor,
  InternshipSourceType 
} from '../types';
import { 
  ROLE_KEYWORDS, 
  MAJOR_TO_ROLES, 
  SKILL_KEYWORDS, 
  PROGRAM_KEYWORDS, 
  LOCATION_ALIASES 
} from '../lib/constants';
import { createCanonicalHash } from '../types/database';

export interface NormalizationResult {
  success: boolean;
  data?: NormalizedInternship;
  errors: string[];
  warnings: string[];
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

  /**
   * Normalize a single raw internship data entry
   */
  async normalize(rawData: RawInternshipData): Promise<NormalizationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate required fields
      if (!rawData.title || !rawData.company || !rawData.url) {
        errors.push('Missing required fields: title, company, or url');
        return { success: false, errors, warnings };
      }

      // Extract and normalize role
      const normalizedRole = this.extractRole(rawData.title, rawData.description);
      if (!normalizedRole) {
        warnings.push('Could not determine internship role, defaulting to Other');
      }

      // Extract relevant majors
      const relevantMajors = this.extractRelevantMajors(
        rawData.title, 
        rawData.description, 
        normalizedRole || InternshipRole.OTHER
      );

      // Extract location and determine if remote
      const { location, isRemote } = this.normalizeLocation(rawData.location);

      // Extract work type
      const workType = this.extractWorkType(rawData.title, rawData.description);

      // Extract skills
      const skills = this.extractSkills(rawData.title, rawData.description);

      // Determine eligibility year
      const eligibilityYear = this.extractEligibilityYear(rawData.title, rawData.description);

      // Extract internship cycle
      const internshipCycle = this.extractInternshipCycle(
        rawData.title, 
        rawData.description, 
        rawData.postedAt
      );

      // Determine if program-specific
      const isProgramSpecific = this.isProgramSpecific(rawData.title, rawData.description);

      // Create canonical hash for deduplication
      const canonicalHash = createCanonicalHash(rawData.title, rawData.company, location);

      // Check for duplicates
      if (this.processedHashes.has(canonicalHash)) {
        return { 
          success: false, 
          errors: ['Duplicate internship detected'], 
          warnings 
        };
      }

      // Parse dates
      const postedAt = rawData.postedAt ? new Date(rawData.postedAt) : new Date();
      const applicationDeadline = rawData.applicationDeadline 
        ? new Date(rawData.applicationDeadline) 
        : undefined;

      // Validate dates
      if (isNaN(postedAt.getTime())) {
        warnings.push('Invalid posted date, using current date');
      }

      if (applicationDeadline && isNaN(applicationDeadline.getTime())) {
        warnings.push('Invalid application deadline, ignoring');
      }

      const normalizedData: NormalizedInternship = {
        id: '', // Will be set by database
        title: this.cleanTitle(rawData.title),
        company: this.cleanCompanyName(rawData.company),
        normalizedRole: normalizedRole || InternshipRole.OTHER,
        relevantMajors,
        location,
        isRemote,
        workType,
        skills,
        eligibilityYear,
        internshipCycle,
        postedAt,
        applicationDeadline,
        applicationUrl: rawData.applicationUrl || rawData.url,
        description: this.cleanDescription(rawData.description),
        source: rawData.source,
        sourceType: rawData.sourceType,
        canonicalHash,
        isProgramSpecific
      };

      // Add to processed hashes
      this.processedHashes.add(canonicalHash);

      return {
        success: true,
        data: normalizedData,
        errors,
        warnings
      };

    } catch (error) {
      errors.push(`Normalization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { success: false, errors, warnings };
    }
  }

  /**
   * Normalize multiple raw internship entries
   */
  async normalizeMany(rawDataArray: RawInternshipData[]): Promise<{
    results: NormalizationResult[];
    metrics: NormalizationMetrics;
  }> {
    const startTime = Date.now();
    const results: NormalizationResult[] = [];
    
    let successful = 0;
    let failed = 0;
    let duplicatesSkipped = 0;

    for (const rawData of rawDataArray) {
      const result = await this.normalize(rawData);
      results.push(result);

      if (result.success) {
        successful++;
      } else {
        failed++;
        if (result.errors.includes('Duplicate internship detected')) {
          duplicatesSkipped++;
        }
      }
    }

    const metrics: NormalizationMetrics = {
      totalProcessed: rawDataArray.length,
      successful,
      failed,
      duplicatesSkipped,
      executionTime: Date.now() - startTime
    };

    return { results, metrics };
  }

  /**
   * Extract internship role from title and description
   */
  private extractRole(title: string, description: string): InternshipRole | null {
    const text = `${title} ${description}`.toLowerCase();
    
    // Check each role's keywords
    for (const [role, keywords] of Object.entries(ROLE_KEYWORDS)) {
      for (const keyword of keywords) {
        if (text.includes(keyword.toLowerCase())) {
          return role as InternshipRole;
        }
      }
    }

    return null;
  }

  /**
   * Extract relevant bachelor's degree majors
   */
  private extractRelevantMajors(
    title: string, 
    description: string, 
    role: InternshipRole
  ): BachelorMajor[] {
    const text = `${title} ${description}`.toLowerCase();
    const majors = new Set<BachelorMajor>();

    // Add majors based on role
    for (const [major, roles] of Object.entries(MAJOR_TO_ROLES)) {
      if (roles.includes(role)) {
        majors.add(major as BachelorMajor);
      }
    }

    // Look for explicit major mentions in text
    const majorKeywords: Record<string, BachelorMajor> = {
      'computer science': 'Computer Science',
      'software engineering': 'Software Engineering',
      'computer engineering': 'Computer Engineering',
      'electrical engineering': 'Electrical Engineering',
      'business': 'Business',
      'finance': 'Finance',
      'economics': 'Economics',
      'mathematics': 'Mathematics',
      'statistics': 'Statistics',
      'data science': 'Data Science',
      'information systems': 'Information Systems',
      'marketing': 'Marketing',
      'psychology': 'Psychology',
      'communications': 'Communications'
    };

    for (const [keyword, major] of Object.entries(majorKeywords)) {
      if (text.includes(keyword)) {
        majors.add(major);
      }
    }

    // If no specific majors found, add "Any" for general roles
    if (majors.size === 0) {
      majors.add('Any');
    }

    return Array.from(majors);
  }

  /**
   * Extract skills from title and description
   */
  private extractSkills(title: string, description: string): string[] {
    const text = `${title} ${description}`.toLowerCase();
    const skills = new Set<string>();

    for (const skill of SKILL_KEYWORDS) {
      if (text.includes(skill.toLowerCase())) {
        // Capitalize first letter
        skills.add(skill.charAt(0).toUpperCase() + skill.slice(1));
      }
    }

    return Array.from(skills).slice(0, 10); // Limit to 10 skills
  }

  /**
   * Normalize location and determine if remote
   */
  private normalizeLocation(location?: string): { location: string; isRemote: boolean } {
    if (!location) {
      return { location: 'Location not specified', isRemote: false };
    }

    const cleanLocation = location.trim();
    const lowerLocation = cleanLocation.toLowerCase();

    // Check if remote
    const remoteKeywords = ['remote', 'work from home', 'distributed', 'anywhere'];
    const isRemote = remoteKeywords.some(keyword => lowerLocation.includes(keyword));

    if (isRemote) {
      return { location: 'Remote', isRemote: true };
    }

    // Normalize using aliases
    for (const [alias, normalized] of Object.entries(LOCATION_ALIASES)) {
      if (lowerLocation.includes(alias)) {
        return { location: normalized, isRemote: false };
      }
    }

    return { location: cleanLocation, isRemote: false };
  }

  /**
   * Extract work type (paid/unpaid)
   */
  private extractWorkType(title: string, description: string): WorkType {
    const text = `${title} ${description}`.toLowerCase();

    // Look for unpaid indicators
    const unpaidKeywords = ['unpaid', 'volunteer', 'no compensation', 'academic credit'];
    if (unpaidKeywords.some(keyword => text.includes(keyword))) {
      return WorkType.UNPAID;
    }

    // Look for paid indicators
    const paidKeywords = ['paid', 'salary', 'compensation', 'stipend', '$', 'hourly'];
    if (paidKeywords.some(keyword => text.includes(keyword))) {
      return WorkType.PAID;
    }

    // Default to paid for most internships
    return WorkType.PAID;
  }

  /**
   * Extract eligibility year requirements
   */
  private extractEligibilityYear(title: string, description: string): EligibilityYear[] {
    const text = `${title} ${description}`.toLowerCase();
    const years = new Set<EligibilityYear>();

    const yearKeywords: Record<string, EligibilityYear> = {
      'freshman': EligibilityYear.FRESHMAN,
      'first year': EligibilityYear.FRESHMAN,
      'sophomore': EligibilityYear.SOPHOMORE,
      'second year': EligibilityYear.SOPHOMORE,
      'junior': EligibilityYear.JUNIOR,
      'third year': EligibilityYear.JUNIOR,
      'senior': EligibilityYear.SENIOR,
      'fourth year': EligibilityYear.SENIOR,
      'final year': EligibilityYear.SENIOR
    };

    for (const [keyword, year] of Object.entries(yearKeywords)) {
      if (text.includes(keyword)) {
        years.add(year);
      }
    }

    // If no specific years mentioned, assume junior/senior
    if (years.size === 0) {
      years.add(EligibilityYear.JUNIOR);
      years.add(EligibilityYear.SENIOR);
    }

    return Array.from(years);
  }

  /**
   * Extract internship cycle (Summer 2025, etc.)
   */
  private extractInternshipCycle(
    title: string, 
    description: string, 
    postedAt?: string
  ): string {
    const text = `${title} ${description}`;
    
    // Look for explicit cycle mentions
    const cyclePattern = /(Summer|Fall|Spring|Winter)\s+(\d{4})/i;
    const match = text.match(cyclePattern);
    
    if (match) {
      return `${match[1]} ${match[2]}`;
    }

    // Infer from posted date
    const date = postedAt ? new Date(postedAt) : new Date();
    const year = date.getFullYear();
    const month = date.getMonth();

    // Typical internship application cycles
    if (month >= 8 && month <= 11) { // Aug-Nov
      return `Summer ${year + 1}`;
    } else if (month >= 0 && month <= 3) { // Jan-Mar
      return `Summer ${year}`;
    } else if (month >= 4 && month <= 7) { // Apr-Jul
      return `Fall ${year}`;
    }

    return `Summer ${year + 1}`;
  }

  /**
   * Determine if internship is program-specific (diversity programs, etc.)
   */
  private isProgramSpecific(title: string, description: string): boolean {
    const text = `${title} ${description}`.toLowerCase();
    
    return PROGRAM_KEYWORDS.some(keyword => text.includes(keyword.toLowerCase()));
  }

  /**
   * Clean and normalize title
   */
  private cleanTitle(title: string): string {
    return title
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s-()]/g, '')
      .substring(0, 200);
  }

  /**
   * Clean and normalize company name
   */
  private cleanCompanyName(company: string): string {
    return company
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s&.-]/g, '')
      .substring(0, 100);
  }

  /**
   * Clean and normalize description
   */
  private cleanDescription(description: string): string {
    if (!description) return '';
    
    return description
      .trim()
      .replace(/\s+/g, ' ')
      .substring(0, 5000);
  }

  /**
   * Reset processed hashes (useful for new ingestion runs)
   */
  resetProcessedHashes(): void {
    this.processedHashes.clear();
  }

  /**
   * Get statistics about processed data
   */
  getProcessedCount(): number {
    return this.processedHashes.size;
  }
}

// Export default instance
export const normalizationEngine = new NormalizationEngine();