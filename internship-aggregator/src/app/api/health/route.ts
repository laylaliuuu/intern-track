import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();
    
    // Check database connectivity
    const { data, error } = await supabase
      .from('internships')
      .select('count')
      .limit(1);
    
    const dbHealthy = !error;
    const responseTime = Date.now() - startTime;
    
    const healthStatus = {
      status: dbHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        database: {
          status: dbHealthy ? 'up' : 'down',
          responseTime: `${responseTime}ms`,
          error: error?.message || null
        }
      }
    };
    
    return NextResponse.json(healthStatus, {
      status: dbHealthy ? 200 : 503
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}