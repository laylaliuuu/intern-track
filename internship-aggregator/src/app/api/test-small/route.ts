// Small test endpoint to avoid using too many credits
import { NextRequest, NextResponse } from 'next/server';
import { exaClient } from '../../../lib/exa-client';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Running small test with minimal credits...');
    
    // Test with just 1 query to verify Exa is working
    const result = await exaClient.search({
      query: 'software engineer internship summer 2026',
      type: 'neural',
      useAutoprompt: true,
      numResults: 5, // Very small number
      includeText: true,
      includeSummary: true,
      startPublishedDate: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Small test successful',
      results: result.results.length,
      sample: result.results.slice(0, 2).map(r => ({
        title: r.title,
        url: r.url,
        score: r.score
      }))
    });
  } catch (error) {
    console.error('Small test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}


