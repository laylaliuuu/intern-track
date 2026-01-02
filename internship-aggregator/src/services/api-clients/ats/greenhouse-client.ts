import { RawInternshipData, InternshipSourceType } from '../../../types';

interface GreenhouseJob {
  id: number;
  title: string;
  location: { name: string };
  absolute_url: string;
  updated_at: string;
  metadata: any[];
}

export class GreenhouseClient {
  private baseUrl = 'https://boards-api.greenhouse.io/v1/boards';

  async getJobs(boardToken: string): Promise<GreenhouseJob[]> {
    const response = await fetch(`${this.baseUrl}/${boardToken}/jobs`);
    if (!response.ok) throw new Error(`Greenhouse API error: ${response.status}`);
    
    const data = await response.json();
    return data.jobs || [];
  }

  filterInternships(jobs: GreenhouseJob[]): GreenhouseJob[] {
    return jobs.filter(job => {
      const title = job.title.toLowerCase();
      return ['intern', 'internship', 'co-op', 'coop'].some(k => title.includes(k)) &&
             (title.includes('2026') || job.updated_at.startsWith('2025') || job.updated_at.startsWith('2026'));
    });
  }

  convertToRawInternshipData(job: GreenhouseJob, company: string): RawInternshipData {
    return {
      source: `Greenhouse: ${company}`,
      sourceType: InternshipSourceType.COMPANY_CAREER_PAGE,
      url: job.absolute_url,
      title: job.title,
      company: company,
      description: '',
      location: job.location.name,
      postedAt: job.updated_at,
      applicationUrl: job.absolute_url,
      rawPayload: { greenhouseId: job.id }
    };
  }

  async scrapeCompany(company: string, boardToken: string): Promise<RawInternshipData[]> {
    const jobs = await this.getJobs(boardToken);
    const internships = this.filterInternships(jobs);
    return internships.map(j => this.convertToRawInternshipData(j, company));
  }
}

export const greenhouseClient = new GreenhouseClient();