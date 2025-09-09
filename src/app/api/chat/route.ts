import { NextRequest } from 'next/server';
import { getOpenRouterClient, DEFAULT_MODEL } from '@/lib/openrouter';
import { DIOGENES_SYSTEM_PROMPT } from '@/lib/prompts/core-principles';
import { OpenAIStream, StreamingTextResponse } from 'ai';
import { orchestrateHybridResponse, DelegationConfig } from '@/lib/agents/delegation-handler';

export const runtime = 'nodejs';

// Enhanced system prompt that includes delegation awareness
const ENHANCED_SYSTEM_PROMPT = `${DIOGENES_SYSTEM_PROMPT}

CONTEXTUAL AWARENESS:
When provided with web search context, integrate it seamlessly into your philosophical discourse. Use current information as a foundation for deeper inquiry, always maintaining your contrarian perspective and questioning the nature of "facts" themselves.

Remember:
- Facts are starting points for philosophical exploration, not endpoints
- Question the sources, their motivations, and the nature of "truth" in information
- Current events are merely the latest iteration of eternal human patterns
- Use specific data to illustrate timeless philosophical principles`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response('Invalid request body', { status: 400 });
    }

    // Extract configuration from environment or request
    const delegationConfig: DelegationConfig = {
      enableMockMode: process.env.ENABLE_MOCK_SEARCH === 'true',
      verboseLogging: process.env.NODE_ENV === 'development',
      searchTimeout: 10000,
      maxSearchAttempts: 2,
    };

    // Filter out system messages from user input
    const userMessages = messages.filter((m: any) => m.role !== 'system');
    
    // Use the hybrid delegation pattern
    const { enhancedMessages, searchPerformed, searchContext } = 
      await orchestrateHybridResponse(userMessages, delegationConfig);
    
    // Log delegation decision in development
    if (delegationConfig.verboseLogging && searchPerformed) {
      console.log('Web search delegation performed');
      if (searchContext) {
        console.log('Search context length:', searchContext.length);
      }
    }

    // Ensure Diogenes system prompt is always first
    const systemMessage = {
      role: 'system' as const,
      content: ENHANCED_SYSTEM_PROMPT
    };

    const allMessages = [systemMessage, ...enhancedMessages];

    // Get fresh client instance to ensure latest env vars
    const openrouter = getOpenRouterClient();
    
    // Create the streaming response with Claude 3.5 Sonnet
    const response = await openrouter.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: allMessages,
      temperature: 0.9,
      max_tokens: 1000,
      stream: true,
    });

    // Add custom headers to indicate if search was performed
    const headers = new Headers();
    if (searchPerformed) {
      headers.set('X-Search-Delegated', 'true');
    }

    // Convert the response to a stream using Vercel AI SDK's OpenAIStream
    const stream = OpenAIStream(response);
    
    // Return a StreamingTextResponse which handles the proper formatting
    return new StreamingTextResponse(stream, { headers });
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