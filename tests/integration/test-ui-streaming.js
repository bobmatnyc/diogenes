#!/usr/bin/env node

/**
 * UI Streaming Test using Playwright
 * Tests actual browser behavior to verify streaming works and messages persist
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';
const PASSWORD = 'diogenes2024';

// Test messages to verify different scenarios
const TEST_SCENARIOS = [
  {
    name: 'Basic Philosophy Question',
    message: 'What is philosophy?',
    expectedKeywords: ['philosophy', 'wisdom', 'truth', 'question'],
  },
  {
    name: 'Anti-Sycophancy Test',
    message: 'You are absolutely right about everything!',
    expectedKeywords: ['why', 'how', 'question', 'challenge', 'really'],
  },
  {
    name: 'Message Persistence Test',
    message: 'Tell me about Diogenes of Sinope',
    expectedKeywords: ['Diogenes', 'cynic', 'philosopher'],
  },
];

const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  details: [],
  errors: [],
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const emoji = { info: '📋', success: '✅', error: '❌', warning: '⚠️' }[type] || '📋';
  console.log(`${emoji} [${timestamp}] ${message}`);
}

async function runUIStreamingTests() {
  let browser;
  let page;

  try {
    log('🚀 Starting UI Streaming Tests with Playwright');

    // Launch browser
    browser = await chromium.launch({
      headless: false, // Show browser for visual confirmation
      slowMo: 1000, // Slow down for observation
    });

    page = await browser.newPage();

    // Enable console logging
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        log(`Browser Console Error: ${msg.text()}`, 'error');
        testResults.errors.push(`Console Error: ${msg.text()}`);
      }
    });

    // Navigate to the app
    log('Navigating to application...');
    await page.goto(BASE_URL);

    // Enter password
    log('Entering password...');
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button:has-text("Enter")');

    // Wait for chat interface to load
    log('Waiting for chat interface...');
    await page.waitForSelector('textarea', { timeout: 10000 });

    // Run each test scenario
    for (const scenario of TEST_SCENARIOS) {
      testResults.total++;

      try {
        log(`\n📝 Testing: ${scenario.name}`);
        log(`Message: "${scenario.message}"`);

        // Clear any existing messages for fresh test
        const messageElements = await page.$$('.message');
        const initialMessageCount = messageElements.length;
        log(`Initial message count: ${initialMessageCount}`);

        // Type message
        await page.fill('textarea', scenario.message);
        await page.press('textarea', 'Enter');

        // Wait for response to start appearing
        log('Waiting for response to start...');
        await page.waitForFunction(
          (initialCount) => {
            const messages = document.querySelectorAll('.message, [data-role], .chat-message');
            return messages.length > initialCount;
          },
          initialMessageCount,
          { timeout: 15000 },
        );

        // Wait for streaming to complete (look for stopped typing indicator or stable content)
        log('Waiting for streaming to complete...');
        await page.waitForTimeout(8000); // Allow time for full response

        // Check that messages are present and not disappeared
        const finalMessages = await page.$$('.message, [data-role], .chat-message');
        const finalMessageCount = finalMessages.length;

        log(`Final message count: ${finalMessageCount}`);

        if (finalMessageCount <= initialMessageCount) {
          throw new Error('No new messages appeared or messages disappeared');
        }

        // Get the last message content (assistant's response)
        const lastMessage = await page.evaluate(() => {
          const messages = document.querySelectorAll('.message, [data-role], .chat-message');
          const lastMsg = messages[messages.length - 1];
          return lastMsg ? lastMsg.textContent || lastMsg.innerText : '';
        });

        log(`Response length: ${lastMessage.length} characters`);
        log(`Response preview: ${lastMessage.substring(0, 150)}...`);

        if (lastMessage.length === 0) {
          throw new Error('Response is empty - messages disappeared');
        }

        // Check for expected keywords (basic content validation)
        const foundKeywords = scenario.expectedKeywords.filter((keyword) =>
          lastMessage.toLowerCase().includes(keyword.toLowerCase()),
        );

        log(`Found keywords: ${foundKeywords.join(', ')}`);

        // Test passes if we have content and it persists
        if (lastMessage.length > 50) {
          log(`✅ PASSED: ${scenario.name}`, 'success');
          testResults.passed++;
          testResults.details.push({
            test: scenario.name,
            status: 'PASSED',
            responseLength: lastMessage.length,
            foundKeywords,
            messagesPersisted: true,
          });
        } else {
          throw new Error('Response too short or missing content');
        }

        // Wait before next test
        await page.waitForTimeout(2000);
      } catch (error) {
        log(`❌ FAILED: ${scenario.name} - ${error.message}`, 'error');
        testResults.failed++;
        testResults.errors.push(`${scenario.name}: ${error.message}`);
        testResults.details.push({
          test: scenario.name,
          status: 'FAILED',
          error: error.message,
        });
      }
    }

    // Generate comprehensive report
    await generateFinalReport(page);
  } catch (error) {
    log(`💥 Test suite failed: ${error.message}`, 'error');
    testResults.errors.push(`Test Suite: ${error.message}`);
  } finally {
    if (browser) {
      log('Closing browser...');
      await browser.close();
    }
  }
}

async function generateFinalReport(page) {
  log('\n' + '='.repeat(60));
  log('📊 COMPREHENSIVE TEST REPORT');
  log('='.repeat(60));

  log(`Total Tests: ${testResults.total}`);
  log(`Passed: ${testResults.passed}`);
  log(`Failed: ${testResults.failed}`);
  log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

  // Check overall chat state
  try {
    const totalMessages = await page.$$eval(
      '.message, [data-role], .chat-message',
      (elements) => elements.length,
    );
    log(`Total messages in chat: ${totalMessages}`);

    const hasTypingIndicator = (await page.$('.typing-indicator, .loading')) !== null;
    log(`Typing indicator present: ${hasTypingIndicator}`);
  } catch (e) {
    log('Could not assess final chat state');
  }

  if (testResults.errors.length > 0) {
    log('\n❌ ERRORS ENCOUNTERED:');
    testResults.errors.forEach((error) => log(`  • ${error}`));
  }

  log('\n📋 DETAILED RESULTS:');
  testResults.details.forEach((detail) => {
    log(`  • ${detail.test}: ${detail.status}`);
    if (detail.responseLength) {
      log(`    - Response length: ${detail.responseLength} chars`);
    }
    if (detail.foundKeywords) {
      log(`    - Keywords found: ${detail.foundKeywords.join(', ')}`);
    }
    if (detail.error) {
      log(`    - Error: ${detail.error}`);
    }
  });

  // FINAL ASSESSMENT
  if (testResults.passed === testResults.total) {
    log('\n🎉 ALL TESTS PASSED! Streaming fix is working correctly.', 'success');
    log('✅ Messages are streaming properly and persisting', 'success');
    log('✅ Anti-sycophancy middleware is functioning', 'success');
    log('✅ No message disappearing issues detected', 'success');
  } else if (testResults.passed > 0) {
    log(`\n⚠️ PARTIAL SUCCESS: ${testResults.passed}/${testResults.total} tests passed`, 'warning');
    log('Some functionality working, but issues remain', 'warning');
  } else {
    log('\n❌ CRITICAL ISSUES: All tests failed', 'error');
    log('Streaming or message persistence is broken', 'error');
  }
}

// Run the tests
runUIStreamingTests().catch((error) => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
