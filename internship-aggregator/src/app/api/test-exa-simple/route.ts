// Simple Exa.ai test to isolate the issue
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

    // Test 1: Very basic search (this should work)
    console.log('Test 1: Basic search');
    const test1 = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        query: 'software engineering internship',
        numResults: 3,
        type: 'neural'
      }),
    });

    const test1Data = await test1.json();
    console.log('Test 1 result:', test1.status, test1Data);

    if (!test1.ok) {
      return NextResponse.json({
        success: false,
        test: 'basic_search',
        error: test1Data,
        status: test1.status
      });
    }

    // Test 2: Add includeDomains
    console.log('Test 2: With includeDomains');
    const test2 = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        query: 'software engineering internship',
        numResults: 3,
        type: 'neural',
        includeDomains: ['careers.google.com', 'careers.microsoft.com']
      }),
    });

    const test2Data = await test2.json();
    console.log('Test 2 result:', test2.status, test2Data);

    if (!test2.ok) {
      return NextResponse.json({
        success: false,
        test: 'with_domains',
        error: test2Data,
        status: test2.status,
        basicSearchWorked: true
      });
    }

    // Test 3: Add date filter
    console.log('Test 3: With date filter');
    const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString();
    const test3 = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        query: 'software engineering internship',
        numResults: 3,
        type: 'neural',
        includeDomains: ['careers.google.com', 'careers.microsoft.com'],
        startPublishedDate: sixMonthsAgo
      }),
    });

    const test3Data = await test3.json();
    console.log('Test 3 result:', test3.status, test3Data);

    if (!test3.ok) {
      return NextResponse.json({
        success: false,
        test: 'with_date_filter',
        error: test3Data,
        status: test3.status,
        basicSearchWorked: true,
        domainsWorked: true,
        dateFilter: sixMonthsAgo
      });
    }

    // Test 4: Add all options like our original
    console.log('Test 4: Full options');
    const test4 = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        query: 'software engineering internship application deadline apply career opportunities students undergraduate',
        numResults: 3,
        type: 'neural',
        useAutoprompt: true,
        includeDomains: ['careers.google.com', 'careers.microsoft.com'],
        includeText: true,
        includeHighlights: true,
        includeSummary: true,
        startPublishedDate: sixMonthsAgo
      }),
    });

    const test4Data = await test4.json();
    console.log('Test 4 result:', test4.status, test4Data);

    return NextResponse.json({
      success: true,
      tests: {
        basic: { status: test1.status, resultCount: test1Data.results?.length || 0 },
        withDomains: { status: test2.status, resultCount: test2Data.results?.length || 0 },
        withDateFilter: { status: test3.status, resultCount: test3Data.results?.length || 0 },
        fullOptions: { 
          status: test4.status, 
          resultCount: test4Data.results?.length || 0,
          success: test4.ok,
          error: test4.ok ? null : test4Data
        }
      },
      sampleResult: test4.ok ? test4Data.results?.[0] : null
    });

  } catch (error) {
    console.error('Test error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}