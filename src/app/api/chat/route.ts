import { NextRequest } from 'next/server';
import { StreamingTextResponse } from 'ai';
import { getOpenRouterClient, DEFAULT_MODEL } from '@/lib/openrouter';
import { DIOGENES_SYSTEM_PROMPT } from '@/lib/prompts/core-principles';

export const runtime = 'nodejs';

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

    // Get fresh client instance to ensure latest env vars
    const openrouter = getOpenRouterClient();
    
    const response = await openrouter.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: allMessages,
      temperature: 0.8,
      max_tokens: 1000,
      stream: true,
    });

    // Create a transform stream that converts OpenAI format to plain text
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              // Send plain text - StreamingTextResponse will handle the formatting
              controller.enqueue(encoder.encode(content));
            }
          }
        } catch (error) {
          console.error('Stream processing error:', error);
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    // Use StreamingTextResponse which handles the SSE formatting for useChat
    return new StreamingTextResponse(stream);
  } catch (error: any) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}