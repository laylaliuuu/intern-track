// GitHub scraper for curated internship lists
import { RawInternshipData, InternshipSourceType } from '../../types';

export interface GitHubRepo {
  owner: string;
  repo: string;
  path: string;
  description: string;
}

export interface ScrapedInternship {
  company: string;
  role: string;
  location: string;
  applicationUrl: string;
  description?: string;
}

export class GitHubScraperService {
  private targetRepos: GitHubRepo[] = [
    {
      owner: 'pittcsc',
      repo: 'Summer2026-Internships',
      path: '.github/scripts/listings.json',
      description: 'Structured JSON data of Summer 2026 internships'
    }
    // Temporarily disabled other repos for testing
    // {
    //   owner: 'pittcsc',
    //   repo: 'Summer2026-Internships', 
    //   path: 'README.md',
    //   description: 'Pitt CSC internship list'
    // },
    // {
    //   owner: 'SimplifyJobs',
    //   repo: 'New-Grad-Positions',
    //   path: 'README.md',
    //   description: 'New grad positions (includes internships)'
    // },
    // {
    //   owner: 'ReaVNaiL',
    //   repo: 'New-Grad-2026',
    //   path: 'README.md',
    //   description: 'New grad positions for 2026'
    // },
    // {
    //   owner: 'coderQuad',
    //   repo: 'New-Grad-Positions',
    //   path: 'README.md',
    //   description: 'New grad positions including internships'
    // },
    // {
    //   owner: 'cvrve',
    //   repo: 'Summer2026-Internships',
    //   path: 'README.md',
    //   description: 'Additional 2026 internships'
    // },
    // {
    //   owner: 'Ouckah',
    //   repo: 'Summer2026-Internships',
    //   path: 'README.md',
    //   description: 'Community-maintained list'
    // },
    // {
    //   owner: 'gcreddy42',
    //   repo: 'hiring2026',
    //   path: 'README.md',
    //   description: 'Graduate hiring 2026'
    // }
  ];

  /**
   * Scrape internships from GitHub repositories
   */
  async scrapeInternships(maxResults: number = 50): Promise<RawInternshipData[]> {
    const results: RawInternshipData[] = [];
    
    for (const repo of this.targetRepos) {
      try {
        console.log(`Scraping ${repo.owner}/${repo.repo}...`);
        const repoInternships = await this.scrapeRepo(repo, Math.floor(maxResults / this.targetRepos.length));
        results.push(...repoInternships);
        
        if (results.length >= maxResults) {
          break;
        }
      } catch (error) {
        console.warn(`Failed to scrape ${repo.owner}/${repo.repo}:`, error);
      }
    }

    return results.slice(0, maxResults);
  }

