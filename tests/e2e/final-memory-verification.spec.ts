import { test, expect } from '@playwright/test';

test('Final Memory Test Verification', async ({ page }) => {
  // Navigate to test dashboard
  await page.goto('/test');
  await page.waitForLoadState('networkidle');

  // Click Run All Tests
  const runButton = page.locator('text=Run All Tests').first();
  await runButton.click();

  // Wait specifically for Memory System tests to complete
  await page.waitForTimeout(10000);

  // Expand Memory System section if not expanded
  const memorySystemHeader = page.locator('h2:has-text("Memory System")');
  const memorySection = memorySystemHeader.locator('..');

  // Take screenshot of final state
  await page.screenshot({
    path: 'final-memory-verification.png',
    fullPage: true
  });

  // Look for the Create Test Entity result
  const createTestResult = page.locator('text=Create Test Entity').locator('..');
  const createTestPassed = await createTestResult.locator('[data-testid="test-status"][data-status="passed"]').isVisible().catch(() => false);

  // Look for the Store Test Memory result
  const storeTestResult = page.locator('text=Store Test Memory').locator('..');
  const storeTestPassed = await storeTestResult.locator('[data-testid="test-status"][data-status="passed"]').isVisible().catch(() => false);

  console.log('Create Test Entity Passed:', createTestPassed);
  console.log('Store Test Memory Passed:', storeTestPassed);

  // Log the current test statistics
  const statsHeader = page.locator('.text-center').first();
  const stats = await statsHeader.textContent();
  console.log('Test Statistics:', stats);
});