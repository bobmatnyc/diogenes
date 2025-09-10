import type { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  // Create a simple SSE stream to test the format
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Send SSE formatted data
      controller.enqueue(encoder.encode('data: {"message":"Hello"}\n\n'));
      await new Promise((resolve) => setTimeout(resolve, 100));

      controller.enqueue(encoder.encode('data: {"message":" World"}\n\n'));
      await new Promise((resolve) => setTimeout(resolve, 100));

      controller.enqueue(encoder.encode('data: {"message":"!"}\n\n'));
      await new Promise((resolve) => setTimeout(resolve, 100));

      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
