// Ingestion service that combines data fetching and normalization
import { dataFetcher, FetchOptions, FetchResult } from './data-fetcher';
import { normalizationEngine, NormalizedInternshipData, NormalizationMetrics } from './data-processing/normalization-engine';
import { supabase, getSupabaseAdmin } from '../lib/supabase';
import { DatabaseInternship, InsertInternship } from '@/types/database';
import { NormalizedInternship } from '../types';
import { logger } from '../lib/logger';

export interface IngestionOptions extends FetchOptions {
  skipDuplicates?: boolean;
  dryRun?: boolean;
  batchSize?: number;
}

export interface IngestionResult {
  success: boolean;
  fetchResults: FetchResult[];
  normalizationMetrics: NormalizationMetrics;
  databaseMetrics: {
    inserted: number;
    updated: number;
    skipped: number;
    errors: number;
  };
  errors: string[];
  executionTime: number;
}

export class IngestionService {
  /**
   * Run complete ingestion pipeline: fetch -> normalize -> store
   */
  async ingest(options: IngestionOptions = {}): Promise<IngestionResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    logger.info('Starting full ingestion', { component: 'ingestion', action: 'start', metadata: { options } });

    try {
      // Step 1: Fetch raw data
      logger.info('Fetching raw internship data', { component: 'ingestion', action: 'fetch' });
      const fetchResults = await dataFetcher.fetchInternships(options);
      
      const totalFetched = fetchResults.reduce((sum, r) => sum + r.data.length, 0);
      logger.info('Data fetch completed', { component: 'ingestion', action: 'fetch', metadata: { totalFetched, duration: Date.now() - startTime } });

      // Collect all raw data
      const allRawData = fetchResults.flatMap(result => result.data);

      // Step 2: Normalize data
      logger.info('Normalizing internship data', { component: 'ingestion', action: 'normalize' });
      console.log(`\n=== NORMALIZATION DEBUG ===`);
      console.log(`Raw data count: ${allRawData.length}`);
      
      // Log first few raw data entries for debugging
      allRawData.slice(0, 3).forEach((item, index) => {
        console.log(`\nRaw data ${index + 1}:`);
        console.log(`  Title: ${item.title}`);
        console.log(`  Company: ${item.company}`);
        console.log(`  URL: ${item.url}`);
        console.log(`  Source: ${item.source}`);
      });
      
      normalizationEngine.reset(); // Reset for fresh ingestion
      
      const { results: normalizationResults, metrics: normalizationMetrics } = 
        await normalizationEngine.normalizeMany(allRawData);

      console.log(`\n=== NORMALIZATION RESULTS ===`);
      console.log(`Total processed: ${normalizationMetrics.totalProcessed}`);
      console.log(`Successful: ${normalizationMetrics.successful}`);
      console.log(`Failed: ${normalizationMetrics.failed}`);
      console.log(`Duplicates skipped: ${normalizationMetrics.duplicatesSkipped}`);
      
      // Log failed normalizations
      const failedResults = normalizationResults.filter(r => !r.success);
      if (failedResults.length > 0) {
        console.log(`\n=== FAILED NORMALIZATIONS ===`);
        failedResults.slice(0, 3).forEach((result, index) => {
          console.log(`\nFailed ${index + 1}:`);
          console.log(`  Errors: ${result.errors.join(', ')}`);
        });
      }

      logger.info('Normalization completed', { 
        component: 'ingestion', 
        action: 'normalize',
        metadata: {
          totalProcessed: normalizationMetrics.totalProcessed,
          successful: normalizationMetrics.successful,
          failed: normalizationMetrics.failed,
          executionTime: normalizationMetrics.executionTime
        }
      });

      // Step 3: Basic URL Validation (TEMPORARILY DISABLED ENRICHMENT)
      console.log('\n=== BASIC URL VALIDATION ===');
      const successfulResults = normalizationResults.filter(r => r.success && r.data);
      console.log(`Processing ${successfulResults.length} internships with basic validation...`);
      
      // For now, just use the normalized results without enrichment
      const validatedResults = successfulResults.map(r => r.data!);
      
      console.log(`✅ Using ${validatedResults.length} internships (enrichment temporarily disabled)`);

      // Step 4: Store in database (if not dry run)
      let databaseMetrics = {
        inserted: 0,
        updated: 0,
        skipped: 0,
        errors: 0
      };

      if (!options.dryRun) {
        console.log('Storing internships in database...');
        databaseMetrics = await this.storeInternships(validatedResults, options);
        console.log(`Database: ${databaseMetrics.inserted} inserted, ${databaseMetrics.updated} updated, ${databaseMetrics.skipped} skipped`);
      } else {
        console.log('Dry run mode - skipping database storage');
      }

      // Collect all errors
      fetchResults.forEach(result => errors.push(...result.errors));
      normalizationResults.forEach(result => errors.push(...result.errors));

      const executionTime = Date.now() - startTime;
      logger.info('Ingestion completed successfully', {
        component: 'ingestion',
        action: 'complete',
        metadata: {
          fetched: totalFetched,
          normalized: normalizationMetrics.successful,
          inserted: databaseMetrics.inserted,
          updated: databaseMetrics.updated,
          executionTime
        }
      });

      return {
        success: true,
        fetchResults,
        normalizationMetrics,
        databaseMetrics,
        errors,
        executionTime
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Ingestion failed', {
        component: 'ingestion',
        action: 'error',
        metadata: { error: errorMessage }
      } as any);
      
