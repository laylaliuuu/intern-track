/**
 * Comprehensive URL Validation Pipeline
 * Implements 5-step validation process with scoring
 */

interface ValidationResult {
  status: 'ok' | 'dead' | 'expired' | 'maybe_valid';
  http_code: number;
  final_url: string;
  redirects: string[];
  score: number;
  reason: string;
  expires: boolean;
  last_checked: string;
}

interface ReachabilityResult {
  status: 'ok' | 'dead';
  http_code: number;
  final_url: string;
  redirects: string[];
  shouldRetry: boolean;
}

interface KeywordScanResult {
  isDead: boolean;
  isExpired: boolean;
  isUselessCareerPage: boolean;
  isGoodListing: boolean;
  isGraduateOnly: boolean;
  deadKeywords: string[];
  expiredKeywords: string[];
  goodKeywords: string[];
}

export class ValidationService {
  // Step 1: URL Reachability Check
  async checkReachability(url: string, retryCount = 0): Promise<ReachabilityResult> {
    const redirects: string[] = [url];
    let finalUrl = url;
    let lastResponse: Response | null = null;

    try {
      // Try HEAD first (faster), fallback to GET if needed
      const response = await fetch(url, {
        method: 'HEAD',
        redirect: 'manual',
        signal: AbortSignal.timeout(10000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; InternshipBot/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      lastResponse = response;

      // Handle redirects manually to track them
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (location) {
          redirects.push(location);
          finalUrl = new URL(location, url).href;
          // Follow redirect recursively (max 5 redirects)
          if (redirects.length < 5) {
            return this.checkReachability(finalUrl, retryCount);
          }
        }
      }

      // If HEAD doesn't work, try GET
      if (response.status === 405 || response.status === 501) {
        const getResponse = await fetch(url, {
          method: 'GET',
          redirect: 'follow',
          signal: AbortSignal.timeout(15000),
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; InternshipBot/1.0)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        });
        lastResponse = getResponse;
        finalUrl = getResponse.url;
      }

      const status = lastResponse!.status;

      // Status code classification
      if (status >= 200 && status < 400) {
        return {
          status: 'ok',
          http_code: status,
          final_url: finalUrl,
          redirects,
          shouldRetry: false,
        };
      }

      if (status >= 400 && status < 500) {
        return {
          status: 'dead',
          http_code: status,
          final_url: finalUrl,
          redirects,
          shouldRetry: false,
        };
      }

      if (status >= 500 && status < 600) {
        // Retry once for server errors
        if (retryCount === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return this.checkReachability(url, 1);
        }
        return {
          status: 'dead',
          http_code: status,
          final_url: finalUrl,
          redirects,
          shouldRetry: false,
        };
      }

      return {
        status: 'dead',
        http_code: status,
        final_url: finalUrl,
        redirects,
        shouldRetry: false,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          status: 'dead',
          http_code: 0,
          final_url: finalUrl,
          redirects,
          shouldRetry: false,
        };
      }
      return {
        status: 'dead',
        http_code: 0,
        final_url: finalUrl,
        redirects,
        shouldRetry: false,
      };
    }
  }

  // Step 2: Detect Redirects
  analyzeRedirects(redirects: string[], finalUrl: string): { quality: 'high' | 'low' | 'medium'; reason: string } {
    if (redirects.length === 1) {
      return { quality: 'high', reason: 'No redirects' };
    }

    const finalUrlLower = finalUrl.toLowerCase();
    const finalPath = new URL(finalUrl).pathname.toLowerCase();

    // Redirects to homepage
    if (finalPath === '/' || finalPath === '/home' || finalPath === '/index') {
      return { quality: 'low', reason: 'Redirects to homepage' };
    }

    // Redirects to login page
    if (finalPath.includes('/login') || finalPath.includes('/signin') || finalPath.includes('/auth')) {
      return { quality: 'medium', reason: 'Redirects to login page' };
    }

    // Redirects to generic careers page
    if (finalPath === '/careers' || finalPath === '/jobs' || finalPath === '/careers/') {
      return { quality: 'low', reason: 'Redirects to generic careers page' };
    }

    // Redirects to search page
    if (finalPath.includes('/search') || finalPath.includes('/browse')) {
      return { quality: 'low', reason: 'Redirects to search/browse page' };
    }

    return { quality: 'high', reason: 'Redirects to specific page' };
  }

