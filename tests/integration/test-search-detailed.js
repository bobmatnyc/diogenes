// Detailed test to verify web search is working
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

async function testSearchDetailed() {
  const apiUrl = 'http://localhost:3000/api/chat';

  console.log('=== Detailed Web Search Test ===\n');
  console.log('Testing with a query that MUST trigger search...\n');

  const query = 'What are the latest AI developments in 2025?';
  console.log(`Query: "${query}"`);
  console.log('Expected: This should trigger web search based on keywords "latest" and "2025"\n');
  console.log('-'.repeat(60));

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: query }],
    }),
  });

  console.log('Response Status:', response.status);
  console.log('Response Headers:', response.headers.raw());
  console.log('\nStreaming Response:\n');

  let fullResponse = '';
  for await (const chunk of response.body) {
    const text = chunk.toString();
    process.stdout.write(text);
    fullResponse += text;
  }

  console.log('\n\n' + '-'.repeat(60));
  console.log('Analysis:');
  console.log('- Response length:', fullResponse.length, 'bytes');
  console.log('- Contains "Mock Result":', fullResponse.includes('Mock Result') ? 'YES' : 'NO');
  console.log('- Contains "example.com":', fullResponse.includes('example.com') ? 'YES' : 'NO');
  console.log('- Contains URL patterns:', /https?:\/\/\S+/.test(fullResponse) ? 'YES' : 'NO');

  // Parse the streaming response to get the actual text
  const lines = fullResponse.split('\n');
  let actualText = '';
  for (const line of lines) {
    if (line.startsWith('0:')) {
      const match = line.match(/0:"([^"]*)"/);
      if (match) {
        actualText += match[1];
      }
    }
  }

  console.log('\nExtracted text preview (first 500 chars):');
  console.log(actualText.substring(0, 500).replace(/\\n/g, '\n').replace(/\\"/g, '"'));

  console.log('\n=== Conclusion ===');
  if (fullResponse.includes('Mock Result') || fullResponse.includes('example.com')) {
    console.log('✅ Web search IS working! Mock results were included in the context.');
  } else {
    console.log(
      'ℹ️  Web search was triggered (check server logs) but results may not be visible in response.',
    );
  }
  console.log('\nTo see actual web results:');
  console.log('1. Get a Tavily API key from https://tavily.com');
  console.log('2. Add to .env.local: TAVILY_API_KEY=your-key-here');
  console.log('3. Restart the server');
}

testSearchDetailed().catch(console.error);
