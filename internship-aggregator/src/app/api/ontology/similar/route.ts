import { NextRequest, NextResponse } from 'next/server';
import { ontologyService } from '@/services/ontology-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const internshipId = searchParams.get('internship_id');
    
    if (!internshipId) {
      return NextResponse.json({ error: 'internship_id is required' }, { status: 400 });
    }

    // Get the internship to find its company
    const { data: internship } = await supabase
      .from('internships')
      .select('company_id')
      .eq('id', internshipId)
      .single();

    if (!internship) {
      return NextResponse.json({ error: 'Internship not found' }, { status: 404 });
    }

    // Find similar companies
    const similarCompanies = await ontologyService.findSimilarCompanies(internship.company_id, 5);
    
    if (similarCompanies.length === 0) {
      return NextResponse.json([]);
    }

    // Get internships at similar companies
    const similarInternships = await ontologyService.findInternshipsAtSimilarCompanies(
      internship.company_id, 
      20
    );

    return NextResponse.json(similarInternships);
  } catch (error) {
    console.error('Error fetching similar internships:', error);
    return NextResponse.json(
      { error: 'Failed to fetch similar internships' },
      { status: 500 }
    );
  }
}