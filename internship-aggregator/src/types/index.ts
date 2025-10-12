import { z } from 'zod';

// Enums
export enum InternshipRole {
  SOFTWARE_ENGINEERING = 'Software Engineering',
  PRODUCT_MANAGEMENT = 'Product Management',
  DATA_SCIENCE = 'Data Science',
  QUANTITATIVE_RESEARCH = 'Quantitative Research',
  BUSINESS_ANALYST = 'Business Analyst',
  DESIGN = 'Design',
  MARKETING = 'Marketing',
  FINANCE = 'Finance',
  CONSULTING = 'Consulting',
  RESEARCH = 'Research',
  OTHER = 'Other'
}

export enum WorkType {
  PAID = 'paid',
  UNPAID = 'unpaid',
  UNKNOWN = 'unknown'
}

export enum InternshipSourceType {
  COMPANY_CAREER_PAGE = 'company_career_page',
  PROGRAM_PAGE = 'program_page',
  API_FEED = 'api_feed'
}

export enum EligibilityYear {
  FRESHMAN = 'Freshman',
  SOPHOMORE = 'Sophomore',
  JUNIOR = 'Junior',
  SENIOR = 'Senior'
}

// Common majors for filtering
export const BACHELOR_MAJORS = [
  'Computer Science',
  'Software Engineering',
  'Computer Engineering',
  'Electrical Engineering',
  'Business',
  'Finance',
  'Economics',
  'Mathematics',
  'Statistics',
  'Data Science',
  'Information Systems',
  'Marketing',
  'Psychology',
  'Communications',
  'Any'
] as const;

export type BachelorMajor = typeof BACHELOR_MAJORS[number];

// Zod Schemas for runtime validation
export const CompanySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  domain: z.string().optional(),
  linkedin_url: z.string().url().optional(),
  logo_url: z.string().url().optional(),
  created_at: z.string().datetime()
});

export const SourceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  type: z.enum(['api', 'scrape', 'manual']),
  base_url: z.string().url().optional(),
  is_active: z.boolean(),
  last_checked: z.string().datetime().optional(),
  error_count: z.number().int().min(0),
  created_at: z.string().datetime()
});

export const RawInternshipDataSchema = z.object({
  source: z.string().min(1),
  sourceType: z.nativeEnum(InternshipSourceType),
  url: z.string().url(),
  title: z.string().min(1),
  company: z.string().min(1),
  description: z.string(),
  location: z.string().optional(),
  postedAt: z.string().optional(),
  applicationUrl: z.string().url().optional(),
  applicationDeadline: z.string().optional(),
  internshipCycle: z.string().optional(),
  eligibilityYear: z.string().optional(),
  rawPayload: z.record(z.string(), z.unknown())
});

export const FilterStateSchema = z.object({
  roles: z.array(z.nativeEnum(InternshipRole)),
  majors: z.array(z.enum(BACHELOR_MAJORS)),
  locations: z.array(z.string()),
  isRemote: z.boolean().optional(),
  workType: z.array(z.nativeEnum(WorkType)),
  eligibilityYear: z.array(z.nativeEnum(EligibilityYear)),
  internshipCycle: z.array(z.string()),
  postedWithin: z.enum(['day', 'week', 'month']).optional(),
  showProgramSpecific: z.boolean().optional()
});

export const InternshipSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  company_id: z.string().uuid(),
  source_id: z.string().uuid().optional(),
  url: z.string().url(),
  application_url: z.string().url().optional(),
  description: z.string(),
  location: z.string(),
  is_remote: z.boolean(),
  work_type: z.nativeEnum(WorkType),
  posted_at: z.string().datetime(),
  application_deadline: z.string().datetime().optional(),
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
  raw_payload: z.record(z.string(), z.unknown()).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

// TypeScript interfaces derived from Zod schemas
export interface Company {
  id: string;
  name: string;
  domain?: string;
  linkedin_url?: string;
  logo_url?: string;
  created_at: string;
}

export interface Source {
  id: string;
  name: string;
  type: 'api' | 'scrape' | 'manual';
  base_url?: string;
  is_active: boolean;
  last_checked?: string;
  error_count: number;
  created_at: string;
}

