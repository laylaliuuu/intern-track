// Test the fixed Exa.ai client
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.EXA_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'EXA_API_KEY not found'
      });
    }

    // Test the corrected format
    console.log('Testing corrected Exa.ai request format');
    
    const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const response = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        query: 'software engineering internship application deadline apply career opportunities students undergraduate',
        numResults: 5,
        type: 'neural',
        useAutoprompt: true,
        includeDomains: ['careers.google.com', 'careers.microsoft.com', 'careers.meta.com'],
        startPublishedDate: sixMonthsAgo,
        contents: {
          text: true,
          highlights: true,
          summary: true
        }
      }),
    });

    const data = await response.json();
    console.log('Fixed request result:', response.status, data);

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: data,
        status: response.status
      });
    }

    return NextResponse.json({
      success: true,
      status: response.status,
      resultCount: data.results?.length || 0,
      results: data.results?.slice(0, 2).map((r: any) => ({
        title: r.title,
        url: r.url,
        score: r.score,
        publishedDate: r.publishedDate,
        hasText: !!r.text,
        hasHighlights: !!r.highlights,
        hasSummary: !!r.summary,
        textPreview: r.text?.substring(0, 200) + '...'
      })),
      searchTime: data.searchTime,
      cost: data.costDollars
    });

  } catch (error) {
    console.error('Test error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}