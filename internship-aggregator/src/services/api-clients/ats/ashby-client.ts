import { RawInternshipData, InternshipSourceType } from '../../../types';

interface AshbyJob {
  id: string;
  title: string;
  locationName: string;
  jobUrl: string;
  publishedDate: string;
}

export class AshbyClient {
  async getJobs(companyId: string): Promise<AshbyJob[]> {
    const response = await fetch(`https://jobs.ashbyhq.com/${companyId}/jobs`);
    if (!response.ok) throw new Error(`Ashby API error: ${response.status}`);
    
    const html = await response.text();
    // Parse JSON embedded in page
    const jsonMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});/);
    if (!jsonMatch) return [];
    
    const data = JSON.parse(jsonMatch[1]);
    return data.jobs || [];
  }

  convertToRawInternshipData(job: AshbyJob, company: string): RawInternshipData {
    return {
      source: `Ashby: ${company}`,
      sourceType: InternshipSourceType.COMPANY_CAREER_PAGE,
      url: job.jobUrl,
      title: job.title,
      company: company,
      description: '',
      location: job.locationName,
      postedAt: job.publishedDate,
      applicationUrl: job.jobUrl,
      rawPayload: { ashbyId: job.id }
    };
  }
}

export const ashbyClient = new AshbyClient();