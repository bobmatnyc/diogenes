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
import { getMemoryClientEdge } from '@/lib/memory/client-edge';
import type { SaveInteractionRequest } from '@/lib/memory/types';
import { getContextWindowStatus, type CompactionSummary } from '@/lib/context-compaction';
import { MemoryMiddleware } from '@/lib/kuzu/middleware';
import { currentUser } from '@clerk/nextjs/server';

// Validate environment on module load (Edge-compatible version)
validateEnvironmentEdge();

// Use Node.js runtime to support kuzu-memory dependencies
export const runtime = 'nodejs';

// Node.js runtime configuration
export const config = {
  runtime: 'nodejs',
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
    console.log('[Node Runtime] Processing chat request');
    console.log('[Node Runtime] Runtime type:', process.env.VERCEL ? 'Vercel' : 'Local');

    // Validate API key is present
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey || apiKey === '') {
      console.error('[Node Runtime] OPENROUTER_API_KEY is not configured or empty');
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

    console.log('[Node Runtime] API key validated, length:', apiKey.length);

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
      console.log('[Node Runtime] Received messages:', messages?.length || 0);
      console.log('[Node Runtime] User firstName:', firstName);
      console.log('[Node Runtime] Selected model:', selectedModel);
      console.log('[Node Runtime] Selected personality:', selectedPersonality);
      if (userId) console.log('[Node Runtime] User ID:', userId);
      if (debugMode) console.log('[Node Runtime] Debug mode enabled');
    } catch (parseError) {
      console.error('[Node Runtime] Failed to parse request body:', parseError);
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!(messages && Array.isArray(messages))) {
      console.error('[Node Runtime] Invalid messages format');
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

    console.log('[Node Runtime] Delegation config:', {
      mockMode: delegationConfig.enableMockMode,
      verbose: delegationConfig.verboseLogging,
    });

    // Anti-sycophancy middleware removed for Edge Function size optimization
    const antiSycophancyEnabled = false;

    // Initialize kuzu-memory middleware
    const kuzuMiddleware = new MemoryMiddleware({
      enableAutoExtraction: true,
      enableEnrichment: true,
      enableCommands: true,
    });

    // Process messages with kuzu-memory for enrichment
    let kuzuEnrichedMessages = messages;
    let kuzuMemoryOperations: any = {};
    let kuzuHeaders: Record<string, string> = {};
    let kuzuSystemEnrichment = '';  // Store enrichment for system prompt

    if (userId) {
      try {
        await kuzuMiddleware.initialize();
        const kuzuResult = await kuzuMiddleware.processRequest(messages, userId);
        kuzuEnrichedMessages = kuzuResult.messages;
        kuzuMemoryOperations = kuzuResult.memoryOperations;
        kuzuHeaders = kuzuResult.headers;
        kuzuSystemEnrichment = kuzuResult.systemPromptEnrichment || '';

        // Log kuzu memory operations
        if (kuzuMemoryOperations.enrichment) {
          console.log('[Kuzu Memory] Enriched prompt with', kuzuMemoryOperations.enrichment.memoryCount, 'memories');
        }
        if (kuzuMemoryOperations.command) {
          console.log('[Kuzu Memory] Handled command:', kuzuMemoryOperations.command.action);
        }
      } catch (kuzuError) {
        console.error('[Kuzu Memory] Error processing request:', kuzuError);
        // Continue without kuzu memory - don't break the chat
      }
    }

    // Initialize memory client and search for relevant memories (existing system)
    let memoryContext = '';
    let memoryDebugInfo = null;
    let userEntity = null;
    const memoryClient = getMemoryClientEdge();
    console.log('[Node Runtime] Memory client status:', !!memoryClient);
    console.log('[Node Runtime] User ID available:', !!userId);
    console.log('[Node Runtime] MEMORY_API_INTERNAL_KEY env var:', !!process.env.MEMORY_API_INTERNAL_KEY);

    if (memoryClient && userId) {
      try {
        console.log('[Node Runtime] Initializing memory system for user:', userId, 'with name:', firstName);

        // Get or create user entity
        console.log('[Node Runtime] Getting/creating user entity...');
        userEntity = await memoryClient.getOrCreateUserEntity(userId, firstName, userEmail);
        console.log('[Node Runtime] User entity result:', userEntity?.id || 'null');

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
            console.log('[Node Runtime] Found', memoryResult.memories.length, 'relevant memories');
            console.log('[Node Runtime] Memory context length:', memoryContext.length);
          } else {
            console.log('[Node Runtime] No relevant memories found');
          }

          // Get debug info if in debug mode
          if (debugMode) {
            memoryDebugInfo = memoryClient.getDebugInfo();
            memoryClient.clearDebugInfo();
          }
        } else {
          console.warn('[Node Runtime] Failed to get/create user entity');
        }
      } catch (error) {
        console.error('[Node Runtime] Memory system error:', error);
        if (error instanceof Error) {
          console.error('[Node Runtime] Memory error details:', error.message);
        }
        // Continue without memory context - don't break the chat
      }
    } else {
      if (!memoryClient) console.warn('[Node Runtime] Memory client not initialized - check MEMORY_API_INTERNAL_KEY');
      if (!userId) console.warn('[Node Runtime] No user ID provided - memory features disabled');
    }

    // Use kuzu-enriched messages if available, otherwise use original
    const messagesToProcess = kuzuEnrichedMessages || messages;

    // Filter out system messages from user input
    const userMessages = messagesToProcess.filter((m: any) => m.role !== 'system');

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
    // Combine memory contexts: existing memory system + kuzu enrichment (transparent to user)
    const combinedMemoryContext = [
      memoryContext,  // Existing memory system context
      kuzuSystemEnrichment  // Kuzu enrichment (behind the scenes)
    ].filter(Boolean).join('\n\n');

    const personalizedPrompt = createPersonalizedPrompt(firstName, selectedPersonality, combinedMemoryContext, debugMode);
    const systemMessage = {
      role: 'system' as const,
      content: personalizedPrompt,
    };

    const allMessages = [systemMessage, ...enhancedMessages];

    // Get fresh client instance to ensure latest env vars
    console.log('[Node Runtime] Creating OpenRouter client...');
    const openrouter = getOpenRouterClient();

    // Create the streaming response with selected model
    console.log('[Node Runtime] Requesting streaming completion from:', selectedModel);
    
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
      console.error('[Node Runtime] OpenRouter API error:', apiError);
      
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
    console.log('[Node Runtime] OpenRouter response received, creating stream...');

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
      
      console.log(`[Node Runtime] Streaming with anti-sycophancy: ${antiSycophancyEnabled}`);

      console.log('[Node Runtime] Returning streaming response');

      // Calculate context window status
      const contextSummaries: CompactionSummary[] = []; // TODO: Load from session/memory
      const contextStatus = getContextWindowStatus(userMessages, contextSummaries);

      // Create headers for the response
      const headers: HeadersInit = {};

      // Add custom headers to indicate if search was performed
      if (searchPerformed) {
        headers['X-Search-Delegated'] = 'true';
      }

      // Add context space tracking headers with compaction awareness
      headers['X-Context-Tokens'] = contextStatus.currentTokens.toString();
      headers['X-Context-Max-Tokens'] = contextStatus.maxTokens.toString();
      headers['X-Context-Usage-Percent'] = contextStatus.utilizationPercent.toFixed(2);
      headers['X-Context-Compacted'] = (contextSummaries.length > 0).toString();
      headers['X-Context-Summaries'] = contextSummaries.length.toString();
      
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

      // Add entity ID and storage flag for memory system
      if (userEntity) {
        headers['X-Memory-Entity-Id'] = userEntity.id;
        headers['X-Memory-Should-Store'] = (!!userEntity && !!userId).toString();
      }

      // Add kuzu-memory headers
      Object.entries(kuzuHeaders).forEach(([key, value]) => {
        headers[key] = value;
      });

      // Add kuzu memory operation indicators
      if (kuzuMemoryOperations.enrichment) {
        headers['X-Kuzu-Memories-Used'] = kuzuMemoryOperations.enrichment.relevantMemories?.length?.toString() || '0';
        headers['X-Kuzu-Confidence'] = kuzuMemoryOperations.enrichment.confidenceScore?.toFixed(2) || '0';
      }
      if (kuzuMemoryOperations.command) {
        headers['X-Kuzu-Command'] = kuzuMemoryOperations.command.action || 'processed';
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
        console.log('[Node Runtime] Setting memory storage headers for entity:', userEntity.id);

        // Note: We can't capture the full streamed response here, so we'll need to handle it in the client
        // For now, we'll store a placeholder that will be updated from the client side

        // Set a flag in headers to indicate memory storage should happen client-side
        headers['X-Memory-Entity-Id'] = userEntity.id;
        headers['X-Memory-Should-Store'] = 'true';
      } else {
        console.log('[Node Runtime] Skipping memory storage - memoryClient:', !!memoryClient, 'userEntity:', !!userEntity);
      }

      // Store assistant memory asynchronously after response starts streaming
      if (userId && kuzuMiddleware) {
        // Get the last user message for context
        const lastUserMessage = userMessages[userMessages.length - 1]?.content || '';

        // Schedule assistant memory storage (non-blocking)
        setTimeout(async () => {
          try {
            // Note: We can't capture the full streamed response here,
            // but we can store context about the conversation
            await kuzuMiddleware.storeAssistantResponse(
              userId,
              lastUserMessage,
              '[Response streamed]',  // Placeholder - actual response captured client-side
              {
                conversationId: `conv_${Date.now()}`,
                modelUsed: selectedModel,
                searchPerformed,
                memoryEnriched: !!kuzuSystemEnrichment || !!memoryContext,
              }
            );
            console.log('[Node Runtime] Scheduled assistant memory storage for user:', userId);
          } catch (error) {
            console.error('[Node Runtime] Failed to store assistant memory:', error);
          }
        }, 1000);  // Delay to ensure streaming has started
      }

      // Use the createStreamingResponse function which handles the type conversion properly
      return createStreamingResponse(enhancedStream, headers);
    } catch (streamError) {
      console.error('[Node Runtime] Stream creation failed:', streamError);
      throw new Error(`Failed to create stream: ${streamError}`);
    }
  } catch (error: any) {
    console.error('[Node Runtime] Chat API error:', error);
    console.error('[Node Runtime] Error stack:', error.stack);

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
