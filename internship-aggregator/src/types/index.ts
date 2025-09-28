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

export interface Internship {
  id: string;
  title: string;
  company: Company;
  normalizedRole: InternshipRole;
  location: string;
  isRemote: boolean;
  workType: 'paid' | 'unpaid' | 'unknown';
  skills: string[];
  eligibilityYear: string[];
  internshipCycle: string;
  postedAt: Date;
  applicationDeadline?: Date;
  applicationUrl: string;
  description: string;
  source: Source;
  timeAgo: string;
  isProgramSpecific: boolean;
  deadlineCountdown?: string;
}

export interface FilterState {
  roles: InternshipRole[];
  majors: string[];
  locations: string[];
  isRemote?: boolean;
  workType: ('paid' | 'unpaid')[];
  eligibilityYear: string[];
  internshipCycle: string[];
  postedWithin: 'day' | 'week' | 'month';
  showProgramSpecific?: boolean;
}

export interface RawInternshipData {
  source: string;
  sourceType: 'company_career_page' | 'program_page' | 'api_feed';
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
  relevantMajors: string[];
  location: string;
  isRemote: boolean;
  workType: 'paid' | 'unpaid' | 'unknown';
  skills: string[];
  eligibilityYear: string[];
  internshipCycle: string;
  postedAt: Date;
  applicationDeadline?: Date;
  applicationUrl: string;
  description: string;
  source: string;
  sourceType: 'company_career_page' | 'program_page' | 'api_feed';
  canonicalHash: string;
  isProgramSpecific: boolean;
}