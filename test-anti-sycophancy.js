// Test script to check anti-sycophancy middleware output
const { Readable } = require('stream');

// Mock the anti-sycophancy transformation
function createMockTransformStream() {
  let buffer = '';
  const sentenceEndRegex = /[.!?]\s/;

  return new TransformStream({
    transform: (chunk, controller) => {
      // Add chunk to buffer
      buffer += chunk;

      // Process complete sentences
      let lastSentenceEnd = -1;
      let match;
      const regex = new RegExp(sentenceEndRegex, 'g');
      
      while ((match = regex.exec(buffer)) !== null) {
        lastSentenceEnd = match.index + match[0].length;
      }

      if (lastSentenceEnd > -1) {
        // Process complete sentences
        const completeText = buffer.substring(0, lastSentenceEnd);
        const remaining = buffer.substring(lastSentenceEnd);

        // Log what we're processing
        console.log('Processing:', JSON.stringify(completeText));
        
        // Check if the text is empty or contains certain patterns
        if (completeText.trim() === '') {
          console.log('WARNING: Empty text being enqueued!');
        }

        controller.enqueue(completeText);

        // Keep the remaining text in buffer
        buffer = remaining;
      }

      // If buffer is getting too large, process it anyway
      if (buffer.length > 500) {
        console.log('Large buffer processing:', JSON.stringify(buffer));
        controller.enqueue(buffer);
        buffer = '';
      }
    },

    flush: (controller) => {
      // Process any remaining text in buffer
      if (buffer.length > 0) {
        console.log('Flush processing:', JSON.stringify(buffer));
        controller.enqueue(buffer);
      }
    },
  });
}

// Test with sample streaming data
async function testStreaming() {
  console.log('Testing anti-sycophancy stream transformation...\n');

  // Create a mock stream with typical OpenAI response chunks
  const chunks = [
    'Hello',
    ' there',
    '!',
    ' How',
    ' can',
    ' I',
    ' help',
    ' you',
    ' today',
    '?',
    ' I\'m',
    ' here',
    ' to',
    ' assist',
    '.',
  ];

  // Create a readable stream from chunks
  const readable = new ReadableStream({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk);
        // Simulate streaming delay
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      controller.close();
    },
  });

  // Transform through mock anti-sycophancy
  const transformed = readable.pipeThrough(createMockTransformStream());
  const reader = transformed.getReader();

  console.log('\nOutput chunks:');
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      console.log('Received:', JSON.stringify(value));
    }
  } catch (error) {
    console.error('Error reading stream:', error);
  }

  console.log('\nTest complete.');
}

// Run the test
testStreaming().catch(console.error);