      return {
        success: false,
        fetchResults: [],
        normalizationMetrics: {
          totalProcessed: 0,
          successful: 0,
          failed: 0,
          duplicatesSkipped: 0,
          executionTime: 0
        },
        databaseMetrics: {
          inserted: 0,
          updated: 0,
          skipped: 0,
          errors: 0
        },
        errors: [errorMessage],
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Store normalized internships in the database
   */
  private async storeInternships(
    internships: NormalizedInternshipData[],
    options: IngestionOptions
  ): Promise<{
    inserted: number;
    updated: number;
    skipped: number;
    errors: number;
  }> {
    const batchSize = options.batchSize || 50;
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    // Process in batches
    for (let i = 0; i < internships.length; i += batchSize) {
      const batch = internships.slice(i, i + batchSize);
      
      try {
        const batchResult = await this.processBatch(batch, options);
        inserted += batchResult.inserted;
        updated += batchResult.updated;
        skipped += batchResult.skipped;
        errors += batchResult.errors;
      } catch (error) {
        console.error(`Batch ${Math.floor(i / batchSize) + 1} failed:`, error);
        errors += batch.length;
      }
    }

    return { inserted, updated, skipped, errors };
  }

  /**
   * Process a batch of internships
   */
  private async processBatch(
    batch: NormalizedInternshipData[],
    options: IngestionOptions
  ): Promise<{
    inserted: number;
    updated: number;
    skipped: number;
    errors: number;
  }> {
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const internship of batch) {
      try {
        // First, ensure company exists
        console.log(`Processing internship: ${internship.title} at ${internship.company}`);
        const companyId = await this.ensureCompanyExists(internship.company);
        console.log(`Company ID: ${companyId}`);
        
        // Then, ensure source exists
        const sourceId = await this.ensureSourceExists(internship.source);
        console.log(`Source ID: ${sourceId}`);

        // Use admin client for server-side operations
        const adminClient = getSupabaseAdmin();
        
        // Check if internship already exists by canonical hash
        const { data: existing } = await adminClient
          .from('internships')
          .select('id, updated_at')
          .eq('canonical_hash', internship.canonicalHash)
          .single();

        if (existing) {
          if (options.skipDuplicates) {
            skipped++;
            continue;
          }
          
          // Update existing internship
          const { error } = await adminClient
            .from('internships')
            .update(this.convertToInsertFormat(internship, companyId, sourceId))
            .eq('id', existing.id);

          if (error) {
            console.error('Update error:', error);
            errors++;
          } else {
            updated++;
          }
        } else {
          // Insert new internship
          const { error } = await adminClient
            .from('internships')
            .insert(this.convertToInsertFormat(internship, companyId, sourceId));

          if (error) {
            console.error('Insert error:', error);
            console.error('Data being inserted:', JSON.stringify(this.convertToInsertFormat(internship, companyId, sourceId), null, 2));
            console.error('Company ID:', companyId);
            console.error('Source ID:', sourceId);
            errors++;
          } else {
            inserted++;
          }
        }
      } catch (error) {
        console.error('Processing error for internship:', internship.title, error);
        errors++;
      }
    }

    return { inserted, updated, skipped, errors };
  }

  /**
   * Ensure company exists in database, create if not
   */
  private async ensureCompanyExists(companyName: string): Promise<string> {
    const adminClient = getSupabaseAdmin();
    
    // Check if company exists
    const { data: existing } = await adminClient
      .from('companies')
      .select('id')
      .eq('name', companyName)
      .single();

    if (existing) {
      return existing.id;
    }

    // Create new company
    const { data: newCompany, error } = await adminClient
      .from('companies')
      .insert({ name: companyName })
      .select('id')
      .single();

    if (error || !newCompany) {
      throw new Error(`Failed to create company ${companyName}: ${error?.message}`);
    }

    return newCompany.id;
  }

