import { createClient } from '@supabase/supabase-js';

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTables() {
  console.log('🐋 Creating tables in Supabase...');

  try {
    // Create conversations table
    console.log('📋 Creating conversations table...');
    const { error: conversationsError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS conversations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT,
          title TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          metadata JSONB DEFAULT '{}'::jsonb
        );
      `
    });

    if (conversationsError) {
      console.error('❌ Error creating conversations table:', conversationsError);
    } else {
      console.log('✅ Conversations table created');
    }

    // Create messages table
    console.log('📋 Creating messages table...');
    const { error: messagesError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
          content TEXT NOT NULL,
          parts JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          metadata JSONB DEFAULT '{}'::jsonb
        );
      `
    });

    if (messagesError) {
      console.error('❌ Error creating messages table:', messagesError);
    } else {
      console.log('✅ Messages table created');
    }

    // Create snapshots table
    console.log('📋 Creating snapshots table...');
    const { error: snapshotsError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS snapshots (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
          description TEXT,
          state JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (snapshotsError) {
      console.error('❌ Error creating snapshots table:', snapshotsError);
    } else {
      console.log('✅ Snapshots table created');
    }

    // Create usage_stats table
    console.log('📋 Creating usage_stats table...');
    const { error: usageStatsError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS usage_stats (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
          message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
          model TEXT NOT NULL,
          prompt_tokens INTEGER,
          completion_tokens INTEGER,
          total_tokens INTEGER,
          estimated_cost_usd DECIMAL(10, 6),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (usageStatsError) {
      console.error('❌ Error creating usage_stats table:', usageStatsError);
    } else {
      console.log('✅ Usage stats table created');
    }

    // Test the connection by trying to insert a test conversation
    console.log('🧪 Testing database connection...');
    const { data: testConversation, error: testError } = await supabase
      .from('conversations')
      .insert({
        title: 'Test Conversation',
        metadata: { test: true }
      })
      .select()
      .single();

    if (testError) {
      console.error('❌ Database connection test failed:', testError);
    } else {
      console.log('✅ Database connection test successful');
      console.log('📊 Test conversation created:', testConversation.id);

      // Clean up test data
      await supabase.from('conversations').delete().eq('id', testConversation.id);
      console.log('🧹 Test data cleaned up');
    }

    console.log('🎉 Database setup complete!');
    console.log('📊 Check your Supabase dashboard to verify tables were created');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

createTables();
