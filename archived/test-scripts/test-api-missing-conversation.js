const testApiMissingConversationId = async () => {
  console.log('🧪 Testing chat API without conversationId...');

  try {
    const response = await fetch('http://localhost:3004/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // conversationId is missing!
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'hello' }]
        },
        model: 'gpt-4o',
        currentDiagram: '',
        mode: 'create'
      })
    });

    const text = await response.text();
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    console.log('Response body:', text);
  } catch (error) {
    console.error('❌ API test error:', error);
  }
};

testApiMissingConversationId();
