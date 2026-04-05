import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testConnection() {
  console.log('🧪 Testing Supabase connection...');

  try {
    // Test basic connectivity
    const { data, error } = await supabase
      .from('_supabase_tables') // This is a system table that should exist
      .select('*')
      .limit(1);

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" which is expected
      throw error;
    }

    console.log('✅ Supabase connection successful!');
    console.log(`📍 Connected to: ${SUPABASE_URL}`);

    return true;
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🐋 Mermaid Live Editor - Supabase Setup Test\n');

  const connected = await testConnection();

  if (!connected) {
    console.log('\n❌ Connection failed. Please check your credentials.');
    process.exit(1);
  }

  console.log('\n📋 Next Steps:');
  console.log('1. Go to your Supabase dashboard: https://supabase.com/dashboard');
  console.log('2. Select your project');
  console.log('3. Go to SQL Editor (left sidebar)');
  console.log('4. Copy and paste the contents of database/schema.sql');
  console.log('5. Click "Run"');
  console.log('6. Verify tables were created in Table Editor');

  console.log('\n📁 Schema file location: ./database/schema.sql');

  console.log('\n🎉 Setup complete! Once schema is applied, run:');
  console.log('   pnpm dev');
  console.log('   Visit: http://localhost:5173/api/chat/conversations');
}

main().catch(console.error);
