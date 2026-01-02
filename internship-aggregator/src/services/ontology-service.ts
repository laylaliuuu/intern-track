import { supabase } from '../lib/supabase';

export interface CompanySimilarity {
  company_id: string;
  company_name: string;
  similarity_score: number;
  relationship_type: string;
}

export interface SkillRecommendation {
  skill: string;
  relevance_score: number;
  category: string;
  related_internships: number;
}

export interface OntologyQuery {
  type: 'similar_companies' | 'skill_recommendations' | 'company_relationships' | 'internship_skills';
  filters?: {
    company_id?: string;
    skill_id?: string;
    relationship_type?: string;
    limit?: number;
  };
}

export class OntologyService {
  /**
   * Find companies similar to a given company
   */
  async findSimilarCompanies(companyId: string, limit = 10): Promise<CompanySimilarity[]> {
    const { data } = await supabase
      .from('company_relationships')
      .select(`
        company_b_id,
        relationship_type,
        confidence_score,
        companies!company_relationships_company_b_id_fkey (
          id,
          name
        )
      `)
      .eq('company_a_id', companyId)
      .eq('relationship_type', 'similar')
      .order('confidence_score', { ascending: false })
      .limit(limit);

    if (!data) return [];

    return data.map(item => ({
      company_id: item.company_b_id,
      company_name: item.companies.name,
      similarity_score: item.confidence_score,
      relationship_type: item.relationship_type
    }));
  }

