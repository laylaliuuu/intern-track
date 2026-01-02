#!/usr/bin/env ts-node

/**
 * Script to validate all existing internship data against job posting enricher
 * This will check if URLs are valid, accessible, and contain actual job postings
 */

import { createClient } from '@supabase/supabase-js';
import { jobPostingEnricher } from '../src/services/data-processing/job-posting-enricher';

// Initialize Supabase client
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

async function validateExistingData(): Promise<ValidationSummary> {
  console.log('🔍 Starting validation of existing internship data...\n');

  try {
    // Fetch all internship data from the database
    console.log('📊 Fetching data from database...');
    const { data: internships, error: fetchError } = await supabase
      .from('internships')
      .select('id, title, company, url, application_url')
      .order('created_at', { ascending: false });

    if (fetchError) {
      throw new Error(`Failed to fetch data: ${fetchError.message}`);
    }

    if (!internships || internships.length === 0) {
      console.log('❌ No internship data found in database');
      return {
        total: 0,
        valid: 0,
        invalid: 0,
        errors: 0,
        averageConfidence: 0,
        averageValidationTime: 0,
        results: []
      };
    }

    console.log(`📈 Found ${internships.length} internships to validate\n`);

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
      console.log(`   URL: ${url}`);

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

        console.log(`   ⏱️  Validation time: ${validationTime}ms\n`);

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
        console.log(`   💥 ERROR: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
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

    return summary;

  } catch (error) {
    console.error('❌ Error during validation:', error);
    throw error;
  }
}

function printSummary(summary: ValidationSummary) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 VALIDATION SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total internships: ${summary.total}`);
  console.log(`✅ Valid: ${summary.valid} (${((summary.valid / summary.total) * 100).toFixed(1)}%)`);
  console.log(`❌ Invalid: ${summary.invalid} (${((summary.invalid / summary.total) * 100).toFixed(1)}%)`);
  console.log(`💥 Errors: ${summary.errors} (${((summary.errors / summary.total) * 100).toFixed(1)}%)`);
  console.log(`📈 Average confidence score: ${summary.averageConfidence.toFixed(2)}`);
  console.log(`⏱️  Average validation time: ${summary.averageValidationTime.toFixed(0)}ms`);
  console.log('='.repeat(80));

  // Show invalid results with reasons
  if (summary.invalid > 0) {
    console.log('\n❌ INVALID RESULTS:');
    console.log('-'.repeat(80));
    summary.results
      .filter(r => !r.isValid && !r.error)
      .forEach((result, index) => {
        console.log(`${index + 1}. ${result.title} at ${result.company}`);
        console.log(`   URL: ${result.url}`);
        console.log(`   Reason: ${result.reason} (confidence: ${result.confidenceScore})`);
        console.log('');
      });
  }

  // Show error results
  if (summary.errors > 0) {
    console.log('\n💥 ERROR RESULTS:');
    console.log('-'.repeat(80));
    summary.results
      .filter(r => r.error)
      .forEach((result, index) => {
        console.log(`${index + 1}. ${result.title} at ${result.company}`);
        console.log(`   URL: ${result.url}`);
        console.log(`   Error: ${result.error}`);
        console.log('');
      });
  }

  // Show confidence score distribution
  console.log('\n📊 CONFIDENCE SCORE DISTRIBUTION:');
  console.log('-'.repeat(80));
  const scoreRanges = [
    { min: 90, max: 100, label: '90-100 (Excellent)' },
    { min: 80, max: 89, label: '80-89 (Good)' },
    { min: 70, max: 79, label: '70-79 (Fair)' },
    { min: 60, max: 69, label: '60-69 (Poor)' },
    { min: 0, max: 59, label: '0-59 (Very Poor)' }
  ];

  scoreRanges.forEach(range => {
    const count = summary.results.filter(r => 
      r.confidenceScore >= range.min && r.confidenceScore <= range.max
    ).length;
    const percentage = ((count / summary.total) * 100).toFixed(1);
    console.log(`${range.label}: ${count} (${percentage}%)`);
  });
}

async function main() {
  try {
    const summary = await validateExistingData();
    printSummary(summary);

    // Save detailed results to a file
    const fs = require('fs');
    const path = require('path');
    
    const resultsPath = path.join(__dirname, 'validation-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(summary, null, 2));
    console.log(`\n💾 Detailed results saved to: ${resultsPath}`);

  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

export { validateExistingData, ValidationResult, ValidationSummary };


