import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
  try {
    // First, let's see what tables exist
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (tablesError) {
      console.log('Error fetching tables:', tablesError);
    } else {
      console.log('Available tables:', tables);
    }

    // Try to get a sample record to see the structure
    const { data: sample, error: sampleError } = await supabase
      .from('internships')
      .select('*')
      .limit(1);

    if (sampleError) {
      console.log('Error fetching sample:', sampleError);
      return NextResponse.json({ 
        error: 'Failed to fetch sample data', 
        details: sampleError.message,
        tables: tables?.map(t => t.table_name) || []
      });
    }

    if (sample && sample.length > 0) {
      const columns = Object.keys(sample[0]);
      return NextResponse.json({ 
        success: true, 
        columns: columns,
        sample: sample[0],
        tables: tables?.map(t => t.table_name) || []
      });
    } else {
      return NextResponse.json({ 
        success: true, 
        message: 'No data found',
        tables: tables?.map(t => t.table_name) || []
      });
    }

  } catch (error) {
    console.error('Error checking schema:', error);
    return NextResponse.json(
      { error: 'Schema check failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


