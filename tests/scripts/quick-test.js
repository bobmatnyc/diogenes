#!/usr/bin/env node

const axios = require('axios');

const API_URL = 'http://localhost:3001/api/chat';

async function quickTest(message, expectDelegation = null) {
  const startTime = Date.now();
  
  try {
    const response = await axios.post(API_URL, 
      { messages: [{ role: 'user', content: message }] },
      { 
        headers: { 'Content-Type': 'application/json' },
        timeout: 20000
      }
    );

    const endTime = Date.now();
    const responseTime = endTime - startTime;
    const searchDelegated = response.headers['x-search-delegated'] === 'true';

    console.log(`\n📝 Query: "${message}"`);
    console.log(`🔍 Search delegated: ${searchDelegated ? 'Yes' : 'No'}`);
    console.log(`⏱️  Response time: ${responseTime}ms`);
    
    if (expectDelegation !== null) {
      const correct = searchDelegated === expectDelegation;
      console.log(`✅ Expected: ${expectDelegation ? 'Yes' : 'No'} - ${correct ? 'PASS' : 'FAIL'}`);
    }
    
    return { searchDelegated, responseTime, success: true };
  } catch (error) {
    console.log(`\n📝 Query: "${message}"`);
    console.log(`❌ Error: ${error.message}`);
    return { error: error.message, success: false };
  }
}

async function runQuickTests() {
  console.log('🧪 Quick Search Delegation Tests');
  console.log('================================\n');

  // Test 1: Should delegate - current event
  await quickTest("What's happening with AI today?", true);
  
  // Test 2: Should NOT delegate - philosophy  
  await quickTest("What is wisdom?", false);
  
  // Test 3: Should delegate - market data
  await quickTest("Current Bitcoin price?", true);
  
  // Test 4: Should NOT delegate - ancient philosophy
  await quickTest("What did Aristotle believe?", false);
  
  // Test 5: Edge case - mixed content
  await quickTest("How do modern AI developments relate to ancient philosophy?", null);

  console.log('\n🎯 Quick tests completed!');
}

runQuickTests().catch(console.error);