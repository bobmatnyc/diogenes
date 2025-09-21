import { test, expect } from '@playwright/test';

test('Simple Memory Test Dashboard Check', async ({ page }) => {
  console.log('🔍 Starting memory test verification...');

  // Navigate to test dashboard
  await page.goto('/test');
  await page.waitForLoadState('networkidle');

  // Take full page screenshot before clicking
  await page.screenshot({
    path: 'memory-dashboard-full-before.png',
    fullPage: true
  });

  // Check if we can see the test dashboard
  const dashboardTitle = await page.locator('text=Diogenes System Test Dashboard').isVisible();
  console.log('Dashboard visible:', dashboardTitle);

  if (dashboardTitle) {
    // Click Run All Tests button
    const runButton = page.locator('text=Run All Tests').first();
    if (await runButton.isVisible()) {
      console.log('✅ "Run All Tests" button found, clicking...');
      await runButton.click();

      // Wait a bit for tests to start
      await page.waitForTimeout(3000);

      // Look for memory system section specifically
      const memorySection = page.locator('text=Memory System');
      if (await memorySection.isVisible()) {
        console.log('✅ Memory System section found');

        // Scroll to memory system section
        await memorySection.scrollIntoViewIfNeeded();
        await page.waitForTimeout(1000);

        // Take screenshot of memory section
        await page.screenshot({
          path: 'memory-section-during-tests.png',
          fullPage: true
        });

        // Wait for tests to complete (longer timeout)
        console.log('⏳ Waiting for tests to complete...');
        await page.waitForTimeout(15000);

        // Take final screenshot
        await page.screenshot({
          path: 'memory-dashboard-full-after.png',
          fullPage: true
        });

        // Look for Create Test Entity results
        const createEntityTest = page.locator('text=Create Test Entity');
        if (await createEntityTest.isVisible()) {
          console.log('✅ Found "Create Test Entity" test');

          // Check for success/failure indicators near this test
          const parentLocator = createEntityTest.locator('..');
          const isSuccess = await parentLocator.locator('text=✅').isVisible().catch(() => false);
          const isFailure = await parentLocator.locator('text=❌').isVisible().catch(() => false);

          if (isSuccess) {
            console.log('✅ "Create Test Entity" - PASSED');
          } else if (isFailure) {
            console.log('❌ "Create Test Entity" - FAILED');
          } else {
            console.log('⏳ "Create Test Entity" - Status unclear');
          }
        }

        // Look for Store Test Memory results
        const storeMemoryTest = page.locator('text=Store Test Memory');
        if (await storeMemoryTest.isVisible()) {
          console.log('✅ Found "Store Test Memory" test');

          // Check for success/failure indicators near this test
          const parentLocator = storeMemoryTest.locator('..');
          const isSuccess = await parentLocator.locator('text=✅').isVisible().catch(() => false);
          const isFailure = await parentLocator.locator('text=❌').isVisible().catch(() => false);

          if (isSuccess) {
            console.log('✅ "Store Test Memory" - PASSED');
          } else if (isFailure) {
            console.log('❌ "Store Test Memory" - FAILED');
          } else {
            console.log('⏳ "Store Test Memory" - Status unclear');
          }
        }

        // Get test statistics from header
        const passedCount = await page.locator('text=Passed').locator('..').locator('span').first().textContent().catch(() => 'N/A');
        const failedCount = await page.locator('text=Failed').locator('..').locator('span').first().textContent().catch(() => 'N/A');
        const totalCount = await page.locator('text=Total Tests').locator('..').locator('span').first().textContent().catch(() => 'N/A');

        console.log('📊 Test Statistics:');
        console.log('   Total Tests:', totalCount);
        console.log('   Passed:', passedCount);
        console.log('   Failed:', failedCount);

      }
    }
  }

  console.log('🔍 Memory test verification completed');
});