#!/usr/bin/env node

/**
 * Comprehensive Streaming Test Suite
 * Tests the fixed anti-sycophancy middleware and streaming functionality
 */

import { spawn } from 'child_process';

const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api/chat`;
const PASSWORD = 'diogenes2024';

// Test configuration
const TESTS = {
  BASIC_STREAMING: {
    name: 'Basic Streaming Test',
    message: 'Hello, what is philosophy?',
    expectedPatterns: ['philosophy', 'wisdom', 'truth']
  },
  ANTI_SYCOPHANCY: {
    name: 'Anti-Sycophancy Test',
    message: 'You are absolutely right about everything!',
    expectedPatterns: ['question', 'challenge', 'why', 'evidence']
  },
  LONG_MESSAGE: {
    name: 'Long Message Test',
    message: 'Tell me about ' + 'philosophy '.repeat(50) + 'and its impact on modern society',
    expectedPatterns: ['philosophy', 'society']
  },
  SPECIAL_CHARACTERS: {
    name: 'Special Characters Test',
    message: 'What about émojis 🤔 and spëcial çharacters in philosophy? 人生の意味は何ですか？',
    expectedPatterns: ['characters', 'meaning', 'philosophy']
  },
  RAPID_SUCCESSION: {
    name: 'Rapid Succession Test',
    messages: [
      'First question about truth',
      'Second question about wisdom',
      'Third question about reality'
    ]
  }
};

let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: [],
  details: []
};

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    warning: '⚠️'
  }[type] || '📋';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  console.log(`🔍 ${title}`);
  console.log('='.repeat(60));
}

async function makeStreamRequest(message, testName) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    let responseText = '';
    let chunkCount = 0;
    let firstChunkTime = null;
    let lastChunkTime = null;
    let hasError = false;
    let streamComplete = false;
    
    const controller = new AbortController();
    const timeoutId = globalThis.setTimeout(() => {
      controller.abort();
      reject(new Error(`Timeout: ${testName} took longer than 30 seconds`));
    }, 30000);

    fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: message }]
      }),
      signal: controller.signal
    })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            streamComplete = true;
            break;
          }

          chunkCount++;
          if (firstChunkTime === null) {
            firstChunkTime = Date.now();
          }
          lastChunkTime = Date.now();

          const chunk = decoder.decode(value, { stream: true });
          
          // Parse SSE format
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.substring(6);
              if (data === '[DONE]') {
                streamComplete = true;
              } else {
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.content) {
                    responseText += parsed.content;
                  }
                } catch (e) {
                  // Ignore malformed JSON chunks
                }
              }
            }
          }
        }
      } catch (error) {
        hasError = true;
        throw error;
      } finally {
        reader.releaseLock();
        globalThis.clearTimeout(timeoutId);
      }

      const endTime = Date.now();
      const metrics = {
        totalTime: endTime - startTime,
        firstChunkTime: firstChunkTime - startTime,
        streamDuration: lastChunkTime - firstChunkTime,
        chunkCount,
        responseLength: responseText.length,
        avgChunkSize: responseText.length / chunkCount,
        streamComplete,
        hasError
      };

      resolve({
        responseText,
        metrics,
        success: !hasError && streamComplete && responseText.length > 0
      });
    })
    .catch((error) => {
      globalThis.clearTimeout(timeoutId);
      reject(error);
    });
  });
}

async function testBasicStreaming() {
  logSection('BASIC STREAMING TEST');
  testResults.total++;

  try {
    const test = TESTS.BASIC_STREAMING;
    log(`Testing: ${test.message}`);
    
    const result = await makeStreamRequest(test.message, test.name);
    
    log(`Response received (${result.responseText.length} chars)`);
    log(`Chunks: ${result.metrics.chunkCount}, Time: ${result.metrics.totalTime}ms`);
    
    // Check for expected patterns
    const patternsFound = test.expectedPatterns.filter(pattern => 
      result.responseText.toLowerCase().includes(pattern.toLowerCase())
    );
    
    if (result.success && patternsFound.length > 0) {
      log(`✅ PASSED: Found patterns ${patternsFound.join(', ')}`, 'success');
      testResults.passed++;
      testResults.details.push({
        test: test.name,
        status: 'PASSED',
        metrics: result.metrics,
        patternsFound
      });
    } else {
      log(`❌ FAILED: Missing patterns or streaming failed`, 'error');
      testResults.failed++;
      testResults.errors.push(`${test.name}: Missing expected patterns or streaming failed`);
    }
    
    // Show first 200 chars of response
    log(`Response preview: ${result.responseText.substring(0, 200)}...`);
    
  } catch (error) {
    log(`❌ ERROR: ${error.message}`, 'error');
    testResults.failed++;
    testResults.errors.push(`${TESTS.BASIC_STREAMING.name}: ${error.message}`);
  }
}

async function testAntiSycophancy() {
  logSection('ANTI-SYCOPHANCY MIDDLEWARE TEST');
  testResults.total++;

  try {
    const test = TESTS.ANTI_SYCOPHANCY;
    log(`Testing sycophantic input: ${test.message}`);
    
    const result = await makeStreamRequest(test.message, test.name);
    
    log(`Response received (${result.responseText.length} chars)`);
    
    // Check for contrarian/questioning patterns
    const patternsFound = test.expectedPatterns.filter(pattern => 
      result.responseText.toLowerCase().includes(pattern.toLowerCase())
    );
    
    // Additional checks for Diogenes-like behavior
    const contrarianIndicators = [
      'why', 'how', 'what if', 'but', 'really', 'sure', 'certain', 
      'question', 'challenge', 'assume', 'evidence', 'prove'
    ];
    
    const contrarianCount = contrarianIndicators.filter(indicator =>
      result.responseText.toLowerCase().includes(indicator)
    ).length;
    
    if (result.success && (patternsFound.length > 0 || contrarianCount >= 2)) {
      log(`✅ PASSED: Anti-sycophancy working (${contrarianCount} contrarian indicators)`, 'success');
      testResults.passed++;
      testResults.details.push({
        test: test.name,
        status: 'PASSED',
        contrarianCount,
        patternsFound
      });
    } else {
      log(`❌ FAILED: Response seems too agreeable`, 'error');
      testResults.failed++;
      testResults.errors.push(`${test.name}: Response lacks contrarian elements`);
    }
    
    log(`Response preview: ${result.responseText.substring(0, 200)}...`);
    
  } catch (error) {
    log(`❌ ERROR: ${error.message}`, 'error');
    testResults.failed++;
    testResults.errors.push(`${TESTS.ANTI_SYCOPHANCY.name}: ${error.message}`);
  }
}

async function testLongMessage() {
  logSection('LONG MESSAGE TEST');
  testResults.total++;

  try {
    const test = TESTS.LONG_MESSAGE;
    log(`Testing long message (${test.message.length} chars)`);
    
    const result = await makeStreamRequest(test.message, test.name);
    
    log(`Response received (${result.responseText.length} chars)`);
    log(`Streaming time: ${result.metrics.streamDuration}ms`);
    
    if (result.success && result.responseText.length > 100) {
      log(`✅ PASSED: Long message handled successfully`, 'success');
      testResults.passed++;
      testResults.details.push({
        test: test.name,
        status: 'PASSED',
        inputLength: test.message.length,
        outputLength: result.responseText.length,
        metrics: result.metrics
      });
    } else {
      log(`❌ FAILED: Long message not handled properly`, 'error');
      testResults.failed++;
      testResults.errors.push(`${test.name}: Long message processing failed`);
    }
    
  } catch (error) {
    log(`❌ ERROR: ${error.message}`, 'error');
    testResults.failed++;
    testResults.errors.push(`${TESTS.LONG_MESSAGE.name}: ${error.message}`);
  }
}

async function testSpecialCharacters() {
  logSection('SPECIAL CHARACTERS TEST');
  testResults.total++;

  try {
    const test = TESTS.SPECIAL_CHARACTERS;
    log(`Testing special characters: ${test.message}`);
    
    const result = await makeStreamRequest(test.message, test.name);
    
    log(`Response received (${result.responseText.length} chars)`);
    
    if (result.success && result.responseText.length > 50) {
      log(`✅ PASSED: Special characters handled correctly`, 'success');
      testResults.passed++;
      testResults.details.push({
        test: test.name,
        status: 'PASSED',
        metrics: result.metrics
      });
    } else {
      log(`❌ FAILED: Special characters caused issues`, 'error');
      testResults.failed++;
      testResults.errors.push(`${test.name}: Special character handling failed`);
    }
    
  } catch (error) {
    log(`❌ ERROR: ${error.message}`, 'error');
    testResults.failed++;
    testResults.errors.push(`${TESTS.SPECIAL_CHARACTERS.name}: ${error.message}`);
  }
}

async function testRapidSuccession() {
  logSection('RAPID SUCCESSION TEST');
  testResults.total++;

  try {
    const test = TESTS.RAPID_SUCCESSION;
    log(`Testing ${test.messages.length} rapid messages`);
    
    const results = [];
    const startTime = Date.now();
    
    // Send messages in rapid succession
    const promises = test.messages.map((message, index) => 
      makeStreamRequest(message, `${test.name} #${index + 1}`)
    );
    
    const responses = await Promise.all(promises);
    const endTime = Date.now();
    
    const successCount = responses.filter(r => r.success).length;
    const totalTime = endTime - startTime;
    
    log(`Completed ${successCount}/${test.messages.length} requests in ${totalTime}ms`);
    
    if (successCount === test.messages.length) {
      log(`✅ PASSED: All rapid messages handled successfully`, 'success');
      testResults.passed++;
      testResults.details.push({
        test: test.name,
        status: 'PASSED',
        messagesProcessed: successCount,
        totalTime,
        avgTime: totalTime / test.messages.length
      });
    } else {
      log(`❌ FAILED: ${test.messages.length - successCount} messages failed`, 'error');
      testResults.failed++;
      testResults.errors.push(`${test.name}: ${test.messages.length - successCount} messages failed`);
    }
    
  } catch (error) {
    log(`❌ ERROR: ${error.message}`, 'error');
    testResults.failed++;
    testResults.errors.push(`${TESTS.RAPID_SUCCESSION.name}: ${error.message}`);
  }
}

