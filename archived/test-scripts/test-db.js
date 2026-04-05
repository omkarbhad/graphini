import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://igdjfobysimpsjvcjsrz.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnZGpmb2J5c2ltcHNqdmNqc3J6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYwODE3MywiZXhwIjoyMDc0MTg0MTczfQ.ama-QOXZOjl1JSi955FH7L96YuMAo8yqitOqlOfrQ04';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testDatabase() {
  console.log('🧪 Testing database operations...');

  try {
    // Test 1: Create a conversation
    console.log('1. Creating conversation...');
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        title: 'Test Conversation',
        metadata: { test: true }
      })
      .select()
      .single();

    if (convError) {
      console.error('❌ Failed to create conversation:', convError);
      return;
    }
    console.log('✅ Conversation created:', conversation.id);

    // Test 2: Create a message
    console.log('2. Creating message...');
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        role: 'user',
        content: 'Hello, this is a test message',
        parts: [{ type: 'text', text: 'Hello, this is a test message' }]
      })
      .select()
      .single();

    if (msgError) {
      console.error('❌ Failed to create message:', msgError);
      return;
    }
    console.log('✅ Message created:', message.id);

    // Test 3: List messages
    console.log('3. Listing messages...');
    const { data: messages, error: listError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation.id);

    if (listError) {
      console.error('❌ Failed to list messages:', listError);
      return;
    }
    console.log('✅ Messages listed:', messages.length);

    // Test 4: Clean up
    console.log('4. Cleaning up...');
    await supabase.from('conversations').delete().eq('id', conversation.id);
    console.log('✅ Cleanup complete');

    console.log('🎉 All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDatabase();
