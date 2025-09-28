// Scheduled ingestion worker (can be triggered by cron services like Vercel Cron)
import { NextRequest, NextResponse } from 'next/server';
import { ingestionService } from '../../../../services/ingestion-service';

// This endpoint can be called by external cron services or Vercel Cron
export async function POST(request: NextRequest) {
  try {
    // Verify the request is from an authorized source
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { 
      type = 'full',
      companies = ['Google', 'Microsoft', 'Meta', 'Apple', 'Amazon', 'Netflix', 'Tesla'],
      maxResults = 100
    } = body;

    console.log(`Scheduled ingestion started: ${type}`);
    const startTime = Date.now();

    let result;

    switch (type) {
      case 'full':
        // Full ingestion with all sources
        result = await ingestionService.ingest({
          companies,
          maxResults,
          includePrograms: true,
          skipDuplicates: true,
          batchSize: 50
        });
        break;

      case 'companies':
        // Company-specific ingestion only
        result = await ingestionService.ingestCompanies(companies, {
          maxResults: Math.floor(maxResults / 2),
          skipDuplicates: true
        });
        break;

      case 'diversity':
        // Diversity programs only
        result = await ingestionService.ingestDiversityPrograms({
          maxResults: 30,
          skipDuplicates: true
        });
        break;

      default:
        return NextResponse.json({
          success: false,
          error: `Invalid ingestion type: ${type}`
        }, { status: 400 });
    }

    const executionTime = Date.now() - startTime;
    
    // Log results
    console.log(`Scheduled ingestion completed: ${type}`, {
      success: result.success,
      fetched: result.fetchResults.reduce((sum, r) => sum + r.data.length, 0),
      normalized: result.normalizationMetrics.successful,
      inserted: result.databaseMetrics.inserted,
      updated: result.databaseMetrics.updated,
      errors: result.errors.length,
      executionTime
    });

    // Store ingestion job record
    await logIngestionJob({
      type,
      success: result.success,
      metrics: {
        fetched: result.fetchResults.reduce((sum, r) => sum + r.data.length, 0),
        normalized: result.normalizationMetrics.successful,
        inserted: result.databaseMetrics.inserted,
        updated: result.databaseMetrics.updated,
        errors: result.errors.length
      },
      executionTime,
      errors: result.errors
    });

    return NextResponse.json({
      success: result.success,
      type,
      summary: {
        fetched: result.fetchResults.reduce((sum, r) => sum + r.data.length, 0),
        normalized: result.normalizationMetrics.successful,
        inserted: result.databaseMetrics.inserted,
        updated: result.databaseMetrics.updated,
        skipped: result.databaseMetrics.skipped,
        errors: result.errors.length,
        executionTime
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Scheduled ingestion failed:', error);
    
    // Log failed job
    await logIngestionJob({
      type: 'unknown',
      success: false,
      metrics: { fetched: 0, normalized: 0, inserted: 0, updated: 0, errors: 1 },
      executionTime: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    });

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// GET endpoint for health checks and status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'status';

    switch (action) {
      case 'status':
        // Return ingestion service status
        const health = await ingestionService.healthCheck();
        
        return NextResponse.json({
          success: true,
          status: 'ready',
          health,
          timestamp: new Date().toISOString()
        });

      case 'history':
        // Return recent ingestion history (if we implement job logging)
        return NextResponse.json({
          success: true,
          message: 'Job history not yet implemented',
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to log ingestion jobs (could be expanded to use database)
async function logIngestionJob(job: {
  type: string;
  success: boolean;
  metrics: {
    fetched: number;
    normalized: number;
    inserted: number;
    updated: number;
    errors: number;
  };
  executionTime: number;
  errors: string[];
}) {
  // For now, just console log. In production, you'd want to store this in a database
  console.log('Ingestion Job Log:', {
    ...job,
    timestamp: new Date().toISOString()
  });

  // TODO: Store in ingestion_jobs table
  // const { error } = await supabase.from('ingestion_jobs').insert({
  //   type: job.type,
  //   status: job.success ? 'completed' : 'failed',
  //   metrics: job.metrics,
  //   execution_time: job.executionTime,
  //   error_messages: job.errors,
  //   created_at: new Date().toISOString()
  // });
}