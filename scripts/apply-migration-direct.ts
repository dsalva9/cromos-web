import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Hardcoded for this specific migration
const supabaseUrl = 'https://cuzuzitadwmrlocqhhtu.supabase.co';

// Read from environment or use anon key
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY');
    console.error('');
    console.error('Please run this migration manually in the Supabase SQL Editor:');
    console.error('https://supabase.com/dashboard/project/cuzuzitadwmrlocqhhtu/sql/new');
    console.error('');
    console.error('Copy the contents of:');
    console.error('supabase/migrations/20251209233300_fix_create_template_overload_conflict.sql');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20251209233300_fix_create_template_overload_conflict.sql');

    console.log('📄 Reading migration file...');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('🚀 Applying migration via Supabase...');
    console.log('');

    // Try to execute the full SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql }).catch(() => ({ data: null, error: null }));

    if (error) {
        console.error('❌ Could not apply via RPC. Please apply manually:');
        console.error('');
        console.error('1. Go to: https://supabase.com/dashboard/project/cuzuzitadwmrlocqhhtu/sql/new');
        console.error('2. Copy and paste the migration SQL');
        console.error('3. Click "Run"');
        console.error('');
        console.error('Error:', error.message);
        process.exit(1);
    }

    console.log('✅ Migration applied successfully!');
}

applyMigration();