// Database row interface (matches database schema exactly)
export interface InternshipRow {
  id: string;
  title: string;
  company_id: string;
  source_id?: string;
  url: string;
  application_url?: string;
  description: string;
  location: string;
  is_remote: boolean;
  work_type: WorkType;
  posted_at: string;
  application_deadline?: string;
  scraped_at: string;
  normalized_role: InternshipRole;
  relevant_majors: BachelorMajor[];
  skills: string[];
  eligibility_year: EligibilityYear[];
  internship_cycle: string;
  is_program_specific: boolean;
  source_type: InternshipSourceType;
  canonical_hash: string;
  is_archived: boolean;
  raw_payload?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Frontend interface with populated relations and computed fields
export interface Internship {
  id: string;
  title: string;
  company: Company;
  normalizedRole: InternshipRole;
  location: string;
  isRemote: boolean;
  workType: WorkType;
  skills: string[];
  eligibilityYear: EligibilityYear[];
  internshipCycle: string;
  postedAt: string; // ISO string from API
  applicationDeadline?: string; // ISO string from API
  applicationUrl: string;
  description: string;
  source: Source;
  isProgramSpecific: boolean;
  relevantMajors: BachelorMajor[];
}

export interface FilterState {
  roles: InternshipRole[];
  majors: BachelorMajor[];
  locations: string[];
  isRemote?: boolean;
  workType: WorkType[];
  eligibilityYear: EligibilityYear[];
  internshipCycle: string[];
  postedWithin?: 'day' | 'week' | 'month';
  showProgramSpecific?: boolean;
}

export interface RawInternshipData {
  source: string;
  sourceType: InternshipSourceType;
  url: string;
  title: string;
  company: string;
  description: string;
  location?: string;
  postedAt?: string;
  applicationUrl?: string;
  applicationDeadline?: string;
  internshipCycle?: string;
  eligibilityYear?: string;
  rawPayload: Record<string, unknown>;
}

export interface NormalizedInternship {
  id: string;
  title: string;
  company: string;
  normalizedRole: InternshipRole;
  relevantMajors: BachelorMajor[];
  location: string;
  isRemote: boolean;
  workType: WorkType;
  skills: string[];
  eligibilityYear: EligibilityYear[];
  internshipCycle: string;
  postedAt: Date;
  applicationDeadline?: Date;
  applicationUrl: string;
  description: string;
  source: string;
  sourceType: InternshipSourceType;
  canonicalHash: string;
  isProgramSpecific: boolean;
}

// API Response Types
export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type InternshipListResponse = PaginatedResponse<Internship>;

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

// Search and Query Types
export interface SearchParams {
  query?: string;
  roles?: InternshipRole[];
  majors?: BachelorMajor[];
  locations?: string[];
  isRemote?: boolean;
  workType?: WorkType[];
  eligibilityYear?: EligibilityYear[];
  internshipCycle?: string[];
  postedWithin?: 'day' | 'week' | 'month';
  showProgramSpecific?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'posted_at' | 'title' | 'company' | 'deadline';
  sortOrder?: 'asc' | 'desc';
}

// Ingestion and Processing Types
export interface IngestionJob {
  id: string;
  source_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  internships_found: number;
  internships_processed: number;
  internships_created: number;
  internships_updated: number;
}

export interface IngestionMetrics {
  total_sources: number;
  active_sources: number;
  last_run_at?: string;
  total_internships: number;
  new_internships_today: number;
  error_rate: number;
  avg_response_time: number;
}

// Table and UI Types
export interface TableColumn<T> {
  id: keyof T;
  header: string;
  accessorKey: keyof T;
  sortable?: boolean;
  filterable?: boolean;
  width?: number;
}

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Type guards
export const isInternshipRole = (value: string): value is InternshipRole => {
  return Object.values(InternshipRole).includes(value as InternshipRole);
};

export const isWorkType = (value: string): value is WorkType => {
  return Object.values(WorkType).includes(value as WorkType);
};

export const isEligibilityYear = (value: string): value is EligibilityYear => {
  return Object.values(EligibilityYear).includes(value as EligibilityYear);
};

export const isBachelorMajor = (value: string): value is BachelorMajor => {
  return BACHELOR_MAJORS.includes(value as BachelorMajor);
};

// Type inference helpers
export type InferZodType<T> = T extends z.ZodType<infer U> ? U : never;

// Export Zod schema types
export type CompanyType = z.infer<typeof CompanySchema>;
export type SourceSchemaType = z.infer<typeof SourceSchema>;
export type RawInternshipDataType = z.infer<typeof RawInternshipDataSchema>;
export type FilterStateType = z.infer<typeof FilterStateSchema>;
export type InternshipRowType = z.infer<typeof InternshipSchema>;