// Test script to verify chat functionality

async function testChat() {
  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'Hello, can you respond to this test?' }
        ]
      })
    });

    if (!response.ok) {
      console.error('Error response:', response.status);
      const text = await response.text();
      console.error('Response body:', text);
      return;
    }

    // Read the streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      fullResponse += chunk;
      process.stdout.write(chunk);
    }

    console.log('\n\n✅ Test successful! Full response received.');
    console.log('Response length:', fullResponse.length, 'characters');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testChat();