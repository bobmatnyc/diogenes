import { NextRequest } from 'next/server';
import { createTextStreamResponse } from 'ai';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  // Create a simple text stream
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      // Send raw text chunks
      controller.enqueue(encoder.encode('Hello'));
      await new Promise(resolve => setTimeout(resolve, 100));
      
      controller.enqueue(encoder.encode(' World'));
      await new Promise(resolve => setTimeout(resolve, 100));
      
      controller.enqueue(encoder.encode('!'));
      controller.close();
    },
  });

  // Use createTextStreamResponse to see what format it produces
  // Convert Uint8Array stream to text stream
  const textStream = stream.pipeThrough(new TextDecoderStream());
  
  return createTextStreamResponse({
    textStream
  });
}