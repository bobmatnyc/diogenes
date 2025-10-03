/**
 * Lightweight delegation handler for Edge Runtime
 * Optimized version with reduced dependencies and simplified logic
 */

import { getOpenRouterClient } from '@/lib/openrouter';

export interface DelegationConfig {
  enableMockMode?: boolean;
  verboseLogging?: boolean;
  searchTimeout?: number;
  maxSearchAttempts?: number;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Simplified search trigger detection
 */
function shouldSearch(prompt: string): boolean {
  const searchKeywords = [
    // Time-based keywords
    'current', 'today', 'latest', 'recent', 'news',
    'happening', '2024', '2025', 'update', 'now',
    'breaking', 'yesterday', 'this week', 'this month',
    'this year', 'real-time', 'live', 'ongoing',

    // Question patterns
    'what is', 'what are', "what's", 'trend',

    // Global/world status keywords
    'state of', 'world', 'global', 'worldwide', 'international',
    'status of', 'situation', 'condition', 'affairs',

    // Event/development keywords
    'event', 'development', 'crisis', 'conflict', 'war',
    'economy', 'market', 'stock', 'price'
  ];

  const lowerPrompt = prompt.toLowerCase();
  return searchKeywords.some(keyword => lowerPrompt.includes(keyword));
}

/**
 * Lightweight web search using Perplexity
 */
async function performSearch(query: string): Promise<string | null> {
  try {
    console.log('[Edge Search] Performing search for:', query.substring(0, 100));
    const openrouter = getOpenRouterClient();

    // Add timeout protection - 15s for search (leaves 15s for main request, total < 30s Vercel limit)
    const SEARCH_TIMEOUT = 15000;

    const searchPromise = openrouter.chat.completions.create({
      model: 'perplexity/sonar-pro',
      messages: [
        {
          role: 'system',
          content: 'You are a search assistant. Provide concise, factual information about current events and recent developments with sources when available. Focus on real, verifiable information.'
        },
        {
          role: 'user',
          content: query
        }
      ],
      temperature: 0.3,
      max_tokens: 800,
      stream: false
    });

    // Race between search and timeout
    const searchResponse = await Promise.race([
      searchPromise,
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Search timeout: Web search took too long'));
        }, SEARCH_TIMEOUT);
      })
    ]);

    const content = searchResponse.choices[0]?.message?.content;
    if (content) {
      console.log('[Edge Search] Search successful, response length:', content.length);
    } else {
      console.log('[Edge Search] Search returned empty response');
    }
    return content || null;
  } catch (error: any) {
    // Handle timeout errors specifically
    if (error?.message?.includes('Search timeout')) {
      console.error('[Edge Search] Search timeout after 15s - continuing without search');
      return null; // Gracefully fail - user gets response without web search
    }

    console.error('[Edge Search] Error performing search:', {
      message: error?.message,
      status: error?.status,
      type: error?.constructor?.name
    });
    return null;
  }
}

/**
 * Simplified orchestration for Edge Runtime
 */
export async function orchestrateHybridResponse(
  messages: Message[],
  config: DelegationConfig = {}
): Promise<{
  enhancedMessages: Message[];
  searchPerformed: boolean;
  searchContext: string | null;
}> {
  // Get the last user message
  const lastUserMessage = messages
    .filter(m => m.role === 'user')
    .pop();

  if (!lastUserMessage) {
    return {
      enhancedMessages: messages,
      searchPerformed: false,
      searchContext: null
    };
  }

  // Check if search is needed
  const needsSearch = shouldSearch(lastUserMessage.content);
  console.log('[Edge Orchestration] Search needed:', needsSearch, 'Mock mode:', config.enableMockMode);

  if (!needsSearch || config.enableMockMode) {
    return {
      enhancedMessages: messages,
      searchPerformed: false,
      searchContext: null
    };
  }

  // Perform search
  console.log('[Edge Orchestration] Initiating web search...');
  const searchContext = await performSearch(lastUserMessage.content);

  if (!searchContext) {
    console.log('[Edge Orchestration] Search failed or returned no results');
    return {
      enhancedMessages: messages,
      searchPerformed: false,
      searchContext: null
    };
  }

  console.log('[Edge Orchestration] Search successful, injecting context');

  // Inject search context as a system message right after the user's question
  // This ensures the AI sees the search results immediately after the query
  const enhancedMessages = [
    ...messages,
    {
      role: 'system' as const,
      content: `[Current web search results for the user's query]:\n${searchContext}\n\nUse this information to provide an accurate, up-to-date response.`
    }
  ];

  return {
    enhancedMessages,
    searchPerformed: true,
    searchContext
  };
}