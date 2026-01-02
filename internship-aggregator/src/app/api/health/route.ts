import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { exaClient } from '../../../lib/exa-client';
import { exaCircuitBreaker } from '../../../lib/circuit-breaker';
import { dataFetcher } from '../../../services/data-fetcher';

// Optional imports - only load if API keys are available
let serperClient: any = null;
let tavilyClient: any = null;

try {
  if (process.env.SERPER_API_KEY) {
    const { serperClient: SerperClient } = require('../../../lib/serper-client');
    serperClient = SerperClient;
  }
} catch (error) {
  console.log('Serper API not available:', error);
}

try {
  if (process.env.TAVILY_API_KEY) {
    const { tavilyClient: TavilyClient } = require('../../../lib/tavily-client');
    tavilyClient = TavilyClient;
  }
} catch (error) {
  console.log('Tavily API not available:', error);
}

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();
    
    // Check database connectivity
    const { data: internshipCount, error: internshipError } = await supabase
      .from('internships')
      .select('count', { count: 'exact' });
    
    const { data: companyCount, error: companyError } = await supabase
      .from('companies')
      .select('count', { count: 'exact' });

    const { data: sourceCount, error: sourceError } = await supabase
      .from('sources')
      .select('count', { count: 'exact' });

    const dbHealthy = !internshipError && !companyError && !sourceError;
    const responseTime = Date.now() - startTime;
    
    // Check data sources health
    const dataSourceHealth = await dataFetcher.healthCheck();
    
    // Check API sources
    const exaHealthy = await exaClient.healthCheck();
    const serperHealthy = serperClient ? await serperClient.healthCheck() : false;
    const tavilyHealthy = tavilyClient ? await tavilyClient.healthCheck() : false;
    
    // Get circuit breaker status
    const circuitBreakerMetrics = exaCircuitBreaker.getMetrics();
    
    // Get 2026 internship count
    const { data: internships2026, error: error2026 } = await supabase
      .from('internships')
      .select('count', { count: 'exact' })
      .like('title', '%2026%');
    
    const healthStatus = {
      status: dbHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      responseTime: `${responseTime}ms`,
      database: {
        status: dbHealthy ? 'up' : 'down',
        responseTime: `${responseTime}ms`,
        metrics: {
          totalInternships: internshipCount?.[0]?.count || 0,
          totalCompanies: companyCount?.[0]?.count || 0,
          totalSources: sourceCount?.[0]?.count || 0,
          internships2026: internships2026?.[0]?.count || 0
        },
        errors: {
          internships: internshipError?.message || null,
          companies: companyError?.message || null,
          sources: sourceError?.message || null,
          internships2026: error2026?.message || null
        }
      },
      dataSources: {
        github: {
          status: dataSourceHealth.github ? 'up' : 'down',
          type: 'scraper',
          cost: '$0/month',
          description: 'GitHub curated lists (primary source)'
        },
        exa: {
          status: exaHealthy ? 'up' : 'down',
          type: 'api',
          cost: '~$50/month',
          description: 'Exa.ai neural search',
          circuitBreaker: {
            state: circuitBreakerMetrics.state,
            failureRate: `${(circuitBreakerMetrics.failureRate * 100).toFixed(1)}%`,
            totalRequests: circuitBreakerMetrics.requestCount,
            failures: circuitBreakerMetrics.failureCount
          }
        },
        serper: {
          status: serperHealthy ? 'up' : 'down',
          type: 'api',
          cost: '~$50/month',
          description: 'Google Search via Serper (fallback)'
        },
        tavily: {
          status: tavilyHealthy ? 'up' : 'down',
          type: 'api',
          cost: 'Free tier + $8/1k requests',
          description: 'Tavily AI for diversity programs'
        }
      },
      overall: {
        totalSources: 4,
        healthySources: [exaHealthy, serperHealthy, tavilyHealthy, dataSourceHealth.github].filter(Boolean).length,
        primarySource: 'GitHub Scraper',
        fallbackSources: ['Exa.ai', 'Serper API', 'Tavily AI'],
        targetYear: '2026',
        lastUpdated: new Date().toISOString()
      }
    };
    
    const overallHealthy = dbHealthy && (exaHealthy || serperHealthy || tavilyHealthy || dataSourceHealth.github);
    
    return NextResponse.json(healthStatus, {
      status: overallHealthy ? 200 : 503
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
    }, { status: 500 });
  }
}