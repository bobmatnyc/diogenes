#!/usr/bin/env node

const axios = require('axios');

async function testCharacterConsistency() {
  console.log('🎭 Testing Character Consistency with Search Delegation\n');

  try {
    const query = "What's the latest news about artificial intelligence development?";
    console.log(`Query: "${query}"`);

    const response = await axios.post(
      'http://localhost:3001/api/chat',
      {
        messages: [{ role: 'user', content: query }],
      },
      {
        timeout: 30000,
      },
    );

    const searchDelegated = response.headers['x-search-delegated'] === 'true';
    console.log(`\n🔍 Search delegated: ${searchDelegated ? 'Yes' : 'No'}`);

    // The response should be streamed, but let's try to get what we can
    console.log('📄 Response headers:', Object.keys(response.headers));
    console.log(`✅ Status: ${response.status}`);

    if (response.data) {
      console.log(`📝 Response received (length: ${response.data.length || 'unknown'})`);
      // For streaming responses, the data might not be complete
      if (typeof response.data === 'string' && response.data.length < 500) {
        console.log(`📄 Preview: ${response.data}`);
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testCharacterConsistency();
