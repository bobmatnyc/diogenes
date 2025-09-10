import { NextRequest } from 'next/server';
import { getOpenRouterClient, DEFAULT_MODEL } from '@/lib/openrouter';
import { DIOGENES_SYSTEM_PROMPT } from '@/lib/prompts/core-principles';
import { createStreamingResponse, openRouterToStream } from '@/lib/ai/streaming-fix';
import { orchestrateHybridResponse, DelegationConfig } from '@/lib/agents/delegation-handler';
import { 
  createAntiSycophancyMiddleware,
  wrapStreamWithAntiSycophancy,
  MetricsAggregator
} from '@/lib/ai/middleware';
import { ANTI_SYCOPHANCY_ENHANCEMENT } from '@/lib/ai/anti-sycophancy';
import { getVersionHeaders } from '@/lib/version';

// Explicitly set edge runtime for Vercel streaming
export const runtime = 'edge';

// Edge runtime configuration
export const config = {
  runtime: 'edge',
  regions: ['iad1'], // US East by default, adjust as needed
};

// Initialize metrics aggregator for monitoring
const metricsAggregator = new MetricsAggregator();

// Function to create personalized system prompt
function createPersonalizedPrompt(firstName: string): string {
  return `${DIOGENES_SYSTEM_PROMPT}

${ANTI_SYCOPHANCY_ENHANCEMENT}

CONTEXTUAL AWARENESS:
When provided with web search context, integrate it seamlessly into your philosophical discourse. Use current information as a foundation for deeper inquiry, always maintaining your contrarian perspective and questioning the nature of "facts" themselves.

PERSONAL ADDRESS:
You are speaking with ${firstName}. Address them naturally in conversation when philosophically appropriate - not forced or frequent, but as you would address any thinking being worthy of challenging discourse. Sometimes use their name when making particularly pointed observations or when the philosophical moment calls for direct address.

Remember:
- Facts are starting points for philosophical exploration, not endpoints
- Question the sources, their motivations, and the nature of "truth" in information
- Current events are merely the latest iteration of eternal human patterns
- Use specific data to illustrate timeless philosophical principles`;
}

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
    let firstName;
    try {
      const body = await req.json();
      messages = body.messages;
      firstName = body.firstName || 'wanderer'; // Default to 'wanderer' if no name provided
      console.log('[Edge Runtime] Received messages:', messages?.length || 0);
      console.log('[Edge Runtime] User firstName:', firstName);
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

    // Initialize anti-sycophancy middleware with configuration
    // DISABLED: Anti-sycophancy middleware is causing messages to disappear
    // The middleware corrupts the SSE stream format
    const antiSycophancyEnabled = false; // CRITICAL: Set to false until SSE issue is fixed
    
    const antiSycophancyConfig = {
      aggressiveness: parseInt(process.env.ANTI_SYCOPHANCY_LEVEL || '7', 10),
      enableSocraticQuestions: true,
      enableEvidenceDemands: true,
      enablePerspectiveMultiplication: true,
      injectSystemPrompt: false, // We inject it manually in ENHANCED_SYSTEM_PROMPT
      logMetrics: process.env.NODE_ENV === 'development',
      metricsCallback: (metrics: any) => {
        metricsAggregator.addMetrics(metrics);
      },
    };
    
    const antiSycophancyMiddleware = createAntiSycophancyMiddleware(antiSycophancyConfig);

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

    // Ensure Diogenes system prompt is always first with personalization
    const personalizedPrompt = createPersonalizedPrompt(firstName);
    const systemMessage = {
      role: 'system' as const,
      content: personalizedPrompt
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

    // Convert the response to a stream using Vercel AI SDK's OpenAIStream
    console.log('[Edge Runtime] OpenRouter response received, creating stream...');
    
    try {
      // CRITICAL FIX: Use custom streaming handler for AI SDK v5
      // OpenAIStream is deprecated in v5, using our custom converter
      const stream = openRouterToStream(response);
      
      // Apply anti-sycophancy middleware only if enabled
      let enhancedStream = stream;
      if (antiSycophancyEnabled) {
        console.log('[Edge Runtime] Applying anti-sycophancy middleware');
        enhancedStream = wrapStreamWithAntiSycophancy(stream, antiSycophancyConfig);
      } else {
        console.log('[Edge Runtime] Anti-sycophancy disabled - using raw stream');
      }
      
      console.log('[Edge Runtime] Returning streaming response');
      
      // Create headers for the response
      const headers: HeadersInit = {};
      
      // Add custom headers to indicate if search was performed
      if (searchPerformed) {
        headers['X-Search-Delegated'] = 'true';
      }
      
      // Add version headers
      const versionHeaders = getVersionHeaders();
      Object.entries(versionHeaders).forEach(([key, value]) => {
        headers[key] = value;
      });
      
      // Use the createStreamingResponse function which handles the type conversion properly
      return createStreamingResponse(enhancedStream, headers);
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