import { supabase } from '../lib/supabase';
import { scoringEngine } from './data-processing/scoring-engine';

export interface HiddenGem {
  id: string;
  company: string;
  title: string;
  location: string;
  url: string;
  gemType: 'early_stage' | 'high_return_rate' | 'excellent_learning' | 'low_competition';
  gemScore: number;
  reasoning: string;
  signals: string[];
  postedAt: string;
  applicationUrl: string;
}

export interface HiddenGemsFilters {
  gemTypes?: string[];
  minGemScore?: number;
  maxCompetition?: number;
  industries?: string[];
  locations?: string[];
  limit?: number;
}

export class HiddenGemsService {
  /**
   * Find hidden gem internships
   */
  async findHiddenGems(filters: HiddenGemsFilters = {}): Promise<HiddenGem[]> {
    const {
      gemTypes = ['early_stage', 'high_return_rate', 'excellent_learning', 'low_competition'],
      minGemScore = 0.7,
      maxCompetition = 0.6,
      industries = [],
      locations = [],
      limit = 50
    } = filters;

    try {
      // Get internships with company metadata
      let query = supabase
        .from('internships')
        .select(`
          id,
          title,
          company,
          location,
          url,
          application_url,
          posted_at,
          quality_score,
          competitiveness_score,
          learning_score,
          brand_value_score,
          companies!inner (
            name,
            company_metadata (
              size_category,
              funding_stage,
              industry,
              employee_count_range
            )
          )
        `)
        .eq('companies.company_metadata.size_category', 'startup')
        .in('companies.company_metadata.funding_stage', ['seed', 'series-a'])
        .order('posted_at', { ascending: false })
        .limit(limit * 2); // Get more to filter

      // Apply filters
      if (industries.length > 0) {
        query = query.overlaps('companies.company_metadata.industry', industries);
      }

      if (locations.length > 0) {
        query = query.or(locations.map(loc => `location.ilike.%${loc}%`).join(','));
      }

      const { data: internships, error } = await query;

      if (error) {
        console.error('Error fetching internships for hidden gems:', error);
        return [];
      }

      if (!internships) return [];

      // Analyze each internship for hidden gem potential
      const hiddenGems: HiddenGem[] = [];

      for (const internship of internships) {
        const gemAnalysis = this.analyzeHiddenGemPotential(internship);
        
        if (gemAnalysis.gemScore >= minGemScore && 
            gemAnalysis.competitivenessScore <= maxCompetition &&
            gemTypes.includes(gemAnalysis.gemType)) {
          
          hiddenGems.push({
            id: internship.id,
            company: internship.company,
            title: internship.title,
            location: internship.location,
            url: internship.url,
            gemType: gemAnalysis.gemType,
            gemScore: gemAnalysis.gemScore,
            reasoning: gemAnalysis.reasoning,
            signals: gemAnalysis.signals,
            postedAt: internship.posted_at,
            applicationUrl: internship.application_url
          });
        }
      }

      // Sort by gem score and return top results
      return hiddenGems
        .sort((a, b) => b.gemScore - a.gemScore)
        .slice(0, limit);

    } catch (error) {
      console.error('Error finding hidden gems:', error);
      return [];
    }
  }

  /**
   * Analyze an internship for hidden gem potential
   */
  private analyzeHiddenGemPotential(internship: any): {
    gemType: 'early_stage' | 'high_return_rate' | 'excellent_learning' | 'low_competition';
    gemScore: number;
    competitivenessScore: number;
    reasoning: string;
    signals: string[];
  } {
    const company = internship.companies;
    const metadata = company?.company_metadata;
    
    let gemType: 'early_stage' | 'high_return_rate' | 'excellent_learning' | 'low_competition' = 'low_competition';
    let gemScore = 0;
    let competitivenessScore = 0;
    const signals: string[] = [];
    const reasoning: string[] = [];

    // Early Stage Analysis
    if (metadata?.funding_stage === 'seed' || metadata?.funding_stage === 'series-a') {
      gemType = 'early_stage';
      gemScore += 0.3;
      competitivenessScore += 0.2; // Early stage = less competition
      signals.push('early-stage');
      reasoning.push('Early-stage startup with high growth potential');
    }

    // Company Size Analysis
    if (metadata?.size_category === 'startup' && metadata?.employee_count_range === '1-10') {
      gemScore += 0.2;
      competitivenessScore += 0.1;
      signals.push('small-team');
      reasoning.push('Small team means more impact and learning opportunities');
    }

    // Learning Score Analysis
    if (internship.learning_score && internship.learning_score >= 80) {
      gemType = 'excellent_learning';
      gemScore += 0.25;
      signals.push('high-learning');
      reasoning.push('Excellent learning environment with mentorship opportunities');
    }

    // Brand Value vs Competition Analysis
    if (internship.brand_value_score && internship.brand_value_score < 60 && 
        internship.competitiveness_score && internship.competitiveness_score < 50) {
      gemType = 'low_competition';
      gemScore += 0.2;
      competitivenessScore = internship.competitiveness_score / 100;
      signals.push('low-competition');
      reasoning.push('Less-known company with lower competition but good opportunities');
    }

    // Industry Analysis
    const highGrowthIndustries = ['fintech', 'healthtech', 'edtech', 'ai', 'blockchain'];
    if (metadata?.industry && highGrowthIndustries.some(industry => 
      metadata.industry.some((ind: string) => ind.toLowerCase().includes(industry)))) {
      gemScore += 0.15;
      signals.push('high-growth-industry');
      reasoning.push('Operating in high-growth industry with future potential');
    }

    // Quality Score Analysis
    if (internship.quality_score && internship.quality_score >= 80) {
      gemScore += 0.1;
      signals.push('high-quality');
      reasoning.push('High-quality internship posting with detailed information');
    }

    // Return Rate Analysis (based on company stage and size)
    if (metadata?.funding_stage === 'series-a' && metadata?.size_category === 'startup') {
      gemType = 'high_return_rate';
      gemScore += 0.2;
      signals.push('high-return-potential');
      reasoning.push('Series A startup likely to offer return offers to strong interns');
    }

    // Final score calculation
    gemScore = Math.min(gemScore, 1.0);
    competitivenessScore = Math.min(competitivenessScore, 1.0);

    return {
      gemType,
      gemScore,
      competitivenessScore,
      reasoning: reasoning.join('; '),
      signals
    };
  }