  /**
   * Ensure source exists in database, create if not
   */
  private async ensureSourceExists(sourceName: string): Promise<string> {
    const adminClient = getSupabaseAdmin();
    
    // Check if source exists
    const { data: existing } = await adminClient
      .from('sources')
      .select('id')
      .eq('name', sourceName)
      .single();

    if (existing) {
      return existing.id;
    }

    // Create new source
    const { data: newSource, error } = await adminClient
      .from('sources')
      .insert({
        name: sourceName,
        type: 'api', // Default type
        is_active: true,
        error_count: 0
      })
      .select('id')
      .single();

    if (error || !newSource) {
      throw new Error(`Failed to create source ${sourceName}: ${error?.message}`);
    }

    return newSource.id;
  }

  /**
   * Convert normalized internship to database insert format
   */
  private convertToInsertFormat(
    internship: NormalizedInternshipData,
    companyId: string,
    sourceId: string
  ): InsertInternship {
    // Extract new quality fields from raw payload if available
    const rawPayload = (internship as any).rawPayload || {};
    const enrichedData = rawPayload as any;

    return {
      title: internship.title,
      company_id: companyId,
      source_id: sourceId,
      url: internship.applicationUrl || 'https://example.com', // Use application URL or fallback
      application_url: internship.applicationUrl,
      description: internship.description,
      location: internship.location,
      is_remote: internship.workType === 'remote' || internship.workType === 'hybrid',
      work_type: internship.compensation.type as any, // Map compensation type to work type
      posted_at: internship.postedAt,
      application_deadline: internship.deadline || undefined,
      normalized_role: internship.role as any,
      relevant_majors: internship.majors as any,
      skills: internship.skills,
      eligibility_year: internship.eligibility.yearLevel as any,
      internship_cycle: internship.internshipCycle,
      is_program_specific: false, // Determine from data if needed
      source_type: internship.sourceType,
      canonical_hash: internship.canonicalHash,
      is_archived: false,
      raw_payload: rawPayload,
      // New quality fields
      graduation_year: internship.graduationYear || [],
      exact_role: internship.exactRole || this.cleanExactRole(internship.title),
      requirements: internship.requirements || '',
      pay_rate_min: internship.payRateDetails.payRateMin,
      pay_rate_max: internship.payRateDetails.payRateMax,
      pay_rate_currency: internship.payRateDetails.payRateCurrency || 'USD',
      pay_rate_type: internship.payRateDetails.payRateType || 'unknown'
    };
  }

  /**
   * Clean exact role title by removing artifacts but keeping the full title
   */
  private cleanExactRole(title: string): string {
    if (!title) return '';
    
    return title
      // Remove seasonal/year indicators
      .replace(/\s*-\s*(summer|fall|spring|winter)\s*202[0-9]/i, '')
      .replace(/\s*(summer|fall|spring|winter)\s*202[0-9]/i, '')
      // Remove degree requirements
      .replace(/\s*\(bs\/ms\)/i, '')
      .replace(/\s*\(bachelor's\)/i, '')
      .replace(/\s*\(master's\)/i, '')
      // Remove class year indicators
      .replace(/\s*class\s+of\s+202[0-9]/i, '')
      .replace(/\s*graduating\s+in\s+202[0-9]/i, '')
      // Remove emojis
      .replace(/🛂\s*/, '')
      .replace(/📍\s*/, '')
      .replace(/💰\s*/, '')
      // Clean up whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Run ingestion for specific companies
   */
  async ingestCompanies(companies: string[], options: Omit<IngestionOptions, 'companies'> = {}): Promise<IngestionResult> {
    return this.ingest({
      ...options,
      companies,
      includePrograms: true
    });
  }

  /**
   * Run ingestion for diversity programs only
   */
  async ingestDiversityPrograms(options: Omit<IngestionOptions, 'includePrograms'> = {}): Promise<IngestionResult> {
    return this.ingest({
      ...options,
      includePrograms: true,
      maxResults: 20
    });
  }

  /**
   * Health check for ingestion service
   */
  async healthCheck(): Promise<{
    dataFetcher: Record<string, boolean>;
    database: boolean;
    overall: boolean;
  }> {
    const dataFetcherHealth = await dataFetcher.healthCheck();
    
    // Test database connection
    let databaseHealth = false;
    try {
      const { error } = await supabase.from('companies').select('id').limit(1);
      databaseHealth = !error;
    } catch {
      databaseHealth = false;
    }

    const overall = Object.values(dataFetcherHealth).every(Boolean) && databaseHealth;

    return {
      dataFetcher: dataFetcherHealth,
      database: databaseHealth,
      overall
    };
  }
}

// Export default instance
export const ingestionService = new IngestionService();