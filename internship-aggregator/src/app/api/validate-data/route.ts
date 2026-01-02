import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jobPostingEnricher } from '../../../services/data-processing/job-posting-enricher';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface ValidationResult {
  id: string;
  title: string;
  company: string;
  url: string;
  isValid: boolean;
  confidenceScore: number;
  isLive: boolean;
  reason?: string;
  error?: string;
  validationTime: number;
}

interface ValidationSummary {
  total: number;
  valid: number;
  invalid: number;
  errors: number;
  averageConfidence: number;
  averageValidationTime: number;
  results: ValidationResult[];
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Starting validation of existing internship data...');

    // Fetch all internship data from the database
    const { data: internships, error: fetchError } = await supabase
      .from('internships')
      .select('id, title, company, url, application_url')
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
        averageConfidence: 0,
        averageValidationTime: 0,
        results: []
      });
    }

    console.log(`📈 Found ${internships.length} internships to validate`);

    const results: ValidationResult[] = [];
    let validCount = 0;
    let invalidCount = 0;
    let errorCount = 0;
    let totalConfidence = 0;
    let totalValidationTime = 0;

    // Process each internship
    for (let i = 0; i < internships.length; i++) {
      const internship = internships[i];
      const url = internship.application_url || internship.url;
      
      console.log(`[${i + 1}/${internships.length}] Validating: ${internship.title} at ${internship.company}`);

      const startTime = Date.now();
      
      try {
        // Use the job posting enricher validation
        const validation = await jobPostingEnricher.validateUrl(url);
        const validationTime = Date.now() - startTime;

        const result: ValidationResult = {
          id: internship.id,
          title: internship.title,
          company: internship.company,
          url: url,
          isValid: validation.isValid,
          confidenceScore: validation.confidenceScore,
          isLive: validation.isLive,
          reason: validation.reason,
          validationTime: validationTime
        };

        results.push(result);
        totalConfidence += validation.confidenceScore;
        totalValidationTime += validationTime;

        if (validation.isValid) {
          validCount++;
          console.log(`   ✅ VALID (confidence: ${validation.confidenceScore}, live: ${validation.isLive})`);
        } else {
          invalidCount++;
          console.log(`   ❌ INVALID (confidence: ${validation.confidenceScore}, reason: ${validation.reason})`);
        }

        // Add small delay to avoid overwhelming the server
        if (i < internships.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (error) {
        const validationTime = Date.now() - startTime;
        errorCount++;
        totalValidationTime += validationTime;

        const result: ValidationResult = {
          id: internship.id,
          title: internship.title,
          company: internship.company,
          url: url,
          isValid: false,
          confidenceScore: 0,
          isLive: false,
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
      averageConfidence: totalConfidence / internships.length,
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


