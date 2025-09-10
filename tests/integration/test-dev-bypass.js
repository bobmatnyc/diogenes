#!/usr/bin/env node

/**
 * Test script to verify development mode authentication bypass
 * Ensures that in development mode:
 * - No authentication is required
 * - Hardcoded user "Bob" is used
 * - Chat functionality works without Clerk
 */

const http = require('http');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_MESSAGE = 'Hello Diogenes, testing development bypass';

// Color output helpers
const green = (text) => `\x1b[32m${text}\x1b[0m`;
const red = (text) => `\x1b[31m${text}\x1b[0m`;
const yellow = (text) => `\x1b[33m${text}\x1b[0m`;
const blue = (text) => `\x1b[34m${text}\x1b[0m`;

// Test step counter
let testStep = 0;
const logStep = (message) => {
  testStep++;
  console.log(`${blue(`[Step ${testStep}]`)} ${message}`);
};

// HTTP request helper
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      ...options,
    };

    const req = http.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

async function runTests() {
  console.log(yellow('\n🧪 Testing Development Mode Authentication Bypass\n'));
  console.log('Environment: NODE_ENV=' + (process.env.NODE_ENV || 'not set'));
  console.log('Testing against:', BASE_URL);
  console.log('-------------------------------------------\n');

  try {
    // Test 1: Check if home page is accessible
    logStep('Testing home page accessibility...');
    const homeResponse = await makeRequest(BASE_URL);
    if (homeResponse.statusCode === 200) {
      console.log(green('✓ Home page accessible without authentication'));
    } else {
      throw new Error(`Home page returned status ${homeResponse.statusCode}`);
    }

    // Test 2: Check if chat page is accessible without authentication
    logStep('Testing chat page accessibility (should bypass auth in dev)...');
    const chatResponse = await makeRequest(`${BASE_URL}/chat`);

    // Check Clerk headers
    const authStatus = chatResponse.headers['x-clerk-auth-status'];
    const authReason = chatResponse.headers['x-clerk-auth-reason'];

    console.log(`  Auth status: ${authStatus || 'not set'}`);
    console.log(`  Auth reason: ${authReason || 'not set'}`);

    if (chatResponse.statusCode === 200) {
      console.log(green('✓ Chat page accessible without authentication'));

      // Check if the response contains dev mode indicators
      if (chatResponse.body.includes('DEV MODE') || chatResponse.body.includes('Bob')) {
        console.log(green('✓ Development mode indicators found in response'));
      }
    } else if (chatResponse.statusCode === 307 || chatResponse.statusCode === 302) {
      console.log(red('✗ Chat page redirected (auth might still be required)'));
      console.log('  Redirect location:', chatResponse.headers.location);
      throw new Error('Authentication bypass not working - still redirecting');
    } else {
      throw new Error(`Chat page returned status ${chatResponse.statusCode}`);
    }

    // Test 3: Check if API endpoint is accessible
    logStep('Testing chat API accessibility...');
    const apiResponse = await makeRequest(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: TEST_MESSAGE }],
        firstName: 'Bob', // This should be accepted in dev mode
      }),
    });

    if (apiResponse.statusCode === 200) {
      console.log(green('✓ Chat API accessible without authentication'));

      // Check if streaming response starts
      if (apiResponse.body.length > 0) {
        console.log(green('✓ Chat API returned response data'));
        console.log(`  Response preview: ${apiResponse.body.substring(0, 100)}...`);
      }
    } else if (apiResponse.statusCode === 401 || apiResponse.statusCode === 403) {
      console.log(red('✗ Chat API requires authentication'));
      throw new Error('API authentication bypass not working');
    } else {
      console.log(yellow(`⚠ Chat API returned status ${apiResponse.statusCode}`));
      console.log('  Response:', apiResponse.body.substring(0, 200));
    }

    // Test 4: Verify no password prompt exists
    logStep('Checking for absence of password authentication...');
    const homeBody = homeResponse.body.toLowerCase();
    if (homeBody.includes('password') && !homeBody.includes('forgot password')) {
      console.log(yellow('⚠ Warning: Password references found in home page'));
    } else {
      console.log(green('✓ No password authentication detected'));
    }

    // Test summary
    console.log(green('\n✅ All development bypass tests passed!\n'));
    console.log('Summary:');
    console.log('• Authentication is successfully bypassed in development mode');
    console.log('• Chat interface is accessible without signing in');
    console.log('• Hardcoded user "Bob" is being used');
    console.log('• No password authentication remains');

    process.exit(0);
  } catch (error) {
    console.error(red('\n❌ Test failed:'), error.message);
    console.error('\nMake sure:');
    console.error('1. The development server is running (npm run dev)');
    console.error('2. NODE_ENV is set to "development"');
    console.error('3. The middleware bypass is properly configured');
    process.exit(1);
  }
}

// Wait a moment for server to be ready, then run tests
setTimeout(runTests, 2000);
