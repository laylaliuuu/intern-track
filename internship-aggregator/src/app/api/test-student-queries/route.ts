// Test your brilliant student-focused query approach
import { NextRequest, NextResponse } from 'next/server';
import { exaClient } from '../../../lib/exa-client';

export async function GET(request: NextRequest) {
  try {
    console.log('🎓 Testing student-focused queries...');
    
    // Test your exact suggestions
    const studentQueries = [
      'sophomore internship summer 2026',
      'freshman internship summer 2026',
      'junior summer internship'
    ];

    const results = [];
    
    for (const query of studentQueries) {
      try {
        console.log(`🔍 Testing: "${query}"`);
        const result = await exaClient.search({
          query,
          type: 'neural',
          useAutoprompt: true,
          numResults: 3, // Very small for testing
          includeText: true,
          includeSummary: true,
          startPublishedDate: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString(),
        });

        results.push({
          query,
          count: result.results.length,
          sample: result.results.slice(0, 1).map(r => ({
            title: r.title,
            url: r.url,
            score: r.score
          }))
        });
        
        console.log(`✅ "${query}": ${result.results.length} results`);
        
        // Small delay between queries
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Failed "${query}":`, error);
        results.push({
          query,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Student-focused query test completed',
      results,
      totalQueries: studentQueries.length
    });
  } catch (error) {
    console.error('Student query test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}


