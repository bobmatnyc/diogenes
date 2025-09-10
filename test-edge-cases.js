#!/usr/bin/env node

/**
 * Edge Case Tests for Streaming Fix Verification
 * Additional tests to verify robustness of the solution
 */

const BASE_URL = 'http://localhost:3001';
const API_URL = `${BASE_URL}/api/chat`;

const EDGE_CASES = [
  {
    name: 'Empty Message Test',
    message: '',
    shouldFail: true,
    description: 'Empty message should be handled gracefully'
  },
  {
    name: 'Very Short Message',
    message: 'Hi',
    shouldFail: false,
    description: 'Very short message should work'
  },
  {
    name: 'Rapid Successive Messages',
    messages: ['Quick question 1', 'Quick question 2', 'Quick question 3'],
    description: 'Multiple rapid messages to test concurrency'
  },
  {
    name: 'Large Message Test',
    message: 'Philosophy '.repeat(100) + 'is the fundamental question about the nature of reality, truth, existence, and the meaning of life. '.repeat(20),
    shouldFail: false,
    description: 'Large message to test buffer handling'
  },
  {
    name: 'JSON-like Content',
    message: 'What do you think about {"philosophy": "wisdom", "question": "what is truth?", "answer": "unknown"}',
    shouldFail: false,
    description: 'JSON-like content that might confuse parsing'
  }
];

async function runEdgeCaseTest(testCase) {
  console.log(`\n🧪 ${testCase.name}`);
  console.log(`📝 ${testCase.description}`);
  
  if (testCase.messages) {
    // Rapid succession test
    console.log(`📦 Sending ${testCase.messages.length} messages rapidly...`);
    
    const promises = testCase.messages.map((message, index) => 
      testMessage(message, `Message ${index + 1}`)
    );
    
    const startTime = Date.now();
    try {
      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
      const totalTime = Date.now() - startTime;
      
      console.log(`📊 Results: ${successful.length}/${testCase.messages.length} successful in ${totalTime}ms`);
      
      if (successful.length === testCase.messages.length) {
        console.log('✅ PASS: All rapid messages handled successfully');
        return { passed: true, details: { successful: successful.length, totalTime } };
      } else {
        console.log('⚠️ PARTIAL: Some rapid messages failed');
        return { passed: false, details: { successful: successful.length, totalTime } };
      }
    } catch (error) {
      console.log(`❌ FAIL: Rapid succession test failed - ${error.message}`);
      return { passed: false, error: error.message };
    }
  } else {
    // Single message test
    if (testCase.message.length > 100) {
      console.log(`📏 Message length: ${testCase.message.length} chars`);
      console.log(`📖 Preview: ${testCase.message.substring(0, 100)}...`);
    } else {
      console.log(`💬 Message: "${testCase.message}"`);
    }
    
    const result = await testMessage(testCase.message, testCase.name);
    
    const passed = testCase.shouldFail ? !result.success : result.success;
    const status = passed ? 'PASS' : 'FAIL';
    const icon = passed ? '✅' : '❌';
    
    console.log(`${icon} ${status}: ${testCase.name}`);
    
    if (result.success) {
      console.log(`📊 Response: ${result.responseLength} chars in ${result.totalTime}ms (${result.chunkCount} chunks)`);
    } else if (result.error) {
      console.log(`💥 Error: ${result.error}`);
    }
    
    return { passed, ...result };
  }
}

async function testMessage(message, testName) {
  try {
    const startTime = Date.now();
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: message }]
      })
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        totalTime: Date.now() - startTime
      };
    }

    const reader = response.body.getReader();
    let fullResponse = '';
    let chunkCount = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        chunkCount++;
        const chunk = new TextDecoder().decode(value);
        fullResponse += chunk;
      }
    } finally {
      reader.releaseLock();
    }

    return {
      success: true,
      responseLength: fullResponse.length,
      chunkCount,
      totalTime: Date.now() - startTime,
      response: fullResponse
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      totalTime: Date.now() - startTime
    };
  }
}

async function runAllEdgeCaseTests() {
  console.log('🚀 Edge Case Testing for Streaming Fix');
  console.log('='.repeat(50));
  
  const results = [];
  
  for (const testCase of EDGE_CASES) {
    const result = await runEdgeCaseTest(testCase);
    results.push({ testCase: testCase.name, ...result });
    
    // Brief pause between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 EDGE CASE TEST SUMMARY');
  console.log('='.repeat(50));
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  console.log(`📈 Success Rate: ${passed}/${total} (${(passed/total*100).toFixed(1)}%)`);
  
  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${status} ${result.testCase}`);
    if (result.error) {
      console.log(`    Error: ${result.error}`);
    }
  });
  
  return { passed, total, results };
}

// Check for Node.js fetch support
if (typeof fetch === 'undefined') {
  import('node-fetch').then(({ default: fetch }) => {
    global.fetch = fetch;
    runAllEdgeCaseTests().catch(console.error);
  });
} else {
  runAllEdgeCaseTests().catch(console.error);
}