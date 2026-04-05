const testApi = async () => {
  console.log('🧪 Testing chat API with UUID...');

  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        conversationId: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID
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
