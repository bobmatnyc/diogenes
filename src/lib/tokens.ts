import { getEncoding } from 'js-tiktoken';

// Token pricing based on GPT-4-turbo rates
const PRICING = {
  inputTokensPer1k: 0.01,   // $0.01 per 1k input tokens
  outputTokensPer1k: 0.03,  // $0.03 per 1k output tokens
};

// Cache the encoding to avoid re-initialization
let encodingCache: ReturnType<typeof getEncoding> | null = null;

/**
 * Get the tiktoken encoding for GPT models
 * Uses cl100k_base encoding which is used by GPT-4 and GPT-3.5-turbo
 */
function getEncoder() {
  if (!encodingCache) {
    encodingCache = getEncoding('cl100k_base');
  }
  return encodingCache;
}

/**
 * Estimate the number of tokens in a text string
 * @param text The text to count tokens for
 * @returns The estimated number of tokens
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  
  try {
    const encoding = getEncoder();
    const tokens = encoding.encode(text);
    return tokens.length;
  } catch (error) {
    console.error('Error counting tokens:', error);
    // Fallback to rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}

/**
 * Estimate tokens for a conversation with messages
 * Includes overhead for message formatting
 * @param messages Array of message objects
 * @returns Total estimated tokens
 */
export function estimateMessagesTokens(messages: Array<{ role: string; content: string }>): number {
  let totalTokens = 0;
  
  for (const message of messages) {
    // Each message has ~4 tokens of overhead for formatting
    totalTokens += 4;
    totalTokens += estimateTokens(message.role);
    totalTokens += estimateTokens(message.content);
  }
  
  // Add ~2 tokens for priming
  totalTokens += 2;
  
  return totalTokens;
}

/**
 * Calculate the cost based on token usage
 * @param promptTokens Number of input/prompt tokens
 * @param completionTokens Number of output/completion tokens
 * @returns The calculated cost in USD
 */
export function calculateCost(promptTokens: number, completionTokens: number): number {
  const inputCost = (promptTokens / 1000) * PRICING.inputTokensPer1k;
  const outputCost = (completionTokens / 1000) * PRICING.outputTokensPer1k;
  return inputCost + outputCost;
}

/**
 * Format token count for display
 * @param tokens Number of tokens
 * @returns Formatted string
 */
export function formatTokens(tokens: number): string {
  if (tokens < 1000) {
    return `${tokens} tokens`;
  }
  return `${(tokens / 1000).toFixed(1)}k tokens`;
}

/**
 * Format cost for display
 * @param cost Cost in USD
 * @returns Formatted string with dollar sign
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return '<$0.01';
  }
  return `$${cost.toFixed(2)}`;
}

/**
 * Parse token usage from OpenRouter response
 * OpenRouter may provide usage data in different formats
 * @param response The response object or headers
 * @returns Token usage data or null if not available
 */
export function parseOpenRouterUsage(response: any): {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
} | null {
  try {
    // Check for usage in the response body
    if (response?.usage) {
      return {
        promptTokens: response.usage.prompt_tokens || 0,
        completionTokens: response.usage.completion_tokens || 0,
        totalTokens: response.usage.total_tokens || 0,
      };
    }
    
    // Check for usage in headers (OpenRouter specific)
    if (response?.headers) {
      const promptTokens = parseInt(response.headers.get('x-ratelimit-tokens-prompt') || '0');
      const completionTokens = parseInt(response.headers.get('x-ratelimit-tokens-completion') || '0');
      const totalTokens = parseInt(response.headers.get('x-ratelimit-tokens-total') || '0');
      
      if (totalTokens > 0) {
        return { promptTokens, completionTokens, totalTokens };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing OpenRouter usage:', error);
    return null;
  }
}

/**
 * Clean up the encoding when done (for memory management)
 */
export function cleanupEncoder() {
  if (encodingCache) {
    // js-tiktoken doesn't have a free method, just clear the cache
    encodingCache = null;
  }
}