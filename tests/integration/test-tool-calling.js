// Test script for tool calling with web search
const fetch = require('node-fetch');

async function testToolCalling() {
  const apiUrl = 'http://localhost:3000/api/chat';

  // Test queries that should trigger web search
  const testQueries = [
    'What happened in the news today?',
    'Who won the latest Super Bowl?',
    "What's the current price of Bitcoin?",
    'Tell me about the latest AI developments in 2024',
  ];

  for (const query of testQueries) {
    console.log(`\n=== Testing: "${query}" ===\n`);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: query,
            },
          ],
        }),
      });

      if (!response.ok) {
        console.error(`Error: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.error('Response:', errorText);
        continue;
      }

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        process.stdout.write(chunk);
        fullResponse += chunk;
      }

      console.log('\n\n--- Response Complete ---');

      // Check if tool was called (look for search result formatting)
      if (fullResponse.includes('Web search results') || fullResponse.includes('http')) {
        console.log('✓ Tool calling appears to be working - found web references');
      } else {
        console.log('ℹ No obvious web search results found in response');
      }
    } catch (error) {
      console.error('Request failed:', error.message);
    }

    // Wait a bit between requests
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log('\n=== Test Complete ===');
}

// Run the test
testToolCalling().catch(console.error);
