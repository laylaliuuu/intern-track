import { NextRequest, NextResponse } from 'next/server';
import { exaClient } from '@/lib/exa-client';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing Exa.ai with simple query...');
    
    // Test 1: Simple search
    const simpleResults = await exaClient.search({
      query: 'software engineer internship summer 2026',
      type: 'neural',
      numResults: 3,
      includeText: true,
      includeSummary: true
    });
    
    console.log(`✅ Simple search returned ${simpleResults.results.length} results`);
    
    // Test 2: Role-based search
    const roleResults = await exaClient.searchByRole('software engineer', {
      cycle: 'summer 2026',
      numResults: 3
    });
    
    console.log(`✅ Role search returned ${roleResults.results.length} results`);
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      tests: {
        simpleSearch: {
          query: 'software engineer internship summer 2026',
          results: simpleResults.results.length,
          sampleResults: simpleResults.results.slice(0, 2).map(r => ({
            title: r.title,
            url: r.url,
            score: r.score,
            domain: new URL(r.url).hostname
          }))
        },
        roleSearch: {
          role: 'software engineer',
          cycle: 'summer 2026',
          results: roleResults.results.length,
          sampleResults: roleResults.results.slice(0, 2).map(r => ({
            title: r.title,
            url: r.url,
            score: r.score,
            domain: new URL(r.url).hostname
          }))
        }
      },
      summary: {
        totalResults: simpleResults.results.length + roleResults.results.length,
        exaWorking: simpleResults.results.length > 0 || roleResults.results.length > 0
      }
    });
    
  } catch (error) {
    console.error('❌ Exa.ai test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}


