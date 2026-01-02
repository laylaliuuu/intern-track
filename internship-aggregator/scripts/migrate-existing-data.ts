#!/usr/bin/env tsx

/**
 * Migration script to re-process all existing internships with improved data extraction
 * 
 * This script will:
 * 1. Fetch all existing internships from the database
 * 2. Re-run normalization with new extractors
 * 3. Attempt to enrich from URLs (with rate limiting)
 * 4. Update database with new fields
 * 5. Generate a summary report
 * 
 * Usage:
 *   npm run migrate-data -- --dry-run
 *   npm run migrate-data -- --batch-size=100 --concurrency=10
 *   npm run migrate-data -- --skip-existing
 */

import { dataEnrichmentService } from '../src/services/data-enrichment-service';
import { normalizationEngine } from '../src/services/normalization-engine';
import { supabase } from '../src/lib/supabase';
import { logger } from '../src/lib/logger';
import { RawInternshipData } from '../src/types';

interface MigrationOptions {
  dryRun: boolean;
  batchSize: number;
  concurrency: number;
  skipExisting: boolean;
  maxRetries: number;
  retryDelay: number;
  verbose: boolean;
}

interface MigrationResult {
  success: boolean;
  totalProcessed: number;
  successfullyEnriched: number;
  skippedExisting: number;
  failedEnrichment: number;
  averageConfidenceScore: number;
  executionTime: number;
  errors: string[];
}

class DataMigrationService {
  private options: MigrationOptions;

  constructor(options: Partial<MigrationOptions> = {}) {
    this.options = {
      dryRun: false,
      batchSize: 50,
      concurrency: 5,
      skipExisting: false,
      maxRetries: 3,
      retryDelay: 1000,
      verbose: false,
      ...options
    };
  }

  /**
   * Run the complete migration process
   */
  async runMigration(): Promise<MigrationResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    logger.info('Starting data migration', {
      component: 'migration',
      operation: 'start',
      options: this.options
    });

    try {
      // Step 1: Get initial metrics
      const initialMetrics = await this.getInitialMetrics();
      logger.info('Initial metrics', initialMetrics);

      // Step 2: Run enrichment process
      const enrichmentResult = await dataEnrichmentService.enrichAllInternships({
        batchSize: this.options.batchSize,
        concurrency: this.options.concurrency,
        dryRun: this.options.dryRun,
        skipExisting: this.options.skipExisting,
        maxRetries: this.options.maxRetries,
        retryDelay: this.options.retryDelay
      });

      if (!enrichmentResult.success) {
        throw new Error(`Enrichment failed: ${enrichmentResult.errors.join(', ')}`);
      }

      // Step 3: Get final metrics
      const finalMetrics = await dataEnrichmentService.getEnrichmentMetrics();
      finalMetrics.executionTime = Date.now() - startTime;

      // Step 4: Generate summary report
      const summary = this.generateSummary(initialMetrics, finalMetrics, enrichmentResult);
      this.printSummary(summary);

      logger.info('Data migration completed successfully', {
        component: 'migration',
        operation: 'complete',
        ...finalMetrics
      });

      return {
        success: true,
        totalProcessed: finalMetrics.totalProcessed,
        successfullyEnriched: finalMetrics.successfullyEnriched,
        skippedExisting: finalMetrics.skippedExisting,
        failedEnrichment: finalMetrics.failedEnrichment,
        averageConfidenceScore: finalMetrics.averageConfidenceScore,
        executionTime: finalMetrics.executionTime,
        errors: enrichmentResult.errors
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Data migration failed', {
        component: 'migration',
        operation: 'error',
        error: errorMessage
      });

