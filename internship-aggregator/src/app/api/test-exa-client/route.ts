// Test our updated ExaClient
import { NextRequest, NextResponse } from 'next/server';
import { exaClient } from '../../../lib/exa-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testType = searchParams.get('type') || 'search';

    switch (testType) {
      case 'search':
        console.log('Testing ExaClient.search()');
        const searchResult = await exaClient.search({
          query: 'software engineering internship',
          numResults: 3,
          includeText: true,
          includeHighlights: true,
          includeSummary: true,
          includeDomains: ['careers.google.com', 'careers.microsoft.com']
        });

        return NextResponse.json({
          success: true,
          method: 'search',
          resultCount: searchResult.results.length,
          results: searchResult.results.map(r => ({
            title: r.title,
            url: r.url,
            score: r.score,
            hasText: !!r.text,
            hasHighlights: !!r.highlights,
            hasSummary: !!r.summary,
            textPreview: r.text?.substring(0, 150) + '...'
          })),
          requestId: searchResult.requestId
        });

      case 'internships':
        console.log('Testing ExaClient.searchInternships()');
        const internshipResult = await exaClient.searchInternships({
          role: 'software engineering',
          company: 'Google',
          numResults: 3
        });

        return NextResponse.json({
          success: true,
          method: 'searchInternships',
          resultCount: internshipResult.results.length,
          results: internshipResult.results.map(r => ({
            title: r.title,
            url: r.url,
            score: r.score,
            publishedDate: r.publishedDate,
            hasText: !!r.text,
            textPreview: r.text?.substring(0, 150) + '...'
          })),
          requestId: internshipResult.requestId
        });

      case 'health':
        console.log('Testing ExaClient.healthCheck()');
        const isHealthy = await exaClient.healthCheck();
        
        return NextResponse.json({
          success: true,
          method: 'healthCheck',
          healthy: isHealthy
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid test type. Use: search, internships, or health'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('ExaClient test error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}