// Application constants and configuration
import { InternshipRole, WorkType } from '../types';

// Role mappings for normalization
export const ROLE_KEYWORDS: Record<InternshipRole, string[]> = {
  [InternshipRole.SOFTWARE_ENGINEERING]: [
    'software engineer', 'software developer', 'full stack', 'frontend', 'backend', 
    'web developer', 'mobile developer', 'ios developer', 'android developer',
    'devops', 'sre', 'platform engineer', 'infrastructure engineer'
  ],
  [InternshipRole.PRODUCT_MANAGEMENT]: [
    'product manager', 'product management', 'pm intern', 'product owner',
    'product strategy', 'product marketing', 'growth product'
  ],
  [InternshipRole.DATA_SCIENCE]: [
    'data scientist', 'data science', 'machine learning', 'ml engineer',
    'data analyst', 'analytics', 'ai engineer', 'artificial intelligence',
    'data engineer', 'business intelligence'
  ],
  [InternshipRole.QUANTITATIVE_RESEARCH]: [
    'quantitative research', 'quant', 'quantitative analyst', 'quant developer',
    'algorithmic trading', 'risk management', 'derivatives', 'fixed income'
  ],
  [InternshipRole.BUSINESS_ANALYST]: [
    'business analyst', 'strategy analyst', 'operations analyst',
    'consulting analyst', 'financial analyst', 'investment analyst'
  ],
  [InternshipRole.DESIGN]: [
    'ux designer', 'ui designer', 'product designer', 'visual designer',
    'interaction designer', 'user experience', 'user interface', 'design'
  ],
  [InternshipRole.MARKETING]: [
    'marketing', 'digital marketing', 'content marketing', 'social media',
    'brand marketing', 'performance marketing', 'marketing analyst'
  ],
  [InternshipRole.FINANCE]: [
    'finance', 'financial analyst', 'investment banking', 'corporate finance',
    'treasury', 'fp&a', 'financial planning', 'accounting'
  ],
  [InternshipRole.CONSULTING]: [
    'consultant', 'consulting', 'strategy consulting', 'management consulting',
    'business consulting', 'technology consulting'
  ],
  [InternshipRole.RESEARCH]: [
    'research', 'researcher', 'research scientist', 'research engineer',
    'lab research', 'academic research', 'clinical research'
  ],
  [InternshipRole.OTHER]: []
};

// Major to role mappings
export const MAJOR_TO_ROLES: Record<string, InternshipRole[]> = {
  'Computer Science': [
    InternshipRole.SOFTWARE_ENGINEERING,
    InternshipRole.DATA_SCIENCE,
    InternshipRole.PRODUCT_MANAGEMENT,
    InternshipRole.QUANTITATIVE_RESEARCH
  ],
  'Software Engineering': [
    InternshipRole.SOFTWARE_ENGINEERING,
    InternshipRole.PRODUCT_MANAGEMENT
  ],
  'Computer Engineering': [
    InternshipRole.SOFTWARE_ENGINEERING,
    InternshipRole.DATA_SCIENCE
  ],
  'Electrical Engineering': [
    InternshipRole.SOFTWARE_ENGINEERING,
    InternshipRole.RESEARCH
  ],
  'Business': [
    InternshipRole.PRODUCT_MANAGEMENT,
    InternshipRole.BUSINESS_ANALYST,
    InternshipRole.CONSULTING,
    InternshipRole.MARKETING
  ],
  'Finance': [
    InternshipRole.FINANCE,
    InternshipRole.QUANTITATIVE_RESEARCH,
    InternshipRole.BUSINESS_ANALYST
  ],
  'Economics': [
    InternshipRole.FINANCE,
    InternshipRole.BUSINESS_ANALYST,
    InternshipRole.CONSULTING,
    InternshipRole.QUANTITATIVE_RESEARCH
  ],
  'Mathematics': [
    InternshipRole.DATA_SCIENCE,
    InternshipRole.QUANTITATIVE_RESEARCH,
    InternshipRole.RESEARCH
  ],
  'Statistics': [
    InternshipRole.DATA_SCIENCE,
    InternshipRole.BUSINESS_ANALYST,
    InternshipRole.RESEARCH
  ],
  'Data Science': [
    InternshipRole.DATA_SCIENCE,
    InternshipRole.BUSINESS_ANALYST
  ],
  'Information Systems': [
    InternshipRole.SOFTWARE_ENGINEERING,
    InternshipRole.BUSINESS_ANALYST,
    InternshipRole.PRODUCT_MANAGEMENT
  ],
  'Marketing': [
    InternshipRole.MARKETING,
    InternshipRole.BUSINESS_ANALYST
  ],
  'Psychology': [
    InternshipRole.DESIGN,
    InternshipRole.RESEARCH,
    InternshipRole.MARKETING
  ],
  'Communications': [
    InternshipRole.MARKETING,
    InternshipRole.BUSINESS_ANALYST
  ]
};

