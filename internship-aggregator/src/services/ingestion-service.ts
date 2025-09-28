// Ingestion service that combines data fetching and normalization
import { dataFetcher, FetchOptions, FetchResult } from './data-fetcher';
import { normalizationEngine, NormalizationResult, NormalizationMetrics } from './normalization-engine';
import { supabase, getSupabaseAdmin } from '../lib/supabase';
import { DatabaseInternship, InsertInternship } from '../types/database';
import { NormalizedInternship } from '../types';
import { log } from '../lib/logger';

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

    log.ingestionStart('full', options);

    try {
      // Step 1: Fetch raw data
      log.info('Fetching raw internship data', { component: 'ingestion', operation: 'fetch' });
      const fetchResults = await dataFetcher.fetchInternships(options);
      
      const totalFetched = fetchResults.reduce((sum, r) => sum + r.data.length, 0);
      log.dataFetch('all-sources', totalFetched, Date.now() - startTime);

      // Collect all raw data
      const allRawData = fetchResults.flatMap(result => result.data);

      // Step 2: Normalize data
      log.info('Normalizing internship data', { component: 'ingestion', operation: 'normalize' });
      normalizationEngine.resetProcessedHashes(); // Reset for fresh ingestion
      
      const { results: normalizationResults, metrics: normalizationMetrics } = 
        await normalizationEngine.normalizeMany(allRawData);

      log.normalization(
        normalizationMetrics.totalProcessed,
        normalizationMetrics.successful,
        normalizationMetrics.failed,
        normalizationMetrics.executionTime
      );

      // Step 3: Store in database (if not dry run)
      let databaseMetrics = {
        inserted: 0,
        updated: 0,
        skipped: 0,
        errors: 0
      };

      if (!options.dryRun) {
        console.log('Storing internships in database...');
        databaseMetrics = await this.storeInternships(
          normalizationResults.filter(r => r.success && r.data).map(r => r.data!),
          options
        );
        console.log(`Database: ${databaseMetrics.inserted} inserted, ${databaseMetrics.updated} updated, ${databaseMetrics.skipped} skipped`);
      } else {
        console.log('Dry run mode - skipping database storage');
      }

      // Collect all errors
      fetchResults.forEach(result => errors.push(...result.errors));
      normalizationResults.forEach(result => errors.push(...result.errors));

      const executionTime = Date.now() - startTime;
      log.ingestionComplete('full', {
        fetched: totalFetched,
        normalized: normalizationMetrics.successful,
        inserted: databaseMetrics.inserted,
        updated: databaseMetrics.updated,
        executionTime
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
      log.ingestionError('full', error instanceof Error ? error : new Error(errorMessage));
      
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
    internships: NormalizedInternship[],
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
    batch: NormalizedInternship[],
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
        const companyId = await this.ensureCompanyExists(internship.company);
        
        // Then, ensure source exists
        const sourceId = await this.ensureSourceExists(internship.source);

        // Check if internship already exists by canonical hash
        const { data: existing } = await supabase
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
          const { error } = await supabase
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
          const { error } = await supabase
            .from('internships')
            .insert(this.convertToInsertFormat(internship, companyId, sourceId));

          if (error) {
            console.error('Insert error:', error);
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
    // Check if company exists
    const { data: existing } = await supabase
      .from('companies')
      .select('id')
      .eq('name', companyName)
      .single();

    if (existing) {
      return existing.id;
    }

    // Create new company
    const { data: newCompany, error } = await supabase
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
    // Check if source exists
    const { data: existing } = await supabase
      .from('sources')
      .select('id')
      .eq('name', sourceName)
      .single();

    if (existing) {
      return existing.id;
    }

    // Create new source
    const { data: newSource, error } = await supabase
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
    internship: NormalizedInternship,
    companyId: string,
    sourceId: string
  ): InsertInternship {
    return {
      title: internship.title,
      company_id: companyId,
      source_id: sourceId,
      url: internship.applicationUrl, // Use application URL as primary URL
      application_url: internship.applicationUrl,
      description: internship.description,
      location: internship.location,
      is_remote: internship.isRemote,
      work_type: internship.workType,
      posted_at: internship.postedAt.toISOString(),
      application_deadline: internship.applicationDeadline?.toISOString(),
      normalized_role: internship.normalizedRole,
      relevant_majors: internship.relevantMajors,
      skills: internship.skills,
      eligibility_year: internship.eligibilityYear,
      internship_cycle: internship.internshipCycle,
      is_program_specific: internship.isProgramSpecific,
      source_type: internship.sourceType,
      canonical_hash: internship.canonicalHash,
      is_archived: false,
      raw_payload: null // Could store original raw data if needed
    };
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