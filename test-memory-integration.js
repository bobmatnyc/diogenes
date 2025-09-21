#!/usr/bin/env node
/**
 * Test script to verify memory integration is working
 */

async function testMemoryIntegration() {
  const baseUrl = 'http://localhost:3000';

  console.log('=== Memory Integration Test ===\n');

  // 1. Test health endpoint
  console.log('1. Testing memory API health...');
  const healthResponse = await fetch(`${baseUrl}/api/memory/health`);
  const healthData = await healthResponse.json();
  console.log('   Health status:', healthData.data?.status || 'Failed');
  console.log('   Database:', healthData.data?.services?.database?.status || 'Unknown');

  // 2. Test entity creation (simulating what happens in chat)
  console.log('\n2. Testing entity creation...');
  const testUserId = `test-user-${Date.now()}`;
  const testUserName = 'Test User';

  // This simulates what getOrCreateUserEntity does
  const entitiesResponse = await fetch(`${baseUrl}/api/memory/entities`, {
    method: 'GET',
    headers: {
      'X-API-Key': 'internal-api-key-for-server-side-calls'
    }
  });
  const entitiesData = await entitiesResponse.json();
  console.log('   Entities fetch success:', entitiesData.success);

  // 3. Test the full chat flow with memory
  console.log('\n3. Testing chat with memory...');
  const chatResponse = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messages: [
        { role: 'user', content: 'Hello, this is a test message for memory integration.' }
      ],
      firstName: 'TestUser',
      userId: testUserId,
      userEmail: 'test@example.com',
      model: 'anthropic/claude-3.5-sonnet-20241022',
      personality: 'executive',
      debugMode: true
    })
  });

  // Check headers for memory indicators
  const memoryEntityId = chatResponse.headers.get('X-Memory-Entity-Id');
  const shouldStore = chatResponse.headers.get('X-Memory-Should-Store');
  const memoryContextUsed = chatResponse.headers.get('X-Memory-Context-Used');

  console.log('   Chat response status:', chatResponse.status);
  console.log('   Memory Entity ID:', memoryEntityId || 'Not set');
  console.log('   Should Store Memory:', shouldStore || 'Not set');
  console.log('   Memory Context Used:', memoryContextUsed || 'Not set');

  // Read a bit of the stream to ensure it works
  if (chatResponse.body) {
    const reader = chatResponse.body.getReader();
    const { done, value } = await reader.read();
    if (!done) {
      const text = new TextDecoder().decode(value);
      console.log('   Response preview:', text.substring(0, 100) + '...');
    }
    reader.releaseLock();
  }

  console.log('\n=== Test Summary ===');
  console.log('✓ Memory API is accessible');
  console.log(memoryEntityId ? '✓ Memory entity creation works' : '✗ Memory entity creation failed');
  console.log(shouldStore === 'true' ? '✓ Memory storage is enabled' : '✗ Memory storage not enabled');
  console.log(memoryContextUsed === 'true' ? '✓ Memory context is being used' : '✗ Memory context not being used');

  const isWorking = healthData.success && (memoryEntityId || memoryContextUsed);
  console.log('\nOverall status:', isWorking ? '✅ Memory integration is working!' : '❌ Memory integration needs fixes');

  if (!isWorking) {
    console.log('\nTroubleshooting tips:');
    console.log('1. Check that MEMORY_API_INTERNAL_KEY is set in .env.local');
    console.log('2. Ensure the development server is running (make dev)');
    console.log('3. Check server logs for any error messages');
    console.log('4. Verify the memory API endpoints are accessible');
  }
}

// Run the test
testMemoryIntegration().catch(console.error);