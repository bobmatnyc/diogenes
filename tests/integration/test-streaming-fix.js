#!/usr/bin/env node

/**
 * Test script to verify streaming messages don't disappear
 * This tests the Uint8Array fix in the anti-sycophancy middleware
 */

const testStreaming = async () => {
  console.log('🧪 Testing streaming with anti-sycophancy middleware...\n');

  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'Tell me about the nature of truth',
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let chunkCount = 0;

    console.log('📥 Receiving chunks:');
    console.log('-'.repeat(50));

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Decode the Uint8Array chunk
      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;
      chunkCount++;

      // Show progress
      process.stdout.write(`Chunk ${chunkCount}: ${value.length} bytes received\r`);
    }

    console.log('\n' + '-'.repeat(50));
    console.log('\n✅ Streaming completed successfully!');
    console.log('📊 Statistics:');
    console.log(`   - Total chunks: ${chunkCount}`);
    console.log(`   - Total size: ${fullText.length} characters`);
    console.log(`   - Response persisted: ${fullText.length > 0 ? 'YES ✓' : 'NO ✗'}`);

    // Check for common streaming issues
    if (fullText.length === 0) {
      console.error('\n❌ ERROR: Response is empty - messages disappeared!');
      console.error('   This indicates the Uint8Array issue is NOT fixed.');
      return false;
    }

    // Parse SSE format to extract actual content
    const lines = fullText.split('\n');
    let messageContent = '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.substring(6);
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          // Try different formats (OpenAI format vs Vercel AI SDK format)
          if (parsed.choices?.[0]?.delta?.content) {
            messageContent += parsed.choices[0].delta.content;
          } else if (parsed.content) {
            messageContent += parsed.content;
          } else if (typeof parsed === 'string') {
            messageContent += parsed;
          }
        } catch (e) {
          // Try as plain text if not JSON
          if (data && data !== '[DONE]') {
            messageContent += data;
          }
        }
      }
    }

    console.log('\n📝 Extracted message (first 200 chars):');
    console.log('   "' + messageContent.substring(0, 200) + '..."');

    // Verify anti-sycophancy is working
    const hasQuestions = messageContent.includes('?');
    const hasContrarian = /but|however|actually|consider|what if/i.test(messageContent);

    console.log('\n🎭 Anti-Sycophancy Check:');
    console.log(`   - Contains questions: ${hasQuestions ? 'YES ✓' : 'NO ✗'}`);
    console.log(`   - Contrarian markers: ${hasContrarian ? 'YES ✓' : 'NO ✗'}`);

    console.log('\n✨ TEST PASSED: Streaming works correctly!');
    return true;
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('\nPossible causes:');
    console.error('1. Server not running (run: npm run dev)');
    console.error('2. Wrong port (should be 3000)');
    console.error('3. API key not configured');
    console.error('4. Middleware type mismatch');
    return false;
  }
};

// Run the test
console.log('🚀 Diogenes Streaming Fix Test\n');
console.log('Prerequisites:');
console.log('  ✓ Server running at http://localhost:3000');
console.log('  ✓ OPENROUTER_API_KEY configured');
console.log('  ✓ Anti-sycophancy middleware enabled\n');

testStreaming().then((success) => {
  process.exit(success ? 0 : 1);
});
