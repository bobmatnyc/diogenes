import type { NextRequest } from 'next/server';
import { type DelegationConfig, orchestrateHybridResponse } from '@/lib/agents/delegation-handler';
import { ANTI_SYCOPHANCY_ENHANCEMENT } from '@/lib/ai/anti-sycophancy';
import {
  createAntiSycophancyMiddleware,
  MetricsAggregator,
  wrapStreamWithAntiSycophancy,
} from '@/lib/ai/middleware';
import { createStreamingResponse, openRouterToStream } from '@/lib/ai/streaming-fix';
import { DEFAULT_MODEL, getOpenRouterClient } from '@/lib/openrouter';
import { DIOGENES_SYSTEM_PROMPT } from '@/lib/prompts/core-principles';
import { BOB_MATSUOKA_SYSTEM_PROMPT } from '@/lib/prompts/bob-matsuoka';
import { getVersionHeaders } from '@/lib/version';
import { validateEnvironmentEdge } from '@/lib/env-edge';
import { estimateMessagesTokens } from '@/lib/tokens-edge';

// Validate environment on module load (Edge-compatible version)
validateEnvironmentEdge();

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
function createPersonalizedPrompt(firstName: string, personality: 'diogenes' | 'bob' = 'diogenes'): string {
  if (personality === 'bob') {
    return `${BOB_MATSUOKA_SYSTEM_PROMPT}

${ANTI_SYCOPHANCY_ENHANCEMENT}

CONTEXTUAL AWARENESS:
When provided with web search context, integrate it naturally into your technical and strategic analysis. Use current information to provide pragmatic insights, always maintaining your thoughtful, research-driven perspective.

PERSONAL ADDRESS:
You are speaking with ${firstName}. Address them professionally and warmly, as you would a colleague or mentee. Use their name occasionally when making important points or sharing personal anecdotes.

Remember:
- Balance technical depth with business pragmatism
- Share relevant experiences from your 50-year journey
- Connect current challenges to historical patterns
- Emphasize sustainable, well-architected solutions`;
  }
  
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
          error: 'OpenRouter API key not configured',
          message: 'The application needs a valid OpenRouter API key to function. Please update the OPENROUTER_API_KEY environment variable.',
          type: 'ConfigurationError',
          debug: process.env.NODE_ENV === 'development' ? 'OPENROUTER_API_KEY missing' : undefined,
        }),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        },
      );
    }

    console.log('[Edge Runtime] API key validated, length:', apiKey.length);

    // Parse request body with error handling
    let messages;
    let firstName;
    let selectedModel;
    let selectedPersonality: 'diogenes' | 'bob';
    try {
      const body = await req.json();
      messages = body.messages;
      firstName = body.firstName || 'wanderer'; // Default to 'wanderer' if no name provided
      selectedModel = body.model || DEFAULT_MODEL; // Use selected model or default
      selectedPersonality = body.personality || 'diogenes'; // Default to 'diogenes' if no personality specified
      console.log('[Edge Runtime] Received messages:', messages?.length || 0);
      console.log('[Edge Runtime] User firstName:', firstName);
      console.log('[Edge Runtime] Selected model:', selectedModel);
      console.log('[Edge Runtime] Selected personality:', selectedPersonality);
    } catch (parseError) {
      console.error('[Edge Runtime] Failed to parse request body:', parseError);
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!(messages && Array.isArray(messages))) {
      console.error('[Edge Runtime] Invalid messages format');
      return new Response(JSON.stringify({ error: 'Messages must be an array' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Extract configuration from environment or request
    const delegationConfig: DelegationConfig = {
      enableMockMode: process.env.ENABLE_MOCK_SEARCH === 'true',
      verboseLogging:
        process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview',
      searchTimeout: 10000,
      maxSearchAttempts: 2,
    };

    console.log('[Edge Runtime] Delegation config:', {
      mockMode: delegationConfig.enableMockMode,
      verbose: delegationConfig.verboseLogging,
    });

    // Initialize anti-sycophancy middleware with configuration
    // DISABLED: Anti-sycophancy middleware is causing messages to disappear
    // The middleware corrupts the SSE stream format
    const antiSycophancyEnabled = false; // CRITICAL: Set to false until SSE issue is fixed

    const antiSycophancyConfig = {
      aggressiveness: Number.parseInt(process.env.ANTI_SYCOPHANCY_LEVEL || '7', 10),
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
    const { enhancedMessages, searchPerformed, searchContext } = await orchestrateHybridResponse(
      userMessages,
      delegationConfig,
    );

    // Log delegation decision in development
    if (delegationConfig.verboseLogging && searchPerformed) {
      console.log('Web search delegation performed');
      if (searchContext) {
        console.log('Search context length:', searchContext.length);
      }
    }

    // Ensure system prompt is always first with personalization
    const personalizedPrompt = createPersonalizedPrompt(firstName, selectedPersonality);
    const systemMessage = {
      role: 'system' as const,
      content: personalizedPrompt,
    };

    const allMessages = [systemMessage, ...enhancedMessages];

    // Get fresh client instance to ensure latest env vars
    console.log('[Edge Runtime] Creating OpenRouter client...');
    const openrouter = getOpenRouterClient();

    // Create the streaming response with selected model
    console.log('[Edge Runtime] Requesting streaming completion from:', selectedModel);
    
    let response;
    try {
      response = await openrouter.chat.completions.create({
        model: selectedModel,
        messages: allMessages,
        temperature: 0.9,
        max_tokens: 1000,
        stream: true,
      });
    } catch (apiError: any) {
      console.error('[Edge Runtime] OpenRouter API error:', apiError);
      
      // Handle authentication errors specifically
      if (apiError?.status === 401 || apiError?.message?.includes('User not found')) {
        return new Response(
          JSON.stringify({
            error: 'Authentication failed',
            message: `**OpenRouter API key is invalid**\n\nTo fix this issue:\n\n1. Go to https://openrouter.ai/keys\n2. Sign in or create an account\n3. Generate a new API key\n4. Update OPENROUTER_API_KEY in .env.local\n5. Restart the development server\n\nSee OPENROUTER_SETUP.md for detailed instructions.`,
            type: 'AuthenticationError',
            details: process.env.NODE_ENV === 'development' ? {
              errorMessage: apiError?.message,
              currentKeyPrefix: process.env.OPENROUTER_API_KEY?.substring(0, 20) + '...',
              documentation: 'See OPENROUTER_SETUP.md for setup guide'
            } : undefined,
          }),
          {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
          },
        );
      }
      
      // Handle rate limiting
      if (apiError?.status === 429) {
        return new Response(
          JSON.stringify({
            error: 'Rate limit exceeded',
            message: 'Too many requests. Please wait a moment before trying again.',
            type: 'RateLimitError',
            retryAfter: apiError?.headers?.['retry-after'] || 60,
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Retry-After': apiError?.headers?.['retry-after'] || '60',
            },
          },
        );
      }
      
      // Handle model availability errors
      if (apiError?.status === 404 || apiError?.message?.includes('model')) {
        return new Response(
          JSON.stringify({
            error: 'Model not available',
            message: `The selected model (${selectedModel}) is not available. Please try a different model.`,
            type: 'ModelNotFoundError',
            availableModels: ['anthropic/claude-3.5-sonnet-20241022', 'anthropic/claude-opus-4.1'],
          }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
          },
        );
      }
      
      // Handle quota/credit errors
      if (apiError?.status === 402 || apiError?.message?.includes('credit') || apiError?.message?.includes('quota')) {
        return new Response(
          JSON.stringify({
            error: 'Insufficient credits',
            message: 'The OpenRouter account has insufficient credits. Please add credits to continue.',
            type: 'QuotaExceededError',
          }),
          {
            status: 402,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
          },
        );
      }
      
      // Re-throw for generic error handling
      throw apiError;
    }

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

      // Add context space tracking headers
      const contextTokens = estimateMessagesTokens(messages);
      const maxContextTokens = 128000; // Claude's context window
      const contextUsagePercent = Math.round((contextTokens / maxContextTokens) * 100);
      
      headers['X-Context-Tokens'] = contextTokens.toString();
      headers['X-Context-Max-Tokens'] = maxContextTokens.toString();
      headers['X-Context-Usage-Percent'] = contextUsagePercent.toString();
      
      // Add search context size if search was performed
      if (searchContext) {
        const searchContextTokens = estimateMessagesTokens([{ role: 'system', content: searchContext }]);
        headers['X-Search-Context-Tokens'] = searchContextTokens.toString();
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

    // Check for network/connection errors
    if (error?.code === 'ECONNREFUSED' || error?.message?.includes('fetch failed')) {
      return new Response(
        JSON.stringify({
          error: 'Connection failed',
          message: 'Unable to connect to OpenRouter API. Please check your internet connection and try again.',
          type: 'NetworkError',
          timestamp: new Date().toISOString(),
        }),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
        },
      );
    }

    // Check for timeout errors
    if (error?.name === 'AbortError' || error?.message?.includes('timeout')) {
      return new Response(
        JSON.stringify({
          error: 'Request timeout',
          message: 'The request took too long to process. Please try again with a shorter message.',
          type: 'TimeoutError',
          timestamp: new Date().toISOString(),
        }),
        {
          status: 504,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
        },
      );
    }

    // Provide user-friendly error messages
    const isDevelopment = process.env.NODE_ENV === 'development';
    const userMessage = 'An unexpected error occurred. Please try again or contact support if the issue persists.';
    
    return new Response(
      JSON.stringify({
        error: 'Service error',
        message: userMessage,
        type: error.name || 'UnknownError',
        timestamp: new Date().toISOString(),
        details: isDevelopment ? {
          originalError: error.message,
          stack: error.stack?.split('\n').slice(0, 3),
        } : undefined,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      },
    );
  }
}
