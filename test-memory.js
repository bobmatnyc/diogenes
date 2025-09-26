#!/usr/bin/env node

// Test the memory API
async function testMemory() {
  console.log('Testing Memory API...\n');

  // Test 1: Save a user memory
  console.log('1. Saving user memory...');
  const saveResponse = await fetch('http://localhost:3000/api/memory', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-dev-mode': 'true',
      'x-dev-user-id': 'test_user_masa'
    },
    body: JSON.stringify({
      content: 'User prefers dark mode and uses VS Code',
      type: 'semantic',
      source: 'user'
    })
  });

  const saveResult = await saveResponse.json();
  console.log('Response:', JSON.stringify(saveResult, null, 2));

  // Test 2: Get memories
  console.log('\n2. Getting user memories...');
  const getResponse = await fetch('http://localhost:3000/api/memory?source=user', {
    headers: {
      'x-dev-mode': 'true',
      'x-dev-user-id': 'test_user_masa'
    }
  });

  const getResult = await getResponse.json();
  console.log('Response:', JSON.stringify(getResult, null, 2));

  // Test 3: Save assistant memory
  console.log('\n3. Saving assistant memory...');
  const assistantResponse = await fetch('http://localhost:3000/api/memory', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-dev-mode': 'true',
      'x-dev-user-id': 'test_user_masa'
    },
    body: JSON.stringify({
      content: 'Discussed memory implementation strategies',
      type: 'episodic',
      source: 'assistant'
    })
  });

  const assistantResult = await assistantResponse.json();
  console.log('Response:', JSON.stringify(assistantResult, null, 2));

  // Test 4: Get memory stats
  console.log('\n4. Getting memory stats...');
  const statsResponse = await fetch('http://localhost:3000/api/memory/stats', {
    headers: {
      'x-dev-mode': 'true',
      'x-dev-user-id': 'test_user_masa'
    }
  });

  const statsResult = await statsResponse.json();
  console.log('Response:', JSON.stringify(statsResult, null, 2));

  console.log('\n✅ Memory API tests complete!');
}

testMemory().catch(console.error);