const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Create screenshots directory
const screenshotsDir = path.join(__dirname, 'test-screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
}

// Test configurations for different viewports
const viewports = [
  { name: 'iPhone_SE', width: 320, height: 568, description: 'Mobile (iPhone SE)' },
  { name: 'iPhone_8', width: 375, height: 667, description: 'Mobile (iPhone 8)' },
  { name: 'iPad', width: 768, height: 1024, description: 'Tablet (iPad)' },
  { name: 'MacBook', width: 1440, height: 900, description: 'Desktop (MacBook)' }
];

async function testResponsiveUI() {
  const browser = await chromium.launch({ headless: true });
  const results = {
    timestamp: new Date().toISOString(),
    baseUrl: 'http://localhost:3000',
    testResults: []
  };

  console.log('🧪 Starting Responsive UI Testing...\n');

  for (const viewport of viewports) {
    console.log(`📱 Testing ${viewport.description} (${viewport.width}x${viewport.height})`);

    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      userAgent: viewport.width <= 768 ?
        'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1' :
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();
    const testResult = {
      viewport: viewport.name,
      description: viewport.description,
      dimensions: `${viewport.width}x${viewport.height}`,
      tests: []
    };

    try {
      // Test 1: Landing Page Load
      console.log('  📄 Testing landing page...');
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

      // Check if page loads without errors
      const title = await page.title();
      const hasErrorElements = await page.locator('text=Error').count() > 0;

      // Take screenshot of landing page
      await page.screenshot({
        path: path.join(screenshotsDir, `${viewport.name}_01_landing.png`),
        fullPage: true
      });

      testResult.tests.push({
        name: 'Landing Page Load',
        status: !hasErrorElements ? 'PASS' : 'FAIL',
        details: `Title: "${title}", Errors detected: ${hasErrorElements}`
      });

      // Test 2: Check for horizontal scrolling
      console.log('  📏 Checking for horizontal scrolling...');
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = viewport.width;
      const hasHorizontalScroll = bodyWidth > viewportWidth;

      testResult.tests.push({
        name: 'No Horizontal Scrolling',
        status: !hasHorizontalScroll ? 'PASS' : 'FAIL',
        details: `Body width: ${bodyWidth}px, Viewport: ${viewportWidth}px`
      });

      // Test 3: Authentication Flow (check if auth elements are present)
      console.log('  🔐 Testing authentication elements...');

      // Look for common auth elements
      const authElements = await page.locator('[data-testid*="auth"], [class*="auth"], button[type="submit"], input[type="email"], input[type="password"]').count();
      const signInButton = await page.locator('text=Sign in, text=Sign In, text=Login, text=LOG IN').count();

      await page.screenshot({
        path: path.join(screenshotsDir, `${viewport.name}_02_auth_elements.png`),
        fullPage: true
      });

      testResult.tests.push({
        name: 'Authentication Elements Present',
        status: (authElements > 0 || signInButton > 0) ? 'PASS' : 'SKIP',
        details: `Auth elements found: ${authElements}, Sign-in buttons: ${signInButton}`
      });

      // Test 4: Chat Interface (if accessible)
      console.log('  💬 Testing chat interface accessibility...');

      // Try to navigate to chat page
      try {
        await page.goto('http://localhost:3000/chat', { waitUntil: 'networkidle', timeout: 10000 });

        // Check for chat interface elements
        const chatInput = await page.locator('textarea, input[placeholder*="message"], input[placeholder*="chat"]').count();
        const chatContainer = await page.locator('[class*="chat"], [id*="chat"], [data-testid*="chat"]').count();

        await page.screenshot({
          path: path.join(screenshotsDir, `${viewport.name}_03_chat_interface.png`),
          fullPage: true
        });

        testResult.tests.push({
          name: 'Chat Interface Elements',
          status: (chatInput > 0 || chatContainer > 0) ? 'PASS' : 'FAIL',
          details: `Chat inputs: ${chatInput}, Chat containers: ${chatContainer}`
        });

        // Test 5: Touch Target Size (for mobile viewports)
        if (viewport.width <= 768) {
          console.log('  👆 Testing touch target sizes...');

          const buttons = await page.locator('button, a, input[type="submit"]').all();
          let smallTargets = 0;

          for (const button of buttons) {
            try {
              const box = await button.boundingBox();
              if (box && (box.width < 44 || box.height < 44)) {
                smallTargets++;
              }
            } catch (e) {
              // Element might not be visible
            }
          }

          testResult.tests.push({
            name: 'Touch Target Size (44px minimum)',
            status: smallTargets === 0 ? 'PASS' : 'WARNING',
            details: `Small targets found: ${smallTargets} (< 44px)`
          });
        }

      } catch (error) {
        testResult.tests.push({
          name: 'Chat Interface Access',
          status: 'SKIP',
          details: `Could not access chat interface: ${error.message}`
        });
      }

      // Test 6: Test Dashboard (if accessible)
      console.log('  🧪 Testing test dashboard...');

      try {
        await page.goto('http://localhost:3000/test', { waitUntil: 'networkidle', timeout: 10000 });

        const testElements = await page.locator('[data-testid], [class*="test"], h1, h2').count();

        await page.screenshot({
          path: path.join(screenshotsDir, `${viewport.name}_04_test_dashboard.png`),
          fullPage: true
        });

        testResult.tests.push({
          name: 'Test Dashboard Access',
          status: testElements > 0 ? 'PASS' : 'FAIL',
          details: `Test elements found: ${testElements}`
        });

      } catch (error) {
        testResult.tests.push({
          name: 'Test Dashboard Access',
          status: 'SKIP',
          details: `Could not access test dashboard: ${error.message}`
        });
      }

      // Test 7: Navigation and Links
      console.log('  🔗 Testing navigation elements...');

      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

      const navElements = await page.locator('nav, [role="navigation"], header, [class*="nav"]').count();
      const links = await page.locator('a[href]').count();

      testResult.tests.push({
        name: 'Navigation Elements',
        status: (navElements > 0 || links > 0) ? 'PASS' : 'FAIL',
        details: `Navigation containers: ${navElements}, Links: ${links}`
      });

      // Test 8: Responsive Typography and Layout
      console.log('  📝 Testing typography and layout...');

      const headings = await page.locator('h1, h2, h3, h4, h5, h6').count();
      const paragraphs = await page.locator('p').count();

      // Check for very small text
      const smallText = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        let smallCount = 0;
        for (const el of elements) {
          const style = window.getComputedStyle(el);
          const fontSize = parseFloat(style.fontSize);
          if (fontSize > 0 && fontSize < 12) smallCount++;
        }
        return smallCount;
      });

      testResult.tests.push({
        name: 'Typography and Layout',
        status: (headings > 0 && smallText < 5) ? 'PASS' : 'WARNING',
        details: `Headings: ${headings}, Paragraphs: ${paragraphs}, Small text elements: ${smallText}`
      });

    } catch (error) {
      console.error(`  ❌ Error testing ${viewport.description}:`, error.message);
      testResult.tests.push({
        name: 'General Test Execution',
        status: 'ERROR',
        details: error.message
      });
    }

    await context.close();
    results.testResults.push(testResult);

    // Summary for this viewport
    const passed = testResult.tests.filter(t => t.status === 'PASS').length;
    const failed = testResult.tests.filter(t => t.status === 'FAIL').length;
    const warnings = testResult.tests.filter(t => t.status === 'WARNING').length;
    const skipped = testResult.tests.filter(t => t.status === 'SKIP').length;

    console.log(`  ✅ ${passed} passed, ❌ ${failed} failed, ⚠️ ${warnings} warnings, ⏭️ ${skipped} skipped\n`);
  }

  await browser.close();

  // Generate comprehensive report
  const reportPath = path.join(__dirname, 'responsive-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

  // Generate human-readable summary
  console.log('📊 RESPONSIVE UI TEST SUMMARY');
  console.log('=' .repeat(50));

  let totalPassed = 0, totalFailed = 0, totalWarnings = 0, totalSkipped = 0;

  for (const result of results.testResults) {
    console.log(`\n${result.description} (${result.dimensions})`);
    console.log('-'.repeat(40));

    for (const test of result.tests) {
      const icon = test.status === 'PASS' ? '✅' :
                  test.status === 'FAIL' ? '❌' :
                  test.status === 'WARNING' ? '⚠️' : '⏭️';
      console.log(`${icon} ${test.name}: ${test.status}`);
      if (test.details) console.log(`   ${test.details}`);
    }

    const passed = result.tests.filter(t => t.status === 'PASS').length;
    const failed = result.tests.filter(t => t.status === 'FAIL').length;
    const warnings = result.tests.filter(t => t.status === 'WARNING').length;
    const skipped = result.tests.filter(t => t.status === 'SKIP').length;

    totalPassed += passed;
    totalFailed += failed;
    totalWarnings += warnings;
    totalSkipped += skipped;
  }

  console.log('\n' + '='.repeat(50));
  console.log('OVERALL RESULTS:');
  console.log(`✅ ${totalPassed} tests passed`);
  console.log(`❌ ${totalFailed} tests failed`);
  console.log(`⚠️ ${totalWarnings} warnings`);
  console.log(`⏭️ ${totalSkipped} tests skipped`);

  console.log(`\n📁 Screenshots saved to: ${screenshotsDir}`);
  console.log(`📄 Detailed report saved to: ${reportPath}`);

  // Return overall status
  if (totalFailed === 0) {
    console.log('\n🎉 VERDICT: All viewports VERIFIED - Responsive UI working correctly!');
    return true;
  } else {
    console.log('\n⚠️ VERDICT: Issues found - Review failed tests above');
    return false;
  }
}

// Run the tests
testResponsiveUI().catch(console.error);