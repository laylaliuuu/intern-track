// API endpoint to test Exa.ai integration
import { NextRequest, NextResponse } from 'next/server';
import { exaClient } from '../../../lib/exa-client';
import { dataFetcher } from '../../../services/data-fetcher';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testType = searchParams.get('type') || 'health';

    switch (testType) {
      case 'health':
        const isHealthy = await exaClient.healthCheck();
        return NextResponse.json({
          success: true,
          healthy: isHealthy,
          message: isHealthy ? 'Exa.ai API is working' : 'Exa.ai API is not responding'
        });

      case 'search':
        const query = searchParams.get('query') || 'software engineering internship';
        const results = await exaClient.search({
          query,
          numResults: 3,
          includeText: true,
          includeSummary: true
        });
        
        return NextResponse.json({
          success: true,
          query,
          resultsCount: results.results.length,
          results: results.results.map(r => ({
            title: r.title,
            url: r.url,
            score: r.score,
            summary: r.summary?.substring(0, 200) + '...'
          }))
        });

      case 'fetch':
        const fetchResults = await dataFetcher.fetchInternships({
          maxResults: 5,
          companies: ['Google', 'Microsoft'],
          includePrograms: true
        });

        return NextResponse.json({
          success: true,
          sources: fetchResults.length,
          totalInternships: fetchResults.reduce((sum, r) => sum + r.data.length, 0),
          results: fetchResults.map(r => ({
            source: r.source,
            count: r.data.length,
            errors: r.errors,
            metadata: r.metadata,
            sampleData: r.data.slice(0, 2).map(d => ({
              title: d.title,
              company: d.company,
              location: d.location,
              url: d.url
            }))
          }))
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid test type. Use: health, search, or fetch'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Exa test API error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, numResults = 5, includeDomains } = body;

    if (!query) {
      return NextResponse.json({
        success: false,
        error: 'Query is required'
      }, { status: 400 });
    }

    const results = await exaClient.searchInternships({
      role: query,
      numResults,
      includeDomains
    });

    return NextResponse.json({
      success: true,
      query,
      resultsCount: results.results.length,
      results: results.results.map(r => ({
        id: r.id,
        title: r.title,
        url: r.url,
        score: r.score,
        publishedDate: r.publishedDate,
        summary: r.summary
      }))
    });

  } catch (error) {
    console.error('Exa search API error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}