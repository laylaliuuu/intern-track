// Validation utilities using Zod schemas
import { z } from 'zod';
import {
  CompanySchema,
  SourceSchema,
  RawInternshipDataSchema,
  FilterStateSchema,
  InternshipSchema,
  InternshipRole,
  WorkType,
  EligibilityYear,
  BachelorMajor,
  InternshipSourceType,
  BACHELOR_MAJORS
} from '../types';

// Validation functions
export const validateCompany = (data: unknown) => {
  return CompanySchema.parse(data);
};

export const validateSource = (data: unknown) => {
  return SourceSchema.parse(data);
};

export const validateRawInternshipData = (data: unknown) => {
  return RawInternshipDataSchema.parse(data);
};

export const validateFilterStateSchema = (data: unknown) => {
  return FilterStateSchema.parse(data);
};

export const validateInternship = (data: unknown) => {
  return InternshipSchema.parse(data);
};

// Safe validation functions that return results instead of throwing
export const safeValidateCompany = (data: unknown) => {
  return CompanySchema.safeParse(data);
};

export const safeValidateSource = (data: unknown) => {
  return SourceSchema.safeParse(data);
};

export const safeValidateRawInternshipData = (data: unknown) => {
  return RawInternshipDataSchema.safeParse(data);
};

export const safeValidateFilterStateSchema = (data: unknown) => {
  return FilterStateSchema.safeParse(data);
};

export const safeValidateInternship = (data: unknown) => {
  return InternshipSchema.safeParse(data);
};

// Partial validation schemas for updates
export const PartialCompanySchema = CompanySchema.partial().omit({ id: true });
export const PartialSourceSchema = SourceSchema.partial().omit({ id: true });
export const PartialInternshipSchema = InternshipSchema.partial().omit({ id: true });

