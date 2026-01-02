import { RawInternshipData, InternshipSourceType } from '../../../types';

interface LeverJob {
  id: string;
  text: string;
  categories: { team?: string; commitment?: string; location?: string };
  hostedUrl: string;
  createdAt: number;
}

export class LeverClient {
  private baseUrl = 'https://api.lever.co/v0/postings';

  async getJobs(site: string): Promise<LeverJob[]> {
    const response = await fetch(`${this.baseUrl}/${site}?mode=json`);
    if (!response.ok) throw new Error(`Lever API error: ${response.status}`);
    return await response.json();
  }

  filterInternships(jobs: LeverJob[]): LeverJob[] {
    return jobs.filter(job => {
      const title = job.text.toLowerCase();
      const commitment = job.categories.commitment?.toLowerCase() || '';
      return ['intern', 'internship', 'co-op'].some(k => title.includes(k) || commitment.includes(k));
    });
  }

  convertToRawInternshipData(job: LeverJob, company: string): RawInternshipData {
    return {
      source: `Lever: ${company}`,
      sourceType: InternshipSourceType.COMPANY_CAREER_PAGE,
      url: job.hostedUrl,
      title: job.text,
      company: company,
      description: '',
      location: job.categories.location || 'Location TBD',
      postedAt: new Date(job.createdAt).toISOString(),
      applicationUrl: job.hostedUrl,
      rawPayload: { leverId: job.id }
    };
  }

  async scrapeCompany(company: string, site: string): Promise<RawInternshipData[]> {
    const jobs = await this.getJobs(site);
    const internships = this.filterInternships(jobs);
    return internships.map(j => this.convertToRawInternshipData(j, company));
  }
}

export const leverClient = new LeverClient();