  // Step 3: HTML Keyword Scan
  async scanKeywords(url: string): Promise<KeywordScanResult> {
    // Check URL for generic career page patterns first (before fetching)
    const genericCareerPagePaths = [
      '/open-roles',
      '/open-positions',
      '/careers',
      '/jobs',
      '/job-search',
      '/all-jobs',
    ];
    
    let isGenericCareerPageUrl = false;
    try {
      const urlObj = new URL(url);
      isGenericCareerPageUrl = genericCareerPagePaths.some(path => 
        urlObj.pathname.toLowerCase().endsWith(path) || 
        urlObj.pathname.toLowerCase() === path
      );
      
      // If it's a generic career page URL, return early
      if (isGenericCareerPageUrl) {
        return {
          isDead: false,
          isExpired: false,
          isUselessCareerPage: true,
          isGoodListing: false,
          isGraduateOnly: false,
          deadKeywords: [],
          expiredKeywords: [],
          goodKeywords: [],
        };
      }
    } catch {
      // Invalid URL, continue with normal scan
    }
    try {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; InternshipBot/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      if (!response.ok) {
        return {
          isDead: false,
          isExpired: false,
          isUselessCareerPage: false,
          isGoodListing: false,
          isGraduateOnly: false,
          deadKeywords: [],
          expiredKeywords: [],
          goodKeywords: [],
        };
      }

      const html = await response.text();
      const lowerHtml = html.toLowerCase();

      // Extract visible text only (remove script, style, comments, meta tags)
      // This prevents false positives from JavaScript/CSS code
      let visibleText = lowerHtml
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')  // Remove script tags
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')    // Remove style tags
        .replace(/<!--[\s\S]*?-->/g, '')                    // Remove comments
        .replace(/<meta[^>]*>/gi, '')                       // Remove meta tags
        .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '') // Remove noscript
        .replace(/<[^>]+>/g, ' ')                           // Remove HTML tags, keep text
        .replace(/\s+/g, ' ')                               // Normalize whitespace
        .trim();

      // Dead/Not Found keywords (check first - highest priority)
      const deadKeywords = [
        'page not found',
        'job not found',
        'the page you are looking for doesn\'t exist',
        'the page you\'re looking for might be deleted',
        'the job you requested was not found',
        'the job board you were viewing is no longer active',
        'page you are looking for doesn\'t exist',
        'page you\'re looking for might be deleted',
        'job you requested was not found',
        'job board you were viewing is no longer active',
        'doesn\'t exist',
        'was not found',
        'no longer active',
        '404',
        'not found',
      ];

      const foundDeadKeywords: string[] = [];
      for (const keyword of deadKeywords) {
        if (visibleText.includes(keyword)) {
          foundDeadKeywords.push(keyword);
        }
      }

      const isDead = foundDeadKeywords.length > 0;

      // Expired / Not Taking Applicants keywords
      // Keep 'archived', 'expired', 'inactive' but check in visible text only
      const expiredKeywords = [
        'no longer accepting',
        'applications closed',
        'position filled',
        'this job posting is no longer available',
        'we are no longer hiring',
        'archived',
        'expired',
        'inactive',
        'job posting is no longer available',
        'position is no longer available',
        'this position has been filled',
        'hiring complete',
        'no longer accepting applications',
        'applications are closed',
        'posting has expired',
        'position has been removed',
        'job has been removed',
        'position filled',
        'role filled',
        'opportunity filled',
      ];

      const foundExpiredKeywords: string[] = [];
      for (const keyword of expiredKeywords) {
        // Check in visible text only (not in scripts/styles)
        if (visibleText.includes(keyword)) {
          foundExpiredKeywords.push(keyword);
        }
      }

      const isExpired = foundExpiredKeywords.length > 0;

      // Check for Master's/PhD-only positions (exclude undergraduate internships)
      const phdOnlyPattern = /\b(phd|ph\.d|doctorate|doctoral|phd summer|phd intern)\b/i;
      const masterOnlyPattern = /\b(master'?s degree|ms degree|mba|graduate degree|graduate intern)\b/i;
      const undergraduatePattern = /\b(bachelor'?s degree|bs degree|undergraduate|bachelor or master|bachelor'?s or master'?s|bs or ms|undergraduate or graduate|pursuing a bachelor|pursuing a master)\b/i;

      const hasPhdOnly = phdOnlyPattern.test(visibleText);
      const hasMasterOnly = masterOnlyPattern.test(visibleText);
      const hasUndergraduate = undergraduatePattern.test(visibleText);

      // If Master's/PhD-only and no Bachelor's mentioned, it's not for undergraduates
      const isGraduateOnly = hasPhdOnly || (hasMasterOnly && !hasUndergraduate);

      // Useless Career Pages indicators
      const uselessPageIndicators = [
        'search all jobs',
        'view openings',
        'browse jobs',
        'find jobs',
        'job search',
        'filter jobs',
        'all jobs',
        'open roles',
        'open positions',
        'all open positions',
        'all open roles',
        'view all jobs',
        'see all jobs',
      ];

      const hasUselessIndicators = uselessPageIndicators.some(indicator => visibleText.includes(indicator));

      // Check if page contains internship-related keywords
      const internshipKeywords = ['intern', 'internship', 'student', 'new grad', 'co-op', 'coop'];
      const hasInternshipKeywords = internshipKeywords.some(keyword => visibleText.includes(keyword));

      // Also check if URL path suggests generic career page
      const genericCareerPagePaths = [
        '/open-roles',
        '/open-positions',
        '/careers',
        '/jobs',
        '/job-search',
        '/all-jobs',
      ];
      
      let isGenericCareerPageUrl = false;
      try {
        const urlObj = new URL(url);
        isGenericCareerPageUrl = genericCareerPagePaths.some(path => 
          urlObj.pathname.toLowerCase().endsWith(path) || 
          urlObj.pathname.toLowerCase() === path
        );
      } catch {
        // Invalid URL, skip check
      }

      const isUselessCareerPage = (hasUselessIndicators && !hasInternshipKeywords) || isGenericCareerPageUrl;

      // Good Listing indicators
      const goodListingKeywords = [
        'internship',
        'intern',
        'summer',
        '2025 internship',
        '2026 internship',
        'apply',
        'responsibilities',
        'qualifications',
        'job description',
        'apply now',
        'submit application',
        'application deadline',
        'internship program',
        'co-op program',
        'undergraduate',
        'bachelor\'s degree',
        'bs degree',
        'class of 202',
        'graduating in 202',
        'internship opportunity',
        'apply for this position',
        'join our team',
        'currently hiring',
        'accepting applications',
      ];

      const foundGoodKeywords: string[] = [];
      for (const keyword of goodListingKeywords) {
        // Check in visible text only
        if (visibleText.includes(keyword)) {
          foundGoodKeywords.push(keyword);
        }
      }

      const isGoodListing = foundGoodKeywords.length >= 2; // Need at least 2 indicators

      return {
        isDead,
        isExpired,
        isUselessCareerPage,
        isGoodListing,
        isGraduateOnly,
        deadKeywords: foundDeadKeywords,
        expiredKeywords: foundExpiredKeywords,
        goodKeywords: foundGoodKeywords,
      };
    } catch (error) {
      return {
        isDead: false,
        isExpired: false,
        isUselessCareerPage: false,
        isGoodListing: false,
        isGraduateOnly: false,
        deadKeywords: [],
        expiredKeywords: [],
        goodKeywords: [],
      };
    }
  }

  // Step 4: Duplicate Detection (URL normalization)
  normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      
      // Remove tracking parameters
      const trackingParams = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'gh_jid', 'ref', 'source', 'fbclid', 'gclid', 'ref_id',
        '_ga', '_gid', 'tracking', 'track', 'campaign',
      ];

