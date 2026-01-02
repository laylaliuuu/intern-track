import { NextResponse } from 'next/server';
import { hiddenGemsService } from '@/services/hidden-gems-service';

export async function GET() {
  try {
    const hiddenGemsByCategory = await hiddenGemsService.getHiddenGemsByCategory();

    return NextResponse.json(hiddenGemsByCategory);
  } catch (error) {
    console.error('Error fetching hidden gems by category:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hidden gems by category' },
      { status: 500 }
    );
  }
}
