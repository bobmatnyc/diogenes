import OpenAI from 'openai';
import { getOpenRouterClient } from '@/lib/openrouter';

// Model configurations for different agents
export const DELEGATION_MODELS = {
  // Claude Sonnet 4.5 for analysis and philosophical responses
  CLAUDE_SONNET: 'anthropic/claude-sonnet-4.5',
  // Perplexity Sonar for web search - optimized for current information retrieval
  PERPLEXITY_SONAR: 'perplexity/sonar-pro',
  // Alternative: Perplexity Online for simpler searches
  PERPLEXITY_ONLINE: 'perplexity/llama-3.1-sonar-large-128k-online',
};

export interface DelegationAnalysis {
  needsWebSearch: boolean;
  searchQuery?: string;
  reason?: string;
  confidence: number;
}

export interface SearchResult {
  content: string;
  sources?: string[];
  timestamp?: string;
}

export interface DelegationConfig {
  enableMockMode?: boolean;
  maxSearchAttempts?: number;
  searchTimeout?: number;
  verboseLogging?: boolean;
}

/**
 * Analyzes a user message to determine if web search delegation is needed
 * Uses Claude 3.5 Sonnet to make intelligent decisions about information requirements
 */
export async function analyzeForDelegation(
  userMessage: string,
  conversationContext: any[] = [],
  config: DelegationConfig = {},
): Promise<DelegationAnalysis> {
  const { enableMockMode = false, verboseLogging = false } = config;

  if (enableMockMode) {
    // Mock mode for testing
    const needsSearch = checkForSearchTriggers(userMessage);
    return {
      needsWebSearch: needsSearch,
      searchQuery: needsSearch ? extractSearchQuery(userMessage) : undefined,
      reason: needsSearch ? 'Mock: Current information requested' : 'Mock: Philosophical inquiry',
      confidence: 0.8,
    };
  }

  try {
    const openrouter = getOpenRouterClient();

    // Create a focused prompt for delegation analysis
    const analysisPrompt = `You are an assistant helping determine if a user's question requires current web information.

Analyze this user message and determine if it needs web search for accurate response:
"${userMessage}"

IMPORTANT: Be LIBERAL in deciding to search. When in doubt, search. Users expect current information.

Consider:
1. Does it ask about ANY current events, recent developments, or time-sensitive information?
2. Does it reference specific dates, prices, statistics, or data that changes?
3. Does it ask about people, companies, products, or topics that may have updates?
4. Does it mention "today", "current", "latest", "recent", "now", or any year from 2020 onwards?
5. Does it ask "what's happening", "what happened", or about any specific events?
6. Does it ask about weather, sports, politics, technology news, or market data?
7. Is it asking about AI developments, new models, or tech updates?

Only return needsWebSearch: false if the question is:
- Purely philosophical with no time element
- Abstract mathematical or logical problems
- Personal advice with no current context needed
- Historical events before 2020

Respond in JSON format:
{
  "needsWebSearch": boolean,
  "searchQuery": "optimized search query if needed",
  "reason": "brief explanation",
  "confidence": 0.0-1.0
}`;

    const response = await openrouter.chat.completions.create({
      model: DELEGATION_MODELS.CLAUDE_SONNET,
      messages: [
        {
          role: 'system',
          content: 'You are a delegation analyzer. Respond only in valid JSON format.',
        },
        {
          role: 'user',
          content: analysisPrompt,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent analysis
      max_tokens: 200,
    });

    const content = response.choices[0]?.message?.content || '{}';

    if (verboseLogging) {
      console.log('Delegation analysis:', content);
    }

    // Parse the JSON response
    try {
      const analysis = JSON.parse(content) as DelegationAnalysis;
      return {
        needsWebSearch: analysis.needsWebSearch,
        searchQuery: analysis.searchQuery,
        reason: analysis.reason,
        confidence: analysis.confidence || 0.5,
      };
    } catch (parseError) {
      console.error('Failed to parse delegation analysis:', parseError);
      // Fallback to simple trigger-based detection
      const needsSearch = checkForSearchTriggers(userMessage);
      return {
        needsWebSearch: needsSearch,
        searchQuery: needsSearch ? extractSearchQuery(userMessage) : undefined,
        reason: 'Fallback: Parse error, using trigger detection',
        confidence: 0.5,
      };
    }
  } catch (error) {
    console.error('Delegation analysis error:', error);
    // Fallback to simple detection
    const needsSearch = checkForSearchTriggers(userMessage);
    return {
      needsWebSearch: needsSearch,
      searchQuery: needsSearch ? extractSearchQuery(userMessage) : undefined,
      reason: 'Fallback: API error',
      confidence: 0.3,
    };
  }
}

/**
 * Delegates to Perplexity Sonar for web search
 * Returns formatted search results for integration into Claude's context
 */
export async function delegateToPerplexity(
  searchQuery: string,
  config: DelegationConfig = {},
): Promise<SearchResult> {
  const { enableMockMode = false, searchTimeout = 10000, verboseLogging = false } = config;

  if (enableMockMode) {
    // Return mock search results for testing
    return {
      content: `Mock search results for: "${searchQuery}"
      
1. Latest development: This is a simulated search result providing context about ${searchQuery}.
2. Recent update: Mock information showing current state of the topic.
3. Additional context: Supplementary mock data for comprehensive coverage.`,
      sources: ['mock-source-1.com', 'mock-source-2.org'],
      timestamp: new Date().toISOString(),
    };
  }

  try {
    const openrouter = getOpenRouterClient();

    // Create a search-optimized prompt for Perplexity
    const searchPrompt = `🔴 CRITICAL: YOU ARE FORBIDDEN TO MAKE ANYTHING UP 🔴
Search for current, accurate information about: ${searchQuery}

ABSOLUTE REQUIREMENTS:
- Only return VERIFIED, FACTUAL information from your web search
- NEVER fabricate or invent any facts, statistics, or events
- If information is unavailable, explicitly state "No information found"
- Include actual sources and citations when available
- Clearly indicate the date/recency of information

Focus on:
- Recent developments and updates
- Factual, verifiable information
- Multiple perspectives if relevant
- Key dates and figures
- Authoritative sources

Provide a comprehensive but concise summary with real citations.`;

    // Use AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), searchTimeout);

    const response = await openrouter.chat.completions.create({
      model: DELEGATION_MODELS.PERPLEXITY_SONAR,
      messages: [
        {
          role: 'user',
          content: searchPrompt,
        },
      ],
      temperature: 0.1, // Very low temperature for factual accuracy
      max_tokens: 800,
      // @ts-expect-error - OpenRouter supports additional options
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const searchContent = response.choices[0]?.message?.content || '';

    if (verboseLogging) {
      console.log('Perplexity search response:', searchContent);
    }

    // Extract sources if mentioned in the response
    const sources = extractSources(searchContent);

    return {
      content: searchContent,
      sources,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('Perplexity search timeout');
      return {
        content: 'Search timeout - unable to retrieve current information.',
        timestamp: new Date().toISOString(),
      };
    }

    console.error('Perplexity delegation error:', error);

    // Fallback to simplified search using existing web-search tool
    try {
      const { webSearch } = await import('@/lib/tools/web-search');
      const fallbackResults = await webSearch({
        query: searchQuery,
        max_results: 3,
      });

      return {
        content: fallbackResults,
        timestamp: new Date().toISOString(),
      };
    } catch (fallbackError) {
      console.error('Fallback search also failed:', fallbackError);
      return {
        content: 'Unable to retrieve current information at this time.',
        timestamp: new Date().toISOString(),
      };
    }
  }
}

/**
 * Formats search results for seamless integration into Claude's response
 */
export function formatSearchResultsForContext(
  searchResult: SearchResult,
  originalQuery: string,
): string {
  const timestamp = searchResult.timestamp
    ? new Date(searchResult.timestamp).toLocaleString()
    : 'Recent';

  let formatted = `[Web Search Context - Retrieved: ${timestamp}]
Query: "${originalQuery}"

${searchResult.content}`;

  if (searchResult.sources && searchResult.sources.length > 0) {
    formatted += `\n\nSources: ${searchResult.sources.join(', ')}`;
  }

  formatted += '\n\n[End of Search Context]';

  return formatted;
}

/**
 * Helper function to check for search triggers in the message
 */
function checkForSearchTriggers(message: string): boolean {
  const searchTriggers = [
    // Time-sensitive triggers
    'today',
    'current',
    'latest',
    'recent',
    'now',
    'happening',
    'yesterday',
    'this week',
    'this month',
    'this year',
    'right now',
    'as of',
    'up to date',
    'nowadays',
    'presently',
    // Specific years that indicate current info
    '2020',
    '2021',
    '2022',
    '2023',
    '2024',
    '2025',
    // AI and tech specific
    'ai',
    'claude',
    'gpt',
    'openai',
    'anthropic',
    'llm',
    'chatbot',
    'artificial intelligence',
    'machine learning',
    'deep learning',
    'neural network',
    // News and events
    'news',
    'update',
    'announcement',
    'breaking',
    'headline',
    'report',
    // Questions needing current info
    "what's",
    "what is",
    "who is",
    "where is",
    "when is",
    "when did",
    "how is",
    // Market and finance
    'price of',
    'stock',
    'bitcoin',
    'crypto',
    'market',
    'economy',
    'inflation',
    'interest rate',
    // Events and competitions
    'who won',
    'election',
    'results',
    'score',
    'game',
    'match',
    'tournament',
    // Weather and location
    'weather',
    'temperature',
    'forecast',
    'climate',
    // Specific queries
    'what happened',
    'status of',
    'how much',
    'how many',
    'statistics',
    'data on',
    'information about',
    // Tech and products
    'release',
    'launch',
    'version',
    'feature',
    'product',
    'service',
    'company',
    'startup',
  ];

  const lowerMessage = message.toLowerCase();
  return searchTriggers.some((trigger) => lowerMessage.includes(trigger));
}

/**
 * Extracts an optimized search query from the user message
 */
function extractSearchQuery(message: string): string {
  // Remove question words and clean up the query
  const cleanedQuery = message
    .replace(/^(what|who|when|where|why|how|is|are|was|were|do|does|did)\s+/gi, '')
    .replace(/\?/g, '')
    .trim();

  // Limit query length for better search results
  const words = cleanedQuery.split(/\s+/);
  if (words.length > 10) {
    return words.slice(0, 10).join(' ');
  }

  return cleanedQuery;
}

/**
 * Attempts to extract source URLs from the search content
 */
function extractSources(content: string): string[] {
  const sources: string[] = [];

  // Look for URLs in the content
  const urlRegex = /https?:\/\/[^\s)]+/g;
  const matches = content.match(urlRegex);

  if (matches) {
    sources.push(...matches.slice(0, 5)); // Limit to 5 sources
  }

  // Also look for domain names mentioned
  const domainRegex = /(?:from|source:|via)\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  let domainMatch;
  while ((domainMatch = domainRegex.exec(content)) !== null) {
    if (!sources.includes(domainMatch[1])) {
      sources.push(domainMatch[1]);
    }
  }

  return sources;
}

/**
 * Main orchestration function for the hybrid delegation pattern
 */
export async function orchestrateHybridResponse(
  messages: any[],
  config: DelegationConfig = {},
): Promise<{
  enhancedMessages: any[];
  searchPerformed: boolean;
  searchContext?: string;
}> {
  const { verboseLogging = false } = config;

  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== 'user') {
    return {
      enhancedMessages: messages,
      searchPerformed: false,
    };
  }

  // Phase 1: Analyze if delegation is needed
  const analysis = await analyzeForDelegation(lastMessage.content, messages, config);

  if (verboseLogging) {
    console.log('Delegation decision:', analysis);
  }

  // Lower threshold to be more aggressive about searching
  if (!analysis.needsWebSearch || analysis.confidence < 0.3) {
    return {
      enhancedMessages: messages,
      searchPerformed: false,
    };
  }

  // Phase 2: Delegate to Perplexity for search
  const searchQuery = analysis.searchQuery || lastMessage.content;
  const searchResult = await delegateToPerplexity(searchQuery, config);

  // Phase 3: Format and inject search results
  const searchContext = formatSearchResultsForContext(searchResult, searchQuery);

  // Create enhanced messages with search context
  const enhancedMessages = [
    ...messages.slice(0, -1),
    {
      role: 'system',
      content: `${searchContext}\n\nIntegrate this information naturally into your philosophical response while maintaining your contrarian perspective.`,
    },
    lastMessage,
  ];

  return {
    enhancedMessages,
    searchPerformed: true,
    searchContext,
  };
}
