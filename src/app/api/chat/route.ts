import { NextRequest } from 'next/server';
import { getOpenRouterClient, DEFAULT_MODEL } from '@/lib/openrouter';
import { DIOGENES_SYSTEM_PROMPT } from '@/lib/prompts/core-principles';
import { OpenAIStream, StreamingTextResponse } from 'ai';
import { orchestrateHybridResponse, DelegationConfig } from '@/lib/agents/delegation-handler';

// Explicitly set edge runtime for Vercel streaming
export const runtime = 'edge';

// Edge runtime configuration
export const config = {
  runtime: 'edge',
  regions: ['iad1'], // US East by default, adjust as needed
};

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
    // Log environment info for debugging
    console.log('[Edge Runtime] Processing chat request');
    console.log('[Edge Runtime] Runtime type:', process.env.VERCEL ? 'Vercel' : 'Local');
    
    // Validate API key is present
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey || apiKey === '') {
      console.error('[Edge Runtime] OPENROUTER_API_KEY is not configured or empty');
      return new Response(
        JSON.stringify({ 
          error: 'API key not configured',
          debug: process.env.NODE_ENV === 'development' ? 'OPENROUTER_API_KEY missing' : undefined
        }),
        {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          },
        }
      );
    }
    
    console.log('[Edge Runtime] API key validated, length:', apiKey.length);

    // Parse request body with error handling
    let messages;
    try {
      const body = await req.json();
      messages = body.messages;
      console.log('[Edge Runtime] Received messages:', messages?.length || 0);
    } catch (parseError) {
      console.error('[Edge Runtime] Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (!messages || !Array.isArray(messages)) {
      console.error('[Edge Runtime] Invalid messages format');
      return new Response(
        JSON.stringify({ error: 'Messages must be an array' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Extract configuration from environment or request
    const delegationConfig: DelegationConfig = {
      enableMockMode: process.env.ENABLE_MOCK_SEARCH === 'true',
      verboseLogging: process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview',
      searchTimeout: 10000,
      maxSearchAttempts: 2,
    };
    
    console.log('[Edge Runtime] Delegation config:', {
      mockMode: delegationConfig.enableMockMode,
      verbose: delegationConfig.verboseLogging
    });

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
    console.log('[Edge Runtime] Creating OpenRouter client...');
    const openrouter = getOpenRouterClient();
    
    // Create the streaming response with Claude 3.5 Sonnet
    console.log('[Edge Runtime] Requesting streaming completion from:', DEFAULT_MODEL);
    const response = await openrouter.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: allMessages,
      temperature: 0.9,
      max_tokens: 1000,
      stream: true,
    });
    
    if (!response) {
      throw new Error('No response received from OpenRouter');
    }

    // Add custom headers to indicate if search was performed
    const headers = new Headers();
    if (searchPerformed) {
      headers.set('X-Search-Delegated', 'true');
    }

    // Convert the response to a stream using Vercel AI SDK's OpenAIStream
    console.log('[Edge Runtime] OpenRouter response received, creating stream...');
    
    try {
      // OpenAIStream expects an async iterable, which the OpenRouter response should be
      const stream = OpenAIStream(response as any);
      
      // Add proper headers for streaming
      headers.set('Content-Type', 'text/event-stream');
      headers.set('Cache-Control', 'no-cache, no-transform');
      headers.set('Connection', 'keep-alive');
      headers.set('X-Content-Type-Options', 'nosniff');
      
      console.log('[Edge Runtime] Returning streaming response');
      
      // Return a StreamingTextResponse which handles the proper formatting
      return new StreamingTextResponse(stream, { headers });
    } catch (streamError) {
      console.error('[Edge Runtime] Stream creation failed:', streamError);
      throw new Error(`Failed to create stream: ${streamError}`);
    }
  } catch (error: any) {
    console.error('[Edge Runtime] Chat API error:', error);
    console.error('[Edge Runtime] Error stack:', error.stack);
    
    // Provide detailed error information in development
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `${error.message} (${error.stack?.split('\n')[0] || 'No stack'})`
      : 'Internal server error';
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        type: error.name || 'UnknownError',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
      }
    );
  }
}