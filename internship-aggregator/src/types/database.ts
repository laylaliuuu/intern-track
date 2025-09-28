// Database-specific types and utilities
import { z } from 'zod';
import { 
  InternshipRole, 
  WorkType, 
  EligibilityYear, 
  BachelorMajor, 
  InternshipSourceType,
  BACHELOR_MAJORS 
} from './index';

// Database table schemas matching the SQL schema exactly
export const DatabaseCompanySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  domain: z.string().nullable(),
  linkedin_url: z.string().nullable(),
  logo_url: z.string().nullable(),
  created_at: z.string().datetime()
});

export const DatabaseSourceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  type: z.enum(['api', 'scrape', 'manual']),
  base_url: z.string().nullable(),
  is_active: z.boolean(),
  last_checked: z.string().datetime().nullable(),
  error_count: z.number().int().min(0),
  created_at: z.string().datetime()
});

export const DatabaseInternshipSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  company_id: z.string().uuid(),
  source_id: z.string().uuid().nullable(),
  url: z.string().url(),
  application_url: z.string().nullable(),
  description: z.string(),
  location: z.string(),
  is_remote: z.boolean(),
  work_type: z.nativeEnum(WorkType),
  posted_at: z.string().datetime(),
  application_deadline: z.string().datetime().nullable(),
  scraped_at: z.string().datetime(),
  normalized_role: z.nativeEnum(InternshipRole),
  relevant_majors: z.array(z.enum(BACHELOR_MAJORS)),
  skills: z.array(z.string()),
  eligibility_year: z.array(z.nativeEnum(EligibilityYear)),
  internship_cycle: z.string(),
  is_program_specific: z.boolean(),
  source_type: z.nativeEnum(InternshipSourceType),
  canonical_hash: z.string(),
  is_archived: z.boolean(),
  raw_payload: z.record(z.string(), z.unknown()).nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

// Database row types
export type DatabaseCompany = z.infer<typeof DatabaseCompanySchema>;
export type DatabaseSource = z.infer<typeof DatabaseSourceSchema>;
export type DatabaseInternship = z.infer<typeof DatabaseInternshipSchema>;

// Insert types (without auto-generated fields)
export type InsertCompany = Omit<DatabaseCompany, 'id' | 'created_at'>;
export type InsertSource = Omit<DatabaseSource, 'id' | 'created_at'>;
export type InsertInternship = Omit<DatabaseInternship, 'id' | 'created_at' | 'updated_at' | 'scraped_at'>;

// Update types (partial with required id)
export type UpdateCompany = Partial<InsertCompany> & { id: string };
export type UpdateSource = Partial<InsertSource> & { id: string };
export type UpdateInternship = Partial<InsertInternship> & { id: string };

// Query builder types for Supabase
export interface InternshipQuery {
  select?: string;
  filters?: {
    roles?: InternshipRole[];
    majors?: BachelorMajor[];
    locations?: string[];
    isRemote?: boolean;
    workType?: WorkType[];
    eligibilityYear?: EligibilityYear[];
    internshipCycle?: string[];
    postedSince?: Date;
    showArchived?: boolean;
    showProgramSpecific?: boolean;
    companyIds?: string[];
    sourceIds?: string[];
  };
  search?: {
    query: string;
    fields?: ('title' | 'description' | 'company.name')[];
  };
  sort?: {
    field: 'posted_at' | 'title' | 'company.name' | 'application_deadline';
    order: 'asc' | 'desc';
  };
  pagination?: {
    page: number;
    limit: number;
  };
}

// Supabase response types
export interface SupabaseResponse<T> {
  data: T | null;
  error: {
    message: string;
    details?: string;
    hint?: string;
    code?: string;
  } | null;
}

export interface SupabaseListResponse<T> {
  data: T[] | null;
  error: {
    message: string;
    details?: string;
    hint?: string;
    code?: string;
  } | null;
  count?: number;
}

// Database utility functions
export const createCanonicalHash = (title: string, company: string, location: string): string => {
  const normalized = `${title.toLowerCase().trim()}-${company.toLowerCase().trim()}-${location.toLowerCase().trim()}`;
  return normalized.replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
};

export const validateDatabaseInternship = (data: unknown): DatabaseInternship => {
  return DatabaseInternshipSchema.parse(data);
};

export const validateDatabaseCompany = (data: unknown): DatabaseCompany => {
  return DatabaseCompanySchema.parse(data);
};

export const validateDatabaseSource = (data: unknown): DatabaseSource => {
  return DatabaseSourceSchema.parse(data);
};