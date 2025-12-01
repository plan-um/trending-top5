import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function runMigration() {
  console.log('Running migration to add rising category...');

  // Supabase JS doesn't support raw SQL directly
  // We'll use a workaround by trying to insert and checking the constraint

  // First, let's check current constraints by trying a test
  const { error: testError } = await supabase
    .from('trends')
    .select('id')
    .eq('category', 'rising')
    .limit(1);

  if (testError) {
    console.log('Current state:', testError.message);
  } else {
    console.log('Rising category query works - constraint may already be updated');
  }

  console.log('\n⚠️  Supabase JS client cannot execute DDL statements directly.');
  console.log('Please run this SQL in Supabase Dashboard → SQL Editor:\n');
  console.log('----------------------------------------');
  console.log(`ALTER TABLE trends DROP CONSTRAINT IF EXISTS trends_category_check;
ALTER TABLE trends ADD CONSTRAINT trends_category_check
  CHECK (category IN ('keyword', 'social', 'content', 'overall', 'rising'));`);
  console.log('----------------------------------------\n');
}

runMigration();
