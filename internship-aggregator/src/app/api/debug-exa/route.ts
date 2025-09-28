// Debug endpoint to test Exa.ai API directly
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.EXA_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'EXA_API_KEY not found in environment variables'
      });
    }

    console.log('Testing Exa.ai API with key:', apiKey.substring(0, 8) + '...');

    // Test with a very simple request
    const response = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        query: 'test',
        numResults: 1,
        type: 'neural'
      }),
    });

    const responseText = await response.text();
    console.log('Exa.ai response status:', response.status);
    console.log('Exa.ai response headers:', Object.fromEntries(response.headers.entries()));
    console.log('Exa.ai response body:', responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { rawResponse: responseText };
    }

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: responseData,
      apiKeyPrefix: apiKey.substring(0, 8) + '...'
    });

  } catch (error) {
    console.error('Debug Exa API error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}