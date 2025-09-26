/**
 * Memory System Client
 * Provides functions to interact with the memory API for storing and retrieving user interactions
 */

import type {
  ApiResponse,
  CreateEntityRequest,
  CreateMemoryRequest,
  Memory,
  MemoryConfig,
  MemoryContextResult,
  MemoryDebugInfo,
  MemoryEntity,
  PaginatedResponse,
  SaveInteractionRequest,
  SearchMemoriesResponse,
} from './types';

// Default configuration
const DEFAULT_CONFIG: Partial<MemoryConfig> = {
  baseUrl: '/api/memory',
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 10000,
  debugMode: false,
  cacheEnabled: true,
  cacheTTL: 300000, // 5 minutes
};

// In-memory cache for performance
const memoryCache = new Map<string, { data: any; expiry: number }>();

/**
 * Memory Client Class
 * Handles all interactions with the memory API
 */
export class MemoryClient {
  private config: MemoryConfig;
  private debugInfo: MemoryDebugInfo | null = null;

  constructor(config: Partial<MemoryConfig> & { apiKey: string }) {
    this.config = { ...DEFAULT_CONFIG, ...config } as MemoryConfig;
  }

  /**
   * Get or create entity for a user
   */
  async getOrCreateUserEntity(
    userId: string,
    userName: string,
    userEmail?: string
  ): Promise<MemoryEntity | null> {
    console.log('[MemoryClient] getOrCreateUserEntity called with:', { userId, userName, userEmail });
    try {
      // When using internal API key, we need to provide user_email to create entities for specific users
      // The memory system will create the user if they don't exist
      const effectiveEmail = userEmail || `${userId}@clerk.local`;
      console.log('[MemoryClient] Using effective email:', effectiveEmail);

      // First, try to get existing entities for this email/user
      console.log('[MemoryClient] Fetching entities for email:', effectiveEmail);
      const entities = await this.listEntitiesForEmail(effectiveEmail);
      console.log('[MemoryClient] Found entities:', entities?.length || 0);
      const userEntity = entities?.find(
        (e) => e.entity_type === 'person' &&
        (e.metadata?.clerk_user_id === userId || e.metadata?.is_primary_user_entity === true)
      );

      if (userEntity) {
        console.log('[MemoryClient] Found existing user entity:', userEntity.id);
        return userEntity;
      }
      console.log('[MemoryClient] No existing entity found, creating new one...');

      // Create new entity for user
      const createRequest: CreateEntityRequest & { user_email?: string } = {
        entity_type: 'person',
        name: userName,
        description: `User profile for ${userName}`,
        metadata: {
          clerk_user_id: userId,
          email: userEmail || effectiveEmail,
          created_from: 'diogenes_chat',
          is_primary_user_entity: true,
        },
        user_email: effectiveEmail, // This allows the internal API to create entities for specific users
      };

      const newEntity = await this.createEntity(createRequest);
      console.log('[MemoryClient] Created new entity:', newEntity?.id);
      return newEntity;
    } catch (error) {
      console.error('[MemoryClient] Failed to get/create user entity:', error);
      if (error instanceof Error) {
        console.error('[MemoryClient] Error details:', error.message);
        console.error('[MemoryClient] Error stack:', error.stack);
      }
      return null;
    }
  }

  /**
   * Save a chat interaction as a memory
   */
  async saveInteraction(
    entityId: string,
    userInput: string,
    assistantResponse: string,
    context: SaveInteractionRequest['context'],
    metadata?: SaveInteractionRequest['metadata']
  ): Promise<Memory | null> {
    const startTime = Date.now();

    try {
      // Create memory title from first 50 chars of user input
      const title = `Chat: ${userInput.substring(0, 50)}${userInput.length > 50 ? '...' : ''}`;

      // Calculate importance based on response length and context
      const importance = this.calculateImportance(userInput, assistantResponse, context);

      // Create memory content as structured JSON
      const content = JSON.stringify({
        user_input: userInput,
        assistant_response: assistantResponse,
        interaction_type: 'chat',
        timestamp: new Date().toISOString(),
      }, null, 2);

      const memoryRequest: CreateMemoryRequest = {
        entity_id: entityId,
        memory_type: 'context',
        title,
        content,
        importance,
        metadata: {
          persona: context.persona,
          model: context.model,
          search_performed: context.search_performed,
          search_context: context.search_results,
          ...metadata,
        },
      };

      console.log('[MemoryClient] Creating memory with request:', memoryRequest);
      const memory = await this.createMemory(memoryRequest);
      console.log('[MemoryClient] Memory created successfully:', memory?.id);

      // Update debug info if in debug mode
      if (this.config.debugMode && memory) {
        this.debugInfo = {
          ...this.debugInfo,
          storage: {
            entityId,
            memoryId: memory.id,
            importance,
            timeMs: Date.now() - startTime,
          },
        } as MemoryDebugInfo;
      }

      return memory;
    } catch (error) {
      console.error('[MemoryClient] Failed to save interaction:', error);
      if (error instanceof Error) {
        console.error('[MemoryClient] Error details:', error.message);
        console.error('[MemoryClient] Error stack:', error.stack);
      }

      if (this.config.debugMode) {
        this.debugInfo = {
          ...this.debugInfo,
          errors: [...(this.debugInfo?.errors || []), `Save interaction failed: ${error}`],
        } as MemoryDebugInfo;
      }

      return null;
    }
  }

