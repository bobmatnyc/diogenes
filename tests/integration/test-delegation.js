/**
 * Test script for the web search delegation functionality
 * Tests both philosophical queries (no delegation) and current info queries (delegation)
 */

const TEST_QUERIES = [
  {
    type: 'philosophical',
    query: 'What is the meaning of life and why do humans seek purpose?',
    expectsDelegation: false,
    description: 'Pure philosophical question - should NOT trigger delegation',
  },
  {
    type: 'current_event',
    query: 'What is the current price of Bitcoin today?',
    expectsDelegation: true,
    description: 'Current market data - SHOULD trigger delegation',
  },
  {
    type: 'recent_news',
    query: 'What happened in the latest developments with AI regulation in 2024?',
    expectsDelegation: true,
    description: 'Recent news query - SHOULD trigger delegation',
  },
  {
    type: 'philosophical_with_current',
    query:
      'Given the current state of social media in 2024, what would ancient philosophers think?',
    expectsDelegation: true,
    description: 'Mixed query - SHOULD trigger delegation for context',
  },
  {
    type: 'timeless',
    query: 'Why do people fear death?',
    expectsDelegation: false,
    description: 'Timeless philosophical question - should NOT trigger delegation',
  },
];

async function testDelegation(query, expectsDelegation) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${query}`);
  console.log(`Expected delegation: ${expectsDelegation}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: query,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Check if delegation occurred via header
    const delegated = response.headers.get('X-Search-Delegated') === 'true';
    console.log(`Delegation occurred: ${delegated}`);

    if (delegated !== expectsDelegation) {
      console.log(`⚠️  UNEXPECTED: Expected ${expectsDelegation}, got ${delegated}`);
    } else {
      console.log('✅ Delegation behavior as expected');
    }

    // Read the streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    console.log('\nResponse preview:\n');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      fullResponse += chunk;

      // Print first chunk for preview
      if (fullResponse.length < 200) {
        process.stdout.write(chunk);
      }
    }

    if (fullResponse.length > 200) {
      console.log('... [truncated]');
    }

    console.log('\n');

    // Check if response contains search-related content when expected
    if (expectsDelegation) {
      const hasSearchContent =
        fullResponse.toLowerCase().includes('according to') ||
        fullResponse.toLowerCase().includes('recent') ||
        fullResponse.toLowerCase().includes('current') ||
        fullResponse.toLowerCase().includes('as of');

      if (hasSearchContent) {
        console.log('✅ Response appears to include search-informed content');
      } else {
        console.log('⚠️  Response may not include search results');
      }
    }

    return { success: true, delegated };
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function runAllTests() {
  console.log('Starting Web Search Delegation Tests');
  console.log('====================================\n');

  // Set environment for mock mode if needed
  if (process.argv.includes('--mock')) {
    console.log('Running in MOCK MODE (no actual API calls to Perplexity)\n');
    process.env.ENABLE_MOCK_SEARCH = 'true';
  }

  const results = [];

  for (const test of TEST_QUERIES) {
    console.log(`\nTest Type: ${test.type}`);
    console.log(`Description: ${test.description}`);

    const result = await testDelegation(test.query, test.expectsDelegation);
    results.push({
      ...test,
      ...result,
    });

    // Add delay between tests to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter((r) => r.success && r.delegated === r.expectsDelegation);
  const failed = results.filter((r) => !r.success || r.delegated !== r.expectsDelegation);

  console.log(`Total tests: ${results.length}`);
  console.log(`Passed: ${passed.length}`);
  console.log(`Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log('\nFailed tests:');
    failed.forEach((test) => {
      console.log(`- ${test.type}: ${test.description}`);
      if (test.error) {
        console.log(`  Error: ${test.error}`);
      }
    });
  }

  console.log('\n✨ Test run complete!');
}

// Run tests
runAllTests().catch(console.error);
