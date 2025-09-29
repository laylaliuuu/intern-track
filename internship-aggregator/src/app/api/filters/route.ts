// API route for fetching filter options and statistics
import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { InternshipRole, WorkType, EligibilityYear, BACHELOR_MAJORS } from '../../../types';

export async function GET() {
  try {
    // Get unique values for filters from the database
    const [
      rolesResult,
      locationsResult,
      cyclesResult,
      statsResult
    ] = await Promise.all([
      // Get unique normalized roles
      supabase
        .from('internships')
        .select('normalized_role')
        .eq('is_archived', false)
        .not('normalized_role', 'is', null),
      
      // Get unique locations
      supabase
        .from('internships')
        .select('location')
        .eq('is_archived', false)
        .not('location', 'is', null),
      
      // Get unique internship cycles
      supabase
        .from('internships')
        .select('internship_cycle')
        .eq('is_archived', false)
        .not('internship_cycle', 'is', null),
      
      // Get statistics
      supabase
        .from('internships')
        .select('id, is_remote, is_program_specific')
        .eq('is_archived', false)
    ]);

    if (rolesResult.error || locationsResult.error || cyclesResult.error || statsResult.error) {
      console.error('Database query error:', {
        roles: rolesResult.error,
        locations: locationsResult.error,
        cycles: cyclesResult.error,
        stats: statsResult.error
      });
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch filter options'
      }, { status: 500 });
    }

    // Process unique values
    const uniqueRoles = [...new Set(rolesResult.data?.map(item => item.normalized_role).filter(Boolean))];
    const uniqueLocations = [...new Set(locationsResult.data?.map(item => item.location).filter(Boolean))];
    const uniqueCycles = [...new Set(cyclesResult.data?.map(item => item.internship_cycle).filter(Boolean))];

    // Calculate statistics
    const totalInternships = statsResult.data?.length || 0;
    const remoteInternships = statsResult.data?.filter(item => item.is_remote).length || 0;
    const programSpecificInternships = statsResult.data?.filter(item => item.is_program_specific).length || 0;

    return NextResponse.json({
      success: true,
      data: {
        roles: uniqueRoles.map(role => ({ value: role, label: role })),
        locations: uniqueLocations.map(location => ({ value: location, label: location })),
        workTypes: Object.values(WorkType).map(type => ({ 
          value: type, 
          label: type.charAt(0).toUpperCase() + type.slice(1) 
        })),
        eligibilityYears: Object.values(EligibilityYear).map(year => ({ value: year, label: year })),
        majors: BACHELOR_MAJORS.map(major => ({ value: major, label: major })),
        cycles: uniqueCycles.map(cycle => ({ value: cycle, label: cycle })),
        stats: {
          total: totalInternships,
          remote: remoteInternships,
          programSpecific: programSpecificInternships,
          paid: 0, // TODO: Calculate from work_type
          unpaid: 0 // TODO: Calculate from work_type
        }
      }
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}