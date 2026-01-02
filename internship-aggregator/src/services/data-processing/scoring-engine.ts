import { supabase } from '../../lib/supabase';
import { NormalizedInternshipData } from './normalization-engine';

export interface InternshipScores {
  quality_score: number;
  competitiveness_score: number;
  learning_score: number;
  brand_value_score: number;
  compensation_score: number;
}

export interface CompanyTier {
  tier: 1 | 2 | 3;
  name: string;
  companies: string[];
}

export class ScoringEngine {
  private companyTiers: CompanyTier[] = [
    {
      tier: 1,
      name: 'Elite',
      companies: [
        'Google', 'Microsoft', 'Meta', 'Apple', 'Amazon', 'Netflix', 'Tesla',
        'Jane Street', 'Citadel', 'Two Sigma', 'HRT', 'Optiver', 'Jump Trading',
        'Goldman Sachs', 'JPMorgan Chase', 'Morgan Stanley', 'BlackRock'
      ]
    },
    {
      tier: 2,
      name: 'Strong',
      companies: [
        'Stripe', 'Airbnb', 'Coinbase', 'Roblox', 'Databricks', 'Snowflake',
        'Plaid', 'Scale AI', 'Anthropic', 'OpenAI', 'MongoDB', 'Datadog',
        'Figma', 'Notion', 'Canva', 'Spotify', 'Discord', 'Twitch',
        'Reddit', 'Pinterest', 'Dropbox', 'Asana', 'DoorDash'
      ]
    },
    {
      tier: 3,
      name: 'Good Opportunities',
      companies: [
        'Salesforce', 'IBM', 'Oracle', 'SAP', 'Cisco', 'Intel', 'NVIDIA',
        'AMD', 'Qualcomm', 'VMware', 'Adobe', 'ServiceNow', 'Atlassian',
        'Splunk', 'Palo Alto Networks', 'Workday', 'Zoom', 'Square',
        'PayPal', 'Visa', 'Mastercard', 'Capital One'
      ]
    }
  ];

  async calculateScores(internship: NormalizedInternshipData): Promise<InternshipScores> {
    const qualityScore = this.calculateQualityScore(internship);
    const competitivenessScore = this.calculateCompetitivenessScore(internship);
    const learningScore = this.calculateLearningScore(internship);
    const brandValueScore = this.calculateBrandValueScore(internship);
    const compensationScore = this.calculateCompensationScore(internship);

    return {
      quality_score: qualityScore,
      competitiveness_score: competitivenessScore,
      learning_score: learningScore,
      brand_value_score: brandValueScore,
      compensation_score: compensationScore
    };
  }

  private calculateQualityScore(internship: NormalizedInternshipData): number {
    let score = 0;

    // Base quality from normalization engine (0-100)
    score += internship.qualityScore * 0.4;

    // Completeness bonus (0-20 points)
    score += internship.completenessScore * 0.2;

    // Description quality (0-20 points)
    if (internship.description.length > 500) score += 10;
    if (internship.description.length > 1000) score += 10;

    // Skills extraction (0-10 points)
    if (internship.skills.length > 3) score += 5;
    if (internship.skills.length > 6) score += 5;

    // Role clarity (0-10 points)
    if (internship.role !== 'Other') score += 10;

    return Math.min(score, 100);
  }

  private calculateCompetitivenessScore(internship: NormalizedInternshipData): number {
    let score = 50; // Base score

    // Company tier impact
    const companyTier = this.getCompanyTier(internship.normalizedCompany);
    if (companyTier === 1) score += 30; // Elite companies are very competitive
    else if (companyTier === 2) score += 15; // Strong companies are moderately competitive
    else if (companyTier === 3) score += 5; // Good companies are less competitive

    // Role competitiveness
    const competitiveRoles = ['Software Engineering', 'Product Management', 'Quantitative Analysis'];
    if (competitiveRoles.includes(internship.role)) score += 15;

    // Location competitiveness
    const competitiveLocations = ['San Francisco', 'New York', 'Seattle', 'Boston'];
    if (competitiveLocations.some(loc => internship.normalizedLocation.includes(loc))) score += 10;

    // Requirements competitiveness
    if (internship.eligibility.gpa && parseFloat(internship.eligibility.gpa) >= 3.5) score += 5;
    if (internship.eligibility.yearLevel.includes('Graduate')) score += 5;

    return Math.min(score, 100);
  }

  private calculateLearningScore(internship: NormalizedInternshipData): number {
    let score = 50; // Base score

    // Company size impact (smaller companies often have better learning)
    const companyTier = this.getCompanyTier(internship.normalizedCompany);
    if (companyTier === 2) score += 20; // Tier 2 companies often have best learning
    else if (companyTier === 1) score += 10; // Elite companies are good but structured
    else if (companyTier === 3) score += 15; // Tier 3 companies can be good for learning

    // Role learning potential
    const highLearningRoles = ['Research', 'Data Science', 'Software Engineering'];
    if (highLearningRoles.includes(internship.role)) score += 15;

    // Skills diversity
    if (internship.skills.length > 5) score += 10;
    if (internship.skills.includes('Machine Learning') || internship.skills.includes('Data Analysis')) score += 10;

    // Description indicates mentorship/learning
    const learningKeywords = ['mentor', 'learning', 'growth', 'development', 'training', 'education'];
    const hasLearningKeywords = learningKeywords.some(keyword => 
      internship.description.toLowerCase().includes(keyword)
    );
    if (hasLearningKeywords) score += 15;

    return Math.min(score, 100);
  }

