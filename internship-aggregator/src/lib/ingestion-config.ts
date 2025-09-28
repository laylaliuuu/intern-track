// Configuration for ingestion scheduling and settings
export interface IngestionSchedule {
  name: string;
  type: 'full' | 'companies' | 'diversity';
  cron: string; // Cron expression
  enabled: boolean;
  companies?: string[];
  maxResults: number;
  description: string;
}

export interface IngestionConfig {
  schedules: IngestionSchedule[];
  defaults: {
    batchSize: number;
    maxRetries: number;
    retryDelay: number;
    timeout: number;
  };
  companies: {
    tier1: string[]; // High-priority companies
    tier2: string[]; // Medium-priority companies
    tier3: string[]; // Lower-priority companies
  };
  rateLimits: {
    exaApi: number;
    concurrent: number;
  };
}

export const INGESTION_CONFIG: IngestionConfig = {
  schedules: [
    {
      name: 'Daily Full Ingestion',
      type: 'full',
      cron: '0 6 * * *', // 6 AM daily
      enabled: false, // Disabled by default to save costs
      maxResults: 50, // Reduced from 200 to save costs
      description: 'Complete ingestion of all sources and companies'
    },
    {
      name: 'Tier 1 Companies - Twice Daily',
      type: 'companies',
      cron: '0 6,18 * * *', // 6 AM and 6 PM daily
      enabled: false, // Disabled by default to save costs
      companies: ['Google', 'Microsoft', 'Meta', 'Apple', 'Amazon'],
      maxResults: 25, // Reduced from 100 to save costs
      description: 'High-priority companies ingestion'
    },
    {
      name: 'Diversity Programs - Weekly',
      type: 'diversity',
      cron: '0 8 * * 1', // 8 AM every Monday
      enabled: true,
      maxResults: 50,
      description: 'Weekly diversity and inclusion programs update'
    },
    {
      name: 'Tier 2 Companies - Daily',
      type: 'companies',
      cron: '0 12 * * *', // 12 PM daily
      enabled: true,
      companies: ['Netflix', 'Tesla', 'Uber', 'Airbnb', 'Spotify', 'Stripe'],
      maxResults: 60,
      description: 'Medium-priority companies ingestion'
    },
    {
      name: 'Financial Services - Daily',
      type: 'companies',
      cron: '0 14 * * *', // 2 PM daily
      enabled: true,
      companies: ['JPMorgan Chase', 'Goldman Sachs', 'Morgan Stanley', 'BlackRock', 'Citadel'],
      maxResults: 40,
      description: 'Financial services companies ingestion'
    }
  ],
  defaults: {
    batchSize: 50,
    maxRetries: 3,
    retryDelay: 5000, // 5 seconds
    timeout: 300000, // 5 minutes
  },
  companies: {
    tier1: [
      'Google',
      'Microsoft',
      'Meta',
      'Apple',
      'Amazon',
      'Netflix',
      'Tesla'
    ],
    tier2: [
      'Uber',
      'Airbnb',
      'Spotify',
      'Stripe',
      'Palantir',
      'Databricks',
      'Snowflake',
      'Figma',
      'Notion',
      'Discord'
    ],
    tier3: [
      'JPMorgan Chase',
      'Goldman Sachs',
      'Morgan Stanley',
      'BlackRock',
      'Citadel',
      'McKinsey & Company',
      'Boston Consulting Group',
      'Bain & Company',
      'Deloitte',
      'PwC'
    ]
  },
  rateLimits: {
    exaApi: 3, // 3 concurrent requests to Exa.ai
    concurrent: 5 // 5 concurrent ingestion processes max
  }
};

// Helper functions for schedule management
export function getEnabledSchedules(): IngestionSchedule[] {
  return INGESTION_CONFIG.schedules.filter(schedule => schedule.enabled);
}

export function getScheduleByName(name: string): IngestionSchedule | undefined {
  return INGESTION_CONFIG.schedules.find(schedule => schedule.name === name);
}

export function getAllCompanies(): string[] {
  const { tier1, tier2, tier3 } = INGESTION_CONFIG.companies;
  return [...tier1, ...tier2, ...tier3];
}

export function getCompaniesByTier(tier: 'tier1' | 'tier2' | 'tier3'): string[] {
  return INGESTION_CONFIG.companies[tier];
}

// Cron expression helpers
export function parseCronExpression(cron: string): {
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
} {
  const parts = cron.split(' ');
  if (parts.length !== 5) {
    throw new Error('Invalid cron expression');
  }

  return {
    minute: parts[0],
    hour: parts[1],
    dayOfMonth: parts[2],
    month: parts[3],
    dayOfWeek: parts[4]
  };
}

export function getNextRunTime(cron: string): Date {
  // This is a simplified implementation
  // In production, you'd use a proper cron parser like 'node-cron' or 'cron-parser'
  const now = new Date();
  const { hour, minute } = parseCronExpression(cron);
  
  const nextRun = new Date(now);
  nextRun.setHours(parseInt(hour), parseInt(minute), 0, 0);
  
  // If the time has passed today, schedule for tomorrow
  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1);
  }
  
  return nextRun;
}

// Environment-specific configuration
export function getIngestionConfigForEnvironment(): Partial<IngestionConfig> {
  const env = process.env.NODE_ENV;
  
  switch (env) {
    case 'development':
      return {
        defaults: {
          ...INGESTION_CONFIG.defaults,
          batchSize: 5, // Very small batches for development to save costs
          timeout: 60000 // 1 minute timeout
        },
        schedules: INGESTION_CONFIG.schedules.map(schedule => ({
          ...schedule,
          maxResults: Math.min(schedule.maxResults, 5), // Very limited results in dev to save costs
          enabled: false // Disable automatic scheduling in dev
        }))
      };
      
    case 'production':
      return INGESTION_CONFIG;
      
    default:
      return INGESTION_CONFIG;
  }
}