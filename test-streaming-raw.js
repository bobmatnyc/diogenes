#!/usr/bin/env node

/**
 * Raw streaming test to see exactly what bytes are being received
 */

const PASSWORD = 'diogenes2024';
const PORT = 3001;

async function testRawStreaming() {
  console.log('Starting raw streaming test...\n');
  
  try {
    const testMessage = "Tell me about wisdom.";
    console.log(`Sending message: "${testMessage}"\n`);
    
    const response = await fetch(`http://localhost:${PORT}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: testMessage }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${error}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let rawData = '';
    let chunkNumber = 0;
    
    console.log('=== RAW STREAM DATA ===\n');
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        console.log('\n=== STREAM COMPLETE ===');
        break;
      }
      
      chunkNumber++;
      const chunk = decoder.decode(value, { stream: true });
      rawData += chunk;
      
      // Show raw bytes
      console.log(`\nChunk #${chunkNumber}:`);
      console.log('Raw bytes:', value.length);
      console.log('Decoded text:');
      console.log(JSON.stringify(chunk));
      console.log('Actual content:');
      console.log(chunk);
      console.log('-'.repeat(40));
    }
    
    console.log('\n=== FULL RAW DATA ===');
    console.log(rawData);
    console.log('\n=== DATA ANALYSIS ===');
    console.log('Total raw data length:', rawData.length);
    console.log('Total chunks:', chunkNumber);
    
    // Check for common issues
    const hasDataPrefix = rawData.includes('data: ');
    const hasDoneSignal = rawData.includes('[DONE]');
    const hasJsonContent = rawData.includes('"content"');
    
    console.log('\nStream format checks:');
    console.log('- Has "data: " prefix:', hasDataPrefix);
    console.log('- Has [DONE] signal:', hasDoneSignal);
    console.log('- Has JSON with "content":', hasJsonContent);
    
    if (!hasDataPrefix) {
      console.error('\n❌ Stream is not in SSE format!');
    } else if (!hasJsonContent && !hasDoneSignal) {
      console.error('\n❌ Stream has SSE format but no content!');
    }
    
  } catch (error) {
    console.error('Error during test:', error);
  }
}

console.log('='.repeat(60));
console.log('RAW STREAMING DEBUG TEST');
console.log('='.repeat(60));
console.log(`Testing against: http://localhost:${PORT}/api/chat`);
console.log('='.repeat(60) + '\n');

testRawStreaming().catch(console.error);