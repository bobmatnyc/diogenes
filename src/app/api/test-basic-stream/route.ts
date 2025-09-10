import { NextRequest } from 'next/server';
import { getOpenRouterClient, DEFAULT_MODEL } from '@/lib/openrouter';
import { DIOGENES_SYSTEM_PROMPT } from '@/lib/prompts/core-principles';
import { createStreamingResponse, openRouterToStream } from '@/lib/ai/streaming-fix';

// Explicitly set edge runtime for Vercel streaming
export const runtime = 'edge';

export async function GET(req: NextRequest) {
  console.log('[Test] Basic streaming test endpoint');
  
  try {
    // Validate API key is present
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey || apiKey === '') {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Simple test messages
    const messages = [
      { role: 'system' as const, content: DIOGENES_SYSTEM_PROMPT },
      { role: 'user' as const, content: 'Say hello in exactly 5 words.' }
    ];

    // Get OpenRouter client
    const openrouter = getOpenRouterClient();
    
    // Create the streaming response
    console.log('[Test] Requesting streaming completion...');
    const response = await openrouter.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: messages,
      temperature: 0.9,
      max_tokens: 50,
      stream: true,
    });

    // Convert to stream - NO MIDDLEWARE
    console.log('[Test] Creating basic stream...');
    const stream = openRouterToStream(response);
    
    console.log('[Test] Returning createStreamingResponse');
    // Use the createStreamingResponse function which handles the type conversion properly
    return createStreamingResponse(stream);
    
  } catch (error: any) {
    console.error('[Test] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}