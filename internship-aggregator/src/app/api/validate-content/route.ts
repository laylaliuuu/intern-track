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
  contentCheck?: string;
}

interface ValidationSummary {
  total: number;
  valid: number;
  invalid: number;
  errors: number;
  averageValidationTime: number;
  results: ValidationResult[];
}

async function validateUrlWithContent(url: string): Promise<{ 
  valid: boolean; 
  statusCode?: number; 
  reason?: string; 
  contentCheck?: string;
}> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
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

    // Get the HTML content
    const html = await response.text();
    const lowerHtml = html.toLowerCase();

    // Check for "job not found" or similar indicators
    const notFoundIndicators = [
      'job not found',
      'page not found',
      'job may have been taken down',
      'this job isn\'t available',
      'job has been removed',
      'no results that match',
      'role does not exist',
      'temporarily unavailable',
      'unexpected error',
      'no longer available',
      'doesn\'t exist',
      'not found',
      'taken down',
      'removed',
      'unavailable',
      'position is no longer available',
      'job is no longer available',
      'this position has been filled',
      'applications are closed',
      'posting has expired',
      'position has been removed',
      'no longer accepting applications',
      'position filled',
      'hiring complete',
      'job posting not found',
      'position not found',
      'opportunity not found',
      'this position is no longer available',
      'job posting has been removed',
      'position has been filled',
      'we are no longer accepting applications',
      'this role is no longer available',
      'position no longer available',
      'job posting expired',
      'position expired',
      'job posting closed',
      'position closed',
      'job closed',
      'no longer hiring',
      'hiring closed',
      'recruitment closed',
      'application period ended',
      'deadline passed',
      'expired',
      'closed',
      'unavailable',
      'not available',
      'position filled',
      'job filled',
      'role filled',
      'opportunity filled',
      'position taken',
      'job taken',
      'role taken',
      'opportunity taken',
      'position closed',
      'job closed',
      'role closed',
      'opportunity closed',
      'position ended',
      'job ended',
      'role ended',
      'opportunity ended',
      'position finished',
      'job finished',
      'role finished',
      'opportunity finished',
      'position completed',
      'job completed',
      'role completed',
      'opportunity completed',
      'position terminated',
      'job terminated',
      'role terminated',
      'opportunity terminated',
      'position cancelled',
      'job cancelled',
      'role cancelled',
      'opportunity cancelled',
      'position withdrawn',
      'job withdrawn',
      'role withdrawn',
      'opportunity withdrawn',
      'position removed',
      'job removed',
      'role removed',
      'opportunity removed',
      'position deleted',
      'job deleted',
      'role deleted',
      'opportunity deleted',
      'position archived',
      'job archived',
      'role archived',
      'opportunity archived',
      'position inactive',
      'job inactive',
      'role inactive',
      'opportunity inactive',
      'position disabled',
      'job disabled',
      'role disabled',
      'opportunity disabled',
      'position suspended',
      'job suspended',
      'role suspended',
      'opportunity suspended',
      'position paused',
      'job paused',
      'role paused',
      'opportunity paused',
      'position stopped',
      'job stopped',
      'role stopped',
      'opportunity stopped',
      'position halted',
      'job halted',
      'role halted',
      'opportunity halted',
      'position ceased',
      'job ceased',
      'role ceased',
      'opportunity ceased',
      'position discontinued',
      'job discontinued',
      'role discontinued',
      'opportunity discontinued',
      'position abandoned',
      'job abandoned',
      'role abandoned',
      'opportunity abandoned',
      'position cancelled',
      'job cancelled',
      'role cancelled',
      'opportunity cancelled',
      'position withdrawn',
      'job withdrawn',
      'role withdrawn',
      'opportunity withdrawn',
      'position removed',
      'job removed',
      'role removed',
      'opportunity removed',
      'position deleted',
      'job deleted',
      'role deleted',
      'opportunity deleted',
      'position archived',
      'job archived',
      'role archived',
      'opportunity archived',
      'position inactive',
      'job inactive',
      'role inactive',
      'opportunity inactive',
      'position disabled',
      'job disabled',
      'role disabled',
      'opportunity disabled',
      'position suspended',
      'job suspended',
      'role suspended',
      'opportunity suspended',
      'position paused',
      'job paused',
      'role paused',
      'opportunity paused',
      'position stopped',
      'job stopped',
      'role stopped',
      'opportunity stopped',
      'position halted',
      'job halted',
      'role halted',
      'opportunity halted',
      'position ceased',
      'job ceased',
      'role ceased',
      'opportunity ceased',
      'position discontinued',
      'job discontinued',
      'role discontinued',
      'opportunity discontinued',
      'position abandoned',
      'job abandoned',
      'role abandoned',
      'opportunity abandoned'
    ];

    const isNotFound = notFoundIndicators.some(indicator => lowerHtml.includes(indicator));
    if (isNotFound) {
      return { 
        valid: false, 
        statusCode: response.status, 
        reason: 'Job posting not found or removed',
        contentCheck: 'Found "job not found" indicators in content'
      };
    }

    return { 
      valid: true, 
      statusCode: response.status,
      contentCheck: 'No "job not found" indicators found'
    };

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
    console.log('🔍 Starting content-based validation of existing internship data...');

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

      const startTime = Date.now();
      
      try {
        const validation = await validateUrlWithContent(url);
        const validationTime = Date.now() - startTime;

        const result: ValidationResult = {
          id: internship.id,
          title: internship.title,
          company: companyName,
          url: url,
          isValid: validation.valid,
          statusCode: validation.statusCode,
          reason: validation.reason,
          contentCheck: validation.contentCheck,
          validationTime: validationTime
        };

        results.push(result);
        totalValidationTime += validationTime;

        if (validation.valid) {
          validCount++;
          console.log(`   ✅ VALID (status: ${validation.statusCode}) - ${validation.contentCheck}`);
        } else {
          invalidCount++;
          console.log(`   ❌ INVALID (status: ${validation.statusCode}, reason: ${validation.reason}) - ${validation.contentCheck}`);
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

    console.log('\n📊 CONTENT VALIDATION COMPLETE');
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


