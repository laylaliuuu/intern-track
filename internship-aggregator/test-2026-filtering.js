// Test 2026 filtering logic
require('dotenv').config({ path: '.env.local' });

async function test2026Filtering() {
  try {
    console.log('Testing 2026 filtering logic...');
    
    // Test the exact same call the scraper makes
    const headers = {
      'Authorization': `token ${process.env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json'
    };
    
    console.log('Making request to pittcsc/Summer2026-Internships...');
    const response = await fetch('https://api.github.com/repos/pittcsc/Summer2026-Internships/contents/.github/scripts/listings.json', {
      headers
    });
    
    if (!response.ok) {
      console.error('GitHub API error:', response.status);
      return;
    }
    
    const data = await response.json();
    let content;
    
    if (data.content) {
      content = Buffer.from(data.content, 'base64').toString('utf-8');
    } else if (data.download_url) {
      const downloadResponse = await fetch(data.download_url);
      content = await downloadResponse.text();
    } else {
      console.error('No content available');
      return;
    }
    
    const jsonData = JSON.parse(content);
    console.log(`Total items in JSON: ${jsonData.length}`);
    
    // Test filtering logic
    let processedCount = 0;
    let visibleCount = 0;
    let validCount = 0;
    let year2026Count = 0;
    let finalCount = 0;
    
    for (const item of jsonData.slice(0, 5000)) { // Test first 5000 items
      processedCount++;
      
      // Only process visible internships
      if (!item.is_visible) {
        continue;
      }
      visibleCount++;
      
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
      
      if (is2026) {
        year2026Count++;
        finalCount++;
        console.log(`Found 2026 internship: ${item.title} at ${item.company_name}`);
        console.log(`  Terms: ${terms.join(', ')}`);
        console.log(`  Active: ${item.active}, Visible: ${item.is_visible}`);
        console.log(`  URL: ${item.url}`);
        console.log();
      }
    }
    
    console.log(`Filtering results: ${processedCount} total, ${visibleCount} visible, ${validCount} valid, ${year2026Count} for 2026, ${finalCount} final`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

test2026Filtering();
