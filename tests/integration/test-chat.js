// Test script to verify chat streaming functionality
const readline = require('readline');

const API_URL = 'http://localhost:3000/api/chat';

async function testChat(message) {
  console.log('\n🔍 Testing chat with message:', message);
  console.log('─'.repeat(50));
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: message
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log('✅ Response received, status:', response.status);
    console.log('📋 Headers:', Object.fromEntries(response.headers.entries()));
    console.log('\n📝 Streaming response:');
    console.log('─'.repeat(30));
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        console.log('\n─'.repeat(30));
        console.log('✅ Stream complete');
        break;
      }
      
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      
      // Process each line in the buffer
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep the last incomplete line in buffer
      
      for (const line of lines) {
        if (line.trim()) {
          // Try to parse the Vercel AI SDK format
          if (line.startsWith('0:')) {
            // Extract the content from the format 0:"content"
            const match = line.match(/^0:"(.*)"/);
            if (match) {
              const content = match[1]
                .replace(/\\"/g, '"')
                .replace(/\\n/g, '\n')
                .replace(/\\\\/g, '\\');
              process.stdout.write(content);
              fullResponse += content;
            }
          } else {
            // Log other format lines for debugging
            console.log('\n[Debug] Received line:', line);
          }
        }
      }
    }
    
    console.log('\n\n📊 Summary:');
    console.log('─'.repeat(30));
    console.log('Total response length:', fullResponse.length, 'characters');
    console.log('Response preview:', fullResponse.substring(0, 100) + '...');
    
    return fullResponse;
  } catch (error) {
    console.error('❌ Error during test:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    throw error;
  }
}

// Interactive test mode
async function interactiveTest() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('🤖 Diogenes Chat Test Interface');
  console.log('Type "exit" to quit\n');

  const askQuestion = () => {
    rl.question('You: ', async (input) => {
      if (input.toLowerCase() === 'exit') {
        console.log('Goodbye!');
        rl.close();
        process.exit(0);
      }

      try {
        await testChat(input);
      } catch (error) {
        console.error('Failed to get response:', error.message);
      }

      askQuestion(); // Ask for next input
    });
  };

  askQuestion();
}

// Run tests
async function main() {
  console.log('🚀 Starting Diogenes Chat API Test');
  console.log('═'.repeat(50));
  
  // Check if we want interactive mode
  const args = process.argv.slice(2);
  if (args.includes('--interactive') || args.includes('-i')) {
    await interactiveTest();
  } else {
    // Run a single test
    console.log('\n📌 Test 1: Simple greeting');
    await testChat('Hello, can you explain what makes you different from other AI assistants?');
    
    console.log('\n\n📌 Test 2: Testing streaming with longer response');
    await testChat('Write a brief philosophical reflection on the nature of truth.');
    
    console.log('\n\n✅ All tests completed!');
    console.log('\nRun with --interactive or -i flag for interactive mode');
  }
}

main().catch(console.error);