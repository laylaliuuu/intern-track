import { NextRequest, NextResponse } from 'next/server';
import { hiddenGemsService } from '@/services/hidden-gems-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? 
      parseInt(searchParams.get('limit')!) : 10;

    const trendingGems = await hiddenGemsService.getTrendingHiddenGems(limit);

    return NextResponse.json(trendingGems);
  } catch (error) {
    console.error('Error fetching trending hidden gems:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending hidden gems' },
      { status: 500 }
    );
  }
}
