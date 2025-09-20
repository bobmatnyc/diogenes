/**
 * Memory System Type Definitions
 * Provides TypeScript interfaces for the memory API integration
 */

// Core Database Types
export interface MemoryUser {
  id: string;
  email: string;
  name: string;
  api_key_hash: string;
  is_active: number; // SQLite boolean (0/1)
  created_at: string;
}

export interface MemoryEntity {
  id: string;
  user_id: string;
  entity_type: EntityType;
  name: string;
  description?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Memory {
  id: string;
  user_id: string;
  entity_id: string;
  memory_type: MemoryType;
  title: string;
  content: string;
  metadata: MemoryMetadata;
  importance: number; // 1-10 scale
  created_at: string;
  updated_at: string;
}

export interface Interaction {
  id: string;
  user_id: string;
  entity_id?: string;
  user_input: string;
  assistant_response: string;
  context: InteractionContext;
  metadata: InteractionMetadata;
  created_at: string;
}

// Enums for valid types
export type EntityType =
  | 'person'
  | 'organization'
  | 'project'
  | 'concept'
  | 'location'
  | 'event'
  | 'other';

export type MemoryType =
  | 'fact'
  | 'preference'
  | 'experience'
  | 'instruction'
  | 'context'
  | 'relationship'
  | 'skill'
  | 'goal'
  | 'interaction'
  | 'other';

// Metadata types
export interface MemoryMetadata {
  persona?: 'diogenes' | 'bob' | 'executive';
  model?: string;
  search_performed?: boolean;
  search_context?: string;
  importance_reason?: string;
  [key: string]: any;
}

export interface InteractionContext {
  persona: 'diogenes' | 'bob' | 'executive';
  model: string;
  search_performed: boolean;
  search_results?: string;
  memory_context?: string[];
  timestamp: string;
}

export interface InteractionMetadata {
  token_usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cost: number;
  };
  response_time_ms?: number;
  [key: string]: any;
}

// API Request/Response Types
export interface CreateEntityRequest {
  entity_type: EntityType;
  name: string;
  description?: string;
  metadata?: Record<string, any>;
  user_email?: string; // For internal API to specify which user to create entity for
}

export interface CreateMemoryRequest {
  entity_id: string;
  memory_type: MemoryType;
  title: string;
  content: string;
  metadata?: MemoryMetadata;
  importance?: number;
}

export interface SaveInteractionRequest {
  entity_id?: string;
  user_input: string;
  assistant_response: string;
  context: InteractionContext;
  metadata?: InteractionMetadata;
}

export interface SearchMemoriesRequest {
  query: string;
  entity_id?: string;
  limit?: number;
  memory_types?: MemoryType[];
  importance_min?: number;
}

export interface SearchMemoriesResponse {
  query: string;
  entity_id?: string;
  results: Memory[];
  total_results: number;
  limit: number;
}

// API Response Wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  message?: string;
  details?: Record<string, any>;
}

// Paginated Response
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// Memory System Configuration
export interface MemoryConfig {
  apiKey: string;
  baseUrl?: string;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  debugMode?: boolean;
  cacheEnabled?: boolean;
  cacheTTL?: number;
}

// Memory Context for Chat
export interface MemoryContextResult {
  memories: Memory[];
  summary: string;
  relevanceScores: Record<string, number>;
  totalTokens: number;
}

// Debug Information
export interface MemoryDebugInfo {
  retrieval: {
    query: string;
    memoriesFound: number;
    relevanceScores: Record<string, number>;
    timeMs: number;
  };
  storage: {
    entityId: string;
    memoryId: string;
    importance: number;
    timeMs: number;
  };
  errors?: string[];
}