  /**
   * Get skill recommendations based on current skills
   */
  async getSkillRecommendations(currentSkills: string[], limit = 10): Promise<SkillRecommendation[]> {
    if (currentSkills.length === 0) return [];

    // Find skills that frequently appear with current skills
    const { data } = await supabase
      .from('internship_skills')
      .select(`
        skill_id,
        skills!internship_skills_skill_id_fkey (
          name,
          category
        )
      `)
      .in('skill_id', 
        await this.getSkillIds(currentSkills)
      );

    if (!data) return [];

    // Count co-occurrences
    const skillCounts = new Map<string, { count: number; category: string }>();
    
    for (const item of data) {
      const skillName = item.skills.name;
      const category = item.skills.category;
      
      if (!currentSkills.includes(skillName)) {
        const current = skillCounts.get(skillName) || { count: 0, category };
        skillCounts.set(skillName, { count: current.count + 1, category });
      }
    }

    // Convert to recommendations
    const recommendations: SkillRecommendation[] = [];
    for (const [skill, data] of skillCounts) {
      recommendations.push({
        skill,
        relevance_score: data.count / currentSkills.length,
        category: data.category,
        related_internships: data.count
      });
    }

    return recommendations
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, limit);
  }

  /**
   * Get company relationships (competitors, partners, etc.)
   */
  async getCompanyRelationships(companyId: string, relationshipType?: string): Promise<CompanySimilarity[]> {
    let query = supabase
      .from('company_relationships')
      .select(`
        company_b_id,
        relationship_type,
        confidence_score,
        companies!company_relationships_company_b_id_fkey (
          id,
          name
        )
      `)
      .eq('company_a_id', companyId);

    if (relationshipType) {
      query = query.eq('relationship_type', relationshipType);
    }

    const { data } = await query.order('confidence_score', { ascending: false });

    if (!data) return [];

    return data.map(item => ({
      company_id: item.company_b_id,
      company_name: item.companies.name,
      similarity_score: item.confidence_score,
      relationship_type: item.relationship_type
    }));
  }

  /**
   * Get internships requiring specific skills
   */
  async getInternshipsBySkills(skillNames: string[], limit = 20): Promise<any[]> {
    const skillIds = await this.getSkillIds(skillNames);
    
    const { data } = await supabase
      .from('internship_skills')
      .select(`
        internship_id,
        importance_score,
        internships!internship_skills_internship_id_fkey (
          id,
          title,
          company,
          location,
          url,
          quality_score
        )
      `)
      .in('skill_id', skillIds)
      .order('importance_score', { ascending: false })
      .limit(limit);

    if (!data) return [];

    return data.map(item => ({
      ...item.internships,
      skill_importance: item.importance_score
    }));
  }

  /**
   * Find internships at companies similar to a given company
   */
  async findInternshipsAtSimilarCompanies(companyId: string, limit = 20): Promise<any[]> {
    const similarCompanies = await this.findSimilarCompanies(companyId, 5);
    const companyIds = similarCompanies.map(c => c.company_id);

    if (companyIds.length === 0) return [];

    const { data } = await supabase
      .from('internships')
      .select('*')
      .in('company_id', companyIds)
      .order('quality_score', { ascending: false })
      .limit(limit);

    return data || [];
  }

  /**
   * Get company metadata and context
   */
  async getCompanyContext(companyId: string): Promise<any> {
    const { data } = await supabase
      .from('company_metadata')
      .select(`
        *,
        companies!company_metadata_company_id_fkey (
          name,
          description
        )
      `)
      .eq('company_id', companyId)
      .single();

    return data;
  }

  /**
   * Build company relationships based on industry and size
   */
  async buildCompanyRelationships(): Promise<void> {
    // Get all companies with metadata
    const { data: companies } = await supabase
      .from('company_metadata')
      .select(`
        company_id,
        size_category,
        industry,
        companies!company_metadata_company_id_fkey (name)
      `);

    if (!companies) return;

    const relationships = [];

    for (let i = 0; i < companies.length; i++) {
      for (let j = i + 1; j < companies.length; j++) {
        const companyA = companies[i];
        const companyB = companies[j];

        // Calculate similarity based on industry and size
        const industrySimilarity = this.calculateIndustrySimilarity(
          companyA.industry, 
          companyB.industry
        );
        const sizeSimilarity = this.calculateSizeSimilarity(
          companyA.size_category, 
          companyB.size_category
        );

        const overallSimilarity = (industrySimilarity + sizeSimilarity) / 2;

        if (overallSimilarity > 0.3) {
          relationships.push({
            company_a_id: companyA.company_id,
            company_b_id: companyB.company_id,
            relationship_type: 'similar',
            confidence_score: overallSimilarity
          });
        }
      }
    }

    // Insert relationships in batches
    if (relationships.length > 0) {
      await supabase
        .from('company_relationships')
        .upsert(relationships, { onConflict: 'company_a_id,company_b_id,relationship_type' });
    }
  }

  /**
   * Seed skills taxonomy
   */
  async seedSkills(): Promise<void> {
    const skills = [
      // Technical skills
      { name: 'Python', category: 'technical' },
      { name: 'JavaScript', category: 'technical' },
      { name: 'Java', category: 'technical' },
      { name: 'C++', category: 'technical' },
      { name: 'SQL', category: 'technical' },
      { name: 'React', category: 'technical' },
      { name: 'Node.js', category: 'technical' },
      { name: 'AWS', category: 'technical' },
      { name: 'Docker', category: 'technical' },
      { name: 'Git', category: 'technical' },
      { name: 'Machine Learning', category: 'technical' },
      { name: 'Data Analysis', category: 'technical' },
      { name: 'TypeScript', category: 'technical' },
      { name: 'Go', category: 'technical' },
      { name: 'Rust', category: 'technical' },
      
      // Soft skills
      { name: 'Communication', category: 'soft' },
      { name: 'Leadership', category: 'soft' },
      { name: 'Problem Solving', category: 'soft' },
      { name: 'Teamwork', category: 'soft' },
      { name: 'Time Management', category: 'soft' },
      
      // Domain skills
      { name: 'Product Management', category: 'domain' },
      { name: 'Data Science', category: 'domain' },
      { name: 'UX Design', category: 'domain' },
      { name: 'DevOps', category: 'domain' },
      { name: 'Cybersecurity', category: 'domain' },
      
      // Languages
      { name: 'English', category: 'language' },
      { name: 'Spanish', category: 'language' },
      { name: 'Mandarin', category: 'language' },
      { name: 'French', category: 'language' }
    ];

    await supabase
      .from('skills')
      .upsert(skills, { onConflict: 'name' });
  }

  private async getSkillIds(skillNames: string[]): Promise<string[]> {
    const { data } = await supabase
      .from('skills')
      .select('id')
      .in('name', skillNames);

    return data?.map(item => item.id) || [];
  }

  private calculateIndustrySimilarity(industryA: string[], industryB: string[]): number {
    if (!industryA || !industryB) return 0;
    
    const setA = new Set(industryA);
    const setB = new Set(industryB);
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    
    return intersection.size / union.size;
  }

  private calculateSizeSimilarity(sizeA: string, sizeB: string): number {
    if (sizeA === sizeB) return 1;
    
    const sizeOrder = ['startup', 'small', 'medium', 'large', 'fortune500'];
    const indexA = sizeOrder.indexOf(sizeA);
    const indexB = sizeOrder.indexOf(sizeB);
    
    if (indexA === -1 || indexB === -1) return 0;
    
    const distance = Math.abs(indexA - indexB);
    return Math.max(0, 1 - distance / (sizeOrder.length - 1));
  }
}

export const ontologyService = new OntologyService();