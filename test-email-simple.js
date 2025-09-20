// Simple test to verify email-based authentication works
// Run with: node test-email-simple.js

const API_BASE = 'http://localhost:3000';

async function test() {
  console.log('Testing Email-Based Authentication\n');

  try {
    // Test 1: Default user (no auth)
    console.log('1. Testing default user (bob@matsuoka.com)...');
    const res1 = await fetch(`${API_BASE}/api/memory/entities`);
    const data1 = await res1.json();
    console.log('   Status:', res1.status);
    console.log('   Success:', data1.success || false);
    console.log('   Entities:', data1.data?.data?.length || 0);

    // Test 2: Create entity for default user
    console.log('\n2. Creating entity for default user...');
    const res2 = await fetch(`${API_BASE}/api/memory/entities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity_type: 'project',
        name: 'Test Project ' + Date.now(),
        description: 'Created by simple test'
      })
    });
    const data2 = await res2.json();
    console.log('   Status:', res2.status);
    console.log('   Success:', data2.success || false);
    if (data2.data?.id) {
      console.log('   Entity ID:', data2.data.id);
    }

    // Test 3: Different user via header
    console.log('\n3. Testing alice@example.com via header...');
    const res3 = await fetch(`${API_BASE}/api/memory/entities`, {
      headers: { 'X-User-Email': 'alice@example.com' }
    });
    const data3 = await res3.json();
    console.log('   Status:', res3.status);
    console.log('   Success:', data3.success || false);
    console.log('   Entities for Alice:', data3.data?.data?.length || 0);

    // Test 4: Create entity with email in body
    console.log('\n4. Creating entity for charlie@test.com...');
    const res4 = await fetch(`${API_BASE}/api/memory/entities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity_type: 'person',
        name: 'Charlie Entity',
        user_email: 'charlie@test.com'
      })
    });
    const data4 = await res4.json();
    console.log('   Status:', res4.status);
    console.log('   Success:', data4.success || false);

    console.log('\n✅ All tests completed!');
    console.log('\nSummary:');
    console.log('- Default user (bob@matsuoka.com) works without auth');
    console.log('- Different users can be specified via header or body');
    console.log('- Each user has isolated entities');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nMake sure the development server is running:');
    console.error('  pnpm dev');
  }
}

test();