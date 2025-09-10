#!/usr/bin/env node

/**
 * Test script to verify environment isolation
 * This ensures .env files always take priority over shell environment
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Environment Isolation\n');
console.log('='.repeat(40));

// Set a fake API key in the shell environment
const FAKE_KEY = 'sk-or-v1-FAKE-SHELL-KEY-SHOULD-BE-IGNORED';
process.env.OPENROUTER_API_KEY = FAKE_KEY;

console.log('1️⃣  Shell environment contamination test:');
console.log(`   Set process.env.OPENROUTER_API_KEY = "${FAKE_KEY}"`);

// Import our environment config module
const { initializeEnv, getEnvVar, requireEnvVar } = require('./src/lib/env-config');

// Initialize environment from .env files
initializeEnv();

// Test 1: Get the API key using our new system
const envFileKey = getEnvVar('OPENROUTER_API_KEY');
console.log(`   Value from getEnvVar(): ${envFileKey ? envFileKey.substring(0, 30) + '...' : 'NOT SET'}`);

// Test 2: Check if it's different from shell env
const shellKey = process.env.OPENROUTER_API_KEY;
console.log(`   Value from process.env: ${shellKey.substring(0, 30)}...`);

// Test 3: Verify isolation
if (envFileKey && envFileKey !== shellKey) {
  console.log('   ✅ SUCCESS: .env file value is isolated from shell environment!');
} else {
  console.log('   ❌ FAIL: Shell environment is contaminating the configuration!');
}

console.log('\n2️⃣  OpenRouter client test:');

// Test the OpenRouter client
try {
  const { getOpenRouterClient } = require('./src/lib/openrouter');
  const client = getOpenRouterClient();
  
  // Check the API key used by the client
  const clientKey = client.apiKey;
  console.log(`   OpenRouter client key: ${clientKey ? clientKey.substring(0, 30) + '...' : 'NOT SET'}`);
  
  if (clientKey === envFileKey) {
    console.log('   ✅ SUCCESS: OpenRouter client uses .env file value!');
  } else if (clientKey === shellKey) {
    console.log('   ❌ FAIL: OpenRouter client uses shell environment value!');
  } else {
    console.log('   ⚠️  WARNING: OpenRouter client has unexpected key value');
  }
} catch (error) {
  console.log(`   ⚠️  Error initializing OpenRouter client: ${error.message}`);
}

console.log('\n3️⃣  Environment validation test:');

// Test the validator
try {
  const { validateEnvironment } = require('./src/lib/env-validator');
  
  // Temporarily suppress console output for cleaner test results
  const originalLog = console.log;
  const originalWarn = console.warn;
  console.log = () => {};
  console.warn = () => {};
  
  validateEnvironment();
  
  // Restore console
  console.log = originalLog;
  console.warn = originalWarn;
  
  console.log('   ✅ SUCCESS: Environment validation passed!');
} catch (error) {
  console.log(`   ❌ FAIL: Environment validation failed: ${error.message}`);
}

console.log('\n' + '='.repeat(40));
console.log('🎯 Summary:');

// Check .env.local file exists
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  console.log('   ✅ .env.local file exists');
  
  // Read and check for OPENROUTER_API_KEY
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  if (envContent.includes('OPENROUTER_API_KEY=')) {
    console.log('   ✅ OPENROUTER_API_KEY is defined in .env.local');
  } else {
    console.log('   ❌ OPENROUTER_API_KEY is NOT defined in .env.local');
  }
} else {
  console.log('   ❌ .env.local file does not exist');
}

// Final verdict
if (envFileKey && envFileKey !== FAKE_KEY) {
  console.log('\n✅ ENVIRONMENT ISOLATION IS WORKING CORRECTLY!');
  console.log('   Your .env files will always take priority over shell environment.');
} else {
  console.log('\n❌ ENVIRONMENT ISOLATION FAILED!');
  console.log('   Shell environment variables can override .env files.');
}

console.log('\n');