  /**
   * Scrape a specific repository
   */
  private async scrapeRepo(repo: GitHubRepo, maxResults: number): Promise<RawInternshipData[]> {
    try {
      // Fetch the README content from GitHub API
      const headers: HeadersInit = {};
      if (process.env.GITHUB_TOKEN) {
        headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
        console.log('GitHub token found, making authenticated request');
      } else {
        console.log('No GitHub token found, making unauthenticated request');
      }
      
      const response = await fetch(`https://api.github.com/repos/${repo.owner}/${repo.repo}/contents/${repo.path}`, {
        headers
      });
      
      console.log(`GitHub API response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`GitHub API error: ${response.status} - ${errorText}`);
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`GitHub API response received, content length: ${data.content ? data.content.length : 0}`);
      
      let content: string;
      
      if (data.content) {
        // Small file - content is included directly
        content = Buffer.from(data.content, 'base64').toString('utf-8');
        console.log('Using direct content');
      } else if (data.download_url) {
        // Large file - need to download separately
        console.log('File too large, downloading from:', data.download_url);
        const downloadResponse = await fetch(data.download_url);
        if (!downloadResponse.ok) {
          throw new Error(`Download failed: ${downloadResponse.status}`);
        }
        content = await downloadResponse.text();
        console.log('Downloaded content, length:', content.length);
      } else {
        console.error('No content or download URL found in repository');
        throw new Error('No content found in repository');
      }
      
      // Parse content based on file type
      let internships: RawInternshipData[];
      if (repo.path.endsWith('.json')) {
        internships = this.parseJsonContent(content, repo);
      } else {
        internships = this.parseMarkdownContent(content, repo);
      }
      
      return internships.slice(0, maxResults);
    } catch (error) {
      console.error(`Error scraping ${repo.owner}/${repo.repo}:`, error);
      return [];
    }
  }

  /**
   * Parse JSON content to extract internship listings
   */
  private parseJsonContent(content: string, repo: GitHubRepo): RawInternshipData[] {
    const internships: RawInternshipData[] = [];
    let processedCount = 0;
    let activeCount = 0;
    let visibleCount = 0;
    let validCount = 0;
    let year2026Count = 0;
    
    try {
      const data = JSON.parse(content);
      
      if (!Array.isArray(data)) {
        console.warn(`Expected array in JSON file ${repo.owner}/${repo.repo}`);
        return internships;
      }
      
      console.log(`Processing ${data.length} total internships from ${repo.owner}/${repo.repo}`);
      
      for (const item of data) {
        processedCount++;
        
        // Only process visible internships
        if (!item.is_visible) {
          visibleCount++;
          continue;
        }
        
        // Count inactive but still process them (we want all visible 2026 internships)
        if (!item.active) {
          activeCount++;
        }
        
        // Skip if missing required fields
        if (!item.company_name || !item.title || !item.url) {
          continue;
        }
        
        validCount++;
        
        // Filter for 2026 internships only
        if (!this.is2026Internship(item)) {
          continue;
        }
        
        year2026Count++;
        
        // Convert timestamp to ISO string
        const postedAt = item.date_posted ? new Date(item.date_posted * 1000).toISOString() : new Date().toISOString();
        
        // Extract location (take first location if multiple)
        const location = item.locations && item.locations.length > 0 ? item.locations[0] : 'Location TBD';
        
        // Extract terms (internship cycle)
        const terms = item.terms || [];
        const internshipCycle = this.extractInternshipCycle(terms);
        
        // Create description
        const description = `${item.title} at ${item.company_name}${location ? ` in ${location}` : ''}. ${item.sponsorship ? `Sponsorship: ${item.sponsorship}` : ''}`;
        
        const internship: RawInternshipData = {
          source: `GitHub: ${repo.owner}/${repo.repo}`,
          sourceType: InternshipSourceType.PROGRAM_PAGE,
          url: item.url,
          title: item.title,
          company: item.company_name,
          description: description,
          location: location,
          postedAt: postedAt,
          applicationUrl: item.url,
          rawPayload: {
            repo: `${repo.owner}/${repo.repo}`,
            description: repo.description,
            scrapedAt: new Date().toISOString(),
            source: item.source,
            id: item.id,
            terms: terms,
            sponsorship: item.sponsorship,
            company_url: item.company_url
          }
        };
        
        internships.push(internship);
      }
      
      console.log(`Filtering results: ${processedCount} total, ${activeCount} inactive, ${visibleCount} not visible, ${validCount} valid, ${year2026Count} for 2026, ${internships.length} final`);
      
    } catch (error) {
      console.error(`Error parsing JSON from ${repo.owner}/${repo.repo}:`, error);
    }
    
    return internships;
  }

  /**
   * Check if internship is for 2026
   */
  private is2026Internship(item: any): boolean {
    const searchText = `${item.title || ''} ${item.description || ''} ${(item.terms || []).join(' ')}`.toLowerCase();
    
    // Look for 2026 in the text
    if (searchText.includes('2026')) {
      return true;
    }
    
    // Look for summer 2026 patterns
    if (searchText.includes('summer 2026') || searchText.includes('2026 summer')) {
      return true;
    }
    
    // Look for fall 2026 patterns
    if (searchText.includes('fall 2026') || searchText.includes('2026 fall')) {
      return true;
    }
    
    // Look for spring 2026 patterns
    if (searchText.includes('spring 2026') || searchText.includes('2026 spring')) {
      return true;
    }
    
    // Look for winter 2026 patterns
    if (searchText.includes('winter 2026') || searchText.includes('2026 winter')) {
      return true;
    }
    
    // Look for "2026" in terms array specifically
    const terms: string[] = item.terms || [];
    for (const term of terms) {
      if (term.toLowerCase().includes('2026')) {
        return true;
      }
    }
    
    // Only include if explicitly 2026
    // If no year is specified, skip it (we want only confirmed 2026 internships)
    return false;
  }

  /**
   * Extract internship cycle from terms array
   */
  private extractInternshipCycle(terms: string[]): string {
    if (!terms || terms.length === 0) return 'unknown';
    
    const term = terms[0].toLowerCase();
    if (term.includes('summer')) return 'summer';
    if (term.includes('fall')) return 'fall';
    if (term.includes('spring')) return 'spring';
    if (term.includes('winter')) return 'winter';
    if (term.includes('year')) return 'year-round';
    
    return 'unknown';
  }

  /**
   * Parse markdown content to extract internship listings
   */
  private parseMarkdownContent(content: string, repo: GitHubRepo): RawInternshipData[] {
    const internships: RawInternshipData[] = [];
    const lines = content.split('\n');
    
    // First, try to parse as table format (most common in 2026 repos)
    const tableInternships = this.parseTableFormat(lines, repo);
    if (tableInternships.length > 0) {
      return tableInternships;
    }
    
    // Fallback to line-by-line parsing
    let currentCompany = '';
    let currentRole = '';
    let currentLocation = '';
    let currentUrl = '';
    let currentDescription = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines and headers
      if (!line || line.startsWith('#') || line.startsWith('|') || line.startsWith('-')) {
        continue;
      }
      
      // Look for company names (usually in bold or as headers)
      if (this.isCompanyName(line)) {
        // Save previous internship if we have one
        if (currentCompany && currentRole) {
          const internship = this.createInternshipData(
            currentCompany,
            currentRole,
            currentLocation,
            currentUrl,
            currentDescription,
            repo
          );
          if (internship) {
            internships.push(internship);
          }
        }
        
        // Start new internship
        currentCompany = this.cleanCompanyName(line);
        currentRole = '';
        currentLocation = '';
        currentUrl = '';
        currentDescription = '';
      }
      
      // Look for role/position information
      else if (this.isRoleInfo(line)) {
        currentRole = line;
      }
      
      // Look for location information
      else if (this.isLocationInfo(line)) {
        currentLocation = line;
      }
      
      // Look for application URLs
      else if (this.isApplicationUrl(line)) {
        currentUrl = this.extractUrl(line);
      }
      
      // Look for description text
      else if (line.length > 20 && !line.startsWith('[') && !line.startsWith('*')) {
        currentDescription += line + ' ';
      }
    }
    
    // Don't forget the last internship
    if (currentCompany && currentRole) {
      const internship = this.createInternshipData(
        currentCompany,
        currentRole,
        currentLocation,
        currentUrl,
        currentDescription,
        repo
      );
      if (internship) {
        internships.push(internship);
      }
    }
    
    return internships;
  }

  /**
   * Parse table format (most common in 2026 internship repos)
   */
  private parseTableFormat(lines: string[], repo: GitHubRepo): RawInternshipData[] {
    const internships: RawInternshipData[] = [];
    let tableStartIndex = -1;
    let headers: string[] = [];
    
    // Find table start and headers
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for table header row (contains | and common headers)
      if (line.includes('|') && this.isTableHeader(line)) {
        tableStartIndex = i;
        headers = this.parseTableHeaders(line);
        break;
      }
    }
    
    if (tableStartIndex === -1 || headers.length === 0) {
      return internships;
    }
    
    // Parse table rows
    for (let i = tableStartIndex + 2; i < lines.length; i++) { // Skip header and separator
      const line = lines[i].trim();
      
      if (!line || !line.includes('|')) {
        break; // End of table
      }
      
      const row = this.parseTableRow(line, headers);
      if (row && this.isValidTableRow(row)) {
        const internship = this.createInternshipFromTableRow(row, repo);
        if (internship) {
          internships.push(internship);
        }
      }
    }
    
    return internships;
  }

  /**
   * Check if line is a table header
   */
  private isTableHeader(line: string): boolean {
    const headerKeywords = ['company', 'position', 'role', 'location', 'status', 'posted', 'deadline', 'link'];
    const lowerLine = line.toLowerCase();
    return headerKeywords.some(keyword => lowerLine.includes(keyword));
  }

  /**
   * Parse table headers from header row
   */
  private parseTableHeaders(headerLine: string): string[] {
    return headerLine.split('|')
      .map(cell => cell.trim())
      .filter(cell => cell.length > 0)
      .map(cell => cell.toLowerCase().replace(/[^a-z]/g, ''));
  }

  /**
   * Parse a table row into key-value pairs
   */
  private parseTableRow(line: string, headers: string[]): Record<string, string> | null {
    const cells = line.split('|')
      .map(cell => cell.trim())
      .filter(cell => cell.length > 0);
    
    if (cells.length !== headers.length) {
      return null;
    }
    
    const row: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      row[headers[i]] = cells[i];
    }
    
    return row;
  }

  /**
   * Check if table row is valid (has required fields)
   */
  private isValidTableRow(row: Record<string, string>): boolean {
    const hasCompany = Object.keys(row).some(key => 
      key.includes('company') && row[key] && row[key].length > 1
    );
    const hasPosition = Object.keys(row).some(key => 
      (key.includes('position') || key.includes('role')) && row[key] && row[key].length > 1
    );
    
    return hasCompany && hasPosition;
  }

  /**
   * Clean markdown formatting from text
   */
  private cleanMarkdown(text: string): string {
    if (!text) return '';
    
    return text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // [text](url) -> text
      .replace(/\*\*([^*]+)\*\*/g, '$1')        // **bold** -> bold
      .replace(/\*([^*]+)\*/g, '$1')            // *italic* -> italic
      .replace(/<[^>]+>/g, '')                   // Remove HTML
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/🛂\s*/g, '')                     // Remove emoji
      .replace(/at \*\*\[([^\]]+)\]\([^)]+\)\*\*/g, 'at $1') // Clean up company links
      .replace(/at \*\*([^*]+)\*\*/g, 'at $1')   // Clean up bold company names
      .replace(/\s*in\s*<details>.*$/, '')       // Remove location details
      .replace(/\s*at \*\*\[.*$/, '')           // Remove malformed company links
      .replace(/^-\s*/, '')                      // Remove leading dashes
      .replace(/^at\s+/, '')                     // Remove leading "at"
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extract URL from markdown or HTML
   */
  private extractUrlFromMarkdown(text: string): string | undefined {
    if (!text) return undefined;
    
    // [text](url)
    const mdMatch = text.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (mdMatch && mdMatch[2]) return mdMatch[2];
    
    // <a href="url">
    const htmlMatch = text.match(/href="([^"]+)"/);
    if (htmlMatch && htmlMatch[1]) return htmlMatch[1];
    
    // Already a URL
    if (text.startsWith('http')) return text;
    
    return undefined;
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  /**
   * Check if position is closed/inactive
   */
  private isPositionClosed(text: string): boolean {
    const closedIndicators = [
      '❌', '🔒', '⛔', '🚫',  // Emoji indicators
      'closed', 'filled', 'no longer available',
      'applications closed', 'position filled',
      'hiring complete', 'deadline passed'
    ];
    
    const lowerText = text.toLowerCase();
    return closedIndicators.some(indicator => lowerText.includes(indicator.toLowerCase()));
  }

  /**
   * Extract pay rate from text
   */
  private extractPayRate(text: string): string {
    if (!text || text.trim().length === 0) return 'Unknown';
    
    // Only extract if we see clear salary patterns
    const patterns = [
      /\$(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:per\s+)?(?:hour|hr|hourly)/i,
      /\$(\d+(?:,\d{3})*)-\$?(\d+(?:,\d{3})*)\s*(?:per\s+)?(?:hour|hr)/i,
      /\$(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:per\s+)?(?:year|yr|annually)/i,
      /(\d+)-(\d+)k\s*(?:per\s+)?(?:year|annually)/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[0]) {
        return match[0]; // Return the actual matched text
      }
    }
    
    // Check for explicit unpaid
    if (text.toLowerCase().includes('unpaid') || text.toLowerCase().includes('no pay')) {
      return 'Unpaid';
    }
    
    // If no clear pattern, return Unknown (don't make up data!)
    return 'Unknown';
  }

  /**
   * Create internship data from table row
   */
  private createInternshipFromTableRow(row: Record<string, string>, repo: GitHubRepo): RawInternshipData | null {
    const companyRaw = this.extractField(row, ['company', 'name']);
    const positionRaw = this.extractField(row, ['position', 'role', 'title']);
    const locationRaw = this.extractField(row, ['location', 'city', 'place']);
    const urlRaw = this.extractField(row, ['link', 'url', 'apply', 'application']);
    const status = this.extractField(row, ['status', 'state']);
    const posted = this.extractField(row, ['posted', 'date', 'created']);
    const payRate = this.extractField(row, ['pay', 'rate', 'salary', 'compensation']);
    
    if (!companyRaw || !positionRaw) return null;
    
    // Skip closed positions
    if (status && (status.toLowerCase().includes('closed') || status.includes('🔒'))) {
      return null;
    }
    
    // Check for closed position indicators in the text
    const fullText = `${companyRaw} ${positionRaw} ${locationRaw || ''} ${payRate || ''}`;
    if (this.isPositionClosed(fullText)) {
      console.log(`Skipping closed position: ${companyRaw} - ${positionRaw}`);
      return null;
    }
    
    // Clean markdown
    const company = this.cleanMarkdown(companyRaw);
    const position = this.cleanMarkdown(positionRaw);
    const location = locationRaw ? this.cleanMarkdown(locationRaw) : 'Location TBD';
    const url = urlRaw ? this.extractUrlFromMarkdown(urlRaw) : undefined;
    
    if (url && !this.isValidUrl(url)) {
      console.warn(`Invalid URL for ${company} - ${position}: ${url}`);
    }
    
    // Extract pay rate
    const extractedPayRate = payRate ? this.extractPayRate(payRate) : 'Unknown';
    
    // Parse posted date properly
    let postedAt: string;
    if (posted) {
      try {
        // Try to parse the posted date
        const parsedDate = new Date(posted);
        if (!isNaN(parsedDate.getTime())) {
          postedAt = parsedDate.toISOString();
        } else {
          // If parsing fails, use a reasonable default (30 days ago)
          const defaultDate = new Date();
          defaultDate.setDate(defaultDate.getDate() - 30);
          postedAt = defaultDate.toISOString();
        }
      } catch (error) {
        // If parsing fails, use a reasonable default
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() - 30);
        postedAt = defaultDate.toISOString();
      }
    } else {
      // No posted date, use a reasonable default (30 days ago)
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() - 30);
      postedAt = defaultDate.toISOString();
    }

    return {
      source: `GitHub: ${repo.owner}/${repo.repo}`,
      sourceType: InternshipSourceType.PROGRAM_PAGE,
      url: url || `https://github.com/${repo.owner}/${repo.repo}`,
      title: position,
      company: company,
      description: `${position} at ${company}${location ? ` in ${location}` : ''}`,
      location: location,
      postedAt: postedAt,
      applicationUrl: url || `https://github.com/${repo.owner}/${repo.repo}`,
      rawPayload: {
        repo: `${repo.owner}/${repo.repo}`,
        description: repo.description,
        scrapedAt: new Date().toISOString(),
        status: status,
        postedDate: posted,
        payRate: extractedPayRate
      }
    };
  }

  /**
   * Extract field value from table row using multiple possible keys
   */
  private extractField(row: Record<string, string>, possibleKeys: string[]): string | null {
    for (const key of possibleKeys) {
      for (const rowKey of Object.keys(row)) {
        if (rowKey.includes(key) && row[rowKey] && row[rowKey].trim()) {
          return row[rowKey].trim();
        }
      }
    }
    return null;
  }

  /**
   * Check if a line contains a company name
   */
  private isCompanyName(line: string): boolean {
    // Look for patterns that indicate company names
    const companyPatterns = [
      /^[A-Z][a-zA-Z\s&]+$/, // All caps or title case
      /^[A-Z][a-zA-Z\s&]+:$/, // Company name followed by colon
      /^[A-Z][a-zA-Z\s&]+\s*\(/, // Company name followed by parentheses
      /^[A-Z][a-zA-Z\s&]+\s*\[/, // Company name followed by brackets
    ];
    
    return companyPatterns.some(pattern => pattern.test(line)) && 
           line.length > 3 && 
           line.length < 50 &&
           !line.includes('http') &&
           !line.includes('www');
  }

  /**
   * Check if a line contains role information
   */
  private isRoleInfo(line: string): boolean {
    const roleKeywords = [
      'intern', 'internship', 'co-op', 'coop', 'trainee', 'associate',
      'engineer', 'developer', 'analyst', 'manager', 'designer', 'researcher'
    ];
    
    return roleKeywords.some(keyword => 
      line.toLowerCase().includes(keyword)
    ) && line.length > 10;
  }

  /**
   * Check if a line contains location information
   */
  private isLocationInfo(line: string): boolean {
    const locationPatterns = [
      /remote/i,
      /hybrid/i,
      /on-site/i,
      /onsite/i,
      /[A-Z][a-z]+,?\s+[A-Z]{2}/, // City, State format
      /[A-Z][a-z]+,?\s+[A-Z][a-z]+/, // City, Country format
    ];
    
    return locationPatterns.some(pattern => pattern.test(line));
  }

  /**
   * Check if a line contains an application URL
   */
  private isApplicationUrl(line: string): boolean {
    return line.includes('http') || line.includes('www') || line.includes('apply');
  }

  /**
   * Extract URL from a line
   */
  private extractUrl(line: string): string {
    const urlMatch = line.match(/https?:\/\/[^\s\)]+/);
    return urlMatch ? urlMatch[0] : '';
  }

  /**
   * Clean company name
   */
  private cleanCompanyName(name: string): string {
    return name
      .replace(/[:\-\[\]()]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Create internship data from parsed information
   */
  private createInternshipData(
    company: string,
    role: string,
    location: string,
    url: string,
    description: string,
    repo: GitHubRepo
  ): RawInternshipData | null {
    if (!company || !role) {
      return null;
    }

    return {
      source: `GitHub: ${repo.owner}/${repo.repo}`,
      sourceType: InternshipSourceType.PROGRAM_PAGE,
      url: url || `https://github.com/${repo.owner}/${repo.repo}`,
      title: role,
      company: company,
      description: description || `${role} at ${company}`,
      location: location || 'Location TBD',
      postedAt: new Date().toISOString(),
      applicationUrl: url,
      rawPayload: {
        repo: `${repo.owner}/${repo.repo}`,
        description: repo.description,
        scrapedAt: new Date().toISOString()
      }
    };
  }

  // Add validation methods
  private isValidCompanyName(name: string): boolean {
    if (!name || name.length < 2) return false;
    if (name.length > 100) return false; // Too long
    
    // Reject if it's clearly a role, not a company
    const roleKeywords = ['software', 'engineer', 'intern', 'analyst', 'manager', 'developer', 'designer'];
    const lowerName = name.toLowerCase();
    if (roleKeywords.some(k => lowerName === k || lowerName.startsWith(k + ' '))) {
      return false;
    }
    
    // Reject if it contains URLs or markdown artifacts
    if (name.includes('http') || name.includes('www.') || name.includes('[') || name.includes('](')) {
      return false;
    }
    
    // Reject if it's truncated garbage (ends with incomplete word)
    if (name.match(/\s[a-z]{1,2}$/)) return false; // "a ca", "us in"
    
    return true;
  }

  // Validate position title is real
  private isValidPositionTitle(title: string): boolean {
    if (!title || title.length < 5) return false;
    if (title.length > 200) return false; // Too long
    
    // Must contain internship-related keyword
    const internKeywords = ['intern', 'internship', 'co-op', 'coop', 'apprentice'];
    if (!internKeywords.some(k => title.toLowerCase().includes(k))) {
      return false;
    }
    
    // Reject if contains URLs
    if (title.includes('http') || title.includes('www.')) {
      return false;
    }
    
    // Reject if it's truncated garbage
    if (title.match(/\s[a-z]{1,3}$/)) return false;
    
    return true;
  }

  // Validate date string
  private isValidDate(dateStr: string): boolean {
    const date = new Date(dateStr);
    return !isNaN(date.getTime()) && date.getFullYear() >= 2024 && date.getFullYear() <= 2027;
  }

  // Extract deadline with strict validation
  private extractDeadline(text: string): string | null {
    if (!text) return null;
    
    const patterns = [
      /(?:deadline|apply by|due)[:\s]*([a-z]+\s+\d{1,2},?\s+\d{4})/i,
      /(?:deadline|due)[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
      /(?:deadline|due)[:\s]*(\d{4}-\d{2}-\d{2})/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        try {
          const date = new Date(match[1]);
          if (!isNaN(date.getTime())) {
            return date.toISOString();
          }
        } catch {}
      }
    }
    
    // Check for "rolling" explicitly
    if (text.toLowerCase().includes('rolling')) {
      return 'Rolling';
    }
    
    // If no clear deadline, return null (don't make up "Rolling Admission"!)
    return null;
  }
}

// Export default instance
export const githubScraper = new GitHubScraperService();
