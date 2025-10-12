import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { asyncHandler } from '../../../../lib/error-handling';

export const GET = asyncHandler(async (request: NextRequest) => {
  const { data, error } = await supabase
    .from('internships')
    .select('relevant_majors')
    .eq('is_archived', false);

  if (error) {
    throw new Error(`Failed to fetch majors: ${error.message}`);
  }

  // Extract and deduplicate majors
  const majors = new Set<string>();
  data?.forEach(internship => {
    if (internship.relevant_majors) {
      internship.relevant_majors.forEach((major: string) => {
        if (major && major.trim()) {
          majors.add(major.trim());
        }
      });
    }
  });

  return NextResponse.json({
    success: true,
    data: Array.from(majors).sort()
  });
});
