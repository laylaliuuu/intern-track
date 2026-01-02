// Debug test for GitHub scraper
require('dotenv').config({ path: '.env.local' });

async function testGitHubScraper() {
  try {
    console.log('Testing GitHub scraper with debug info...');
    console.log('GITHUB_TOKEN:', process.env.GITHUB_TOKEN ? 'SET' : 'NOT SET');
    
    // Test the exact same call the scraper makes
    const headers = {
      'Authorization': `token ${process.env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json'
    };
    
    console.log('Making request to pittcsc/Summer2026-Internships...');
    const response = await fetch('https://api.github.com/repos/pittcsc/Summer2026-Internships/contents/.github/scripts/listings.json', {
      headers
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('GitHub API error:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('GitHub API response received');
    console.log('Has content:', !!data.content);
    console.log('Has download_url:', !!data.download_url);
    console.log('Size:', data.size);
    
    let content;
    if (data.content) {
      content = Buffer.from(data.content, 'base64').toString('utf-8');
      console.log('Using direct content, length:', content.length);
    } else if (data.download_url) {
      console.log('Downloading from:', data.download_url);
      const downloadResponse = await fetch(data.download_url);
      content = await downloadResponse.text();
      console.log('Downloaded content, length:', content.length);
    } else {
      console.error('No content or download URL available');
      return;
    }
    
    // Parse JSON
    const jsonData = JSON.parse(content);
    console.log('JSON parsed successfully, items:', jsonData.length);
    
    // Test filtering
    let processedCount = 0;
    let activeCount = 0;
    let visibleCount = 0;
    let validCount = 0;
    let year2026Count = 0;
    
    for (const item of jsonData.slice(0, 1000)) { // Test first 1000 items
      processedCount++;
      
      // Only process visible internships (relax active requirement for now)
      if (!item.is_visible) {
        visibleCount++;
        continue;
      }
      
      // Count inactive but still process them
      if (!item.active) {
        activeCount++;
      }
      
      // Skip if missing required fields
      if (!item.company_name || !item.title || !item.url) {
        continue;
      }
      
      validCount++;
      
      // Test 2026 filtering
      const searchText = `${item.title || ''} ${item.description || ''} ${(item.terms || []).join(' ')}`.toLowerCase();
      const terms = item.terms || [];
      
      let is2026 = false;
      
      // Look for 2026 in the text
      if (searchText.includes('2026')) {
        is2026 = true;
      }
      
      // Look for "2026" in terms array specifically
      for (const term of terms) {
        if (term.toLowerCase().includes('2026')) {
          is2026 = true;
          break;
        }
      }
      
      // If no year is specified in terms, include it (might be 2026)
      if (terms.length === 0 || !terms.some(term => /\b(202[0-9]|203[0-9])\b/.test(term))) {
        is2026 = true;
      }
      
      // Only include if explicitly 2026 or no year specified (might be 2026)
      if (terms.length === 0 || !terms.some(term => /\b(202[0-9]|203[0-9])\b/.test(term))) {
        is2026 = true;
      } else {
        is2026 = false;
      }
      
      if (is2026) {
        year2026Count++;
        console.log(`Found 2026 internship: ${item.title} at ${item.company_name}`);
        console.log(`  Terms: ${terms.join(', ')}`);
        console.log(`  Active: ${item.active}, Visible: ${item.is_visible}`);
        console.log(`  URL: ${item.url}`);
        console.log();
      }
    }
    
    console.log(`Filtering results: ${processedCount} total, ${activeCount} inactive, ${visibleCount} not visible, ${validCount} valid, ${year2026Count} for 2026`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testGitHubScraper();
