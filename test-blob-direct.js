#!/usr/bin/env node

/**
 * Direct test of Vercel Blob Storage API
 * This demonstrates the core Blob operations used in our memory system
 */

// Note: This requires BLOB_READ_WRITE_TOKEN to be set
// In production, this token is automatically available when Blob Storage is configured

async function testBlobStorage() {
  console.log('🗄️  Testing Vercel Blob Storage Direct API\n');

  // Check if we have the token
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    console.log('⚠️  BLOB_READ_WRITE_TOKEN not found in environment');
    console.log('\nTo test Blob Storage:');
    console.log('1. Set up Blob Storage at: https://vercel.com/1-m/diogenes/storage');
    console.log('2. Add the token to your .env.local:');
    console.log('   BLOB_READ_WRITE_TOKEN=vercel_blob_xxx...\n');

    console.log('📝 How our memory system uses Blob Storage:\n');
    showBlobUsageExample();
    return;
  }

  try {
    // Import Vercel Blob SDK
    const { put, head, list, del } = await import('@vercel/blob');

    // Test 1: Store a memory blob
    console.log('1️⃣  Storing memory blob...');
    const testMemory = {
      userId: 'test-user-123',
      memories: [
        {
          id: 'mem_' + Date.now(),
          content: 'Test memory content - Vercel Blob verification',
          type: 'semantic',
          source: 'user',
          timestamp: new Date().toISOString()
        }
      ],
      metadata: {
        count: 1,
        lastUpdated: new Date().toISOString(),
        version: '2.0.0'
      }
    };

    const blobName = `memories/test-user-123.json`;
    const { url } = await put(blobName, JSON.stringify(testMemory, null, 2), {
      access: 'public',
      contentType: 'application/json',
      token
    });

    console.log('✅ Blob stored successfully');
    console.log('   URL:', url);
    console.log('   Name:', blobName);

    // Test 2: Get blob metadata
    console.log('\n2️⃣  Getting blob metadata...');
    const metadata = await head(blobName, { token });
    console.log('✅ Metadata retrieved:');
    console.log('   Size:', metadata.size, 'bytes');
    console.log('   Uploaded:', new Date(metadata.uploadedAt).toLocaleString());

    // Test 3: List blobs
    console.log('\n3️⃣  Listing memory blobs...');
    const { blobs } = await list({
      prefix: 'memories/',
      limit: 10,
      token
    });
    console.log(`✅ Found ${blobs.length} memory blob(s)`);
    blobs.forEach(blob => {
      console.log(`   - ${blob.pathname} (${blob.size} bytes)`);
    });

    // Test 4: Fetch and verify content
    console.log('\n4️⃣  Fetching blob content...');
    const response = await fetch(url);
    const retrieved = await response.json();
    console.log('✅ Content retrieved successfully');
    console.log('   User ID:', retrieved.userId);
    console.log('   Memories:', retrieved.memories.length);
    console.log('   Version:', retrieved.metadata.version);

    // Test 5: Clean up (optional)
    console.log('\n5️⃣  Cleaning up test blob...');
    await del(blobName, { token });
    console.log('✅ Test blob deleted');

    console.log('\n🎉 Blob Storage API working correctly!\n');

  } catch (error) {
    console.error('❌ Blob Storage test failed:', error.message);
    if (error.message.includes('Module not found')) {
      console.log('\n📦 Make sure @vercel/blob is installed:');
      console.log('   pnpm add @vercel/blob\n');
    }
  }
}

function showBlobUsageExample() {
  console.log('In our VercelBlobAdapter, we use Blob Storage like this:\n');

  console.log('📤 Saving Memory:');
  console.log(`
  const blobName = 'memories/{userId}.json';
  const memoriesData = {
    userId: userId,
    memories: [...userMemories],
    metadata: { count, lastUpdated, version }
  };

  await put(blobName, JSON.stringify(memoriesData), {
    access: 'public',
    contentType: 'application/json',
    token: process.env.BLOB_READ_WRITE_TOKEN
  });
  `);

  console.log('\n📥 Retrieving Memory:');
  console.log(`
  // Using fetch API
  const response = await fetch(
    'https://[your-blob-store].public.blob.vercel-storage.com/memories/{userId}.json'
  );
  const data = await response.json();

  // Or using head() for metadata
  const metadata = await head(blobName, { token });
  console.log('Last updated:', metadata.uploadedAt);
  `);

  console.log('\n🗑️  Clearing Memory:');
  console.log(`
  await del('memories/{userId}.json', { token });
  `);

  console.log('\n📊 Key Benefits of Vercel Blob Storage:');
  console.log('   • Permanent persistence (no expiration)');
  console.log('   • Global CDN distribution');
  console.log('   • Automatic backups');
  console.log('   • Simple API (put, get, del, list)');
  console.log('   • Direct HTTP access to stored files');
  console.log('   • Integrated with Vercel deployments\n');
}

// Run the test
testBlobStorage().catch(console.error);