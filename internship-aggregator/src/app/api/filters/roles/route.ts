import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { asyncHandler } from '../../../../lib/error-handling';

export const GET = asyncHandler(async (request: NextRequest) => {
  const { data, error } = await supabase
    .from('internships')
    .select('normalized_role')
    .eq('is_archived', false)
    .not('normalized_role', 'is', null);

  if (error) {
    throw new Error(`Failed to fetch roles: ${error.message}`);
  }

  // Extract and deduplicate roles
  const roles = new Set<string>();
  data?.forEach(internship => {
    if (internship.normalized_role && internship.normalized_role.trim()) {
      roles.add(internship.normalized_role.trim());
    }
  });

  return NextResponse.json({
    success: true,
    data: Array.from(roles).sort()
  });
});
