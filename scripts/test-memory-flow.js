#!/usr/bin/env node

/**
 * Test script to verify memory system end-to-end functionality
 * Tests: entity creation, memory storage, and memory retrieval
 */

const TEST_USER_ID = 'test-user-123';
const TEST_USER_NAME = 'Test User';
const TEST_USER_EMAIL = 'test@example.com';

async function testMemoryFlow() {
  console.log('🧪 Testing Memory System End-to-End...\n');

  try {
    // Step 1: Test health endpoint
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await fetch('http://localhost:3000/api/memory/health');
    const healthData = await healthResponse.json();

    if (healthData.success) {
      console.log('✅ Memory API is healthy');
      console.log(`   Database: ${healthData.data.services.database.status}`);
      console.log(`   Response time: ${healthData.data.services.database.response_time_ms}ms\n`);
    } else {
      console.error('❌ Memory API health check failed');
      return;
    }

    // Step 2: Simulate chat interaction with memory
    console.log('2️⃣ Simulating chat interaction with memory...');
    const chatRequest = {
      messages: [
        { role: 'user', content: 'Hello, I am testing the memory system. Remember that my favorite color is blue.' }
      ],
      firstName: TEST_USER_NAME,
      userId: TEST_USER_ID,
      userEmail: TEST_USER_EMAIL,
      debugMode: true,
      personality: 'executive',
      model: 'anthropic/claude-3.5-sonnet-20241022'
    };

    console.log('   Sending chat request with user context...');
    const chatResponse = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chatRequest)
    });

    // Check response headers for memory indicators
    const memoryEntityId = chatResponse.headers.get('X-Memory-Entity-Id');
    const shouldStore = chatResponse.headers.get('X-Memory-Should-Store');
    const memoryUsed = chatResponse.headers.get('X-Memory-Context-Used');

    console.log(`   Memory Entity ID: ${memoryEntityId || 'Not created'}`);
    console.log(`   Should Store: ${shouldStore || 'No'}`);
    console.log(`   Memory Context Used: ${memoryUsed || 'No'}\n`);

    // Read the streaming response
    const reader = chatResponse.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullResponse += decoder.decode(value, { stream: true });
    }

    console.log('   Assistant response received (length: ' + fullResponse.length + ' chars)\n');

    // Step 3: Store the interaction in memory (simulate what the client would do)
    if (memoryEntityId && shouldStore === 'true') {
      console.log('3️⃣ Storing interaction in memory...');

      const storeRequest = {
        entityId: memoryEntityId,
        userInput: chatRequest.messages[0].content,
        assistantResponse: fullResponse.substring(0, 500) + '...', // Truncate for testing
        persona: 'executive',
        model: 'anthropic/claude-3.5-sonnet-20241022',
        searchPerformed: false
      };

      const storeResponse = await fetch('http://localhost:3000/api/memory/store-interaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(storeRequest)
      });

      const storeResult = await storeResponse.json();

      if (storeResult.success) {
        console.log('✅ Memory stored successfully');
        console.log(`   Memory ID: ${storeResult.data.memoryId}`);
        console.log(`   Importance: ${storeResult.data.importance}\n`);
      } else {
        console.error('❌ Failed to store memory:', storeResult.error);
      }
    }

    // Step 4: Send another message to test memory retrieval
    console.log('4️⃣ Testing memory retrieval with follow-up question...');
    const followUpRequest = {
      messages: [
        { role: 'user', content: 'What is my favorite color that I just mentioned?' }
      ],
      firstName: TEST_USER_NAME,
      userId: TEST_USER_ID,
      userEmail: TEST_USER_EMAIL,
      debugMode: true,
      personality: 'executive',
      model: 'anthropic/claude-3.5-sonnet-20241022'
    };

    const followUpResponse = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(followUpRequest)
    });

    const memoryContextUsed = followUpResponse.headers.get('X-Memory-Context-Used');
    const memoryTokens = followUpResponse.headers.get('X-Memory-Context-Tokens');

    console.log(`   Memory Context Used: ${memoryContextUsed === 'true' ? '✅ Yes' : '❌ No'}`);
    if (memoryTokens) {
      console.log(`   Memory Context Tokens: ${memoryTokens}`);
    }

    // Read follow-up response
    const followUpReader = followUpResponse.body.getReader();
    let followUpFullResponse = '';

    while (true) {
      const { done, value } = await followUpReader.read();
      if (done) break;
      followUpFullResponse += decoder.decode(value, { stream: true });
    }

    console.log('   Follow-up response received\n');

    // Step 5: Check if the response mentions the color
    if (followUpFullResponse.toLowerCase().includes('blue')) {
      console.log('✅ Memory system working! Assistant remembered the favorite color.');
    } else {
      console.log('⚠️  Assistant response does not mention the remembered color.');
      console.log('   This could mean memories were not retrieved or not used in context.');
    }

    console.log('\n📊 Memory System Test Complete!');
    console.log('====================================');
    console.log('Summary:');
    console.log(`- Health Check: ${healthData.success ? '✅' : '❌'}`);
    console.log(`- Entity Created: ${memoryEntityId ? '✅' : '❌'}`);
    console.log(`- Memory Stored: ${memoryEntityId && shouldStore === 'true' ? '✅' : '❌'}`);
    console.log(`- Memory Retrieved: ${memoryContextUsed === 'true' ? '✅' : '❌'}`);

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    if (error.cause) {
      console.error('   Cause:', error.cause);
    }
  }
}

// Run the test
testMemoryFlow();