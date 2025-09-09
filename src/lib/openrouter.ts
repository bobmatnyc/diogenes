import OpenAI from 'openai';

// Create OpenRouter client dynamically to ensure fresh env vars
export function getOpenRouterClient() {
  return new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY || '',
    defaultHeaders: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'Diogenes - The Contrarian AI',
    },
  });
}

// For backward compatibility
export const openrouter = getOpenRouterClient();

// Model configurations for different purposes
export const MODELS = {
  // Primary model: Claude 3.5 Sonnet for superior philosophical reasoning
  CLAUDE_SONNET: 'anthropic/claude-3.5-sonnet-20241022',
  
  // Delegation models: Perplexity for web search
  PERPLEXITY_SONAR_PRO: 'perplexity/sonar-pro',
  PERPLEXITY_SONAR_ONLINE: 'perplexity/llama-3.1-sonar-large-128k-online',
  
  // Fallback models
  CLAUDE_HAIKU: 'anthropic/claude-3-haiku-20240307',
  GPT_4_TURBO: 'openai/gpt-4-turbo-preview',
};

// Default model for Diogenes responses
export const DEFAULT_MODEL = MODELS.CLAUDE_SONNET;

export interface OpenRouterStreamOptions {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}