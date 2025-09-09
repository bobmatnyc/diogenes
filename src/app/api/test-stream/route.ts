import { NextRequest } from 'next/server';

// Explicitly set edge runtime
export const runtime = 'edge';

export async function GET(req: NextRequest) {
  console.log('[Test Stream] Edge runtime test endpoint called');
  
  // Create a simple streaming response to test edge runtime
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const messages = [
        'Testing ',
        'edge ',
        'runtime ',
        'streaming ',
        'on ',
        'Vercel...',
      ];
      
      for (const msg of messages) {
        controller.enqueue(encoder.encode(`data: ${msg}\n\n`));
        // Small delay between chunks
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}

export async function POST(req: NextRequest) {
  console.log('[Test Stream] Testing OpenRouter connection');
  
  // Test basic API key presence
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  return new Response(
    JSON.stringify({
      edge_runtime: true,
      api_key_present: !!apiKey,
      api_key_length: apiKey?.length || 0,
      vercel_env: process.env.VERCEL_ENV || 'local',
      node_env: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}