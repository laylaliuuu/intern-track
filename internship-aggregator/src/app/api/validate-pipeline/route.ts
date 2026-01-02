import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validationService } from '@/services/validation-service';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface ValidationResult {
  id: string;
  title: string;
  company: string;
  url: string;
  status: 'ok' | 'dead' | 'expired' | 'maybe_valid';
  http_code: number;
  final_url: string;
  redirects: string[];
  score: number;
  reason: string;
  expires: boolean;
  last_checked: string;
  validationTime: number;
}

interface ValidationSummary {
  total: number;
  valid: number;
  expired: number;
  dead: number;
  maybe_valid: number;
  updated: number;
  errors: number;
  averageValidationTime: number;
  results: ValidationResult[];
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const updateDatabase = searchParams.get('update') === 'true';
    const limit = parseInt(searchParams.get('limit') || '0');

    console.log('🔍 Starting comprehensive validation pipeline...');
    console.log(`   Update database: ${updateDatabase}`);
    console.log(`   Limit: ${limit || 'all'}`);

    // Fetch all internship data from the database with company names
    let query = supabase
      .from('internships')
      .select(`
        id, 
        title, 
        url, 
        application_url,
        companies!inner(name)
      `)
      .order('created_at', { ascending: false });

    if (limit > 0) {
      query = query.limit(limit);
    }

    const { data: internships, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch data: ${fetchError.message}`);
    }

    if (!internships || internships.length === 0) {
      return NextResponse.json({
        total: 0,
        valid: 0,
        expired: 0,
        dead: 0,
        maybe_valid: 0,
        updated: 0,
        errors: 0,
        averageValidationTime: 0,
        results: [],
      });
    }

    console.log(`📈 Found ${internships.length} internships to validate`);

    const results: ValidationResult[] = [];
    let validCount = 0;
    let expiredCount = 0;
    let deadCount = 0;
    let maybeValidCount = 0;
    let updatedCount = 0;
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
        // Run comprehensive validation
        const validation = await validationService.validateUrl(url);
        const validationTime = Date.now() - startTime;

        const result: ValidationResult = {
          id: internship.id,
          title: internship.title,
          company: companyName,
          url: url,
          status: validation.status,
          http_code: validation.http_code,
          final_url: validation.final_url,
          redirects: validation.redirects,
          score: validation.score,
          reason: validation.reason,
          expires: validation.expires,
          last_checked: validation.last_checked,
          validationTime: validationTime,
        };

        results.push(result);
        totalValidationTime += validationTime;

        // Count by status
        switch (validation.status) {
          case 'ok':
            validCount++;
            console.log(`   ✅ VALID (score: ${validation.score}, ${validation.reason})`);
            break;
          case 'expired':
            expiredCount++;
            console.log(`   ⏰ EXPIRED (${validation.reason})`);
            break;
          case 'dead':
            deadCount++;
            console.log(`   ❌ DEAD (${validation.reason})`);
            break;
          case 'maybe_valid':
            maybeValidCount++;
            console.log(`   ⚠️  MAYBE VALID (score: ${validation.score}, ${validation.reason})`);
            break;
        }

        // Update database if requested
        if (updateDatabase) {
          const updateData: any = {
            validation_status: validation.status,
            validation_score: validation.score,
            validation_http_code: validation.http_code,
            validation_final_url: validation.final_url,
            validation_redirects: validation.redirects,
            validation_reason: validation.reason,
            validation_last_checked: validation.last_checked,
          };

          // Set is_active based on status
          if (validation.status === 'expired' || validation.status === 'dead') {
            updateData.is_active = false;
          } else if (validation.status === 'ok') {
            updateData.is_active = true;
          }

          const { error: updateError } = await supabase
            .from('internships')
            .update(updateData)
            .eq('id', internship.id);

          if (updateError) {
            console.error(`   ⚠️  Failed to update database: ${updateError.message}`);
          } else {
            updatedCount++;
          }
        }

        // Add small delay to avoid overwhelming servers
        if (i < internships.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error) {
        const validationTime = Date.now() - startTime;
        errorCount++;
        totalValidationTime += validationTime;

        console.log(`   💥 ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);

        results.push({
          id: internship.id,
          title: internship.title,
          company: companyName,
          url: url,
          status: 'dead',
          http_code: 0,
          final_url: url,
          redirects: [],
          score: -10,
          reason: error instanceof Error ? error.message : 'Unknown error',
          expires: false,
          last_checked: new Date().toISOString(),
          validationTime: validationTime,
        });
      }
    }

    const summary: ValidationSummary = {
      total: internships.length,
      valid: validCount,
      expired: expiredCount,
      dead: deadCount,
      maybe_valid: maybeValidCount,
      updated: updatedCount,
      errors: errorCount,
      averageValidationTime: totalValidationTime / internships.length,
      results: results,
    };

    console.log('\n📊 VALIDATION PIPELINE COMPLETE');
    console.log(`Total: ${summary.total}`);
    console.log(`✅ Valid: ${summary.valid}`);
    console.log(`⏰ Expired: ${summary.expired}`);
    console.log(`❌ Dead: ${summary.dead}`);
    console.log(`⚠️  Maybe Valid: ${summary.maybe_valid}`);
    console.log(`💾 Updated in DB: ${summary.updated}`);
    console.log(`💥 Errors: ${summary.errors}`);

    return NextResponse.json(summary);
  } catch (error) {
    console.error('❌ Error during validation:', error);
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