// Skills extraction keywords
export const SKILL_KEYWORDS = [
  // Programming Languages
  'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'go', 'rust', 'swift',
  'kotlin', 'scala', 'r', 'matlab', 'sql', 'html', 'css', 'php', 'ruby',
  
  // Frameworks and Libraries
  'react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask', 'spring',
  'tensorflow', 'pytorch', 'pandas', 'numpy', 'scikit-learn',
  
  // Tools and Technologies
  'git', 'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'jenkins', 'terraform',
  'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch',
  
  // Methodologies
  'agile', 'scrum', 'kanban', 'devops', 'ci/cd', 'tdd', 'microservices',
  
  // Business Skills
  'excel', 'powerpoint', 'tableau', 'power bi', 'salesforce', 'jira', 'confluence',
  'financial modeling', 'market research', 'project management'
];

// Program-specific keywords
export const PROGRAM_KEYWORDS = [
  'step', 'explore', 'code2040', 'colorstack', 'rewriting the code',
  'grace hopper', 'tapia', 'nsbe', 'shpe', 'out in tech',
  'first year', 'sophomore', 'early career', 'diversity',
  'underrepresented', 'women in tech', 'veterans'
];

// Location normalization
export const LOCATION_ALIASES: Record<string, string> = {
  'sf': 'San Francisco, CA',
  'bay area': 'San Francisco, CA',
  'silicon valley': 'San Francisco, CA',
  'nyc': 'New York, NY',
  'new york city': 'New York, NY',
  'la': 'Los Angeles, CA',
  'los angeles': 'Los Angeles, CA',
  'seattle': 'Seattle, WA',
  'boston': 'Boston, MA',
  'chicago': 'Chicago, IL',
  'austin': 'Austin, TX',
  'denver': 'Denver, CO',
  'atlanta': 'Atlanta, GA',
  'remote': 'Remote',
  'work from home': 'Remote',
  'distributed': 'Remote'
};

// Time constants
export const TIME_FILTERS = {
  day: 24 * 60 * 60 * 1000, // 1 day in milliseconds
  week: 7 * 24 * 60 * 60 * 1000, // 1 week in milliseconds
  month: 30 * 24 * 60 * 60 * 1000 // 30 days in milliseconds
};

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

// Cache durations (in seconds)
export const CACHE_DURATIONS = {
  internships: 300, // 5 minutes
  companies: 3600, // 1 hour
  sources: 3600, // 1 hour
  search: 60 // 1 minute
};

// API rate limits
export const RATE_LIMITS = {
  exa_api: 3, // 3 concurrent requests
  greenhouse: 2, // 2 concurrent requests
  lever: 2, // 2 concurrent requests
  workday: 1 // 1 concurrent request
};

// Validation constants
export const VALIDATION_LIMITS = {
  title: { min: 1, max: 200 },
  description: { min: 10, max: 5000 },
  company: { min: 1, max: 100 },
  location: { min: 1, max: 100 },
  skills: { max: 20 },
  majors: { max: 10 }
};

// Default filter state
export const DEFAULT_FILTER_STATE = {
  roles: [],
  majors: [],
  locations: [],
  workType: [WorkType.PAID],
  eligibilityYear: [],
  internshipCycle: [],
  postedWithin: 'week' as const,
  showProgramSpecific: false
};

// Sort options
export const SORT_OPTIONS = [
  { value: 'posted_at', label: 'Most Recent', order: 'desc' as const },
  { value: 'posted_at', label: 'Oldest First', order: 'asc' as const },
  { value: 'title', label: 'Title A-Z', order: 'asc' as const },
  { value: 'title', label: 'Title Z-A', order: 'desc' as const },
  { value: 'company', label: 'Company A-Z', order: 'asc' as const },
  { value: 'company', label: 'Company Z-A', order: 'desc' as const },
  { value: 'deadline', label: 'Deadline Soon', order: 'asc' as const }
];