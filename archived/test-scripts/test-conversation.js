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

async function testConversationOperations() {
  console.log('🧪 Testing conversation operations...');

  try {
    // Test 1: Check if conversation exists
    const testId = 'test-conversation-123';
    console.log('1. Checking if conversation exists:', testId);

    const { data: existingConversation, error: getError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', testId)
      .single();

    if (getError && getError.code !== 'PGRST116') {
      console.error('❌ Error checking conversation:', getError);
      return;
    }

    if (existingConversation) {
      console.log('✅ Conversation exists:', existingConversation.id);
    } else {
      console.log('ℹ️  Conversation does not exist, creating new one...');

      // Test 2: Create conversation
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert({
          id: testId,
          title: 'Test Chat',
          metadata: {}
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating conversation:', createError);
        return;
      }
      console.log('✅ Conversation created:', newConversation.id);
    }

    // Test 3: Create message
    console.log('3. Creating message...');
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: testId,
        role: 'user',
        content: 'Hello, this is a test message',
        parts: [{ type: 'text', text: 'Hello, this is a test message' }]
      })
      .select()
      .single();

    if (msgError) {
      console.error('❌ Error creating message:', msgError);
      return;
    }
    console.log('✅ Message created:', message.id);

    // Test 4: Clean up
    console.log('4. Cleaning up...');
    await supabase.from('conversations').delete().eq('id', testId);
    console.log('✅ Cleanup complete');

    console.log('🎉 All conversation tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testConversationOperations();
