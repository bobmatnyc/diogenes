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

export const DEFAULT_MODEL = 'openai/gpt-4-turbo';

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