      return {
        success: false,
        totalProcessed: 0,
        successfullyEnriched: 0,
        skippedExisting: 0,
        failedEnrichment: 0,
        averageConfidenceScore: 0,
        executionTime: Date.now() - startTime,
        errors: [errorMessage]
      };
    }
  }

  /**
   * Get initial metrics before migration
   */
  private async getInitialMetrics(): Promise<{
    totalInternships: number;
    alreadyEnriched: number;
    needsEnrichment: number;
  }> {
    const { data: internships, error } = await supabase
      .from('internships')
      .select('id, exact_role, requirements, pay_rate_min, graduation_year')
      .eq('is_archived', false);

    if (error) {
      throw new Error(`Failed to fetch initial metrics: ${error.message}`);
    }

    const totalInternships = internships?.length || 0;
    let alreadyEnriched = 0;

    for (const internship of internships || []) {
      const isEnriched = !!(
        internship.exact_role ||
        internship.requirements ||
        internship.pay_rate_min ||
        internship.graduation_year?.length
      );

      if (isEnriched) {
        alreadyEnriched++;
      }
    }

    return {
      totalInternships,
      alreadyEnriched,
      needsEnrichment: totalInternships - alreadyEnriched
    };
  }

  /**
   * Generate summary report
   */
  private generateSummary(
    initial: any,
    final: any,
    enrichment: any
  ): {
    totalInternships: number;
    processed: number;
    enriched: number;
    skipped: number;
    failed: number;
    improvement: number;
    averageConfidence: number;
    executionTime: number;
  } {
    const improvement = final.successfullyEnriched - initial.alreadyEnriched;

    return {
      totalInternships: initial.totalInternships,
      processed: enrichment.processed,
      enriched: enrichment.enriched,
      skipped: enrichment.skipped,
      failed: enrichment.failed,
      improvement,
      averageConfidence: final.averageConfidenceScore,
      executionTime: final.executionTime
    };
  }

  /**
   * Print summary to console
   */
  private printSummary(summary: any): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 DATA MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Internships: ${summary.totalInternships}`);
    console.log(`Processed: ${summary.processed}`);
    console.log(`Successfully Enriched: ${summary.enriched}`);
    console.log(`Skipped: ${summary.skipped}`);
    console.log(`Failed: ${summary.failed}`);
    console.log(`Improvement: +${summary.improvement} enriched internships`);
    console.log(`Average Confidence Score: ${summary.averageConfidence.toFixed(1)}/100`);
    console.log(`Execution Time: ${(summary.executionTime / 1000).toFixed(1)}s`);
    
    if (this.options.dryRun) {
      console.log('\n⚠️  DRY RUN MODE - No changes were made to the database');
    }
    
    console.log('='.repeat(60) + '\n');
  }

  /**
   * Validate database connection and schema
   */
  async validateEnvironment(): Promise<boolean> {
    try {
      // Test database connection
      const { error: dbError } = await supabase.from('internships').select('id').limit(1);
      if (dbError) {
        console.error('❌ Database connection failed:', dbError.message);
        return false;
      }

      // Test enrichment service
      const enrichmentHealthy = await dataEnrichmentService.healthCheck();
      if (!enrichmentHealthy) {
        console.error('❌ Enrichment service health check failed');
        return false;
      }

      // Check if new columns exist
      const { data: columns, error: columnError } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'internships')
        .in('column_name', ['graduation_year', 'exact_role', 'requirements', 'pay_rate_min']);

      if (columnError) {
        console.error('❌ Failed to check database schema:', columnError.message);
        return false;
      }

      const requiredColumns = ['graduation_year', 'exact_role', 'requirements', 'pay_rate_min'];
      const existingColumns = columns?.map(c => c.column_name) || [];
      const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

      if (missingColumns.length > 0) {
        console.error('❌ Missing required database columns:', missingColumns.join(', '));
        console.error('Please run the database migration first: npm run db:migrate');
        return false;
      }

      console.log('✅ Environment validation passed');
      return true;

    } catch (error) {
      console.error('❌ Environment validation failed:', error);
      return false;
    }
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): Partial<MigrationOptions> {
  const args = process.argv.slice(2);
  const options: Partial<MigrationOptions> = {};

  for (const arg of args) {
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--skip-existing') {
      options.skipExisting = true;
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else if (arg.startsWith('--batch-size=')) {
      options.batchSize = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--concurrency=')) {
      options.concurrency = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--max-retries=')) {
      options.maxRetries = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--retry-delay=')) {
      options.retryDelay = parseInt(arg.split('=')[1]);
    } else if (arg === '--help') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

/**
 * Print help information
 */
function printHelp(): void {
  console.log(`
Data Migration Script

Usage: npm run migrate-data [options]

Options:
  --dry-run              Run in dry-run mode (no database changes)
  --skip-existing        Skip internships that are already enriched
  --batch-size=N         Process N internships per batch (default: 50)
  --concurrency=N        Process N internships concurrently (default: 5)
  --max-retries=N        Maximum retry attempts for failed enrichments (default: 3)
  --retry-delay=N        Delay between retries in milliseconds (default: 1000)
  --verbose              Enable verbose logging
  --help                 Show this help message

Examples:
  npm run migrate-data -- --dry-run
  npm run migrate-data -- --batch-size=100 --concurrency=10
  npm run migrate-data -- --skip-existing --verbose
`);
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  try {
    const options = parseArgs();
    const migration = new DataMigrationService(options);

    console.log('🚀 Starting data migration...\n');

    // Validate environment
    const isValid = await migration.validateEnvironment();
    if (!isValid) {
      console.error('❌ Environment validation failed. Exiting.');
      process.exit(1);
    }

    // Run migration
    const result = await migration.runMigration();

    if (result.success) {
      console.log('✅ Migration completed successfully!');
      process.exit(0);
    } else {
      console.error('❌ Migration failed:', result.errors.join(', '));
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}

export { DataMigrationService };


