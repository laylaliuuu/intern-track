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

export const validateFilterState = (data: unknown) => {
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

export const safeValidateFilterState = (data: unknown) => {
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
  roles: z.array(z.nativeEnum(InternshipRole)).optional(),
  majors: z.array(z.enum(BACHELOR_MAJORS)).optional(),
  locations: z.array(z.string()).optional(),
  isRemote: z.boolean().optional(),
  workType: z.array(z.nativeEnum(WorkType)).optional(),
  eligibilityYear: z.array(z.nativeEnum(EligibilityYear)).optional(),
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
  normalizedRole: z.nativeEnum(InternshipRole),
  relevantMajors: z.array(z.enum(BACHELOR_MAJORS)),
  skills: z.array(z.string()),
  eligibilityYear: z.array(z.nativeEnum(EligibilityYear)),
  isRemote: z.boolean(),
  workType: z.nativeEnum(WorkType),
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