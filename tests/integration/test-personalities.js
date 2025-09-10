#!/usr/bin/env node
/**
 * Test both Diogenes and Bob Matsuoka personalities
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
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

async function testPersonality(personality, model) {
  console.log(`\n${colors.cyan}🤖 Testing ${personality} personality with ${model}...${colors.reset}`);
  
  const messages = [
    {
      role: 'user',
      content: personality === 'diogenes' 
        ? 'What is the meaning of success in modern society?'
        : 'How should we approach building AI systems that serve humanity?'
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
        model: model,
        personality: personality
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API returned ${response.status}: ${JSON.stringify(error, null, 2)}`);
    }

    // Read the streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    let chunkCount = 0;

    console.log(`${colors.yellow}Streaming response:${colors.reset}`);
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      fullResponse += chunk;
      chunkCount++;
      
      // Show first few chunks to verify streaming
      if (chunkCount <= 3) {
        console.log(`  Chunk ${chunkCount}: "${chunk.substring(0, 50)}..."`);
      }
    }

    console.log(`${colors.green}✅ ${personality} personality test successful!${colors.reset}`);
    console.log(`  Total response length: ${fullResponse.length} characters`);
    console.log(`  Total chunks received: ${chunkCount}`);
    console.log(`  First 200 chars: "${fullResponse.substring(0, 200)}..."`);
    
    // Check if response matches personality
    if (personality === 'diogenes') {
      const hasPhilosophical = /philosophy|truth|virtue|society|wisdom/i.test(fullResponse);
      console.log(`  ${hasPhilosophical ? '✅' : '❌'} Contains philosophical language`);
    } else if (personality === 'bob') {
      const hasTechnical = /engineering|architecture|team|scale|experience/i.test(fullResponse);
      console.log(`  ${hasTechnical ? '✅' : '❌'} Contains technical leadership language`);
    }
    
    return true;
  } catch (error) {
    console.error(`${colors.red}❌ ${personality} personality test failed:${colors.reset}`, error.message);
    return false;
  }
}

async function runTests() {
  console.log(`${colors.bright}${colors.blue}=== Personality System Test ===${colors.reset}`);
  console.log(`API Endpoint: ${BASE_URL}/api/chat`);
  console.log(`Testing with API Key: ${API_KEY.substring(0, 20)}...`);
  
  const testCases = [
    { personality: 'diogenes', model: 'anthropic/claude-3.5-sonnet-20241022' },
    { personality: 'bob', model: 'anthropic/claude-3.5-sonnet-20241022' },
    { personality: 'diogenes', model: 'openai/gpt-4o' },
    { personality: 'bob', model: 'openai/gpt-4o' },
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const { personality, model } of testCases) {
    const success = await testPersonality(personality, model);
    if (success) {
      passed++;
    } else {
      failed++;
    }
    
    // Wait a bit between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n${colors.bright}=== Test Summary ===${colors.reset}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  
  if (failed === 0) {
    console.log(`\n${colors.green}${colors.bright}🎉 All personality tests passed!${colors.reset}`);
  } else {
    console.log(`\n${colors.red}${colors.bright}⚠️ Some personality tests failed. Check the logs above.${colors.reset}`);
    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});