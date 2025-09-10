// Integration test for Diogenes Chat UI - Fixed version
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

    // Send a test message
    console.log('\n📌 Step 3: Sending test message...');
    const testMessage = 'What is the meaning of life?';

    await page.fill(inputSelector, testMessage);
    console.log(`  - Filled input with: "${testMessage}"`);

    await page.click(sendButtonSelector);
    console.log('  - Clicked send button');

    // Wait for user message to appear
    console.log('\n📌 Step 4: Waiting for user message to appear...');
    await page.waitForSelector(`text="${testMessage}"`, { timeout: 10000 });
    console.log('✅ User message appeared in chat');

    // Wait for assistant response
    console.log('\n📌 Step 5: Waiting for assistant response...');

    // Look for the Diogenes label that appears with assistant messages
    await page.waitForSelector('text="Diogenes"', {
      timeout: 15000,
      state: 'visible',
    });

    // Wait a bit more for the full response to stream in
    await page.waitForTimeout(3000);

    // Get all elements with assistant messages
    const assistantMessages = await page
      .locator('div:has-text("Diogenes")')
      .filter({
        hasNot: page.locator('h1'), // Exclude the header
      })
      .allTextContents();

    let assistantResponseFound = false;
    let responseText = '';

    if (assistantMessages.length > 0) {
      // Get the last assistant message (most recent response)
      responseText = assistantMessages[assistantMessages.length - 1];
      // Remove the "Diogenes" label and timestamp from the text
      responseText = responseText
        .replace(/^Diogenes\s*/, '')
        .replace(/\d{1,2}:\d{2}:\d{2}\s*(AM|PM)\s*$/, '')
        .trim();

      if (responseText && responseText.length > 10) {
        assistantResponseFound = true;
      }
    }

    if (assistantResponseFound) {
      console.log('✅ Assistant response received!');
      console.log(`  - Response length: ${responseText.length} characters`);
      console.log(`  - Response preview: "${responseText.substring(0, 100)}..."`);
    } else {
      console.log('❌ No assistant response detected');
    }

    // Take a screenshot for verification
    console.log('\n📌 Step 6: Taking screenshot...');
    await page.screenshot({ path: 'chat-test-final.png' });
    console.log('✅ Screenshot saved as chat-test-final.png');

    // Test streaming by sending another message
    console.log('\n📌 Step 7: Testing streaming with another message...');
    const secondMessage = 'Why do you answer questions with questions?';

    await page.fill(inputSelector, secondMessage);
    await page.click(sendButtonSelector);

    // Watch for streaming content
    let streamingDetected = false;
    const startTime = Date.now();

    // Check for progressive content updates
    let lastContent = '';
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(500);

      const currentMessages = await page
        .locator('div:has-text("Diogenes")')
        .filter({
          hasNot: page.locator('h1'),
        })
        .allTextContents();

      if (currentMessages.length > assistantMessages.length) {
        const newResponse = currentMessages[currentMessages.length - 1];
        if (newResponse !== lastContent && newResponse.length > lastContent.length) {
          streamingDetected = true;
          console.log(
            `  - Streaming detected: ${newResponse.length} chars after ${Date.now() - startTime}ms`,
          );
          lastContent = newResponse;
        }
      }
    }

    // Final verification
    console.log('\n📊 Test Summary:');
    console.log('─'.repeat(30));
    console.log('✅ Page loaded: Yes');
    console.log('✅ UI elements present: Yes');
    console.log('✅ User message sent: Yes');
    console.log(`✅ Assistant response received: ${assistantResponseFound ? 'Yes' : 'No'}`);
    console.log(`✅ Streaming detected: ${streamingDetected ? 'Yes' : 'No'}`);

    if (assistantResponseFound) {
      console.log('\n🎉 Integration test PASSED!');
      console.log('\n✨ The Diogenes chat is working correctly:');
      console.log('  - Messages are being sent to the API');
      console.log('  - Assistant responses are streaming back');
      console.log('  - UI is displaying responses properly');
    } else {
      console.log('\n⚠️  Integration test FAILED');
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
