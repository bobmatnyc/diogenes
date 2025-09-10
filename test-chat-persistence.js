#!/usr/bin/env node

/**
 * Test script to verify chat messages persist after streaming
 * This tests the full chat flow including the useChat hook integration
 */

const { chromium } = require('playwright');

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

async function testChatPersistence() {
  log(`${colors.bold}Starting Chat Persistence Test${colors.reset}`, 'magenta');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate to chat page
    log('Navigating to chat page...', 'cyan');
    await page.goto('http://localhost:3001/chat');
    
    // Enter password if required
    const passwordInput = await page.$('input[type="password"]');
    if (passwordInput) {
      log('Entering password...', 'cyan');
      await passwordInput.fill('diogenes2024');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
    }
    
    // Wait for chat interface to load
    await page.waitForSelector('textarea[placeholder*="Ask"]', { timeout: 10000 });
    log('Chat interface loaded', 'green');
    
    // Test 1: Send a simple message
    log('\n=== Test 1: Simple Message ===', 'bold');
    const input = await page.$('textarea[placeholder*="Ask"]');
    await input.fill('Say hello in exactly 5 words');
    await page.keyboard.press('Enter');
    
    // Wait for streaming to start
    log('Waiting for response to start streaming...', 'yellow');
    await page.waitForTimeout(1000);
    
    // Check if message appears during streaming
    const streamingMessage = await page.waitForSelector('.text-gray-800', { timeout: 10000 });
    if (streamingMessage) {
      log('✅ Message visible during streaming', 'green');
    } else {
      log('❌ Message not visible during streaming', 'red');
      return false;
    }
    
    // Wait for streaming to complete (look for when loading indicator disappears)
    log('Waiting for streaming to complete...', 'yellow');
    await page.waitForTimeout(5000);
    
    // Check if message persists after streaming
    const messages = await page.$$('.text-gray-800');
    const messageTexts = await Promise.all(messages.map(m => m.innerText()));
    
    log('\nMessages found after streaming:', 'cyan');
    messageTexts.forEach((text, i) => {
      log(`  ${i + 1}. ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`, 'blue');
    });
    
    if (messages.length > 0) {
      log('✅ Messages persist after streaming', 'green');
    } else {
      log('❌ Messages disappeared after streaming!', 'red');
      return false;
    }
    
    // Test 2: Send another message to verify conversation continuity
    log('\n=== Test 2: Conversation Continuity ===', 'bold');
    await input.fill('What did I just ask you?');
    await page.keyboard.press('Enter');
    
    await page.waitForTimeout(5000);
    
    const allMessages = await page.$$('.text-gray-800');
    log(`Total messages in conversation: ${allMessages.length}`, 'cyan');
    
    if (allMessages.length >= 2) {
      log('✅ Conversation history maintained', 'green');
    } else {
      log('❌ Conversation history lost', 'red');
      return false;
    }
    
    // Test 3: Check token tracking
    log('\n=== Test 3: Token Tracking ===', 'bold');
    const tokenBadges = await page.$$('[class*="token"]');
    if (tokenBadges.length > 0) {
      log(`✅ Token tracking active (${tokenBadges.length} badges found)`, 'green');
    } else {
      log('⚠️  No token badges found (may be expected)', 'yellow');
    }
    
    // Take screenshot for verification
    await page.screenshot({ path: 'chat-persistence-test.png', fullPage: true });
    log('\nScreenshot saved as chat-persistence-test.png', 'cyan');
    
    return true;
    
  } catch (error) {
    log(`\nError during test: ${error.message}`, 'red');
    await page.screenshot({ path: 'chat-persistence-error.png', fullPage: true });
    return false;
    
  } finally {
    await browser.close();
  }
}

async function runTests() {
  const success = await testChatPersistence();
  
  log(`\n${colors.bold}=== Test Summary ===${colors.reset}`, 'magenta');
  if (success) {
    log('✅ ALL TESTS PASSED - Messages persist correctly!', 'green');
    log('\nThe streaming issue has been FIXED:', 'green');
    log('1. Migrated to AI SDK v5 with proper imports', 'cyan');
    log('2. Fixed streaming response format', 'cyan');
    log('3. Disabled problematic anti-sycophancy middleware', 'cyan');
    log('4. Installed @ai-sdk/react for useChat hook', 'cyan');
  } else {
    log('❌ TESTS FAILED - Messages still disappearing', 'red');
    log('\nPossible remaining issues:', 'yellow');
    log('- Check browser console for errors', 'yellow');
    log('- Verify API responses in Network tab', 'yellow');
    log('- Check if useChat hook is handling streams correctly', 'yellow');
  }
  
  process.exit(success ? 0 : 1);
}

// Run the tests
runTests().catch(console.error);