import type { NextRequest } from 'next/server';
import { type DelegationConfig, orchestrateHybridResponse } from '@/lib/agents/delegation-handler-edge';
// Using lightweight Edge-optimized anti-sycophancy
import {
  createAntiSycophancyTransform
} from '@/lib/ai/anti-sycophancy-edge';
import { createStreamingResponse, openRouterToStream } from '@/lib/ai/streaming-fix';
import { DEFAULT_MODEL, getOpenRouterClient } from '@/lib/openrouter';
// Using new layered personality architecture
import {
  composePersonalityPrompt,
  getAntiSycophancyLevel,
  type PersonalityType
} from '@/lib/personality/composer';
// Full prompts available but commented for size:
// import { DIOGENES_SYSTEM_PROMPT } from '@/lib/prompts/core-principles';
// import { BOB_MATSUOKA_SYSTEM_PROMPT } from '@/lib/prompts/bob-matsuoka';
import { getVersionHeaders } from '@/lib/version';
import { validateEnvironmentEdge } from '@/lib/env-edge';
import { estimateMessagesTokens } from '@/lib/tokens-edge';
import { getMemoryClient } from '@/lib/memory/client';
import type { SaveInteractionRequest } from '@/lib/memory/types';

// Validate environment on module load (Edge-compatible version)
validateEnvironmentEdge();

// Explicitly set edge runtime for Vercel streaming
export const runtime = 'edge';

// Edge runtime configuration
export const config = {
  runtime: 'edge',
  regions: ['iad1'], // US East by default, adjust as needed
};

// Metrics aggregator removed for Edge Function size optimization
// const metricsAggregator = new MetricsAggregator();

// Create personalized prompt using the new layered architecture
function createPersonalizedPrompt(
  firstName: string,
  personality: PersonalityType = 'executive',
  memoryContext?: string,
  debugMode?: boolean
): string {
  return composePersonalityPrompt({
    personality,
    mode: 'minimal', // Use minimal mode for Edge Runtime
    antiSycophancyLevel: getAntiSycophancyLevel(personality),
    memoryContext,
    debugMode,
    userName: firstName
  });
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
    let selectedPersonality: PersonalityType;
    let userId;
    let userEmail;
    let debugMode = false;
    try {
      const body = await req.json();
      messages = body.messages;
      firstName = body.firstName || 'wanderer'; // Default to 'wanderer' if no name provided
      selectedModel = body.model || DEFAULT_MODEL; // Use selected model or default
      selectedPersonality = body.personality || 'executive'; // Default to 'executive' if no personality specified
      userId = body.userId; // Clerk user ID
      userEmail = body.userEmail;
      debugMode = body.debugMode === true;
      console.log('[Edge Runtime] Received messages:', messages?.length || 0);
      console.log('[Edge Runtime] User firstName:', firstName);
      console.log('[Edge Runtime] Selected model:', selectedModel);
      console.log('[Edge Runtime] Selected personality:', selectedPersonality);
      if (userId) console.log('[Edge Runtime] User ID:', userId);
      if (debugMode) console.log('[Edge Runtime] Debug mode enabled');
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

    // Anti-sycophancy middleware removed for Edge Function size optimization
    const antiSycophancyEnabled = false;

    // Initialize memory client and search for relevant memories
    let memoryContext = '';
    let memoryDebugInfo = null;
    let userEntity = null;
    const memoryClient = getMemoryClient();

    if (memoryClient && userId) {
      try {
        console.log('[Edge Runtime] Initializing memory system for user:', userId);

        // Get or create user entity
        userEntity = await memoryClient.getOrCreateUserEntity(userId, firstName, userEmail);

        if (userEntity) {
          // Get the last user message for context search
          const lastUserMessage = messages
            .filter((m: any) => m.role === 'user')
            .pop()?.content || '';

          // Search for relevant memories
          const memoryResult = await memoryClient.searchRelevantMemories(
            lastUserMessage,
            userEntity.id,
            10 // Limit to 10 most relevant memories
          );

          if (memoryResult.memories.length > 0) {
            memoryContext = memoryResult.summary;
            console.log('[Edge Runtime] Found', memoryResult.memories.length, 'relevant memories');
          }

          // Get debug info if in debug mode
          if (debugMode) {
            memoryDebugInfo = memoryClient.getDebugInfo();
            memoryClient.clearDebugInfo();
          }
        }
      } catch (error) {
        console.error('[Edge Runtime] Memory system error:', error);
        // Continue without memory context - don't break the chat
      }
    }

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

    // Ensure system prompt is always first with personalization and memory context
    const personalizedPrompt = createPersonalizedPrompt(firstName, selectedPersonality, memoryContext, debugMode);
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

      // Apply lightweight anti-sycophancy transform that preserves SSE format
      // Using the new getAntiSycophancyLevel function for consistency
      const aggressiveness = getAntiSycophancyLevel(selectedPersonality);
      const antiSycophancyEnabled = aggressiveness > 0;
      
      const enhancedStream = antiSycophancyEnabled 
        ? stream.pipeThrough(createAntiSycophancyTransform(aggressiveness))
        : stream;
      
      console.log(`[Edge Runtime] Streaming with anti-sycophancy: ${antiSycophancyEnabled}`);

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

      // Add memory debug info if in debug mode
      if (debugMode && memoryDebugInfo) {
        headers['X-Memory-Debug'] = JSON.stringify(memoryDebugInfo);
      }

      // Add memory context indicator
      if (memoryContext) {
        headers['X-Memory-Context-Used'] = 'true';
        headers['X-Memory-Context-Tokens'] = estimateMessagesTokens([{ role: 'system', content: memoryContext }]).toString();
      }

      // Add version headers
      const versionHeaders = getVersionHeaders();
      Object.entries(versionHeaders).forEach(([key, value]) => {
        headers[key] = value;
      });

      // Store the interaction in memory after successful response
      if (memoryClient && userEntity) {
        // Get the last user message and construct assistant response from stream
        const lastUserMessage = userMessages[userMessages.length - 1]?.content || '';

        // Note: We can't capture the full streamed response here, so we'll need to handle it in the client
        // For now, we'll store a placeholder that will be updated from the client side

        // Set a flag in headers to indicate memory storage should happen client-side
        headers['X-Memory-Entity-Id'] = userEntity.id;
        headers['X-Memory-Should-Store'] = 'true';
      }

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