  /**
   * Search for relevant memories based on user input
   */
  async searchRelevantMemories(
    userInput: string,
    entityId?: string,
    limit: number = 10
  ): Promise<MemoryContextResult> {
    const startTime = Date.now();

    try {
      // Extract key terms for search
      const searchQuery = this.extractKeyTerms(userInput);

      const searchResponse = await this.searchMemories(searchQuery, entityId, limit);

      if (!searchResponse || searchResponse.results.length === 0) {
        return {
          memories: [],
          summary: '',
          relevanceScores: {},
          totalTokens: 0,
        };
      }

      // Calculate relevance scores
      const relevanceScores = this.calculateRelevanceScores(userInput, searchResponse.results);

      // Sort by relevance and recency
      const sortedMemories = searchResponse.results
        .sort((a, b) => {
          const scoreA = relevanceScores[a.id] || 0;
          const scoreB = relevanceScores[b.id] || 0;
          if (scoreA !== scoreB) return scoreB - scoreA;

          // If scores are equal, prefer more recent
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        })
        .slice(0, limit);

      // Generate context summary
      const summary = this.generateContextSummary(sortedMemories);

      // Estimate token usage
      const totalTokens = this.estimateTokens(summary);

      // Update debug info if in debug mode
      if (this.config.debugMode) {
        this.debugInfo = {
          ...this.debugInfo,
          retrieval: {
            query: searchQuery,
            memoriesFound: sortedMemories.length,
            relevanceScores,
            timeMs: Date.now() - startTime,
          },
        } as MemoryDebugInfo;
      }

      return {
        memories: sortedMemories,
        summary,
        relevanceScores,
        totalTokens,
      };
    } catch (error) {
      console.error('[MemoryClient] Failed to search relevant memories:', error);

      if (this.config.debugMode) {
        this.debugInfo = {
          ...this.debugInfo,
          errors: [...(this.debugInfo?.errors || []), `Search memories failed: ${error}`],
        } as MemoryDebugInfo;
      }

      return {
        memories: [],
        summary: '',
        relevanceScores: {},
        totalTokens: 0,
      };
    }
  }

  /**
   * Get debug information (only available in debug mode)
   */
  getDebugInfo(): MemoryDebugInfo | null {
    return this.config.debugMode ? this.debugInfo : null;
  }

  /**
   * Clear debug information
   */
  clearDebugInfo(): void {
    this.debugInfo = null;
  }

  // Private API methods

  private async createEntity(request: CreateEntityRequest & { user_email?: string }): Promise<MemoryEntity | null> {
    try {
      const response = await this.fetchWithRetry<ApiResponse<MemoryEntity>>(
        `${this.config.baseUrl}/entities`,
        {
          method: 'POST',
          body: JSON.stringify(request),
        }
      );

      return response.success ? response.data || null : null;
    } catch (error) {
      console.error('[MemoryClient] Create entity failed:', error);
      return null;
    }
  }

  private async listEntities(): Promise<MemoryEntity[]> {
    const cacheKey = 'entities_list';

    // Check cache
    if (this.config.cacheEnabled) {
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
    }

    try {
      const response = await this.fetchWithRetry<ApiResponse<PaginatedResponse<MemoryEntity>>>(
        `${this.config.baseUrl}/entities?limit=100`
      );

      const entities = response.success ? response.data?.data || [] : [];

      // Cache the result
      if (this.config.cacheEnabled && entities.length > 0) {
        this.setInCache(cacheKey, entities);
      }

      return entities;
    } catch (error) {
      console.error('[MemoryClient] List entities failed:', error);
      return [];
    }
  }

