// API route for fetching internships with filtering and pagination
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { InternshipRole, WorkType, EligibilityYear, BachelorMajor } from '../../../types';
import { asyncHandler, DatabaseError, ValidationError } from '../../../lib/error-handling';
import { logger, createRequestLogger } from '../../../lib/logger';

export const GET = asyncHandler(async (request: NextRequest) => {
  const requestLogger = createRequestLogger();
  const { requestId, logger: reqLogger, end } = requestLogger(request);
  
  reqLogger.info('Fetching internships', {
    action: 'fetch_internships_start',
  });

  // Check if Supabase is configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new DatabaseError('fetch_internships', new Error('Supabase environment variables are not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment variables.'));
  }

  const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 500); // Increased from 100 to 500
    
    // Validate pagination parameters
    if (page < 1) {
      throw new ValidationError('Page must be greater than 0', { page });
    }
    if (limit < 1 || limit > 500) {
      throw new ValidationError('Limit must be between 1 and 500', { limit });
    }
    const search = searchParams.get('search') || '';
    const roles = searchParams.get('roles')?.split(',').filter(Boolean) || [];
    const majors = searchParams.get('majors')?.split(',').filter(Boolean) || [];
    const locations = searchParams.get('locations')?.split(',').filter(Boolean) || [];
    const workTypes = searchParams.get('workTypes')?.split(',').filter(Boolean) || [];
    const eligibilityYears = searchParams.get('eligibilityYears')?.split(',').filter(Boolean) || [];
    const cycles = searchParams.get('cycles')?.split(',').filter(Boolean) || [];
    const isRemote = searchParams.get('isRemote');
    const showProgramSpecific = searchParams.get('showProgramSpecific');
    const postedWithin = searchParams.get('postedWithin') || '';
    const sortBy = searchParams.get('sortBy') || 'posted_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build the query
    let query = supabase
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
          type
        )
      `, { count: 'exact' })
      .eq('is_archived', false);

    // Apply filters
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,companies.name.ilike.%${search}%`);
    }

    if (roles.length > 0) {
      query = query.in('normalized_role', roles);
    }

    if (majors.length > 0) {
      query = query.overlaps('relevant_majors', majors);
    }

    if (locations.length > 0) {
      query = query.in('location', locations);
    }

    if (workTypes.length > 0) {
      query = query.in('work_type', workTypes);
    }

    if (eligibilityYears.length > 0) {
      query = query.overlaps('eligibility_year', eligibilityYears);
    }

    if (cycles.length > 0) {
      query = query.in('internship_cycle', cycles);
    }

    if (isRemote === 'true') {
      query = query.eq('is_remote', true);
    } else if (isRemote === 'false') {
      query = query.eq('is_remote', false);
    }

    if (showProgramSpecific === 'true') {
      query = query.eq('is_program_specific', true);
    } else if (showProgramSpecific === 'false') {
      query = query.eq('is_program_specific', false);
    }

    // Date filtering - make more inclusive for development
    if (postedWithin && postedWithin !== 'month') {
      const now = new Date();
      let dateThreshold: Date;
      
      switch (postedWithin) {
        case 'day':
          dateThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          dateThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        default:
          // Skip filtering for month or unknown values to show all data
          dateThreshold = new Date('2020-01-01'); // Very old date to include everything
      }
      
      query = query.gte('posted_at', dateThreshold.toISOString());
    }
    // If postedWithin is 'month' or empty, don't apply date filtering to show all internships

    // Sorting
    const validSortFields = ['posted_at', 'title', 'application_deadline'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'posted_at';
    const order = sortOrder === 'asc' ? 'asc' : 'desc';
    
    if (sortField === 'title') {
      query = query.order('title', { ascending: order === 'asc' });
    } else if (sortField === 'application_deadline') {
      query = query.order('application_deadline', { ascending: order === 'asc', nullsFirst: false });
    } else {
      query = query.order('posted_at', { ascending: order === 'asc' });
    }

    // Pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new DatabaseError('fetch_internships', error);
    }

    // Transform data for frontend
    const internships = data?.map(item => ({
      id: item.id,
      title: item.title,
      company: {
        id: item.companies?.id,
        name: item.companies?.name || 'Unknown Company',
        domain: item.companies?.domain,
        linkedin_url: item.companies?.linkedin_url,
        logo_url: item.companies?.logo_url
      },
      normalizedRole: item.normalized_role,
      // New quality fields
      exactRole: item.exact_role,
      graduationYear: item.graduation_year || [],
      requirements: item.requirements,
      payRateMin: item.pay_rate_min,
      payRateMax: item.pay_rate_max,
      payRateCurrency: item.pay_rate_currency || 'USD',
      payRateType: item.pay_rate_type || 'unknown',
      // Legacy fields
      location: item.location,
      isRemote: item.is_remote,
      workType: item.work_type,
      skills: item.skills || [],
      eligibilityYear: item.eligibility_year || [],
      internshipCycle: item.internship_cycle,
      postedAt: item.posted_at,
      applicationDeadline: item.application_deadline,
      applicationUrl: item.application_url || item.url,
      description: item.description,
      source: {
        id: item.sources?.id,
        name: item.sources?.name || 'Unknown Source',
        type: item.sources?.type
      },
      isProgramSpecific: item.is_program_specific,
      relevantMajors: item.relevant_majors || []
    })) || [];

    const totalPages = Math.ceil((count || 0) / limit);

    reqLogger.info('Internships fetched successfully', {
      action: 'fetch_internships_success',
      metadata: {
        count: internships.length,
        total: count,
        page,
        limit,
      },
    });

    end(200);

    return NextResponse.json({
      success: true,
      data: internships,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      filters: {
        search,
        roles,
        majors,
        locations,
        workTypes,
        eligibilityYears,
        cycles,
        isRemote,
        showProgramSpecific,
        postedWithin,
        sortBy,
        sortOrder
      }
    });
});