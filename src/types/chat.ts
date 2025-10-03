export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  tokenUsage?: TokenUsage;
}

export interface ChatSession {
  id: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  totalTokens: number;
  totalCost: number;
}

export interface ChatRequest {
  message: string;
  sessionId?: string;
}

export interface ChatResponse {
  message: Message;
  sessionId: string;
  tokenUsage?: TokenUsage;
}

// Model configuration
export interface AIModel {
  id: string;
  name: string;
  provider: string;
  description?: string;
}

export const AVAILABLE_MODELS: AIModel[] = [
  {
    id: 'anthropic/claude-sonnet-4.5',
    name: 'Claude Sonnet 4.5',
    provider: 'Anthropic',
    description: 'Latest and most capable Claude model - Best for coding and agents',
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    description: 'Latest GPT-4 optimized model',
  },
  {
    id: 'google/gemini-pro-1.5',
    name: 'Gemini 1.5 Pro',
    provider: 'Google',
    description: 'Google\'s advanced multimodal model',
  },
  {
    id: 'meta-llama/llama-3.1-405b-instruct',
    name: 'Llama 3.1 405B',
    provider: 'Meta',
    description: 'Meta\'s largest open-source model',
  },
  {
    id: 'perplexity/llama-3.1-sonar-large-128k-online',
    name: 'Perplexity Sonar',
    provider: 'Perplexity',
    description: 'Model with real-time web search',
  },
];

export const DEFAULT_MODEL_ID = 'anthropic/claude-sonnet-4.5';
export const DEFAULT_MODEL = DEFAULT_MODEL_ID; // Alias for compatibility
