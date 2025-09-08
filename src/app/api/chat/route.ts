import { NextRequest } from 'next/server';
import { OpenAIStream, StreamingTextResponse } from 'ai';
import { openrouter, DEFAULT_MODEL } from '@/lib/openrouter';
import { DIOGENES_SYSTEM_PROMPT } from '@/lib/prompts/core-principles';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response('Invalid request body', { status: 400 });
    }

    // Ensure Diogenes system prompt is always first
    const systemMessage = {
      role: 'system' as const,
      content: DIOGENES_SYSTEM_PROMPT
    };

    // Filter out any existing system messages and prepend our system prompt
    const userMessages = messages.filter((m: any) => m.role !== 'system');
    const allMessages = [systemMessage, ...userMessages];

    const response = await openrouter.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: allMessages,
      temperature: 0.8,
      max_tokens: 1000,
      stream: true,
    });

    // Convert the response into a friendly text-stream
    const stream = OpenAIStream(response);
    
    // Return a StreamingTextResponse, which can be consumed by the client
    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process chat request' }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}