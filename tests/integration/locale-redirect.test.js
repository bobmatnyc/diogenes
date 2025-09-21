/**
 * Test locale prefix handling in middleware
 * Verifies that locale prefixes like /en/, /es/, etc. are properly redirected
 */

const testCases = [
  { input: '/en/chat', expected: '/chat' },
  { input: '/es/chat', expected: '/chat' },
  { input: '/fr/api/chat', expected: '/api/chat' },
  { input: '/de/', expected: '/' },
  { input: '/ja/about', expected: '/about' },
  { input: '/chat', expected: null }, // Should not redirect
  { input: '/api/chat', expected: null }, // Should not redirect
  { input: '/eng/chat', expected: null }, // 3-letter codes should not redirect
];

async function testLocaleRedirects() {
  const baseUrl = 'http://localhost:3000';
  let passed = 0;
  let failed = 0;

  console.log('Testing locale prefix redirects...\n');

  for (const testCase of testCases) {
    try {
      const response = await fetch(`${baseUrl}${testCase.input}`, {
        method: 'HEAD',
        redirect: 'manual', // Don't follow redirects automatically
      });

      const location = response.headers.get('location');

      if (testCase.expected === null) {
        // Should not redirect
        if (response.status === 307 || response.status === 308) {
          console.error(`❌ ${testCase.input} should NOT redirect but got: ${location}`);
          failed++;
        } else {
          console.log(`✅ ${testCase.input} - correctly not redirected`);
          passed++;
        }
      } else {
        // Should redirect
        if (location === testCase.expected) {
          console.log(`✅ ${testCase.input} → ${location}`);
          passed++;
        } else {
          console.error(`❌ ${testCase.input} expected ${testCase.expected} but got: ${location}`);
          failed++;
        }
      }
    } catch (error) {
      console.error(`❌ ${testCase.input} - Error: ${error.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

// Run the test if this file is executed directly
if (require.main === module) {
  testLocaleRedirects()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testLocaleRedirects };