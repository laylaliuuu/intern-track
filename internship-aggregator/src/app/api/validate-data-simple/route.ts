import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface ValidationResult {
  id: string;
  title: string;
  company: string;
  url: string;
  isValid: boolean;
  statusCode?: number;
  reason?: string;
  error?: string;
  validationTime: number;
}

interface ValidationSummary {
  total: number;
  valid: number;
  invalid: number;
  errors: number;
  averageValidationTime: number;
  results: ValidationResult[];
}

async function validateUrl(url: string): Promise<{ valid: boolean; statusCode?: number; reason?: string }> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; InternshipBot/1.0)'
      }
    });

    if (response.status === 404) {
      return { valid: false, statusCode: 404, reason: '404 Not Found' };
    }

    if (response.status === 410) {
      return { valid: false, statusCode: 410, reason: '410 Gone' };
    }

    if (response.status >= 500) {
      return { valid: false, statusCode: response.status, reason: `Server error: ${response.status}` };
    }

    if (!response.ok) {
      return { valid: false, statusCode: response.status, reason: `HTTP ${response.status}` };
    }

    return { valid: true, statusCode: response.status };

  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { valid: false, reason: 'Timeout' };
      }
      return { valid: false, reason: error.message };
    }
    return { valid: false, reason: 'Unknown error' };
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Starting simple validation of existing internship data...');

    // Fetch all internship data from the database with company names
    const { data: internships, error: fetchError } = await supabase
      .from('internships')
      .select(`
        id, 
        title, 
        url, 
        application_url,
        companies!inner(name)
      `)
      .order('created_at', { ascending: false });

    if (fetchError) {
      throw new Error(`Failed to fetch data: ${fetchError.message}`);
    }

    if (!internships || internships.length === 0) {
      return NextResponse.json({
        total: 0,
        valid: 0,
        invalid: 0,
        errors: 0,
        averageValidationTime: 0,
        results: []
      });
    }

    console.log(`📈 Found ${internships.length} internships to validate`);

    const results: ValidationResult[] = [];
    let validCount = 0;
    let invalidCount = 0;
    let errorCount = 0;
    let totalValidationTime = 0;

    // Process each internship
    for (let i = 0; i < internships.length; i++) {
      const internship = internships[i];
      const url = internship.application_url || internship.url;
      const companyName = internship.companies?.name || 'Unknown Company';
      
      console.log(`[${i + 1}/${internships.length}] Validating: ${internship.title} at ${companyName}`);
      console.log(`   URL: ${url}`);

      const startTime = Date.now();
      
      try {
        const validation = await validateUrl(url);
        const validationTime = Date.now() - startTime;

        const result: ValidationResult = {
          id: internship.id,
          title: internship.title,
          company: companyName,
          url: url,
          isValid: validation.valid,
          statusCode: validation.statusCode,
          reason: validation.reason,
          validationTime: validationTime
        };

        results.push(result);
        totalValidationTime += validationTime;

        if (validation.valid) {
          validCount++;
          console.log(`   ✅ VALID (status: ${validation.statusCode})`);
        } else {
          invalidCount++;
          console.log(`   ❌ INVALID (status: ${validation.statusCode}, reason: ${validation.reason})`);
        }

        // Add small delay to avoid overwhelming the server
        if (i < internships.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }

      } catch (error) {
        const validationTime = Date.now() - startTime;
        errorCount++;
        totalValidationTime += validationTime;

        const result: ValidationResult = {
          id: internship.id,
          title: internship.title,
          company: companyName,
          url: url,
          isValid: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          validationTime: validationTime
        };

        results.push(result);
        console.log(`   💥 ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const summary: ValidationSummary = {
      total: internships.length,
      valid: validCount,
      invalid: invalidCount,
      errors: errorCount,
      averageValidationTime: totalValidationTime / internships.length,
      results: results
    };

    console.log('\n📊 VALIDATION COMPLETE');
    console.log(`Total: ${summary.total}, Valid: ${summary.valid}, Invalid: ${summary.invalid}, Errors: ${summary.errors}`);

    return NextResponse.json(summary);

  } catch (error) {
    console.error('❌ Error during validation:', error);
    return NextResponse.json(
      { error: 'Validation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
