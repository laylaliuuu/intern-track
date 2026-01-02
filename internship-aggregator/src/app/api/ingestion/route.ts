// API endpoint for manual ingestion triggers
import { NextRequest, NextResponse } from 'next/server';
import { ingestionService } from '../../../services/ingestion-service';
import { asyncHandler, ValidationError } from '../../../lib/error-handling';
import { logger } from '../../../lib/logger';

export const POST = asyncHandler(async (request: Request) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const reqLogger = logger.withContext({ requestId, component: 'api' });
  
  const body = await request.json();
    const {
      companies,
      maxResults = 50,
      includePrograms = true,
      dryRun = false,
      skipDuplicates = true,
      batchSize = 25
    } = body;

    // Validate parameters
    if (maxResults < 1 || maxResults > 1000) {
      throw new ValidationError('maxResults must be between 1 and 1000', { maxResults });
    }
    if (batchSize < 1 || batchSize > 100) {
      throw new ValidationError('batchSize must be between 1 and 100', { batchSize });
    }

    reqLogger.info('Manual ingestion triggered', {
      action: 'manual_ingestion_start',
      metadata: {
        companies: companies?.length || 'all',
        maxResults,
        includePrograms,
        dryRun,
      },
    });

    const result = await ingestionService.ingest({
      companies,
      maxResults,
      includePrograms,
      dryRun,
      skipDuplicates,
      batchSize
    });

    reqLogger.info('Manual ingestion completed', {
      action: 'manual_ingestion_success',
      metadata: {
        fetched: result.fetchResults.reduce((sum, r) => sum + r.data.length, 0),
        normalized: result.normalizationMetrics.successful,
        inserted: result.databaseMetrics.inserted,
        executionTime: result.executionTime,
      },
    });

    reqLogger.info('Ingestion completed successfully', { action: 'ingestion_complete' });

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
});

export const GET = asyncHandler(async (request: Request) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const reqLogger = logger.withContext({ requestId, component: 'api' });
  
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
        const maxResultsParam = searchParams.get('maxResults');
        const maxResults = maxResultsParam ? parseInt(maxResultsParam) : 200; // Increased default from 30 to 200
        
        const result = await ingestionService.ingestCompanies(companies, {
          maxResults,
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
        throw new ValidationError('Invalid action. Use: health, companies, or diversity', { action });
    }
});