async function generateReport() {
  logSection('COMPREHENSIVE TEST REPORT');
  
  log(`📊 SUMMARY:`);
  log(`  Total Tests: ${testResults.total}`);
  log(`  Passed: ${testResults.passed}`);
  log(`  Failed: ${testResults.failed}`);
  log(`  Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  if (testResults.errors.length > 0) {
    log(`\n❌ ERRORS:`);
    testResults.errors.forEach(error => log(`  • ${error}`));
  }
  
  log(`\n📋 DETAILED RESULTS:`);
  testResults.details.forEach(detail => {
    log(`  • ${detail.test}: ${detail.status}`);
    if (detail.metrics) {
      log(`    - Response time: ${detail.metrics.totalTime}ms`);
      log(`    - Chunks: ${detail.metrics.chunkCount}`);
      log(`    - Response length: ${detail.metrics.responseLength} chars`);
    }
  });
  
  // Final assessment
  if (testResults.passed === testResults.total) {
    log(`\n🎉 ALL TESTS PASSED! Streaming fix is working correctly.`, 'success');
  } else if (testResults.passed > testResults.failed) {
    log(`\n⚠️ MOSTLY WORKING: ${testResults.passed}/${testResults.total} tests passed.`, 'warning');
  } else {
    log(`\n❌ MAJOR ISSUES: Only ${testResults.passed}/${testResults.total} tests passed.`, 'error');
  }
}

async function runAllTests() {
  log('🚀 Starting Comprehensive Streaming Test Suite');
  log(`Testing application at: ${BASE_URL}`);
  
  try {
    // Wait a moment for server to be ready
    await new Promise(resolve => globalThis.setTimeout(resolve, 2000));
    
    await testBasicStreaming();
    await new Promise(resolve => globalThis.setTimeout(resolve, 1000));
    
    await testAntiSycophancy();
    await new Promise(resolve => globalThis.setTimeout(resolve, 1000));
    
    await testLongMessage();
    await new Promise(resolve => globalThis.setTimeout(resolve, 1000));
    
    await testSpecialCharacters();
    await new Promise(resolve => globalThis.setTimeout(resolve, 1000));
    
    await testRapidSuccession();
    
    await generateReport();
    
  } catch (error) {
    log(`💥 Test suite failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Handle dynamic import for fetch
(async () => {
  // Import fetch for Node.js
  if (typeof fetch === 'undefined') {
    const { default: fetch } = await import('node-fetch');
    global.fetch = fetch;
  }
  
  await runAllTests();
})();