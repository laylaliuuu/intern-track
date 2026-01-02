import { NextRequest, NextResponse } from 'next/server';
import { scoringEngine } from '@/services/data-processing/scoring-engine';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const internshipId = searchParams.get('internship_id');
    
    if (!internshipId) {
      return NextResponse.json({ error: 'internship_id is required' }, { status: 400 });
    }

    const scores = await scoringEngine.getScores(internshipId);
    
    if (!scores) {
      return NextResponse.json({ error: 'Scores not found for this internship' }, { status: 404 });
    }

    return NextResponse.json(scores);
  } catch (error) {
    console.error('Error fetching internship scores:', error);
    return NextResponse.json(
      { error: 'Failed to fetch internship scores' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { internshipId, scores } = body;
    
    if (!internshipId || !scores) {
      return NextResponse.json({ error: 'internshipId and scores are required' }, { status: 400 });
    }

    await scoringEngine.saveScores(internshipId, scores);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving internship scores:', error);
    return NextResponse.json(
      { error: 'Failed to save internship scores' },
      { status: 500 }
    );
  }
}