  private async listEntitiesForEmail(email: string): Promise<MemoryEntity[]> {
    const cacheKey = `entities_${email}`;
    console.log('[MemoryClient] listEntitiesForEmail called for:', email);

    // Check cache
    if (this.config.cacheEnabled) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        console.log('[MemoryClient] Found cached entities for email:', email);
        return cached;
      }
    }

    try {
      const url = `${this.config.baseUrl}/entities?limit=100&user_email=${encodeURIComponent(email)}`;
      console.log('[MemoryClient] Fetching entities from:', url);
      const response = await this.fetchWithRetry<ApiResponse<PaginatedResponse<MemoryEntity>>>(url);

      console.log('[MemoryClient] List entities response:', response);
      const entities = response.success ? response.data?.data || [] : [];
      console.log('[MemoryClient] Found', entities.length, 'entities for email:', email);

      // Cache the result
      if (this.config.cacheEnabled && entities.length > 0) {
        this.setInCache(cacheKey, entities);
      }

      return entities;
    } catch (error) {
      console.error('[MemoryClient] List entities for email failed:', error);
      if (error instanceof Error) {
        console.error('[MemoryClient] Error message:', error.message);
      }
      return [];
    }
  }

  private async createMemory(request: CreateMemoryRequest): Promise<Memory | null> {
    try {
      const response = await this.fetchWithRetry<ApiResponse<Memory>>(
        `${this.config.baseUrl}/memories`,
        {
          method: 'POST',
          body: JSON.stringify(request),
        }
      );

      return response.success ? response.data || null : null;
    } catch (error) {
      console.error('[MemoryClient] Create memory failed:', error);
      return null;
    }
  }

  private async searchMemories(
    query: string,
    entityId?: string,
    limit: number = 50
  ): Promise<SearchMemoriesResponse | null> {
    try {
      const response = await this.fetchWithRetry<ApiResponse<SearchMemoriesResponse>>(
        `${this.config.baseUrl}/search`,
        {
          method: 'POST',
          body: JSON.stringify({
            query,
            entity_id: entityId,
            limit,
          }),
        }
      );

      return response.success ? response.data || null : null;
    } catch (error) {
      console.error('[MemoryClient] Search memories failed:', error);
      return null;
    }
  }

  // Helper methods

  private async fetchWithRetry<T>(url: string, options: RequestInit = {}): Promise<T> {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
      ...options.headers,
    };

    let lastError;
    const maxRetries = this.config?.maxRetries || 3;
    const timeout = this.config?.timeout || 5000;
    for (let i = 0; i < maxRetries; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        lastError = error;
        if (i < maxRetries - 1) {
          const retryDelay = this.config?.retryDelay || 1000;
          await this.delay(retryDelay * Math.pow(2, i)); // Exponential backoff
        }
      }
    }

    throw lastError;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getFromCache(key: string): any {
    const cached = memoryCache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    memoryCache.delete(key);
    return null;
  }

  private setInCache(key: string, data: any): void {
    memoryCache.set(key, {
      data,
      expiry: Date.now() + (this.config?.cacheTTL || 300000),
    });
  }

  private extractKeyTerms(text: string): string {
    // Simple keyword extraction - could be enhanced with NLP
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but',
      'in', 'with', 'to', 'for', 'of', 'as', 'from', 'by', 'that', 'this',
      'it', 'what', 'how', 'when', 'where', 'who', 'why', 'are', 'was',
      'were', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    ]);

    return text
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 3 && !stopWords.has(word))
      .slice(0, 10)
      .join(' ');
  }

  private calculateImportance(
    userInput: string,
    assistantResponse: string,
    context: SaveInteractionRequest['context']
  ): number {
    let importance = 5; // Base importance

    // Increase for longer, substantive conversations
    if (assistantResponse.length > 500) importance += 1;
    if (assistantResponse.length > 1000) importance += 1;

    // Increase if search was performed (indicates information-seeking)
    if (context.search_performed) importance += 2;

    // Increase for certain keywords indicating important topics
    const importantKeywords = [
      'remember', 'important', 'always', 'never', 'prefer',
      'like', 'dislike', 'goal', 'plan', 'project', 'deadline',
    ];

    const lowerInput = userInput.toLowerCase();
    if (importantKeywords.some((keyword) => lowerInput.includes(keyword))) {
      importance += 1;
    }

    return Math.min(importance, 10); // Cap at 10
  }

  private calculateRelevanceScores(query: string, memories: Memory[]): Record<string, number> {
    const scores: Record<string, number> = {};
    const queryTerms = query.toLowerCase().split(/\s+/);

    for (const memory of memories) {
      let score = 0;
      const content = (memory.content + ' ' + memory.title).toLowerCase();

      // Term frequency scoring
      for (const term of queryTerms) {
        if (content.includes(term)) {
          score += (content.match(new RegExp(term, 'g')) || []).length;
        }
      }

      // Boost recent memories
      const ageInDays = (Date.now() - new Date(memory.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (ageInDays < 1) score *= 2;
      else if (ageInDays < 7) score *= 1.5;
      else if (ageInDays < 30) score *= 1.2;

      // Factor in importance
      score *= (memory.importance / 10);

      scores[memory.id] = score;
    }

    return scores;
  }

  private generateContextSummary(memories: Memory[]): string {
    if (memories.length === 0) return '';

    const summaryParts: string[] = ['Previous context from memories:'];

    for (const memory of memories.slice(0, 5)) {
      // Max 5 memories in summary
      try {
        const content = JSON.parse(memory.content);
        if (content.user_input && content.assistant_response) {
          // For interaction memories
          summaryParts.push(
            `- User asked: "${content.user_input.substring(0, 100)}..." and you responded about ${
              content.assistant_response.substring(0, 150)
            }...`
          );
        } else {
          // For other memory types
          summaryParts.push(`- ${memory.title}: ${memory.content.substring(0, 150)}...`);
        }
      } catch {
        // If not JSON, use raw content
        summaryParts.push(`- ${memory.title}: ${memory.content.substring(0, 150)}...`);
      }
    }

    return summaryParts.join('\n');
  }

  private estimateTokens(text: string): number {
    // Simple estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Store a memory (alias for saveInteraction for backward compatibility)
   */
  async storeMemory(request: CreateMemoryRequest, userEmail: string): Promise<void> {
    const interactionRequest: SaveInteractionRequest = {
      entity_id: request.entity_id,
      user_input: request.title,
      assistant_response: request.content,
      context: {
        persona: 'executive' as const,
        model: 'claude-3.5-sonnet',
        search_performed: false,
        timestamp: new Date().toISOString()
      },
      metadata: {
        importance: request.importance,
        memory_type: request.memory_type,
        user_email: userEmail,
        ...request.metadata
      }
    };

    if (interactionRequest.entity_id) {
      await this.saveInteraction(
        interactionRequest.entity_id,
        interactionRequest.user_input,
        interactionRequest.assistant_response,
        interactionRequest.context,
        interactionRequest.metadata
      );
    }
  }
}

// Singleton instance for the application
let memoryClientInstance: MemoryClient | null = null;

/**
 * Get or create the memory client instance
 */
export function getMemoryClient(): MemoryClient | null {
  if (!memoryClientInstance) {
    const apiKey = process.env.MEMORY_API_INTERNAL_KEY;

    if (!apiKey) {
      console.warn('[MemoryClient] MEMORY_API_INTERNAL_KEY not configured');
      return null;
    }

    memoryClientInstance = new MemoryClient({
      apiKey,
      debugMode: process.env.NODE_ENV === 'development',
      baseUrl: '/api/memory',
    });
  }

  return memoryClientInstance;
}

/**
 * Create a memory client with custom configuration
 */
export function createMemoryClient(config: Partial<MemoryConfig> & { apiKey: string }): MemoryClient {
  return new MemoryClient(config);
}

/**
 * Generate a summary of a chat session
 */
export function generateSessionSummary(messages: any[]): string {
  const userMessages = messages.filter(m => m.role === 'user');
  const assistantMessages = messages.filter(m => m.role === 'assistant');

  if (messages.length === 0) return 'Empty session';

  const topics = extractTopics(messages);
  const keyQuestions = userMessages
    .filter(m => m.content.includes('?'))
    .slice(0, 3)
    .map(m => m.content.substring(0, 100));

  let summary = `Chat session with ${userMessages.length} user messages and ${assistantMessages.length} responses.`;

  if (topics.length > 0) {
    summary += ` Topics discussed: ${topics.join(', ')}.`;
  }

  if (keyQuestions.length > 0) {
    summary += ` Key questions: ${keyQuestions.join('; ')}.`;
  }

  return summary;
}

/**
 * Extract topics from chat messages
 */
export function extractTopics(messages: any[]): string[] {
  const topics = new Set<string>();

  for (const message of messages) {
    // Extract technology terms
    const techTerms = message.content.match(/\b(?:AI|API|database|function|code|search|web|memory|context|authentication|deployment|testing|performance|security|optimization|backend|frontend|React|TypeScript|JavaScript|Python|Node\.js|Docker|Kubernetes|AWS|GCP|Azure)\b/gi);

    if (techTerms) {
      techTerms.forEach((term: string) => topics.add(term.toLowerCase()));
    }

    // Extract common business terms
    const businessTerms = message.content.match(/\b(?:project|development|implementation|design|architecture|requirements|strategy|planning|management|analysis|documentation|testing|deployment|monitoring|performance|scalability|security|integration|migration|optimization)\b/gi);

    if (businessTerms) {
      businessTerms.forEach((term: string) => topics.add(term.toLowerCase()));
    }
  }

  return Array.from(topics).slice(0, 10); // Limit to top 10 topics
}