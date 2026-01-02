import { supabase } from '../../lib/supabase';
import { greenhouseClient } from '../api-clients/ats/greenhouse-client';
import { leverClient } from '../api-clients/ats/lever-client';
import { ashbyClient } from '../api-clients/ats/ashby-client';
import { workdayScraper } from './scrapers/workday-scraper';
import { comprehensiveScraper } from './comprehensive-scraper';
import { RawInternshipData } from '../../types';

interface CompanyTarget {
  id: string;
  company_name: string;
  scraping_method: string;
  greenhouse_board_token?: string;
  lever_site?: string;
  ashby_company_id?: string;
  career_page_url?: string;
}

export class CompanyScrapingOrchestrator {
  async scrapeByPriority(priority: number, limit = 50): Promise<RawInternshipData[]> {
    const { data: targets } = await supabase
      .from('company_targets')
      .select('*')
      .eq('enabled', true)
      .eq('priority', priority)
      .limit(limit);

    if (!targets) return [];

    const results: RawInternshipData[] = [];
    for (const target of targets) {
      try {
        const jobs = await this.scrapeCompany(target);
        results.push(...jobs);
        
        // Update success count
        await supabase
          .from('company_targets')
          .update({
            last_scraped_at: new Date().toISOString(),
            scrape_success_count: target.scrape_success_count + 1
          })
          .eq('id', target.id);
      } catch (error) {
        console.error(`Failed to scrape ${target.company_name}:`, error);
        
        // Update error count
        await supabase
          .from('company_targets')
          .update({
            scrape_error_count: target.scrape_error_count + 1,
            last_error_message: error instanceof Error ? error.message : 'Unknown error'
          })
          .eq('id', target.id);
      }
    }

    return results;
  }

  private async scrapeCompany(target: CompanyTarget): Promise<RawInternshipData[]> {
    switch(target.scraping_method) {
      case 'greenhouse_api':
        if (!target.greenhouse_board_token) throw new Error('Missing Greenhouse token');
        return greenhouseClient.scrapeCompany(target.company_name, target.greenhouse_board_token);
      
      case 'lever_api':
        if (!target.lever_site) throw new Error('Missing Lever site');
        return leverClient.scrapeCompany(target.company_name, target.lever_site);
      
      case 'ashby_api':
        if (!target.ashby_company_id) throw new Error('Missing Ashby ID');
        const jobs = await ashbyClient.getJobs(target.ashby_company_id);
        return jobs.map(j => ashbyClient.convertToRawInternshipData(j, target.company_name));
      
      case 'workday_static':
        if (!target.career_page_url) throw new Error('Missing career page URL');
        return workdayScraper.scrapeCompany(target.company_name, target.career_page_url);
      
      case 'puppeteer':
        // Use comprehensive scraper for complex sites
        const results = await comprehensiveScraper.scrapeCompanyPages([target.company_name]);
        return results.flatMap(r => r.data);
      
      default:
        throw new Error(`Unknown scraping method: ${target.scraping_method}`);
    }
  }
}

export const companyOrchestrator = new CompanyScrapingOrchestrator();
