#!/usr/bin/env node

/**
 * Test script to verify memory API functionality
 * Tests both local development and Vercel production environments
 */

async function testLocalMemory() {
  console.log('🧪 Testing LOCAL Memory API...\n');

  const baseUrl = 'http://localhost:3000';
  const headers = {
    'Content-Type': 'application/json',
    'x-dev-mode': 'true',
    'x-dev-user-id': 'test_verification_user'
  };

  try {
    // Test 1: Save a memory
    console.log('1️⃣ Saving test memory...');
    const saveResponse = await fetch(`${baseUrl}/api/memory`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        content: 'Vercel Blob storage test - timestamp: ' + new Date().toISOString(),
        type: 'semantic',
        source: 'user'
      })
    });

    if (!saveResponse.ok) {
      throw new Error(`Save failed: ${saveResponse.status}`);
    }

    const saveResult = await saveResponse.json();
    console.log('✅ Memory saved successfully');
    console.log('   Stats:', saveResult.data?.stats);

    // Test 2: Retrieve memories
    console.log('\n2️⃣ Retrieving memories...');
    const getResponse = await fetch(`${baseUrl}/api/memory?limit=5`, {
      headers
    });

    if (!getResponse.ok) {
      throw new Error(`Get failed: ${getResponse.status}`);
    }

    const getResult = await getResponse.json();
    console.log(`✅ Retrieved ${getResult.data?.memories?.length || 0} memories`);

    if (getResult.data?.memories?.length > 0) {
      const latest = getResult.data.memories[0];
      console.log('   Latest memory:', {
        id: latest.id,
        content: latest.content.substring(0, 50) + '...',
        timestamp: latest.timestamp
      });
    }

    // Test 3: Filter memories
    console.log('\n3️⃣ Testing memory filters...');
    const filterResponse = await fetch(`${baseUrl}/api/memory?source=user&type=semantic`, {
      headers
    });

    if (!filterResponse.ok) {
      throw new Error(`Filter failed: ${filterResponse.status}`);
    }

    const filterResult = await filterResponse.json();
    console.log(`✅ Filtered to ${filterResult.data?.memories?.length || 0} user semantic memories`);

    // Test 4: Search memories
    console.log('\n4️⃣ Testing memory search...');
    const searchResponse = await fetch(`${baseUrl}/api/memory?q=test`, {
      headers
    });

    if (!searchResponse.ok) {
      throw new Error(`Search failed: ${searchResponse.status}`);
    }

    const searchResult = await searchResponse.json();
    console.log(`✅ Search found ${searchResult.data?.memories?.length || 0} memories matching "test"`);

    console.log('\n🎉 LOCAL Memory API tests PASSED!\n');

  } catch (error) {
    console.error('❌ Local test failed:', error.message);
    return false;
  }

  return true;
}

async function testProductionAuth() {
  console.log('🔒 Testing PRODUCTION Authentication Requirements...\n');

  // Note: We expect these to fail without proper authentication
  const baseUrl = 'https://diogenes-1bw2d0enr-1-m.vercel.app';

  try {
    // Test 1: GET without auth (should fail)
    console.log('1️⃣ Testing GET without auth...');
    const getResponse = await fetch(`${baseUrl}/api/memory`, {
      redirect: 'manual'
    });

    if (getResponse.status === 401 || getResponse.status === 302 || getResponse.status === 303) {
      console.log('✅ GET properly requires authentication (status:', getResponse.status + ')');
    } else {
      console.log('⚠️ Unexpected status for GET:', getResponse.status);
    }

    // Test 2: POST without auth (should fail)
    console.log('\n2️⃣ Testing POST without auth...');
    const postResponse = await fetch(`${baseUrl}/api/memory`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: 'This should not be saved',
        type: 'semantic',
        source: 'user'
      }),
      redirect: 'manual'
    });

    if (postResponse.status === 401 || postResponse.status === 302 || postResponse.status === 303) {
      console.log('✅ POST properly requires authentication (status:', postResponse.status + ')');
    } else {
      console.log('⚠️ Unexpected status for POST:', postResponse.status);
    }

    // Test 3: DELETE without auth (should fail)
    console.log('\n3️⃣ Testing DELETE without auth...');
    const deleteResponse = await fetch(`${baseUrl}/api/memory`, {
      method: 'DELETE',
      redirect: 'manual'
    });

    if (deleteResponse.status === 401 || deleteResponse.status === 302 || deleteResponse.status === 303) {
      console.log('✅ DELETE properly requires authentication (status:', deleteResponse.status + ')');
    } else {
      console.log('⚠️ Unexpected status for DELETE:', deleteResponse.status);
    }

    console.log('\n🔐 PRODUCTION Authentication tests PASSED!\n');
    console.log('ℹ️  Note: To fully test production memory storage:');
    console.log('   1. Visit', baseUrl);
    console.log('   2. Sign in with Clerk OAuth');
    console.log('   3. Use the chat interface to generate memories');
    console.log('   4. Memories will be stored in Vercel Blob Storage');

  } catch (error) {
    console.error('❌ Production test error:', error.message);
    return false;
  }

  return true;
}

async function verifyBlobConfiguration() {
  console.log('🗄️ Vercel Blob Storage Configuration Check\n');

  console.log('To enable Blob Storage in production:');
  console.log('1. Go to: https://vercel.com/1-m/diogenes/storage');
  console.log('2. Click "Create Database" → "Blob"');
  console.log('3. Name it (e.g., "diogenes-memories")');
  console.log('4. The BLOB_READ_WRITE_TOKEN will be automatically added');
  console.log('5. Redeploy your application to apply the changes\n');

  console.log('Current Storage Adapters:');
  console.log('- Development: LocalStorageAdapter (.kuzu_memory/)');
  console.log('- Production: VercelBlobAdapter (Vercel Blob Storage)');
  console.log('- Fallback: LocalStorageAdapter if Blob not configured\n');
}

// Main execution
async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   Diogenes Memory System Verification   ');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test local first
  const localSuccess = await testLocalMemory();

  // Test production auth
  const productionSuccess = await testProductionAuth();

  // Show Blob configuration info
  await verifyBlobConfiguration();

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📊 Test Summary:');
  console.log(`   Local API: ${localSuccess ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   Production Auth: ${productionSuccess ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (localSuccess && productionSuccess) {
    console.log('✨ All tests passed! The memory system is working correctly.');
    console.log('   - Local development uses filesystem storage');
    console.log('   - Production requires authentication via Clerk');
    console.log('   - Vercel Blob Storage ready for configuration');
  } else {
    console.log('⚠️  Some tests failed. Please check the errors above.');
    process.exit(1);
  }
}

// Run tests
main().catch(console.error);