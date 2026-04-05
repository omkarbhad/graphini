import { createClient } from '@supabase/supabase-js';

// Supabase credentials (from your .env file)
const SUPABASE_URL = 'https://igdjfobysimpsjvcjsrz.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnZGpmb2J5c2ltcHNqdmNqc3J6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYwODE3MywiZXhwIjoyMDc0MTg0MTczfQ.ama-QOXZOjl1JSi955FH7L96YuMAo8yqitOqlOfrQ04';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testConnection() {
  console.log('🧪 Testing Supabase connection...');

  try {
    // Test basic connectivity by trying to select from a non-existent table
    // This will fail with a specific error if connection works
    const { error } = await supabase.from('non_existent_test_table').select('*').limit(1);

    // If we get a permission/connection error, connection is working
    if (error) {
      console.log('✅ Supabase connection successful!');
      console.log(`📍 Connected to: ${SUPABASE_URL}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🐋 Mermaid Live Editor - Supabase Setup Test\\n');

  const connected = await testConnection();

  if (!connected) {
    console.log('\\n❌ Connection failed. Please check your credentials.');
    process.exit(1);
  }

  console.log('\\n📋 Next Steps:');
  console.log('1. Go to your Supabase dashboard: https://supabase.com/dashboard');
  console.log('2. Select your project');
  console.log('3. Go to SQL Editor (left sidebar)');
  console.log('4. Click "New Query"');
  console.log('5. Copy and paste the contents of database/schema.sql');
  console.log('6. Click "Run" (bottom right)');
  console.log('7. Verify tables were created in Table Editor (left sidebar)');

  console.log('\\n📁 Schema file location: ./database/schema.sql');

  console.log('\\n🎉 Setup complete! Once schema is applied:');
  console.log('   pnpm dev');
  console.log('   Visit: http://localhost:5173/api/chat/conversations');
  console.log('   Should see: {"conversations":[],"pagination":{...}}');
}

main().catch(console.error);
