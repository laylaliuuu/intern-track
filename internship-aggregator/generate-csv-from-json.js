const fs = require('fs');

// Helper function to properly escape CSV fields
function escapeCsvField(field, alwaysQuote = false) {
  if (field === null || field === undefined) {
    return '';
  }
  const str = String(field);
  // Always quote URLs, or if field contains comma, quote, or newline
  if (alwaysQuote || str.includes(',') || str.includes('"') || str.includes('\n') || str.includes(':')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

const data = JSON.parse(fs.readFileSync('full-validation-pipeline-results.json', 'utf8'));

// CSV Headers
const headers = ['ID', 'Company', 'Title', 'URL', 'Status', 'HTTP Code', 'Final URL', 'Score', 'Reason', 'Expires', 'Last Checked', 'Validation Time (ms)'];

// Group by status
const byStatus = {
  ok: [],
  expired: [],
  dead: [],
  maybe_valid: []
};

data.results.forEach(r => {
  const row = [
    escapeCsvField(r.id),
    escapeCsvField(r.company || ''),
    escapeCsvField(r.title || ''),
    escapeCsvField(r.url, true),  // Always quote URL
    escapeCsvField(r.status),
    escapeCsvField(r.http_code || ''),
    escapeCsvField(r.final_url || r.url, true),  // Always quote final URL
    escapeCsvField(r.score),
    escapeCsvField(r.reason || ''),
    escapeCsvField(r.expires ? 'Yes' : 'No'),
    escapeCsvField(r.last_checked),
    escapeCsvField(r.validationTime)
  ].join(',');
  
  if (byStatus[r.status]) {
    byStatus[r.status].push(row);
  }
});

// Write CSV files
Object.keys(byStatus).forEach(status => {
  const filename = `validation-results-${status.toUpperCase()}.csv`;
  const content = [headers.join(','), ...byStatus[status]].join('\n');
  fs.writeFileSync(filename, content);
  console.log(`✅ Created ${filename} (${byStatus[status].length} records)`);
});

// Also create all-in-one CSV
const allRows = data.results.map(r => [
  escapeCsvField(r.id),
  escapeCsvField(r.company || ''),
  escapeCsvField(r.title || ''),
  escapeCsvField(r.url, true),  // Always quote URL
  escapeCsvField(r.status),
  escapeCsvField(r.http_code || ''),
  escapeCsvField(r.final_url || r.url, true),  // Always quote final URL
  escapeCsvField(r.score),
  escapeCsvField(r.reason || ''),
  escapeCsvField(r.expires ? 'Yes' : 'No'),
  escapeCsvField(r.last_checked),
  escapeCsvField(r.validationTime)
].join(','));

fs.writeFileSync('validation-results-all.csv', [headers.join(','), ...allRows].join('\n'));
console.log(`✅ Created validation-results-all.csv (${allRows.length} records)`);

console.log('\n📊 Summary:');
console.log(`   Total: ${data.total}`);
console.log(`   ✅ Valid: ${data.valid}`);
console.log(`   ⏰ Expired: ${data.expired}`);
console.log(`   ❌ Dead: ${data.dead}`);
console.log(`   ⚠️  Maybe Valid: ${data.maybe_valid}`);
