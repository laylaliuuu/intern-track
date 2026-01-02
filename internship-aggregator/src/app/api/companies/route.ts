// API route for company operations
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const industry = searchParams.get('industry');
    const size = searchParams.get('size');
    const fundingStage = searchParams.get('fundingStage');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('companies')
      .select(`
        id,
        name,
        domain,
        description,
        created_at,
        company_metadata(
          size_category,
          industry,
          funding_stage,
          employee_count_range,
          glassdoor_rating
        )
      `);

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,domain.ilike.%${search}%`);
    }

    if (industry) {
      query = query.contains('company_metadata.industry', [industry]);
    }

    if (size) {
      query = query.eq('company_metadata.size_category', size);
    }

    if (fundingStage) {
      query = query.eq('company_metadata.funding_stage', fundingStage);
    }

    // Apply pagination and ordering
    const { data: companies, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch companies: ${error.message}`);
    }

    logger.info('Companies fetched successfully', {
      component: 'api',
      operation: 'get_companies',
      count: companies?.length || 0,
      search,
      industry,
      size,
      fundingStage
    });

    return NextResponse.json({
      data: companies || [],
      total: count || 0,
      limit,
      offset,
      hasMore: (companies?.length || 0) === limit
    });

  } catch (error) {
    logger.error('Failed to fetch companies', {
      component: 'api',
      operation: 'get_companies_error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      { error: 'Failed to fetch companies' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, domain, description, metadata } = body;

    // Validate required fields
    if (!name || !domain) {
      return NextResponse.json(
        { error: 'Name and domain are required' },
        { status: 400 }
      );
    }

    // Insert company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name,
        domain,
        description
      })
      .select()
      .single();

    if (companyError) {
      throw new Error(`Failed to create company: ${companyError.message}`);
    }

    // Insert metadata if provided
    if (metadata && company) {
      const { error: metadataError } = await supabase
        .from('company_metadata')
        .insert({
          company_id: company.id,
          ...metadata
        });

      if (metadataError) {
        logger.warn('Failed to create company metadata', {
          component: 'api',
          operation: 'create_company_metadata',
          companyId: company.id,
          error: metadataError.message
        });
      }
    }

    logger.info('Company created successfully', {
      component: 'api',
      operation: 'create_company',
      companyId: company.id,
      name: company.name
    });

    return NextResponse.json({ data: company }, { status: 201 });

  } catch (error) {
    logger.error('Failed to create company', {
      component: 'api',
      operation: 'create_company_error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      { error: 'Failed to create company' },
      { status: 500 }
    );
  }
}
