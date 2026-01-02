// Direct test of GitHub scraper
require('dotenv').config({ path: '.env.local' });

async function testGitHubScraper() {
  try {
    console.log('Testing GitHub scraper directly...');
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
    console.log('File size:', data.size, 'bytes');
    console.log('Has content:', !!data.content);
    
    if (!data.content) {
      console.error('No content found in repository');
      return;
    }
    
    // Decode base64 content
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    console.log('Content decoded, length:', content.length);
    
    // Parse JSON
    const jsonData = JSON.parse(content);
    console.log('JSON parsed successfully, items:', jsonData.length);
    
    // Show first few items
    console.log('\nFirst 3 items:');
    jsonData.slice(0, 3).forEach((item, index) => {
      console.log(`${index + 1}. ${item.title} at ${item.company_name}`);
      console.log(`   URL: ${item.url}`);
      console.log(`   Location: ${item.locations?.[0] || 'N/A'}`);
      console.log(`   Active: ${item.active}`);
      console.log();
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testGitHubScraper();


