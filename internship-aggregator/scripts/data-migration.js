// Data Quality Migration Script
// Re-processes existing internships with improved extraction logic

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Simple extraction functions (avoiding complex dependencies)
function extractGraduationYear(description) {
  if (!description) return [];
  
  const patterns = [
    /class\s+of\s+(\d{4})/gi,
    /graduating\s+in\s+(\d{4})/gi,
    /(\d{4})\s+graduate/gi,
    /class\s+(\d{4})/gi,
    /(\d{4})\s+class/gi
  ];
  
  const years = new Set();
  
  patterns.forEach(pattern => {
    const matches = description.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const yearMatch = match.match(/\d{4}/);
        if (yearMatch) {
          const year = yearMatch[0];
          if (year >= '2024' && year <= '2030') {
            years.add(year);
          }
        }
      });
    }
  });
  
  return Array.from(years);
}

function cleanExactRole(title) {
  if (!title) return '';
  
  return title
    .replace(/\s*-\s*(summer|fall|spring|winter)\s*202[0-9]/gi, '')
    .replace(/\s*(summer|fall|spring|winter)\s*202[0-9]/gi, '')
    .replace(/\s*\(bs\/ms\)/gi, '')
    .replace(/\s*\(bachelor's\)/gi, '')
    .replace(/\s*\(master's\)/gi, '')
    .replace(/\s*class\s+of\s+202[0-9]/gi, '')
    .replace(/\s*graduating\s+in\s+202[0-9]/gi, '')
    .replace(/🛂\s*/g, '')
    .replace(/📍\s*/g, '')
    .replace(/💰\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractPayRate(description) {
  if (!description) return { payRateMin: null, payRateMax: null, payRateType: 'unknown' };
  
  const hourlyPattern = /\$(\d+(?:,\d{3})*)\s*-\s*\$(\d+(?:,\d{3})*)\s*\/\s*hour/gi;
  const hourlySinglePattern = /\$(\d+(?:,\d{3})*)\s*\/\s*hour/gi;
  const salaryPattern = /\$(\d+(?:,\d{3})*)\s*-\s*\$(\d+(?:,\d{3})*)\s*\/\s*year/gi;
  const salarySinglePattern = /\$(\d+(?:,\d{3})*)\s*\/\s*year/gi;
  const unpaidPattern = /unpaid/gi;
  
  // Check for hourly rates
  let match = hourlyPattern.exec(description);
  if (match) {
    return {
      payRateMin: parseInt(match[1].replace(/,/g, '')),
      payRateMax: parseInt(match[2].replace(/,/g, '')),
      payRateType: 'hourly'
    };
  }
  
  match = hourlySinglePattern.exec(description);
  if (match) {
    const rate = parseInt(match[1].replace(/,/g, ''));
    return {
      payRateMin: rate,
      payRateMax: rate,
      payRateType: 'hourly'
    };
  }
  
  // Check for salary
  match = salaryPattern.exec(description);
  if (match) {
    return {
      payRateMin: parseInt(match[1].replace(/,/g, '')),
      payRateMax: parseInt(match[2].replace(/,/g, '')),
      payRateType: 'salary'
    };
  }
  
  match = salarySinglePattern.exec(description);
  if (match) {
    const rate = parseInt(match[1].replace(/,/g, ''));
    return {
      payRateMin: rate,
      payRateMax: rate,
      payRateType: 'salary'
    };
  }
  
  // Check for unpaid
  if (unpaidPattern.test(description)) {
    return {
      payRateMin: 0,
      payRateMax: 0,
      payRateType: 'unpaid'
    };
  }
  
  return { payRateMin: null, payRateMax: null, payRateType: 'unknown' };
}

function cleanLocation(location) {
  if (!location) return 'Not specified';
  
  // Clean up common location artifacts
  return location
    .replace(/📍\s*/g, '')
    .replace(/🛂\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim() || 'Not specified';
}

async function migrateData(dryRun = true) {
  console.log(`🚀 Starting data quality migration (Dry Run: ${dryRun})...`);
  
  const BATCH_SIZE = 10;
  let offset = 0;
  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalErrors = 0;
  
  while (true) {
    // Fetch batch of internships
    const { data: internships, error } = await supabase
      .from('internships')
      .select('id, title, description, location, raw_payload')
      .order('created_at', { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);
    
    if (error) {
      console.error('❌ Error fetching internships:', error);
      totalErrors += BATCH_SIZE;
      break;
    }
    
    if (!internships || internships.length === 0) {
      break; // No more internships to process
    }
    
    console.log(`📦 Processing batch ${Math.floor(offset / BATCH_SIZE) + 1} (${offset + 1}-${offset + internships.length})...`);
    
    for (const internship of internships) {
      totalProcessed++;
      
      try {
        // Extract new data
        const graduationYear = extractGraduationYear(internship.description);
        const exactRole = cleanExactRole(internship.title);
        const payRate = extractPayRate(internship.description);
        const cleanedLocation = cleanLocation(internship.location);
        
        // Prepare update payload
        const updatePayload = {
          graduation_year: graduationYear.length > 0 ? graduationYear : null,
          exact_role: exactRole || null,
          pay_rate_min: payRate.payRateMin,
          pay_rate_max: payRate.payRateMax,
          pay_rate_type: payRate.payRateType,
          location: cleanedLocation,
          raw_payload: {
            ...internship.raw_payload,
            migration_processed: true,
            migration_timestamp: new Date().toISOString(),
            extracted_graduation_year: graduationYear,
            extracted_exact_role: exactRole,
            extracted_pay_rate: payRate
          },
          updated_at: new Date().toISOString()
        };
        
        if (!dryRun) {
          const { error: updateError } = await supabase
            .from('internships')
            .update(updatePayload)
            .eq('id', internship.id);
          
          if (updateError) {
            console.error(`❌ Error updating internship ${internship.id}:`, updateError);
            totalErrors++;
          } else {
            totalUpdated++;
            console.log(`✅ Updated: ${internship.title.substring(0, 50)}...`);
          }
        } else {
          console.log(`🔍 Would update: ${internship.title.substring(0, 50)}...`);
          console.log(`   - Graduation Year: ${graduationYear.join(', ') || 'None'}`);
          console.log(`   - Exact Role: ${exactRole || 'None'}`);
          console.log(`   - Pay Rate: ${payRate.payRateType} ${payRate.payRateMin ? `$${payRate.payRateMin}` : ''}${payRate.payRateMax && payRate.payRateMax !== payRate.payRateMin ? `-$${payRate.payRateMax}` : ''}`);
          totalUpdated++; // Count as updated for dry run
        }
        
      } catch (error) {
        console.error(`❌ Error processing internship ${internship.id}:`, error);
        totalErrors++;
      }
    }
    
    offset += BATCH_SIZE;
    
    // Add small delay between batches
    if (!dryRun) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log('\n🎉 Migration complete!');
  console.log(`📊 Total processed: ${totalProcessed}`);
  console.log(`✅ Total updated: ${totalUpdated}`);
  console.log(`❌ Total errors: ${totalErrors}`);
  
  if (dryRun) {
    console.log('\n🚀 To execute the actual migration, run:');
    console.log('node scripts/data-migration.js --execute');
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const execute = args.includes('--execute');

migrateData(!execute).catch(console.error);
