// Integration test for Diogenes Chat UI
// This script uses Playwright to test that the chat UI properly displays assistant responses

const { chromium } = require('playwright');

async function testChatUI() {
  console.log('🧪 Starting Diogenes Chat UI Integration Test');
  console.log('═'.repeat(50));

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Enable console logging
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log('❌ Browser console error:', msg.text());
      }
    });

    page.on('pageerror', (error) => {
      console.log('❌ Page error:', error.message);
    });

    console.log('\n📌 Step 1: Navigating to chat page...');
    await page.goto('http://localhost:3001/chat', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    console.log('✅ Page loaded successfully');

    // Check for initial elements
    console.log('\n📌 Step 2: Checking for UI elements...');

    const title = await page.textContent('h1');
    console.log(`  - Title found: "${title}"`);

    const inputSelector = 'input[placeholder*="Challenge Diogenes"]';
    const inputExists = (await page.locator(inputSelector).count()) > 0;
    console.log(`  - Input field exists: ${inputExists}`);

    const sendButtonSelector = 'button:has-text("Send")';
    const sendButtonExists = (await page.locator(sendButtonSelector).count()) > 0;
    console.log(`  - Send button exists: ${sendButtonExists}`);

    // Check for initial welcome message
    console.log('\n📌 Step 3: Checking for welcome message...');
    await page.waitForTimeout(2000); // Give time for initial message to render

    const messages = await page.locator('.message, [class*="message"]').allTextContents();
    console.log(`  - Initial messages count: ${messages.length}`);
    if (messages.length > 0) {
      console.log(`  - First message preview: "${messages[0].substring(0, 50)}..."`);
    }

    // Send a test message
    console.log('\n📌 Step 4: Sending test message...');
    const testMessage = 'What is the meaning of life?';

    await page.fill(inputSelector, testMessage);
    console.log(`  - Filled input with: "${testMessage}"`);

    await page.click(sendButtonSelector);
    console.log('  - Clicked send button');

    // Wait for user message to appear
    console.log('\n📌 Step 5: Waiting for user message to appear...');
    const userMessageSelector = `text="${testMessage}"`;
    await page.waitForSelector(userMessageSelector, { timeout: 10000 });
    console.log('✅ User message appeared in chat');

    // Wait for assistant response to start appearing
    console.log('\n📌 Step 6: Waiting for assistant response...');

    // Wait for loading indicator or new message
    let assistantResponseFound = false;
    let responseText = '';

    // Poll for assistant message for up to 20 seconds
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(500);

      const allMessages = await page.locator('.message, [class*="message"]').allTextContents();

      // Look for a message after the user's message
      const userMsgIndex = allMessages.findIndex((msg) => msg.includes(testMessage));
      if (userMsgIndex >= 0 && userMsgIndex < allMessages.length - 1) {
        // Found a message after the user's message
        responseText = allMessages[userMsgIndex + 1];
        if (responseText && responseText.length > 0) {
          assistantResponseFound = true;
          break;
        }
      }

      // Also check if there's any loading indicator
      const loadingExists =
        (await page.locator('[class*="loading"], [class*="animate"]').count()) > 0;
      if (loadingExists) {
        console.log('  - Loading indicator detected');
      }
    }

    if (assistantResponseFound) {
      console.log('✅ Assistant response received!');
      console.log(`  - Response length: ${responseText.length} characters`);
      console.log(`  - Response preview: "${responseText.substring(0, 100)}..."`);
    } else {
      console.log('❌ No assistant response received within timeout');

      // Debug: Get all messages for analysis
      const allMessages = await page.locator('.message, [class*="message"]').allTextContents();
      console.log('\n  Debug - All messages on page:');
      allMessages.forEach((msg, i) => {
        console.log(`    Message ${i}: "${msg.substring(0, 50)}..."`);
      });
    }

    // Take a screenshot for debugging
    console.log('\n📌 Step 7: Taking screenshot...');
    await page.screenshot({ path: 'chat-test-screenshot.png' });
    console.log('✅ Screenshot saved as chat-test-screenshot.png');

    // Final verification
    console.log('\n📊 Test Summary:');
    console.log('─'.repeat(30));
    console.log('✅ Page loaded: Yes');
    console.log(`✅ UI elements present: ${inputExists && sendButtonExists ? 'Yes' : 'No'}`);
    console.log('✅ User message sent: Yes');
    console.log(
      `${assistantResponseFound ? '✅' : '❌'} Assistant response received: ${assistantResponseFound ? 'Yes' : 'No'}`,
    );

    if (assistantResponseFound) {
      console.log('\n🎉 Integration test PASSED!');
    } else {
      console.log('\n⚠️  Integration test FAILED - Assistant response not displayed');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Run the test
testChatUI().catch(console.error);
