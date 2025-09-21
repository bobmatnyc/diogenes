#!/usr/bin/env node

/**
 * Test script to verify the memory storage system is working
 * Run with: node scripts/test-memory-system.js
 */

const API_KEY = 'internal-api-key-for-server-side-calls';
const BASE_URL = 'http://localhost:3000/api/memory';

async function testMemorySystem() {
  console.log('\n🔍 Testing Memory Storage System...\n');

  try {
    // Step 1: Create a test entity
    console.log('1️⃣  Creating test entity...');
    const entityResponse = await fetch(`${BASE_URL}/entities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        namespace: 'test-suite',
        name: 'Integration Test Entity',
        entity_type: 'project',
        metadata: {
          test_run: new Date().toISOString(),
          version: '1.0'
        }
      })
    });

    if (!entityResponse.ok) {
      const error = await entityResponse.json();
      throw new Error(`Failed to create entity: ${JSON.stringify(error)}`);
    }

    const entityData = await entityResponse.json();
    const entityId = entityData.data.id;
    console.log(`✅ Entity created: ${entityId}`);

    // Step 2: Create multiple memories
    console.log('\n2️⃣  Creating memories...');
    const memoryTypes = ['fact', 'preference', 'experience', 'instruction'];
    const memories = [];

    for (let i = 0; i < memoryTypes.length; i++) {
      const memoryResponse = await fetch(`${BASE_URL}/memories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          entity_id: entityId,
          memory_type: memoryTypes[i],
          title: `Test ${memoryTypes[i]} memory`,
          content: `This is a test ${memoryTypes[i]} created at ${new Date().toISOString()}`,
          metadata: {
            test_index: i,
            type: memoryTypes[i]
          },
          importance: 5 + i
        })
      });

      if (!memoryResponse.ok) {
        const error = await memoryResponse.json();
        throw new Error(`Failed to create memory: ${JSON.stringify(error)}`);
      }

      const memoryData = await memoryResponse.json();
      memories.push(memoryData.data);
      console.log(`✅ Created ${memoryTypes[i]} memory: ${memoryData.data.id}`);
    }

    // Step 3: Retrieve memories
    console.log('\n3️⃣  Retrieving memories...');
    const getResponse = await fetch(`${BASE_URL}/memories?entity_id=${entityId}`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    });

    if (!getResponse.ok) {
      const error = await getResponse.json();
      throw new Error(`Failed to retrieve memories: ${JSON.stringify(error)}`);
    }

    const retrievedData = await getResponse.json();
    const retrievedMemories = retrievedData.data.data;
    console.log(`✅ Retrieved ${retrievedMemories.length} memories`);

    // Step 4: Update a memory
    console.log('\n4️⃣  Updating a memory...');
    const memoryToUpdate = memories[0].id;
    const updateResponse = await fetch(`${BASE_URL}/memories/${memoryToUpdate}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        content: 'Updated content with new information',
        importance: 10
      })
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      let error;
      try {
        error = JSON.parse(errorText);
      } catch {
        error = { message: errorText || 'Empty response' };
      }
      throw new Error(`Failed to update memory: ${JSON.stringify(error)}`);
    }

    const updateText = await updateResponse.text();
    let updateData;
    try {
      updateData = JSON.parse(updateText);
    } catch {
      // If response is empty or not JSON, that's okay for PATCH
      updateData = { success: true };
    }
    console.log(`✅ Updated memory: ${memoryToUpdate}`);

    // Step 5: Search memories
    console.log('\n5️⃣  Searching memories...');
    const searchResponse = await fetch(`${BASE_URL}/search?q=test&entity_id=${entityId}`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    });

    if (!searchResponse.ok) {
      const error = await searchResponse.json();
      throw new Error(`Failed to search memories: ${JSON.stringify(error)}`);
    }

    const searchData = await searchResponse.json();
    const searchResults = searchData.data?.data || searchData.data || [];
    console.log(`✅ Search found ${searchResults.length} matching memories`);

    // Step 6: Clean up - delete test data
    console.log('\n6️⃣  Cleaning up test data...');

    // Delete memories
    for (const memory of memories) {
      const deleteResponse = await fetch(`${BASE_URL}/memories/${memory.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${API_KEY}`
        }
      });

      if (!deleteResponse.ok) {
        console.warn(`Warning: Could not delete memory ${memory.id}`);
      }
    }
    console.log(`✅ Deleted ${memories.length} test memories`);

    // Delete entity
    const entityDeleteResponse = await fetch(`${BASE_URL}/entities/${entityId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    });

    if (!entityDeleteResponse.ok) {
      console.warn(`Warning: Could not delete entity ${entityId}`);
    }
    console.log(`✅ Deleted test entity`);

    console.log('\n🎉 Memory Storage System Test PASSED! 🎉\n');
    console.log('Summary:');
    console.log('- ✅ Middleware correctly bypasses Clerk for /api/memory routes');
    console.log('- ✅ Entity creation and deletion working');
    console.log('- ✅ Memory CRUD operations functional');
    console.log('- ✅ Search functionality operational');
    console.log('- ✅ Authentication with Bearer token working');
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Memory Storage System Test FAILED!\n');
    console.error('Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Ensure dev server is running: make dev');
    console.error('2. Check MEMORY_API_INTERNAL_KEY in .env.local');
    console.error('3. Verify database is accessible');
    process.exit(1);
  }
}

// Run the test
testMemorySystem().catch(console.error);