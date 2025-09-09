import { NextRequest } from 'next/server';
import { StreamingTextResponse } from 'ai';
import { getOpenRouterClient, DEFAULT_MODEL } from '@/lib/openrouter';
import { DIOGENES_SYSTEM_PROMPT } from '@/lib/prompts/core-principles';
import { estimateMessagesTokens, calculateCost, estimateTokens } from '@/lib/tokens';
import { TokenUsage } from '@/types/chat';

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

    // Estimate prompt tokens before making the request
    const estimatedPromptTokens = estimateMessagesTokens(allMessages);

    // Get fresh client instance to ensure latest env vars
    const openrouter = getOpenRouterClient();
    const response = await openrouter.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: allMessages,
      temperature: 0.8,
      max_tokens: 1000,
      stream: true,
    });

    // Convert the OpenAI SDK stream to a ReadableStream for the StreamingTextResponse
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(new TextEncoder().encode(content));
            }
          }
        } catch (error) {
          console.error('Stream processing error:', error);
        } finally {
          controller.close();
        }
      },
    });
    
    // Return a StreamingTextResponse
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