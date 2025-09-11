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
    'current', 'today', 'latest', 'recent', 'news',
    'happening', '2024', '2025', 'update', 'now'
  ];
  
  const lowerPrompt = prompt.toLowerCase();
  return searchKeywords.some(keyword => lowerPrompt.includes(keyword));
}

/**
 * Lightweight web search using Perplexity
 */
async function performSearch(query: string): Promise<string | null> {
  try {
    const openrouter = getOpenRouterClient();
    
    const searchResponse = await openrouter.chat.completions.create({
      model: 'perplexity/llama-3.1-sonar-large-128k-online',
      messages: [
        {
          role: 'system',
          content: 'You are a search assistant. Provide concise, factual information with sources when available.'
        },
        {
          role: 'user',
          content: query
        }
      ],
      temperature: 0.3,
      max_tokens: 500,
      stream: false
    });

    return searchResponse.choices[0]?.message?.content || null;
  } catch (error) {
    console.error('[Edge Search] Error:', error);
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

  if (!needsSearch || config.enableMockMode) {
    return {
      enhancedMessages: messages,
      searchPerformed: false,
      searchContext: null
    };
  }

  // Perform search
  const searchContext = await performSearch(lastUserMessage.content);

  if (!searchContext) {
    return {
      enhancedMessages: messages,
      searchPerformed: false,
      searchContext: null
    };
  }

  // Inject search context
  const enhancedMessages = [
    ...messages.slice(0, -1),
    {
      role: 'system' as const,
      content: `Web search results:\n${searchContext}`
    },
    lastUserMessage
  ];

  return {
    enhancedMessages,
    searchPerformed: true,
    searchContext
  };
}