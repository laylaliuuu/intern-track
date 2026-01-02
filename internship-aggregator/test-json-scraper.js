// Test script for JSON scraper
const fetch = require('node-fetch');

async function testJsonScraper() {
  try {
    console.log('Testing JSON scraper...');
    
    // Test GitHub API call
    const response = await fetch('https://api.github.com/repos/SimplifyJobs/Summer2026-Internships/contents/.github/scripts/listings.json', {
      headers: {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('GitHub API response received');
    
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
  }
}

testJsonScraper();


