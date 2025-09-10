#!/usr/bin/env node

/**
 * Test script to verify OpenRouter API key configuration
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Read .env.local file manually
const envPath = path.join(process.cwd(), '.env.local');
let API_KEY = process.env.OPENROUTER_API_KEY;

if (!API_KEY && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/OPENROUTER_API_KEY=(.+)/);
  if (match) {
    API_KEY = match[1].trim();
  }
}

if (!API_KEY) {
  console.error('❌ OPENROUTER_API_KEY not found in .env.local');
  process.exit(1);
}

console.log('🔍 Testing OpenRouter API key...');
console.log(`📝 Key format: ${API_KEY.substring(0, 10)}...${API_KEY.substring(API_KEY.length - 4)}`);

// Test API key with a simple request
const testData = JSON.stringify({
  model: 'anthropic/claude-3.5-sonnet-20241022',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Say "API key is working!" and nothing else.' }
  ],
  max_tokens: 10,
  stream: false
});

const options = {
  hostname: 'openrouter.ai',
  port: 443,
  path: '/api/v1/chat/completions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
    'HTTP-Referer': 'http://localhost:3000',
    'X-Title': 'Diogenes Test'
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      
      if (res.statusCode === 200) {
        console.log('✅ API key is valid!');
        console.log('📝 Response:', response.choices?.[0]?.message?.content || 'No content');
        console.log('\n✨ You can now use the chat interface at http://localhost:3000');
      } else if (res.statusCode === 401) {
        console.error('❌ API key is invalid or expired');
        console.error('📝 Error:', response.error?.message || 'Authentication failed');
        console.error('\n💡 Please check your API key at https://openrouter.ai/keys');
      } else if (res.statusCode === 402) {
        console.error('❌ Insufficient credits');
        console.error('📝 Error:', response.error?.message || 'No credits available');
        console.error('\n💡 Please add credits at https://openrouter.ai/credits');
      } else if (res.statusCode === 429) {
        console.error('⏱️ Rate limit exceeded');
        console.error('📝 Error:', response.error?.message || 'Too many requests');
        console.error('\n💡 Please wait a moment and try again');
      } else {
        console.error(`❌ Unexpected status: ${res.statusCode}`);
        console.error('📝 Response:', response);
      }
    } catch (e) {
      console.error('❌ Failed to parse response:', e.message);
      console.error('📝 Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Network error:', e.message);
  console.error('\n💡 Please check your internet connection');
});

req.write(testData);
req.end();