// Database types for Supabase integration
import { InternshipRole, WorkType, InternshipSourceType, EligibilityYear, BachelorMajor } from './index';

// Database table types (matching Supabase schema)
export interface DatabaseInternship {
  id: string;
  title: string;
  company_id: string;
  source_id: string;
  url: string;
  application_url?: string;
  description?: string;
  location?: string;
  is_remote: boolean;
  work_type: WorkType;
  posted_at: string; // ISO string
  application_deadline?: string; // ISO string
  normalized_role?: InternshipRole;
  relevant_majors?: BachelorMajor[];
  skills?: string[];
  eligibility_year?: EligibilityYear[];
  internship_cycle?: string;
  is_program_specific: boolean;
  source_type: InternshipSourceType;
  canonical_hash: string;
  is_archived: boolean;
  raw_payload?: Record<string, unknown>;
  // New quality fields
  graduation_year?: string[];
  exact_role?: string;
  requirements?: string;
  pay_rate_min?: number;
  pay_rate_max?: number;
  pay_rate_currency?: string;
  pay_rate_type?: 'hourly' | 'salary' | 'stipend' | 'unpaid' | 'unknown';
  created_at: string; // ISO string
  updated_at: string; // ISO string
}

// Insert types (for creating new records)
export interface InsertInternship {
  title: string;
  company_id: string;
  source_id: string;
  url: string;
  application_url?: string;
  description?: string;
  location?: string;
  is_remote: boolean;
  work_type: WorkType;
  posted_at: string; // ISO string
  application_deadline?: string; // ISO string
  normalized_role?: InternshipRole;
  relevant_majors?: BachelorMajor[];
  skills?: string[];
  eligibility_year?: EligibilityYear[];
  internship_cycle?: string;
  is_program_specific: boolean;
  source_type: InternshipSourceType;
  canonical_hash: string;
  is_archived: boolean;
  raw_payload?: Record<string, unknown>;
  // New quality fields
  graduation_year?: string[];
  exact_role?: string;
  requirements?: string;
  pay_rate_min?: number;
  pay_rate_max?: number;
  pay_rate_currency?: string;
  pay_rate_type?: 'hourly' | 'salary' | 'stipend' | 'unpaid' | 'unknown';
}

// Company types
export interface DatabaseCompany {
  id: string;
  name: string;
  domain?: string;
  linkedin_url?: string;
  logo_url?: string;
  created_at: string;
}

export interface InsertCompany {
  name: string;
  domain?: string;
  linkedin_url?: string;
  logo_url?: string;
}

// Source types
export interface DatabaseSource {
  id: string;
  name: string;
  type: 'api' | 'scrape' | 'manual';
  base_url?: string;
  is_active: boolean;
  last_checked?: string;
  error_count: number;
  created_at: string;
}

export interface InsertSource {
  name: string;
  type: 'api' | 'scrape' | 'manual';
  base_url?: string;
  is_active?: boolean;
  last_checked?: string;
  error_count?: number;
}
