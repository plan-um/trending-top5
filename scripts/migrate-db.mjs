// Direct SQL execution via Supabase
// Run with: node scripts/migrate-db.mjs

const SUPABASE_URL = 'https://qolnmdnmfcxxfuigiser.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvbG5tZG5tZmN4eGZ1aWdpc2VyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzg0Nzg5OSwiZXhwIjoyMDc5NDIzODk5fQ.jj6awD4ws1nrAgyWS8jzL1TMdSlmlcK2eOj6rAWp2cE';

const SQL = `
-- First try to create a helper function
CREATE OR REPLACE FUNCTION update_category_constraint()
RETURNS void AS $$
BEGIN
  ALTER TABLE trends DROP CONSTRAINT IF EXISTS trends_category_check;
  ALTER TABLE trends ADD CONSTRAINT trends_category_check
    CHECK (category IN ('keyword', 'social', 'content', 'overall', 'rising'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

const SQL_EXEC = `SELECT update_category_constraint();`;

async function main() {
  console.log('Attempting to create migration function...');

  // Try to call the rpc endpoint
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/update_category_constraint`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({})
  });

  const text = await response.text();
  console.log('Status:', response.status);
  console.log('Response:', text);

  if (response.status === 404) {
    console.log('\nFunction does not exist. Trying alternative approach...');

    // Try the pg/query endpoint (might not be available)
    const pgResponse = await fetch(`${SUPABASE_URL}/pg/query`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: SQL })
    });

    console.log('PG Query Status:', pgResponse.status);
    const pgText = await pgResponse.text();
    console.log('PG Response:', pgText);
  }
}

main().catch(console.error);
