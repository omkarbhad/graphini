const testApi = async () => {
  console.log('🧪 Testing chat API...');

  try {
    const response = await fetch('http://localhost:3004/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        conversationId: 'test-api-123',
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

    if (response.ok) {
      console.log('✅ API test successful');
    } else {
      console.log('❌ API test failed');
    }
  } catch (error) {
    console.error('❌ API test error:', error);
  }
};

testApi();