  /**
   * Get hidden gems by category
   */
  async getHiddenGemsByCategory(): Promise<{
    earlyStage: HiddenGem[];
    highReturnRate: HiddenGem[];
    excellentLearning: HiddenGem[];
    lowCompetition: HiddenGem[];
  }> {
    const [earlyStage, highReturnRate, excellentLearning, lowCompetition] = await Promise.all([
      this.findHiddenGems({ gemTypes: ['early_stage'], limit: 20 }),
      this.findHiddenGems({ gemTypes: ['high_return_rate'], limit: 20 }),
      this.findHiddenGems({ gemTypes: ['excellent_learning'], limit: 20 }),
      this.findHiddenGems({ gemTypes: ['low_competition'], limit: 20 })
    ]);

    return {
      earlyStage,
      highReturnRate,
      excellentLearning,
      lowCompetition
    };
  }

  /**
   * Get hidden gems statistics
   */
  async getHiddenGemsStats(): Promise<{
    totalGems: number;
    byType: Record<string, number>;
    avgGemScore: number;
    topIndustries: Array<{ industry: string; count: number }>;
    topLocations: Array<{ location: string; count: number }>;
  }> {
    const hiddenGems = await this.findHiddenGems({ limit: 1000 });

    const byType = hiddenGems.reduce((acc, gem) => {
      acc[gem.gemType] = (acc[gem.gemType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgGemScore = hiddenGems.reduce((sum, gem) => sum + gem.gemScore, 0) / hiddenGems.length;

    // Get top industries and locations
    const { data: industryStats } = await supabase
      .from('companies')
      .select(`
        company_metadata!inner (
          industry
        )
      `)
      .eq('company_metadata.size_category', 'startup');

    const industryCounts = new Map<string, number>();
    industryStats?.forEach(stat => {
      stat.company_metadata?.industry?.forEach((industry: string) => {
        industryCounts.set(industry, (industryCounts.get(industry) || 0) + 1);
      });
    });

    const topIndustries = Array.from(industryCounts.entries())
      .map(([industry, count]) => ({ industry, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const locationCounts = new Map<string, number>();
    hiddenGems.forEach(gem => {
      const location = gem.location.split(',')[0].trim(); // Get city
      locationCounts.set(location, (locationCounts.get(location) || 0) + 1);
    });

    const topLocations = Array.from(locationCounts.entries())
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalGems: hiddenGems.length,
      byType,
      avgGemScore,
      topIndustries,
      topLocations
    };
  }

  /**
   * Get trending hidden gems (recently posted with high scores)
   */
  async getTrendingHiddenGems(limit = 10): Promise<HiddenGem[]> {
    const hiddenGems = await this.findHiddenGems({ 
      limit: limit * 2,
      minGemScore: 0.8 
    });

    // Filter for recent postings (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    return hiddenGems
      .filter(gem => new Date(gem.postedAt) >= sevenDaysAgo)
      .sort((a, b) => b.gemScore - a.gemScore)
      .slice(0, limit);
  }

  /**
   * Get hidden gems by industry
   */
  async getHiddenGemsByIndustry(industry: string, limit = 20): Promise<HiddenGem[]> {
    return this.findHiddenGems({
      industries: [industry],
      limit
    });
  }

  /**
   * Get hidden gems by location
   */
  async getHiddenGemsByLocation(location: string, limit = 20): Promise<HiddenGem[]> {
    return this.findHiddenGems({
      locations: [location],
      limit
    });
  }
}

export const hiddenGemsService = new HiddenGemsService();