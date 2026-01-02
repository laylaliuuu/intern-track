import { NextResponse } from 'next/server';
import { hiddenGemsService } from '@/services/hidden-gems-service';

export async function GET() {
  try {
    const stats = await hiddenGemsService.getHiddenGemsStats();

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching hidden gems stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hidden gems stats' },
      { status: 500 }
    );
  }
}
