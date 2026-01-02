import { NextRequest, NextResponse } from 'next/server';
import { ontologyService } from '@/services/ontology-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const skillsParam = searchParams.get('skills');
    
    if (!skillsParam) {
      return NextResponse.json({ error: 'skills parameter is required' }, { status: 400 });
    }

    const currentSkills = skillsParam.split(',').map(s => s.trim());
    
    const recommendations = await ontologyService.getSkillRecommendations(currentSkills);
    
    return NextResponse.json(recommendations);
  } catch (error) {
    console.error('Error fetching skill recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch skill recommendations' },
      { status: 500 }
    );
  }
}