/**
 * Streaming fix for Vercel AI SDK v5
 * Handles OpenRouter responses and converts them to proper SSE format
 */

import { createTextStreamResponse } from 'ai';

/**
 * Convert OpenRouter streaming response to a ReadableStream
 * This replaces the deprecated OpenAIStream function from AI SDK v4
 */
export function openRouterToStream(response: any): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream({
    async start(controller) {
      try {
        // Handle the async iterator from OpenRouter
        for await (const chunk of response) {
          // OpenRouter chunks have a choices array
          if (chunk.choices && chunk.choices[0]?.delta?.content) {
            const content = chunk.choices[0].delta.content;
            controller.enqueue(encoder.encode(content));
          }
        }
      } catch (error) {
        console.error('[Streaming] Error processing chunks:', error);
        controller.error(error);
      } finally {
        controller.close();
      }
    },
  });
}

/**
 * Create a properly formatted SSE response for the client
 * The createTextStreamResponse handles the SSE formatting automatically
 */
export function createStreamingResponse(
  stream: ReadableStream<Uint8Array>,
  headers?: HeadersInit
): Response {
  // Return a raw Response with proper streaming headers instead of using createTextStreamResponse
  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      ...(headers as Record<string, string>)
    }
  });
}

/**
 * Debug wrapper to log stream chunks
 */
export function debugStream(stream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  
  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      const text = decoder.decode(chunk, { stream: true });
      console.log('[Stream Debug] Chunk:', JSON.stringify(text));
      controller.enqueue(chunk);
    },
  }).readable.pipeThrough(new TransformStream({
    start(controller) {
      // Pass through
    },
    transform(chunk, controller) {
      controller.enqueue(chunk);
    },
    flush(controller) {
      console.log('[Stream Debug] Stream complete');
    },
  }));
}