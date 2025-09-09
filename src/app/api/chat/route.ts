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

    // Variables to track the response and token usage
    let fullContent = '';
    let tokenUsage: TokenUsage | null = null;

    // Convert the OpenAI SDK stream to a ReadableStream for the StreamingTextResponse
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              fullContent += content;
              controller.enqueue(new TextEncoder().encode(content));
            }
            
            // Check for usage data in the final chunk
            if (chunk.usage) {
              tokenUsage = {
                promptTokens: chunk.usage.prompt_tokens || estimatedPromptTokens,
                completionTokens: chunk.usage.completion_tokens || 0,
                totalTokens: chunk.usage.total_tokens || 0,
                cost: 0
              };
              tokenUsage.cost = calculateCost(tokenUsage.promptTokens, tokenUsage.completionTokens);
            }
          }
          
          // If we didn't get usage data from the stream, estimate it
          if (!tokenUsage) {
            const completionTokens = estimateTokens(fullContent);
            tokenUsage = {
              promptTokens: estimatedPromptTokens,
              completionTokens: completionTokens,
              totalTokens: estimatedPromptTokens + completionTokens,
              cost: calculateCost(estimatedPromptTokens, completionTokens)
            };
          }
          
          // Send token usage as a special data chunk at the end
          const tokenData = JSON.stringify({ tokenUsage });
          controller.enqueue(new TextEncoder().encode(`\n##TOKEN_USAGE##${tokenData}##END_TOKEN_USAGE##`));
          
        } catch (error) {
          console.error('Stream processing error:', error);
        } finally {
          controller.close();
        }
      },
    });
    
    // Return a StreamingTextResponse with custom headers for token usage
    const streamingResponse = new StreamingTextResponse(stream);
    
    return streamingResponse;
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