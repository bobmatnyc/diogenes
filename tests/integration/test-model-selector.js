/**
 * Test script for model selector functionality
 * Tests that different models can be selected and used in the chat API
 */

const testModels = [
  { id: 'anthropic/claude-3-opus-20240229', name: 'Claude 3 Opus' },
  { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo' },
  { id: 'google/gemini-1.5-pro-latest', name: 'Gemini 1.5 Pro' },
  { id: 'qwen/qwen-110b-chat', name: 'Qwen 110B Chat' },
  { id: 'xai/grok-2-latest', name: 'Grok 2' },
];

async function testModelSelection() {
  console.log('🧪 Testing Model Selector Functionality\n');
  
  const baseUrl = 'http://localhost:3001';
  const testMessage = 'What is the meaning of life?';
  
  for (const model of testModels) {
    console.log(`\n📋 Testing model: ${model.name}`);
    console.log(`   Model ID: ${model.id}`);
    
    try {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: testMessage }
          ],
          firstName: 'Test User',
          model: model.id,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Read a small portion of the stream to verify it works
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('No response body');
      }
      
      let firstChunk = '';
      const { done, value } = await reader.read();
      if (!done && value) {
        firstChunk = decoder.decode(value, { stream: true });
      }
      
      // Cancel the rest of the stream to avoid wasting API calls
      await reader.cancel();
      
      if (firstChunk) {
        console.log(`   ✅ Model ${model.name} is working`);
        console.log(`   First chunk: ${firstChunk.substring(0, 50)}...`);
      } else {
        console.log(`   ⚠️ Model ${model.name} returned empty response`);
      }
      
    } catch (error) {
      console.error(`   ❌ Error testing ${model.name}:`, error.message);
    }
  }
  
  console.log('\n✨ Model selector test complete!');
}

// Run the test
testModelSelection().catch(console.error);