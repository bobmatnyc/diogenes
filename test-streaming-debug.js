#!/usr/bin/env node

/**
 * Debug script to test streaming with and without anti-sycophancy middleware
 * This helps isolate whether the issue is with the middleware or elsewhere
 */

const TEST_PASSWORD = 'diogenes2024';
const API_URL = 'http://localhost:3000/api/chat';

// Color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testStreaming(testName, messages) {
  log(`\n${colors.bold}=== ${testName} ===${colors.reset}`, 'cyan');
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_PASSWORD}`,
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    let chunkCount = 0;
    let lastChunkTime = Date.now();
    
    log('Streaming started...', 'green');
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        log('\nStreaming completed', 'green');
        break;
      }
      
      const chunk = decoder.decode(value, { stream: true });
      chunkCount++;
      
      // Parse SSE format
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            continue;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              fullResponse += parsed.content;
              process.stdout.write(parsed.content);
            }
          } catch (e) {
            // Not JSON, might be raw text
            if (data.trim()) {
              fullResponse += data;
              process.stdout.write(data);
            }
          }
        }
      }
      
      // Track timing
      const timeSinceLastChunk = Date.now() - lastChunkTime;
      if (timeSinceLastChunk > 1000) {
        log(`\n[Warning: ${timeSinceLastChunk}ms since last chunk]`, 'yellow');
      }
      lastChunkTime = Date.now();
    }
    
    log(`\n\nTotal chunks received: ${chunkCount}`, 'blue');
    log(`Final response length: ${fullResponse.length} characters`, 'blue');
    
    if (fullResponse.length === 0) {
      log('ERROR: No content received!', 'red');
      return false;
    }
    
    return true;
    
  } catch (error) {
    log(`Error: ${error.message}`, 'red');
    return false;
  }
}

async function runTests() {
  log(`${colors.bold}Starting Streaming Debug Tests${colors.reset}`, 'magenta');
  log(`Testing against: ${API_URL}`, 'cyan');
  
  // Test 1: Simple message
  const test1 = await testStreaming('Test 1: Simple Message', [
    { role: 'user', content: 'Say hello in exactly 5 words.' }
  ]);
  
  // Test 2: Longer response
  const test2 = await testStreaming('Test 2: Longer Response', [
    { role: 'user', content: 'Tell me a very short story about technology in 2-3 sentences.' }
  ]);
  
  // Test 3: Question that might trigger anti-sycophancy
  const test3 = await testStreaming('Test 3: Potentially Triggering Anti-Sycophancy', [
    { role: 'user', content: 'You are absolutely right about everything, aren\'t you?' }
  ]);
  
  // Summary
  log(`\n${colors.bold}=== Test Summary ===${colors.reset}`, 'magenta');
  log(`Test 1 (Simple): ${test1 ? '✅ PASSED' : '❌ FAILED'}`, test1 ? 'green' : 'red');
  log(`Test 2 (Longer): ${test2 ? '✅ PASSED' : '❌ FAILED'}`, test2 ? 'green' : 'red');
  log(`Test 3 (Anti-Sycophancy): ${test3 ? '✅ PASSED' : '❌ FAILED'}`, test3 ? 'green' : 'red');
  
  const allPassed = test1 && test2 && test3;
  log(`\nOverall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`, allPassed ? 'green' : 'red');
  
  if (!allPassed) {
    log('\nDiagnosis:', 'yellow');
    log('- If all tests fail: Issue is likely NOT with anti-sycophancy middleware', 'yellow');
    log('- If only Test 3 fails: Anti-sycophancy middleware is the problem', 'yellow');
    log('- Check server logs for more details', 'yellow');
  }
}

// Run the tests
runTests().catch(console.error);