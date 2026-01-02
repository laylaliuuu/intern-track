import { NextRequest, NextResponse } from 'next/server';
import { hiddenGemsService } from '@/services/hidden-gems-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const gemTypes = searchParams.get('gemTypes')?.split(',') || undefined;
    const minGemScore = searchParams.get('minGemScore') ? 
      parseFloat(searchParams.get('minGemScore')!) : undefined;
    const maxCompetition = searchParams.get('maxCompetition') ? 
      parseFloat(searchParams.get('maxCompetition')!) : undefined;
    const industries = searchParams.get('industries')?.split(',') || undefined;
    const locations = searchParams.get('locations')?.split(',') || undefined;
    const limit = searchParams.get('limit') ? 
      parseInt(searchParams.get('limit')!) : 50;

    const filters = {
      gemTypes,
      minGemScore,
      maxCompetition,
      industries,
      locations,
      limit
    };

    const hiddenGems = await hiddenGemsService.findHiddenGems(filters);

    return NextResponse.json(hiddenGems);
  } catch (error) {
    console.error('Error fetching hidden gems:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hidden gems' },
      { status: 500 }
    );
  }
}