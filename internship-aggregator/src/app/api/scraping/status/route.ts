import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { data: stats } = await supabase
    .from('company_targets')
    .select('scraping_method, scrape_success_count, scrape_error_count, enabled')
    .eq('enabled', true);

  const summary = {
    total_companies: stats?.length || 0,
    by_method: {} as Record<string, any>,
    overall_success_rate: 0
  };

  // Aggregate stats by method
  stats?.forEach(s => {
    if (!summary.by_method[s.scraping_method]) {
      summary.by_method[s.scraping_method] = { success: 0, errors: 0, count: 0 };
    }
    summary.by_method[s.scraping_method].success += s.scrape_success_count;
    summary.by_method[s.scraping_method].errors += s.scrape_error_count;
    summary.by_method[s.scraping_method].count += 1;
  });

  return NextResponse.json(summary);
}
