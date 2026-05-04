import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data', 'geonames');
const OUT_FILE = path.join(DATA_DIR, 'seed_postcodes.sql');
const COUNTRIES = ['ES', 'US', 'MX', 'CO', 'AR', 'BR'];

// Clean up old file
if (fs.existsSync(OUT_FILE)) {
  fs.unlinkSync(OUT_FILE);
}

// Ensure the directory exists
if (!fs.existsSync(DATA_DIR)) {
  console.error(`Data directory not found: ${DATA_DIR}`);
  process.exit(1);
}

const escapeSql = (str: string) => {
  if (!str) return 'NULL';
  return `'${str.replace(/'/g, "''")}'`;
};

// We will write in chunks to avoid memory issues
const stream = fs.createWriteStream(OUT_FILE, { encoding: 'utf8' });

stream.write(`
-- ==========================================
-- AUTO-GENERATED POSTAL CODE SEED FILE
-- Generated from Geonames TSV datasets
-- ==========================================

BEGIN;

`);

let totalProcessed = 0;

for (const country of COUNTRIES) {
  const filePath = path.join(DATA_DIR, `${country}.txt`);
  if (!fs.existsSync(filePath)) {
    console.warn(`[WARNING] Skipping ${country} - File not found at ${filePath}`);
    continue;
  }

  console.log(`Processing ${country}...`);
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  const processedPostcodes = new Set<string>();
  let countryCount = 0;

  for (const line of lines) {
    if (!line.trim()) continue;
    
    const parts = line.split('\t');
    if (parts.length < 11) continue;

    const countryCode = parts[0].trim();
    let postcode = parts[1].trim();
    const municipio = parts[2].trim();
    const provincia = parts[3].trim(); // Admin Name 1
    const lat = parseFloat(parts[9]);
    const lon = parseFloat(parts[10]);

    // Apply country-specific truncation rules
    if (countryCode === 'BR') {
      // Keep first 5 digits and pad with 000
      postcode = postcode.replace(/\D/g, ''); // Remove dash if any
      if (postcode.length >= 5) {
        postcode = postcode.substring(0, 5) + '000';
      }
    } else if (countryCode === 'AR') {
      // Get the 4 numeric digits (e.g., C1425DKF -> 1425)
      const match = postcode.match(/\d{4}/);
      if (match) {
        postcode = match[0];
      }
    }

    // Skip invalid or empty postcodes
    if (!postcode) continue;

    // Deduplicate within the country (since truncation creates duplicates)
    if (processedPostcodes.has(postcode)) {
      continue;
    }
    processedPostcodes.add(postcode);

    const latVal = isNaN(lat) ? 'NULL' : lat;
    const lonVal = isNaN(lon) ? 'NULL' : lon;

    const sql = `INSERT INTO postal_codes (country, postcode, municipio, provincia, lat, lon) VALUES (${escapeSql(countryCode)}, ${escapeSql(postcode)}, ${escapeSql(municipio)}, ${escapeSql(provincia)}, ${latVal}, ${lonVal}) ON CONFLICT (country, postcode) DO UPDATE SET municipio = COALESCE(EXCLUDED.municipio, postal_codes.municipio), provincia = COALESCE(EXCLUDED.provincia, postal_codes.provincia), lat = EXCLUDED.lat, lon = EXCLUDED.lon;\n`;
    
    stream.write(sql);
    countryCount++;
    totalProcessed++;
  }
  
  console.log(`- Added ${countryCount} unique postcodes for ${country}`);
}

stream.write(`
COMMIT;
`);
stream.end();

stream.on('finish', () => {
  console.log(`\n✅ Done! Generated SQL for ${totalProcessed} total postcodes.`);
  console.log(`File saved to: ${OUT_FILE}`);
  console.log(`Run: npx supabase db execute data/geonames/seed_postcodes.sql --linked`);
});
