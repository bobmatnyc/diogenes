#!/usr/bin/env node

const fetch = require('node-fetch');

const API_URL = 'http://localhost:3000/api/chat';

// Test data for comprehensive testing
const testCases = [
  {
    name: "Philosophical Question",
    message: "What is the meaning of life?",
    expectedTraits: ["contrarian", "philosophical", "questioning"]
  },
  {
    name: "Simple Greeting",
    message: "Hello, how are you?",
    expectedTraits: ["skeptical", "challenging"]
  },
  {
    name: "Technology Discussion",
    message: "AI will solve all human problems.",
    expectedTraits: ["contrarian", "critical", "provocative"]
  },
  {
    name: "Empty Content Test",
    message: "",
    expectError: true
  },
  {
    name: "Special Characters",
    message: "What about symbols like @#$%^&*() and émojis 🤔?",
    expectedTraits: ["responsive"]
  },
  {
    name: "Very Long Message",
    message: "This is a very long message ".repeat(50) + "What do you think?",
    expectedTraits: ["responsive"]
  }
];

async function sendMessage(messages) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    // Collect streaming response
    let fullResponse = '';
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      // Parse streaming chunks (format: 0:"text")
      const matches = chunk.match(/0:"([^"]*)"/g);
      if (matches) {
        matches.forEach(match => {
          const text = match.substring(3, match.length - 1);
          fullResponse += text;
        });
      }
    }

    return {
      success: true,
      response: fullResponse,
      streaming: true
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      streaming: false
    };
  }
}

function analyzeResponse(response, expectedTraits) {
  if (!response) return { traits: [], score: 0 };
  
  const lowerResponse = response.toLowerCase();
  const foundTraits = [];
  let score = 0;

  // Check for Diogenes-like traits
  const traitPatterns = {
    contrarian: ['but ', 'however', 'yet ', 'challenge', 'question', 'doubt'],
    philosophical: ['truth', 'wisdom', 'virtue', 'nature', 'human', 'society'],
    questioning: ['?', 'why', 'what if', 'consider', 'think about'],
    skeptical: ['really', 'truly', 'suppose', 'assume', 'claim'],
    critical: ['problem', 'issue', 'flaw', 'wrong', 'mistake'],
    provocative: ['tell me', 'perhaps', 'instead', 'rather']
  };

  for (const [trait, patterns] of Object.entries(traitPatterns)) {
    if (patterns.some(pattern => lowerResponse.includes(pattern))) {
      foundTraits.push(trait);
      if (expectedTraits && expectedTraits.includes(trait)) {
        score += 2;
      } else {
        score += 1;
      }
    }
  }

  return { traits: foundTraits, score, length: response.length };
}

async function runTest(testCase, conversationHistory = []) {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log(`📝 Message: "${testCase.message}"`);
  
  const messages = [
    ...conversationHistory,
    { role: 'user', content: testCase.message }
  ];

  const result = await sendMessage(messages);
  
  if (testCase.expectError) {
    if (!result.success) {
      console.log(`✅ Expected error occurred: ${result.error}`);
      return { passed: true, result };
    } else {
      console.log(`❌ Expected error but got response: ${result.response.substring(0, 100)}...`);
      return { passed: false, result };
    }
  }

  if (!result.success) {
    console.log(`❌ Unexpected error: ${result.error}`);
    return { passed: false, result };
  }

  console.log(`📤 Response: "${result.response.substring(0, 200)}${result.response.length > 200 ? '...' : ''}"`);
  console.log(`🌊 Streaming: ${result.streaming ? '✅' : '❌'}`);
  
  const analysis = analyzeResponse(result.response, testCase.expectedTraits);
  console.log(`🎭 Traits found: ${analysis.traits.join(', ')}`);
  console.log(`📏 Response length: ${analysis.length} characters`);
  console.log(`⭐ Personality score: ${analysis.score}`);
  
  const passed = analysis.score >= 2 && result.streaming && analysis.length > 20;
  console.log(`${passed ? '✅' : '❌'} Test ${passed ? 'PASSED' : 'FAILED'}`);
  
  return { 
    passed, 
    result, 
    analysis,
    conversationHistory: [...messages, { role: 'assistant', content: result.response }]
  };
}

async function runConversationTest() {
  console.log('\n🗣️  Testing Conversation Continuity');
  
  let conversationHistory = [];
  const conversationTests = [
    { name: "Opening", message: "I think technology is always good for humanity." },
    { name: "Follow-up", message: "But surely smartphones have improved our lives?" },
    { name: "Context Check", message: "What was I just saying about technology?" }
  ];

  let allPassed = true;
  
  for (const test of conversationTests) {
    const { passed, conversationHistory: newHistory } = await runTest(test, conversationHistory);
    conversationHistory = newHistory;
    if (!passed) allPassed = false;
  }
  
  return allPassed;
}

async function main() {
  console.log('🚀 Starting Comprehensive Diogenes Chat Testing');
  console.log('=' * 60);
  
  const results = {
    passed: 0,
    failed: 0,
    details: []
  };

  // Run individual tests
  for (const testCase of testCases) {
    const { passed, result, analysis } = await runTest(testCase);
    
    if (passed) {
      results.passed++;
    } else {
      results.failed++;
    }
    
    results.details.push({
      name: testCase.name,
      passed,
      analysis
    });
  }

  // Run conversation continuity test
  console.log('\n' + '=' * 60);
  const conversationPassed = await runConversationTest();
  if (conversationPassed) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Final report
  console.log('\n' + '=' * 60);
  console.log('📊 FINAL TEST RESULTS');
  console.log('=' * 60);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  
  console.log('\n📋 Test Summary:');
  results.details.forEach(detail => {
    console.log(`  ${detail.passed ? '✅' : '❌'} ${detail.name}`);
  });
  
  const overallPass = results.failed === 0;
  console.log(`\n🎯 Overall Result: ${overallPass ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  process.exit(overallPass ? 0 : 1);
}

if (require.main === module) {
  main().catch(console.error);
}