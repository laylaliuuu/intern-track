import { exaClient } from '../lib/exa-client';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

export interface DiscoveredCompany {
  name: string;
  domain: string;
  description: string;
  industry: string;
  fundingStage?: string;
  employeeCount?: number;
  signals: string[];
  discoverySource: 'yc' | 'funding' | 'growth' | 'tech_stack' | 'hiring_signal';
  confidenceScore: number;
  lastSeen: string;
}

export interface DiscoveryMetrics {
  totalDiscovered: number;
  newCompanies: number;
  existingCompanies: number;
  highConfidence: number;
  bySource: Record<string, number>;
  executionTime: number;
}

export class CompanyDiscoveryPipeline {
  private readonly DISCOVERY_SOURCES = {
    YC_COMPANIES: 'yc',
    FUNDING_ANNOUNCEMENTS: 'funding',
    GROWTH_SIGNALS: 'growth',
    TECH_STACK_CHANGES: 'tech_stack',
    HIRING_SIGNALS: 'hiring_signal'
  };

  /**
   * Run the complete company discovery pipeline
   */
  async runDiscovery(options: {
    maxCompanies?: number;
    minConfidenceScore?: number;
    sources?: string[];
  } = {}): Promise<DiscoveryMetrics> {
    const startTime = Date.now();
    const { maxCompanies = 100, minConfidenceScore = 0.6, sources = Object.values(this.DISCOVERY_SOURCES) } = options;

    logger.info('Starting company discovery pipeline', { maxCompanies, minConfidenceScore, sources });

    const allDiscoveredCompanies: DiscoveredCompany[] = [];

    // Run discovery from each source
    for (const source of sources) {
      try {
        const companies = await this.discoverFromSource(source, maxCompanies);
        allDiscoveredCompanies.push(...companies);
      } catch (error) {
        logger.error(`Discovery failed for source ${source}`, { error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    // Process and deduplicate results
    const processedCompanies = this.processAndDeduplicate(allDiscoveredCompanies);
    
    // Filter by confidence score
    const filteredCompanies = processedCompanies.filter(company => 
      company.confidenceScore >= minConfidenceScore
    );

    // Store in database
    const metrics = await this.storeDiscoveredCompanies(filteredCompanies);

    const executionTime = Date.now() - startTime;
    logger.info('Company discovery pipeline completed', { 
      totalDiscovered: allDiscoveredCompanies.length,
      processed: processedCompanies.length,
      filtered: filteredCompanies.length,
      stored: metrics.newCompanies,
      executionTime
    });

    return {
      totalDiscovered: allDiscoveredCompanies.length,
      newCompanies: metrics.newCompanies,
      existingCompanies: metrics.existingCompanies,
      highConfidence: filteredCompanies.filter(c => c.confidenceScore >= 0.8).length,
      bySource: this.groupBySource(filteredCompanies),
      executionTime
    };
  }

  /**
   * Discover companies from a specific source
   */
  private async discoverFromSource(source: string, maxCompanies: number): Promise<DiscoveredCompany[]> {
    switch (source) {
      case this.DISCOVERY_SOURCES.YC_COMPANIES:
        return this.discoverYCCompanies(maxCompanies);
      
      case this.DISCOVERY_SOURCES.FUNDING_ANNOUNCEMENTS:
        return this.discoverFromFundingAnnouncements(maxCompanies);
      
      case this.DISCOVERY_SOURCES.GROWTH_SIGNALS:
        return this.discoverFromGrowthSignals(maxCompanies);
      
      case this.DISCOVERY_SOURCES.TECH_STACK_CHANGES:
        return this.discoverFromTechStackChanges(maxCompanies);
      
      case this.DISCOVERY_SOURCES.HIRING_SIGNALS:
        return this.discoverFromHiringSignals(maxCompanies);
      
      default:
        logger.warn(`Unknown discovery source: ${source}`);
        return [];
    }
  }

  /**
   * Discover YC-backed companies
   */
  private async discoverYCCompanies(maxCompanies: number): Promise<DiscoveredCompany[]> {
    try {
      const results = await exaClient.discoverHiddenCompanies({
        categories: ['yc'],
        companySize: 'startup',
        limit: maxCompanies
      });

      return results.companies.map(company => ({
        ...company,
        discoverySource: 'yc' as const,
        confidenceScore: this.calculateYCConfidenceScore(company),
        lastSeen: new Date().toISOString()
      }));
    } catch (error) {
      logger.error('YC company discovery failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return [];
    }
  }

  /**
   * Discover companies from funding announcements
   */
  private async discoverFromFundingAnnouncements(maxCompanies: number): Promise<DiscoveredCompany[]> {
    try {
      const results = await exaClient.findCompaniesByCriteria({
        companyStage: 'series-a',
        hiringSignals: ['hiring', 'expanding', 'growing team']
      });

      return results.map(company => ({
        ...company,
        discoverySource: 'funding' as const,
        confidenceScore: this.calculateFundingConfidenceScore(company),
        lastSeen: new Date().toISOString()
      }));
    } catch (error) {
      logger.error('Funding announcement discovery failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return [];
    }
  }

  /**
   * Discover companies from growth signals
   */
  private async discoverFromGrowthSignals(maxCompanies: number): Promise<DiscoveredCompany[]> {
    try {
      const results = await exaClient.findCompaniesByCriteria({
        hiringSignals: ['growing', 'expanding', 'hiring engineers', 'new team members']
      });

      return results.map(company => ({
        ...company,
        discoverySource: 'growth' as const,
        confidenceScore: this.calculateGrowthConfidenceScore(company),
        lastSeen: new Date().toISOString()
      }));
    } catch (error) {
      logger.error('Growth signal discovery failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return [];
    }
  }

  /**
   * Discover companies from tech stack changes
   */
  private async discoverFromTechStackChanges(maxCompanies: number): Promise<DiscoveredCompany[]> {
    try {
      const results = await exaClient.findCompaniesByCriteria({
        techStack: ['React', 'Node.js', 'Python', 'AWS', 'Docker', 'Kubernetes'],
        hiringSignals: ['hiring', 'engineers', 'developers']
      });

      return results.map(company => ({
        ...company,
        discoverySource: 'tech_stack' as const,
        confidenceScore: this.calculateTechStackConfidenceScore(company),
        lastSeen: new Date().toISOString()
      }));
    } catch (error) {
      logger.error('Tech stack discovery failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return [];
    }
  }

  /**
   * Discover companies from hiring signals
   */
  private async discoverFromHiringSignals(maxCompanies: number): Promise<DiscoveredCompany[]> {
    try {
      const results = await exaClient.findCompaniesByCriteria({
        hiringSignals: ['hiring interns', 'summer internship', 'internship program', 'co-op']
      });

      return results.map(company => ({
        ...company,
        discoverySource: 'hiring_signal' as const,
        confidenceScore: this.calculateHiringConfidenceScore(company),
        lastSeen: new Date().toISOString()
      }));
    } catch (error) {
      logger.error('Hiring signal discovery failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return [];
    }
  }

  /**
   * Process and deduplicate discovered companies
   */
  private processAndDeduplicate(companies: DiscoveredCompany[]): DiscoveredCompany[] {
    const companyMap = new Map<string, DiscoveredCompany>();

    companies.forEach(company => {
      const key = company.domain || company.name.toLowerCase();
      const existing = companyMap.get(key);

      if (existing) {
        // Merge signals and update confidence score
        existing.signals = [...new Set([...existing.signals, ...company.signals])];
        existing.confidenceScore = Math.max(existing.confidenceScore, company.confidenceScore);
        existing.lastSeen = company.lastSeen;
      } else {
        companyMap.set(key, company);
      }
    });

    return Array.from(companyMap.values());
  }

  /**
   * Store discovered companies in database
   */
  private async storeDiscoveredCompanies(companies: DiscoveredCompany[]): Promise<{
    newCompanies: number;
    existingCompanies: number;
  }> {
    let newCompanies = 0;
    let existingCompanies = 0;

    for (const company of companies) {
      try {
        // Check if company already exists
        const { data: existing } = await supabase
          .from('companies')
          .select('id')
          .eq('name', company.name)
          .single();

        if (existing) {
          existingCompanies++;
          // Update existing company with new signals
          await supabase
            .from('company_metadata')
            .upsert({
              company_id: existing.id,
              industry: [company.industry],
              funding_stage: company.fundingStage,
              employee_count_range: company.employeeCount ? this.getEmployeeRange(company.employeeCount) : null
            });
        } else {
          newCompanies++;
          // Insert new company
          const { data: newCompany } = await supabase
        .from('companies')
            .insert({
              name: company.name,
              description: company.description,
              website: company.domain ? `https://${company.domain}` : null
            })
            .select('id')
            .single();

          if (newCompany) {
            // Insert company metadata
            await supabase
              .from('company_metadata')
              .insert({
                company_id: newCompany.id,
                size_category: this.getSizeCategory(company.employeeCount),
                industry: [company.industry],
                funding_stage: company.fundingStage,
                employee_count_range: company.employeeCount ? this.getEmployeeRange(company.employeeCount) : null
              });
          }
        }
      } catch (error) {
        logger.error(`Failed to store company ${company.name}`, { error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    return { newCompanies, existingCompanies };
  }

  /**
   * Calculate confidence score for YC companies
   */
  private calculateYCConfidenceScore(company: any): number {
    let score = 0.7; // Base score for YC companies
    
    if (company.signals.includes('yc-backed')) score += 0.2;
    if (company.signals.includes('hiring')) score += 0.1;
    if (company.employeeCount && company.employeeCount < 50) score += 0.1;
    if (company.fundingStage === 'seed' || company.fundingStage === 'series-a') score += 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * Calculate confidence score for funding announcements
   */
  private calculateFundingConfidenceScore(company: any): number {
    let score = 0.6; // Base score for funding announcements
    
    if (company.signals.includes('series-a') || company.signals.includes('series-b')) score += 0.2;
    if (company.signals.includes('hiring')) score += 0.1;
    if (company.signals.includes('growing')) score += 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * Calculate confidence score for growth signals
   */
  private calculateGrowthConfidenceScore(company: any): number {
    let score = 0.5; // Base score for growth signals
    
    if (company.signals.includes('growing')) score += 0.2;
    if (company.signals.includes('hiring')) score += 0.2;
    if (company.signals.includes('tech-hiring')) score += 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * Calculate confidence score for tech stack changes
   */
  private calculateTechStackConfidenceScore(company: any): number {
    let score = 0.4; // Base score for tech stack signals
    
    if (company.signals.includes('tech-hiring')) score += 0.3;
    if (company.signals.includes('hiring')) score += 0.2;
    if (company.industry === 'technology') score += 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * Calculate confidence score for hiring signals
   */
  private calculateHiringConfidenceScore(company: any): number {
    let score = 0.8; // High base score for explicit hiring signals
    
    if (company.signals.includes('internship-program')) score += 0.1;
    if (company.signals.includes('hiring')) score += 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * Get employee count range category
   */
  private getEmployeeRange(count: number): string {
    if (count < 10) return '1-10';
    if (count < 50) return '11-50';
    if (count < 200) return '51-200';
    if (count < 1000) return '201-1000';
    return '1000+';
  }

  /**
   * Get size category from employee count
   */
  private getSizeCategory(count?: number): string {
    if (!count) return 'startup';
    if (count < 50) return 'startup';
    if (count < 200) return 'small';
    if (count < 1000) return 'medium';
    return 'large';
  }

  /**
   * Group companies by discovery source
   */
  private groupBySource(companies: DiscoveredCompany[]): Record<string, number> {
    return companies.reduce((acc, company) => {
      acc[company.discoverySource] = (acc[company.discoverySource] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Get discovery statistics
   */
  async getDiscoveryStats(): Promise<{
    totalDiscovered: number;
    bySource: Record<string, number>;
    highConfidence: number;
    lastDiscovery: string | null;
  }> {
    const { data: companies } = await supabase
        .from('companies')
      .select(`
        id,
        created_at,
        company_metadata (
          size_category,
          funding_stage
        )
      `)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

    const totalDiscovered = companies?.length || 0;
    const highConfidence = companies?.filter(c => c.company_metadata?.funding_stage === 'series-a' || c.company_metadata?.funding_stage === 'series-b').length || 0;
    const lastDiscovery = companies?.length ? companies[0]?.created_at : null;

      return {
      totalDiscovered,
      bySource: {}, // Would need to track this separately
      highConfidence,
      lastDiscovery
    };
  }
}

export const companyDiscoveryPipeline = new CompanyDiscoveryPipeline();