// API request validation schemas
export const SearchParamsSchema = z.object({
  query: z.string().optional(),
  roles: z.array(z.enum(Object.values(InternshipRole) as [string, ...string[]])).optional(),
  majors: z.array(z.enum(BACHELOR_MAJORS)).optional(),
  locations: z.array(z.string()).optional(),
  isRemote: z.boolean().optional(),
  workType: z.array(z.enum(Object.values(WorkType) as [string, ...string[]])).optional(),
  eligibilityYear: z.array(z.enum(Object.values(EligibilityYear) as [string, ...string[]])).optional(),
  internshipCycle: z.array(z.string()).optional(),
  postedWithin: z.enum(['day', 'week', 'month']).optional(),
  showProgramSpecific: z.boolean().optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  sortBy: z.enum(['posted_at', 'title', 'company', 'deadline']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

export const validateSearchParams = (data: unknown) => {
  return SearchParamsSchema.parse(data);
};

export const safeValidateSearchParams = (data: unknown) => {
  return SearchParamsSchema.safeParse(data);
};

// Normalization validation
export const NormalizationInputSchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  description: z.string(),
  location: z.string().optional(),
  rawPayload: z.record(z.string(), z.unknown())
});

export const NormalizationOutputSchema = z.object({
  normalizedRole: z.enum(Object.values(InternshipRole) as [string, ...string[]]),
  relevantMajors: z.array(z.enum(BACHELOR_MAJORS)),
  skills: z.array(z.string()),
  eligibilityYear: z.array(z.enum(Object.values(EligibilityYear) as [string, ...string[]])),
  isRemote: z.boolean(),
  workType: z.enum(Object.values(WorkType) as [string, ...string[]]),
  isProgramSpecific: z.boolean(),
  canonicalHash: z.string()
});

export const validateNormalizationInput = (data: unknown) => {
  return NormalizationInputSchema.parse(data);
};

export const validateNormalizationOutput = (data: unknown) => {
  return NormalizationOutputSchema.parse(data);
};

// Error formatting utilities
export const formatZodError = (error: z.ZodError): string => {
  return error.issues
    .map(issue => `${issue.path.join('.')}: ${issue.message}`)
    .join(', ');
};

export const createValidationError = (field: string, message: string) => {
  return new Error(`Validation error in ${field}: ${message}`);
};

// Type guards with validation
export const isValidInternshipRole = (value: unknown): value is InternshipRole => {
  return typeof value === 'string' && Object.values(InternshipRole).includes(value as InternshipRole);
};

export const isValidWorkType = (value: unknown): value is WorkType => {
  return typeof value === 'string' && Object.values(WorkType).includes(value as WorkType);
};

export const isValidEligibilityYear = (value: unknown): value is EligibilityYear => {
  return typeof value === 'string' && Object.values(EligibilityYear).includes(value as EligibilityYear);
};

export const isValidBachelorMajor = (value: unknown): value is BachelorMajor => {
  return typeof value === 'string' && BACHELOR_MAJORS.includes(value as BachelorMajor);
};

export const isValidSourceType = (value: unknown): value is InternshipSourceType => {
  return typeof value === 'string' && Object.values(InternshipSourceType).includes(value as InternshipSourceType);
};

// Query parameter validation for API routes
export const validateQueryParams = (params: Record<string, any>) => {
  // Validate limit
  if (params.limit !== undefined) {
    const limit = parseInt(params.limit);
    if (isNaN(limit)) {
      throw new Error('Limit must be a valid number');
    }
    if (limit < 1 || limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }
  }

  // Validate page
  if (params.page !== undefined) {
    const page = parseInt(params.page);
    if (isNaN(page)) {
      throw new Error('Page must be a valid number');
    }
    if (page < 1) {
      throw new Error('Page must be greater than 0');
    }
  }

  // Validate search query length
  if (params.search !== undefined && params.search.length > 100) {
    throw new Error('Search query too long');
  }

  // Validate roles
  if (params.roles !== undefined) {
    const roles = params.roles.split(',');
    for (const role of roles) {
      if (!isValidInternshipRole(role.trim())) {
        throw new Error(`Invalid role: ${role}`);
      }
    }
  }

  // Validate work type
  if (params.workType !== undefined && !isValidWorkType(params.workType)) {
    throw new Error('Invalid work type');
  }

  // Validate eligibility year
  if (params.eligibilityYear !== undefined) {
    const years = params.eligibilityYear.split(',');
    for (const year of years) {
      if (!isValidEligibilityYear(year.trim())) {
        throw new Error(`Invalid eligibility year: ${year}`);
      }
    }
  }

  // Validate postedWithin
  if (params.postedWithin !== undefined) {
    const validValues = ['day', 'week', 'month'];
    if (!validValues.includes(params.postedWithin)) {
      throw new Error('Invalid posted within value');
    }
  }
};

// Internship data validation
export const validateInternshipData = (data: any) => {
  if (!data.title || data.title.trim() === '') {
    throw new Error('Title is required');
  }

  if (!data.company || data.company.trim() === '') {
    throw new Error('Company is required');
  }

  if (!data.url || !isValidUrl(data.url)) {
    throw new Error('Invalid URL format');
  }

  if (data.applicationUrl && !isValidUrl(data.applicationUrl)) {
    throw new Error('Invalid application URL format');
  }

  if (data.postedAt && !isValidDate(data.postedAt)) {
    throw new Error('Invalid posted date');
  }

  if (data.normalizedRole && !isValidInternshipRole(data.normalizedRole)) {
    throw new Error('Invalid normalized role');
  }

  if (data.workType && !isValidWorkType(data.workType)) {
    throw new Error('Invalid work type');
  }

  if (data.eligibilityYear && Array.isArray(data.eligibilityYear)) {
    for (const year of data.eligibilityYear) {
      if (!isValidEligibilityYear(year)) {
        throw new Error(`Invalid eligibility year: ${year}`);
      }
    }
  }
};

// Filter state validation
export const validateFilterState = (filters: any) => {
  if (filters.roles && Array.isArray(filters.roles)) {
    for (const role of filters.roles) {
      if (!isValidInternshipRole(role)) {
        throw new Error(`Invalid role in filter: ${role}`);
      }
    }
  }

  if (filters.workType && Array.isArray(filters.workType)) {
    for (const workType of filters.workType) {
      if (!isValidWorkType(workType)) {
        throw new Error(`Invalid work type in filter: ${workType}`);
      }
    }
  }

  if (filters.eligibilityYear && Array.isArray(filters.eligibilityYear)) {
    for (const year of filters.eligibilityYear) {
      if (!isValidEligibilityYear(year)) {
        throw new Error(`Invalid eligibility year in filter: ${year}`);
      }
    }
  }

  if (filters.postedWithin) {
    const validValues = ['day', 'week', 'month'];
    if (!validValues.includes(filters.postedWithin)) {
      throw new Error('Invalid posted within value');
    }
  }
};

// Utility functions
export const sanitizeSearchQuery = (query: string): string => {
  if (!query) return '';
  
  // Remove potentially dangerous HTML/script tags
  const sanitized = query
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();
  
  return sanitized;
};

export const normalizeLocation = (location: string): string => {
  if (!location) return '';
  
  const normalized = location.toLowerCase().trim();
  
  // Common aliases
  const aliases: Record<string, string> = {
    'sf': 'San Francisco, CA',
    'nyc': 'New York, NY',
    'la': 'Los Angeles, CA',
    'bay area': 'San Francisco, CA',
    'work from home': 'Remote',
    'distributed': 'Remote',
    'san francisco': 'San Francisco, CA'
  };

  if (aliases[normalized]) {
    return aliases[normalized];
  }

  if (normalized === 'remote') {
    return 'Remote';
  }

  // Return original with proper capitalization
  return location.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export const extractSkills = (description: string): string[] => {
  if (!description) return [];
  
  const skillPatterns = [
    // Programming languages
    /\b(Python|Java|JavaScript|TypeScript|C\+\+|C#|Go|Rust|Swift|Kotlin|Ruby|PHP|Scala|R|MATLAB)\b/gi,
    // Frameworks and libraries
    /\b(React|Angular|Vue|Node\.js|Express|Django|Flask|Spring|Laravel|Rails|jQuery|Bootstrap)\b/gi,
    // Databases
    /\b(PostgreSQL|MySQL|MongoDB|Redis|Elasticsearch|Cassandra|DynamoDB|SQLite)\b/gi,
    // Tools and platforms
    /\b(Docker|Kubernetes|AWS|Azure|GCP|Git|Jenkins|Terraform|Ansible)\b/gi,
    // Soft skills
    /\b(Communication|Leadership|Teamwork|Problem[- ]solving|Analytical|Creative)\b/gi
  ];

  const skills = new Set<string>();
  
  for (const pattern of skillPatterns) {
    const matches = description.match(pattern);
    if (matches) {
      matches.forEach(match => {
        // Normalize case
        const normalized = match.charAt(0).toUpperCase() + match.slice(1).toLowerCase();
        skills.add(normalized);
      });
    }
  }

  return Array.from(skills);
};

export const parseApplicationDeadline = (deadlineText: string): Date | null => {
  if (!deadlineText) return null;
  
  try {
    // Clean up the text
    const cleaned = deadlineText
      .replace(/application deadline:?/gi, '')
      .replace(/apply by:?/gi, '')
      .replace(/deadline:?/gi, '')
      .trim();

    // Try parsing common formats
    const formats = [
      // ISO format
      /^\d{4}-\d{2}-\d{2}$/,
      // US format
      /^\d{1,2}\/\d{1,2}\/\d{4}$/,
      // Long format
      /^[A-Za-z]+ \d{1,2}, \d{4}$/
    ];

    for (const format of formats) {
      if (format.test(cleaned)) {
        const date = new Date(cleaned);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }

    // Handle relative dates
    if (cleaned.toLowerCase().includes('next week')) {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      return nextWeek;
    }

    // Handle month-only dates (assume first of month)
    const monthMatch = cleaned.match(/^([A-Za-z]+) (\d{4})$/);
    if (monthMatch) {
      const [, month, year] = monthMatch;
      const date = new Date(`${month} 1, ${year}`);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    return null;
  } catch {
    return null;
  }
};

// Helper functions
const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const isValidDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};