  private calculateBrandValueScore(internship: NormalizedInternshipData): number {
    let score = 0;

    // Company tier impact
    const companyTier = this.getCompanyTier(internship.normalizedCompany);
    if (companyTier === 1) score += 80; // Elite companies have high brand value
    else if (companyTier === 2) score += 60; // Strong companies have good brand value
    else if (companyTier === 3) score += 40; // Good companies have moderate brand value
    else score += 20; // Unknown companies have low brand value

    // Role brand value
    const highBrandRoles = ['Software Engineering', 'Product Management', 'Quantitative Analysis'];
    if (highBrandRoles.includes(internship.role)) score += 10;

    // Company recognition bonus
    const wellKnownCompanies = ['Google', 'Microsoft', 'Meta', 'Apple', 'Amazon', 'Netflix', 'Tesla'];
    if (wellKnownCompanies.includes(internship.normalizedCompany)) score += 10;

    return Math.min(score, 100);
  }

  private calculateCompensationScore(internship: NormalizedInternshipData): number {
    let score = 0;

    // Compensation type scoring
    if (internship.compensation.type === 'hourly') {
      const hourlyRate = parseFloat(internship.compensation.amount || '0');
      if (hourlyRate >= 50) score += 80;
      else if (hourlyRate >= 40) score += 70;
      else if (hourlyRate >= 30) score += 60;
      else if (hourlyRate >= 20) score += 50;
      else if (hourlyRate > 0) score += 30;
    } else if (internship.compensation.type === 'salary') {
      // Assume annual salary, convert to hourly equivalent
      const salary = parseFloat(internship.compensation.amount?.split('-')[0] || '0');
      const hourlyEquivalent = salary / 2000; // Rough conversion
      if (hourlyEquivalent >= 50) score += 80;
      else if (hourlyEquivalent >= 40) score += 70;
      else if (hourlyEquivalent >= 30) score += 60;
      else if (hourlyEquivalent >= 20) score += 50;
      else if (hourlyEquivalent > 0) score += 30;
    } else if (internship.compensation.type === 'unpaid') {
      score += 10; // Very low score for unpaid
    } else {
      score += 40; // Unknown compensation gets middle score
    }

    // Company tier bonus
    const companyTier = this.getCompanyTier(internship.normalizedCompany);
    if (companyTier === 1) score += 15;
    else if (companyTier === 2) score += 10;
    else if (companyTier === 3) score += 5;

    // Role compensation bonus
    const highCompRoles = ['Quantitative Analysis', 'Software Engineering', 'Product Management'];
    if (highCompRoles.includes(internship.role)) score += 5;

    return Math.min(score, 100);
  }

  private getCompanyTier(companyName: string): 1 | 2 | 3 | null {
    for (const tier of this.companyTiers) {
      if (tier.companies.some(company => 
        company.toLowerCase() === companyName.toLowerCase() ||
        companyName.toLowerCase().includes(company.toLowerCase())
      )) {
        return tier.tier;
      }
    }
    return null;
  }

  async saveScores(internshipId: string, scores: InternshipScores): Promise<void> {
    await supabase
      .from('internship_scores')
      .upsert({
        internship_id: internshipId,
        ...scores,
        calculated_at: new Date().toISOString()
      });
  }

  async getScores(internshipId: string): Promise<InternshipScores | null> {
    const { data } = await supabase
      .from('internship_scores')
      .select('*')
      .eq('internship_id', internshipId)
      .single();

    if (!data) return null;

    return {
      quality_score: data.quality_score,
      competitiveness_score: data.competitiveness_score,
      learning_score: data.learning_score,
      brand_value_score: data.brand_value_score,
      compensation_score: data.compensation_score
    };
  }

  async calculatePersonalizedScore(
    internship: NormalizedInternshipData, 
    studentProfile: any
  ): Promise<number> {
    const baseScores = await this.calculateScores(internship);
    let personalizedScore = 0;

    // Role match (0-30 points)
    if (studentProfile.target_roles?.includes(internship.role)) {
      personalizedScore += 30;
    }

    // Skills match (0-25 points)
    const matchingSkills = internship.skills.filter(skill => 
      studentProfile.skills?.includes(skill)
    );
    personalizedScore += (matchingSkills.length / internship.skills.length) * 25;

    // Major match (0-20 points)
    if (studentProfile.major?.some((major: string) => 
      internship.majors.includes(major)
    )) {
      personalizedScore += 20;
    }

    // Location preference (0-15 points)
    if (studentProfile.preferred_locations?.some((location: string) => 
      internship.normalizedLocation.toLowerCase().includes(location.toLowerCase())
    )) {
      personalizedScore += 15;
    }

    // Year level match (0-10 points)
    if (studentProfile.year_level && internship.eligibility.yearLevel.includes(studentProfile.year_level)) {
      personalizedScore += 10;
    }

    return Math.min(personalizedScore, 100);
  }
}

export const scoringEngine = new ScoringEngine();