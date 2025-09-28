// API endpoint for manual ingestion triggers
import { NextRequest, NextResponse } from 'next/server';
import { ingestionService } from '../../../services/ingestion-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      companies,
      maxResults = 50,
      includePrograms = true,
      dryRun = false,
      skipDuplicates = true,
      batchSize = 25
    } = body;

    console.log('Manual ingestion triggered:', {
      companies: companies?.length || 'all',
      maxResults,
      includePrograms,
      dryRun
    });

    const result = await ingestionService.ingest({
      companies,
      maxResults,
      includePrograms,
      dryRun,
      skipDuplicates,
      batchSize
    });

    return NextResponse.json({
      success: result.success,
      summary: {
        fetched: result.fetchResults.reduce((sum, r) => sum + r.data.length, 0),
        normalized: result.normalizationMetrics.successful,
        inserted: result.databaseMetrics.inserted,
        updated: result.databaseMetrics.updated,
        skipped: result.databaseMetrics.skipped,
        errors: result.errors.length,
        executionTime: result.executionTime
      },
      details: {
        fetchResults: result.fetchResults.map(r => ({
          source: r.source,
          count: r.data.length,
          errors: r.errors,
          metadata: r.metadata
        })),
        normalizationMetrics: result.normalizationMetrics,
        databaseMetrics: result.databaseMetrics,
        errors: result.errors
      }
    });

  } catch (error) {
    console.error('Ingestion API error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'health':
        const health = await ingestionService.healthCheck();
        return NextResponse.json({
          success: true,
          health
        });

      case 'companies':
        // Trigger company-specific ingestion
        const companiesParam = searchParams.get('companies');
        const companies = companiesParam ? companiesParam.split(',') : ['Google', 'Microsoft', 'Meta', 'Apple', 'Amazon'];
        
        const result = await ingestionService.ingestCompanies(companies, {
          maxResults: 30,
          dryRun: searchParams.get('dryRun') === 'true'
        });

        return NextResponse.json({
          success: result.success,
          companies,
          summary: {
            fetched: result.fetchResults.reduce((sum, r) => sum + r.data.length, 0),
            normalized: result.normalizationMetrics.successful,
            inserted: result.databaseMetrics.inserted,
            executionTime: result.executionTime
          }
        });

      case 'diversity':
        // Trigger diversity programs ingestion
        const diversityResult = await ingestionService.ingestDiversityPrograms({
          maxResults: 20,
          dryRun: searchParams.get('dryRun') === 'true'
        });

        return NextResponse.json({
          success: diversityResult.success,
          summary: {
            fetched: diversityResult.fetchResults.reduce((sum, r) => sum + r.data.length, 0),
            normalized: diversityResult.normalizationMetrics.successful,
            inserted: diversityResult.databaseMetrics.inserted,
            executionTime: diversityResult.executionTime
          }
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use: health, companies, or diversity'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Ingestion GET API error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}