      trackingParams.forEach(param => {
        urlObj.searchParams.delete(param);
      });

      // Normalize path (remove trailing slash)
      urlObj.pathname = urlObj.pathname.replace(/\/$/, '');

      return urlObj.href;
    } catch {
      return url;
    }
  }

  // Step 5: Final Scoring
  calculateScore(
    reachability: ReachabilityResult,
    redirectAnalysis: { quality: 'high' | 'low' | 'medium'; reason: string },
    keywordScan: KeywordScanResult
  ): number {
    let score = 0;

    // Reachable (200-399)
    if (reachability.status === 'ok' && reachability.http_code >= 200 && reachability.http_code < 400) {
      score += 3;
    }

    // Contains internship keywords
    if (keywordScan.isGoodListing) {
      score += 3;
    }

    // Has Apply button/keywords
    if (keywordScan.goodKeywords.some(k => k.includes('apply'))) {
      score += 4;
    }

    // Redirects to generic career page
    if (redirectAnalysis.quality === 'low') {
      score -= 3;
    }

    // Expired keyword found
    if (keywordScan.isExpired) {
      score -= 5;
    }

    // 400/500 status
    if (reachability.http_code >= 400) {
      score -= 10;
    }

    // Useless career page
    if (keywordScan.isUselessCareerPage) {
      score -= 3;
    }

    return score;
  }

  // Main validation method
  async validateUrl(url: string): Promise<ValidationResult> {
    const startTime = Date.now();

    // Step 1: URL Reachability Check
    const reachability = await this.checkReachability(url);

    if (reachability.status === 'dead') {
      return {
        status: 'dead',
        http_code: reachability.http_code,
        final_url: reachability.final_url,
        redirects: reachability.redirects,
        score: -10,
        reason: `HTTP ${reachability.http_code} - Page not reachable`,
        expires: false,
        last_checked: new Date().toISOString(),
      };
    }

    // Step 2: Detect Redirects
    const redirectAnalysis = this.analyzeRedirects(reachability.redirects, reachability.final_url);

    // Step 3: HTML Keyword Scan
    const keywordScan = await this.scanKeywords(reachability.final_url);

    // Check if dead/not found (highest priority)
    if (keywordScan.isDead) {
      return {
        status: 'dead',
        http_code: reachability.http_code,
        final_url: reachability.final_url,
        redirects: reachability.redirects,
        score: -10,
        reason: `Page/Job not found: ${keywordScan.deadKeywords[0]}`,
        expires: false,
        last_checked: new Date().toISOString(),
      };
    }

    // Check if generic career page (not specific job listing)
    if (keywordScan.isUselessCareerPage) {
      return {
        status: 'dead',
        http_code: reachability.http_code,
        final_url: reachability.final_url,
        redirects: reachability.redirects,
        score: -10,
        reason: 'Generic career page - not a specific job listing',
        expires: false,
        last_checked: new Date().toISOString(),
      };
    }

    // Check if expired
    if (keywordScan.isExpired) {
      return {
        status: 'expired',
        http_code: reachability.http_code,
        final_url: reachability.final_url,
        redirects: reachability.redirects,
        score: -5,
        reason: `Expired: ${keywordScan.expiredKeywords[0]}`,
        expires: true,
        last_checked: new Date().toISOString(),
      };
    }

    // Check for Master's/PhD-only positions (exclude undergraduate internships)
    if (keywordScan.isGraduateOnly) {
      return {
        status: 'dead',
        http_code: reachability.http_code,
        final_url: reachability.final_url,
        redirects: reachability.redirects,
        score: -10,
        reason: 'Master\'s/PhD-only position - not undergraduate internship',
        expires: false,
        last_checked: new Date().toISOString(),
      };
    }

    // Step 5: Final Scoring
    const score = this.calculateScore(reachability, redirectAnalysis, keywordScan);

    // Determine final status
    let status: 'ok' | 'dead' | 'expired' | 'maybe_valid';
    let reason: string;

    if (score >= 5) {
      status = 'ok';
      reason = 'Valid listing - high quality';
    } else if (score >= 1 && score < 5) {
      status = 'maybe_valid';
      reason = 'Maybe valid - needs manual review';
    } else {
      status = 'dead';
      reason = `Low score: ${score} - ${redirectAnalysis.reason || 'Poor quality indicators'}`;
    }

    return {
      status,
      http_code: reachability.http_code,
      final_url: reachability.final_url,
      redirects: reachability.redirects,
      score,
      reason,
      expires: false,
      last_checked: new Date().toISOString(),
    };
  }
}

export const validationService = new ValidationService();

