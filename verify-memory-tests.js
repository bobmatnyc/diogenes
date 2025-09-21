// Verification script for memory test fixes
console.log('🔍 Starting Memory Test Verification...\n');

const baseUrl = 'http://localhost:3000';

async function testCreateEntity() {
  console.log('Testing: Create Test Entity');
  try {
    const response = await fetch(`${baseUrl}/api/memory/entities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer internal-api-key-for-server-side-calls'
      },
      body: JSON.stringify({
        name: 'Test Entity Verification',
        entity_type: 'other',
        metadata: { test: true, verification: true }
      })
    });

    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));

    if (response.ok && data.data?.id) {
      console.log('✅ CREATE TEST ENTITY - PASSED');
      console.log(`   Entity ID: ${data.data.id}`);
      return data.data.id;
    } else {
      console.log('❌ CREATE TEST ENTITY - FAILED');
      console.log('   Reason: No entity ID in response');
      return null;
    }
  } catch (error) {
    console.log('❌ CREATE TEST ENTITY - FAILED');
    console.log(`   Error: ${error.message}`);
    return null;
  }
}

async function testStoreMemory(entityId) {
  console.log('\nTesting: Store Test Memory');

  if (!entityId) {
    console.log('❌ STORE TEST MEMORY - FAILED');
    console.log('   Reason: No entity ID available');
    return null;
  }

  try {
    const response = await fetch(`${baseUrl}/api/memory/memories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer internal-api-key-for-server-side-calls'
      },
      body: JSON.stringify({
        entity_id: entityId,
        memory_type: 'fact',
        title: 'Test Memory Verification',
        content: 'This is a verification test for the memory storage functionality',
        importance: 5
      })
    });

    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));

    if (response.ok && data.data?.id) {
      console.log('✅ STORE TEST MEMORY - PASSED');
      console.log(`   Memory ID: ${data.data.id}`);
      return data.data.id;
    } else {
      console.log('❌ STORE TEST MEMORY - FAILED');
      console.log('   Reason: No memory ID in response');
      return null;
    }
  } catch (error) {
    console.log('❌ STORE TEST MEMORY - FAILED');
    console.log(`   Error: ${error.message}`);
    return null;
  }
}

async function runVerification() {
  console.log('Starting verification of memory test fixes...\n');

  const entityId = await testCreateEntity();
  const memoryId = await testStoreMemory(entityId);

  console.log('\n📊 VERIFICATION SUMMARY:');
  console.log('=========================');

  if (entityId) {
    console.log('✅ Create Test Entity: VERIFIED - Test passes with Authorization headers and proper field mappings');
  } else {
    console.log('❌ Create Test Entity: FAILED - Fix not working correctly');
  }

  if (memoryId) {
    console.log('✅ Store Test Memory: VERIFIED - Test passes with Authorization headers and proper field mappings');
  } else {
    console.log('❌ Store Test Memory: FAILED - Fix not working correctly');
  }

  const allPassed = entityId && memoryId;

  console.log('\n🏁 FINAL RESULT:');
  if (allPassed) {
    console.log('✅ ALL MEMORY TESTS VERIFIED - Fixes are working correctly!');
    console.log('   - Authorization headers properly configured');
    console.log('   - Field names corrected (entity_type, entity_id)');
    console.log('   - Response parsing fixed (data.data.id instead of data.entity.id)');
  } else {
    console.log('❌ Some memory tests still failing - Additional fixes needed');
  }

  return allPassed;
}

// Run the verification
runVerification().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Verification script failed:', error);
  process.exit(1);
});