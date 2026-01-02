// API route for fetching individual internship details
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Internship ID is required'
      }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('internships')
      .select(`
        *,
        companies:company_id (
          id,
          name,
          domain,
          linkedin_url,
          logo_url
        ),
        sources:source_id (
          id,
          name,
          type,
          base_url
        )
      `)
      .eq('id', id)
      .eq('is_archived', false)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: false,
          error: 'Internship not found'
        }, { status: 404 });
      }
      
      console.error('Database query error:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch internship'
      }, { status: 500 });
    }

    // Transform data for frontend
    const internship = {
      id: data.id,
      title: data.title,
      company: {
        id: data.companies?.id,
        name: data.companies?.name || 'Unknown Company',
        domain: data.companies?.domain,
        linkedin_url: data.companies?.linkedin_url,
        logo_url: data.companies?.logo_url
      },
      normalizedRole: data.normalized_role,
      // New quality fields
      exactRole: data.exact_role,
      graduationYear: data.graduation_year || [],
      requirements: data.requirements,
      payRateMin: data.pay_rate_min,
      payRateMax: data.pay_rate_max,
      payRateCurrency: data.pay_rate_currency || 'USD',
      payRateType: data.pay_rate_type || 'unknown',
      // Legacy fields
      location: data.location,
      isRemote: data.is_remote,
      workType: data.work_type,
      skills: data.skills || [],
      eligibilityYear: data.eligibility_year || [],
      internshipCycle: data.internship_cycle,
      postedAt: data.posted_at,
      applicationDeadline: data.application_deadline,
      applicationUrl: data.application_url || data.url,
      description: data.description,
      source: {
        id: data.sources?.id,
        name: data.sources?.name || 'Unknown Source',
        type: data.sources?.type,
        base_url: data.sources?.base_url
      },
      isProgramSpecific: data.is_program_specific,
      relevantMajors: data.relevant_majors || [],
      rawPayload: data.raw_payload,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      scrapedAt: data.scraped_at
    };

    return NextResponse.json({
      success: true,
      data: internship
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}