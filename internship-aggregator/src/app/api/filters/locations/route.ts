import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { asyncHandler } from '../../../../lib/error-handling';

export const GET = asyncHandler(async (request: NextRequest) => {
  const { data, error } = await supabase
    .from('internships')
    .select('location')
    .eq('is_archived', false)
    .not('location', 'is', null);

  if (error) {
    throw new Error(`Failed to fetch locations: ${error.message}`);
  }

  // Extract and deduplicate locations
  const locations = new Set<string>();
  data?.forEach(internship => {
    if (internship.location && internship.location.trim()) {
      locations.add(internship.location.trim());
    }
  });

  return NextResponse.json({
    success: true,
    data: Array.from(locations).sort()
  });
});
