import OpenAI from 'openai';
import { getEnvVar, requireEnvVar } from './env-edge';

// Create OpenRouter client dynamically with enforced .env priority
export function getOpenRouterClient() {
  // CRITICAL: Use requireEnvVar to ONLY get value from .env files
  // This prevents shell environment from overriding .env.local
  const apiKey = requireEnvVar('OPENROUTER_API_KEY');

  return new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: apiKey,
    defaultHeaders: {
      'HTTP-Referer': getEnvVar('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
      'X-Title': 'Diogenes - The Contrarian AI',
    },
    // Timeout configuration: 25 seconds with 5s buffer before Vercel's 30s limit
    timeout: 25000,
    // Automatic retry on connection failures
    maxRetries: 2,
  });
}

// For backward compatibility
export const openrouter = getOpenRouterClient();

// Model configurations for different purposes
export const MODELS = {
  // Primary model: Claude Sonnet 4.5 for superior philosophical reasoning and coding
  CLAUDE_SONNET: 'anthropic/claude-sonnet-4.5',
  
  // Additional primary models for user selection
  CLAUDE_OPUS: 'anthropic/claude-opus-4.1',
  GPT_4_TURBO: 'openai/gpt-4-turbo',
  GEMINI_PRO: 'google/gemini-1.5-pro-latest',
  QWEN_CHAT: 'qwen/qwen-110b-chat',
  GROK_2: 'xai/grok-2-latest',

  // Delegation models: Perplexity for web search
  PERPLEXITY_SONAR_PRO: 'perplexity/sonar-pro',
  PERPLEXITY_SONAR_ONLINE: 'perplexity/llama-3.1-sonar-large-128k-online',

  // Fallback models
  CLAUDE_HAIKU: 'anthropic/claude-3-haiku-20240307',
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
