#!/usr/bin/env node
/**
 * Test real web search functionality (not mock)
 */

const API_KEY = process.env.OPENROUTER_API_KEY;
if (!API_KEY) {
  console.error('OPENROUTER_API_KEY environment variable is required');
  process.exit(1);
}
const BASE_URL = 'http://localhost:3000';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

async function testWebSearch(query) {
  console.log(`\n${colors.cyan}🔍 Testing web search with query: "${query}"${colors.reset}`);
  
  const messages = [
    {
      role: 'user',
      content: query
    }
  ];

  try {
    const response = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        firstName: 'Test User',
        model: 'anthropic/claude-3.5-sonnet-20241022',
        personality: 'diogenes'
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API returned ${response.status}: ${JSON.stringify(error, null, 2)}`);
    }

    // Check response headers
    const searchDelegated = response.headers.get('X-Search-Delegated');
    console.log(`${colors.yellow}Search delegation status: ${searchDelegated === 'true' ? 'YES' : 'NO'}${colors.reset}`);

    // Read the streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    let chunkCount = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      fullResponse += chunk;
      chunkCount++;
    }

    console.log(`${colors.green}✅ Web search test successful!${colors.reset}`);
    console.log(`  Response length: ${fullResponse.length} characters`);
    console.log(`  Chunks received: ${chunkCount}`);
    
    // Check for signs of real web search
    const hasUrls = /https?:\/\/[^\s]+/.test(fullResponse);
    const hasCurrentInfo = /202[4-5]/.test(fullResponse);
    const hasSources = /\[.*?\]\(https?:\/\/.*?\)/.test(fullResponse);
    
    console.log(`  ${hasUrls ? '✅' : '❌'} Contains URLs/links`);
    console.log(`  ${hasCurrentInfo ? '✅' : '❌'} Contains current year references`);
    console.log(`  ${hasSources ? '✅' : '❌'} Contains inline citations`);
    
    // Show sample of response
    console.log(`\n${colors.blue}Sample response:${colors.reset}`);
    console.log(`  "${fullResponse.substring(0, 300)}..."`);
    
    return searchDelegated === 'true';
  } catch (error) {
    console.error(`${colors.red}❌ Web search test failed:${colors.reset}`, error.message);
    return false;
  }
}

async function runTests() {
  console.log(`${colors.bright}${colors.blue}=== Real Web Search Test ===${colors.reset}`);
  console.log(`API Endpoint: ${BASE_URL}/api/chat`);
  console.log(`Mock Mode: DISABLED (testing real web search)`);
  
  const testQueries = [
    "What are the latest developments in AI as of 2024?",
    "Who won the 2024 Super Bowl?",
    "What's the current stock price of Apple?",
    "What happened in technology news today?"
  ];
  
  let searchTriggered = 0;
  let searchNotTriggered = 0;
  
  for (const query of testQueries) {
    const wasSearchUsed = await testWebSearch(query);
    if (wasSearchUsed) {
      searchTriggered++;
    } else {
      searchNotTriggered++;
    }
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(`\n${colors.bright}=== Test Summary ===${colors.reset}`);
  console.log(`${colors.green}Search triggered: ${searchTriggered}${colors.reset}`);
  console.log(`${colors.yellow}Search not triggered: ${searchNotTriggered}${colors.reset}`);
  
  if (searchTriggered > 0) {
    console.log(`\n${colors.green}${colors.bright}🎉 Web search is working! Real searches were performed.${colors.reset}`);
  } else {
    console.log(`\n${colors.red}${colors.bright}⚠️ No web searches were triggered. Check delegation logic.${colors.reset}`);
  }
}

// Run the tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});