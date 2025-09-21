import { test, expect } from '@playwright/test';

test('Memory Test Dashboard Verification', async ({ page }) => {
  // Navigate to test dashboard
  await page.goto('/test');

  // Wait for page to load
  await page.waitForLoadState('networkidle');

  // Take initial screenshot
  await page.screenshot({ path: 'test-dashboard-initial.png', fullPage: true });

  // Check if OAuth authentication is required
  const isAuthRequired = await page.locator('text=Sign in').isVisible().catch(() => false);

  if (isAuthRequired) {
    console.log('OAuth authentication detected, attempting to sign in...');
    // Look for sign in button or Google OAuth
    const signInButton = page.locator('text=Sign in').first();
    if (await signInButton.isVisible()) {
      await signInButton.click();
      await page.waitForLoadState('networkidle');

      // If Google OAuth is present, click it
      const googleButton = page.locator('text=Continue with Google').first();
      if (await googleButton.isVisible()) {
        console.log('Google OAuth available but requires manual authentication');
        // Take screenshot of auth screen
        await page.screenshot({ path: 'auth-screen.png', fullPage: true });
      }
    }
  }

  // Look for the test dashboard content
  const runAllTestsButton = page.locator('text=Run All Tests').first();

  if (await runAllTestsButton.isVisible()) {
    console.log('Test dashboard loaded successfully');

    // Take screenshot before running tests
    await page.screenshot({ path: 'test-dashboard-before-tests.png', fullPage: true });

    // Click "Run All Tests" button
    await runAllTestsButton.click();
    console.log('Clicked "Run All Tests" button');

    // Wait for tests to complete (up to 30 seconds)
    await page.waitForTimeout(5000); // Give tests time to start

    // Wait for test results to appear
    try {
      await page.waitForSelector('text=Test Results', { timeout: 30000 });
      console.log('Test results appeared');
    } catch (error) {
      console.log('Test results did not appear within timeout, taking screenshot anyway');
    }

    // Take screenshot of test results
    await page.screenshot({ path: 'test-dashboard-results.png', fullPage: true });

    // Look for specific test results
    const createTestEntityResult = await page.locator('text=Create Test Entity').isVisible().catch(() => false);
    const storeTestMemoryResult = await page.locator('text=Store Test Memory').isVisible().catch(() => false);

    if (createTestEntityResult) {
      console.log('✅ "Create Test Entity" test found');

      // Check if it passed or failed
      const createTestPassed = await page.locator('text=Create Test Entity').locator('..').locator('text=✅').isVisible().catch(() => false);
      const createTestFailed = await page.locator('text=Create Test Entity').locator('..').locator('text=❌').isVisible().catch(() => false);

      if (createTestPassed) {
        console.log('✅ "Create Test Entity" test PASSED');
      } else if (createTestFailed) {
        console.log('❌ "Create Test Entity" test FAILED');
      } else {
        console.log('⏳ "Create Test Entity" test status unclear');
      }
    }

    if (storeTestMemoryResult) {
      console.log('✅ "Store Test Memory" test found');

      // Check if it passed or failed
      const storeTestPassed = await page.locator('text=Store Test Memory').locator('..').locator('text=✅').isVisible().catch(() => false);
      const storeTestFailed = await page.locator('text=Store Test Memory').locator('..').locator('text=❌').isVisible().catch(() => false);

      if (storeTestPassed) {
        console.log('✅ "Store Test Memory" test PASSED');
      } else if (storeTestFailed) {
        console.log('❌ "Store Test Memory" test FAILED');
      } else {
        console.log('⏳ "Store Test Memory" test status unclear');
      }
    }

    // Extract all test results text
    const testResultsText = await page.locator('body').textContent();
    console.log('=== FULL TEST RESULTS ===');
    console.log(testResultsText);

  } else {
    console.log('Test dashboard not accessible - taking screenshot for debugging');
    await page.screenshot({ path: 'test-dashboard-error.png', fullPage: true });

    // Check what's actually on the page
    const pageContent = await page.textContent('body');
    console.log('Page content:', pageContent?.substring(0, 500));
  }
});