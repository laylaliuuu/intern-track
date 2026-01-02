// Temporarily disabled due to Node.js compatibility issues
// import * as cheerio from 'cheerio';
import { RawInternshipData, InternshipSourceType } from '../../../types';

export class WorkdayScraperService {
  async scrapeCompany(company: string, searchUrl: string): Promise<RawInternshipData[]> {
    // Temporarily disabled due to cheerio compatibility issues
    console.log(`Workday scraper temporarily disabled for ${company}`);
    return [];
    
    // Add intern filter to URL
    const url = searchUrl.includes('?') 
      ? `${searchUrl}&q=intern` 
      : `${searchUrl}?q=intern`;
    
    const response = await fetch(url);
    const html = await response.text();
    // const $ = cheerio.load(html);
    
    const jobs: RawInternshipData[] = [];
    
    // Workday-specific selectors
    $('[data-automation-id="compositeContainer"]').each((_, element) => {
      const title = $(element).find('[data-automation-id="jobTitle"]').text().trim();
      const location = $(element).find('[data-automation-id="location"]').text().trim();
      const link = $(element).find('a').attr('href');
      
      if (title && link && this.isInternship(title)) {
        jobs.push({
          source: `Workday: ${company}`,
          sourceType: InternshipSourceType.COMPANY_CAREER_PAGE,
          url: link.startsWith('http') ? link : `https://workday.com${link}`,
          title,
          company,
          description: '',
          location: location || 'Location TBD',
          postedAt: new Date().toISOString(),
          applicationUrl: link,
          rawPayload: {}
        });
      }
    });
    
    return jobs;
  }
  
  private isInternship(title: string): boolean {
    const t = title.toLowerCase();
    return ['intern', 'internship', 'co-op'].some(k => t.includes(k)) && 
           !['senior', 'staff', 'principal'].some(k => t.includes(k));
  }
}

export const workdayScraper = new WorkdayScraperService();