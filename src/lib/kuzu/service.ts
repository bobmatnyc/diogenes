// Remove direct KuzuMemory import to avoid dependency issues
// We'll use our own implementation instead
import { LocalStorageAdapter } from './storage/local-adapter';
import { VercelBlobAdapter } from './storage/vercel-adapter';
import type {
  Memory,
  MemoryContext,
  StorageAdapter,
  KuzuMemoryConfig,
  EnrichedPromptResult,
  KuzuMemoryEnrichment,
  KuzuMemoryExtraction,
  KuzuCommandResult,
  AssistantMemoryContext,
  PromptEnrichmentResult,
  MemoryFilter,
  MemoryStats,
} from './types';

/**
 * Main memory service for managing user memories
 * Note: We're not using kuzu-memory directly due to dependency conflicts
 * with webworker-threads and aws4 in Node.js environment
 */
export class MemoryService {
  private storage: StorageAdapter;
  private config: KuzuMemoryConfig;
  private static instance: MemoryService;

  constructor(config?: Partial<KuzuMemoryConfig>) {
    // Default configuration
    this.config = {
      maxMemoriesPerUser: Number(process.env.MEMORY_MAX_PER_USER) || 1000,
      memoryTTLDays: Number(process.env.MEMORY_TTL_DAYS) || 30,
      enableAutoExtraction:
        process.env.MEMORY_AUTO_EXTRACT === 'true' || true,
      enableExplicitCommands: true,
      storage: 'auto',
      ...config,
    };

    // Auto-detect storage backend
    this.storage = this.createStorageAdapter();
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<KuzuMemoryConfig>): MemoryService {
    if (!MemoryService.instance) {
      MemoryService.instance = new MemoryService(config);
    }
    return MemoryService.instance;
  }

  /**
   * Initialize the memory service
   */
  async initialize(): Promise<void> {
    await this.storage.initialize();
  }

  /**
   * Enrich a prompt with relevant memories (Behind the scenes)
   * This method finds relevant memories and returns enrichment content
   * that can be transparently added to the system prompt
   */
  async enrichPromptBehindTheScenes(
    prompt: string,
    userId: string
  ): Promise<PromptEnrichmentResult> {
    console.log('[MemoryService] Starting prompt enrichment for user:', userId);
    console.log('[MemoryService] Prompt length:', prompt.length, 'characters');

    try {
      // Get user memories (prioritize user and assistant memories)
      const filter: MemoryFilter = {
        source: undefined, // Get all sources but we'll prioritize
      };
      const memories = await this.storage.getMemories(userId, 50, filter);

      console.log('[MemoryService] Retrieved', memories.length, 'total memories for user');

      if (memories.length === 0) {
        console.log('[MemoryService] No memories found - skipping enrichment');
        return {
          originalPrompt: prompt,
          enrichedContent: '',
          relevantMemories: [],
          confidenceScore: 0,
          enrichmentMethod: 'keyword',
        };
      }

      // Enhanced relevance scoring
      const scoredMemories = memories.map(memory => {
        let score = 0;
        const promptLower = prompt.toLowerCase();
        const contentLower = memory.content.toLowerCase();

        // Keyword matching
        const promptWords = promptLower.split(/\s+/).filter(w => w.length > 3);
        const contentWords = contentLower.split(/\s+/).filter(w => w.length > 3);
        const commonWords = promptWords.filter(word => contentWords.includes(word));
        score += commonWords.length * 2;

        // Exact phrase matching
        if (contentLower.includes(promptLower)) score += 10;

        // Prioritize user-created memories
        if (memory.source === 'user') score += 3;
        if (memory.source === 'assistant') score += 1;

        // Recency bonus (memories from last 7 days)
        const ageInDays = (Date.now() - new Date(memory.timestamp).getTime()) / (1000 * 60 * 60 * 24);
        if (ageInDays < 7) score += 2;
        if (ageInDays < 1) score += 3;

        // Importance factor
        score *= (memory.importance || 0.5);

        return { memory, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

      const relevantMemories = scoredMemories.map(item => item.memory);
      const avgScore = scoredMemories.reduce((sum, item) => sum + item.score, 0) / (scoredMemories.length || 1);
      const confidenceScore = Math.min(avgScore / 10, 1); // Normalize to 0-1

      console.log('[MemoryService] Found', relevantMemories.length, 'relevant memories');
      console.log('[MemoryService] Average relevance score:', avgScore.toFixed(2));
      console.log('[MemoryService] Confidence score:', confidenceScore.toFixed(2));

      if (relevantMemories.length > 0) {
        console.log('[MemoryService] Relevant memories:');
        relevantMemories.forEach((m, i) => {
          console.log(`  ${i + 1}. [${m.source}] ${m.content.substring(0, 100)}${m.content.length > 100 ? '...' : ''}`);
        });
      }

      // Create enrichment content (not visible to user)
      let enrichedContent = '';
      if (relevantMemories.length > 0) {
        const memoryLines = relevantMemories.map((m, i) => {
          const source = m.source === 'user' ? 'User mentioned' : 'Previously discussed';
          return `- ${source}: ${m.content}`;
        });

        enrichedContent = [
          '\n[Memory Context - Not shown to user]',
          'Relevant information from previous conversations:',
          ...memoryLines,
          'Use this context naturally in your response without explicitly mentioning you remember it.',
          '[End Memory Context]\n'
        ].join('\n');

        console.log('[MemoryService] Enrichment content length:', enrichedContent.length, 'characters');
      }

      return {
        originalPrompt: prompt,
        enrichedContent,
        relevantMemories,
        confidenceScore,
        enrichmentMethod: 'combined',
      };
    } catch (error) {
      console.error('[MemoryService] Failed to enrich prompt:', error);
      if (error instanceof Error) {
        console.error('[MemoryService] Error details:', error.message);
        console.error('[MemoryService] Error stack:', error.stack);
      }
      return {
        originalPrompt: prompt,
        enrichedContent: '',
        relevantMemories: [],
        confidenceScore: 0,
        enrichmentMethod: 'keyword',
      };
    }
  }

  /**
   * Legacy enrichPrompt method for backward compatibility
   */
  async enrichPrompt(
    prompt: string,
    userId: string
  ): Promise<KuzuMemoryEnrichment> {
    const result = await this.enrichPromptBehindTheScenes(prompt, userId);

    // Convert to legacy format
    let enrichedPrompt = prompt;
    if (result.enrichedContent) {
      enrichedPrompt = result.enrichedContent + '\n\n' + prompt;
    }

    return {
      originalPrompt: prompt,
      enrichedPrompt,
      relevantMemories: result.relevantMemories,
      memoryCount: result.relevantMemories.length,
    };
  }

  /**
   * Extract memories from a conversation
   */
  async extractMemories(
    conversation: string,
    userId: string
  ): Promise<KuzuMemoryExtraction> {
    if (!this.config.enableAutoExtraction) {
      return {
        extractedMemories: [],
        conversation,
        timestamp: new Date(),
      };
    }

    try {
      // For now, skip automatic extraction to avoid IndexedDB issues
      // TODO: Configure kuzu-memory for Node.js environment properly or implement simple extraction
      const memories: Memory[] = [];

      // Simple pattern extraction based on conversation content
      // Look for explicit statements like "I prefer", "I am", "My name is", etc.
      const extractionPatterns = [
        /I (?:am|like|prefer|work at|live in|enjoy|hate|dislike) [^.!?]+/gi,
        /My (?:name is|job is|favorite|hobby is) [^.!?]+/gi,
        /I'm (?:a|an) [^.!?]+/gi,
      ];

      for (const pattern of extractionPatterns) {
        const matches = conversation.match(pattern);
        if (matches) {
          for (const match of matches) {
            const memory: Memory = {
              id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              content: match.trim(),
              type: 'semantic',
              timestamp: new Date(),
              tags: [],
              accessCount: 0,
              importance: 0.5,
              decay: 0.1,
              relations: [],
              metadata: {
                userId,
                extractedAt: new Date().toISOString(),
                source: 'conversation',
                patternName: 'simple_extraction',
                confidence: 0.8
              }
            };
            memories.push(memory);
          }
        }
      }

      if (memories.length > 0) {
        // Add metadata to memories
        const enrichedMemories = memories.map((memory) => ({
          ...memory,
          metadata: {
            ...memory.metadata,
            userId,
            extractedAt: new Date().toISOString(),
            source: 'conversation',
          },
        }));

        // Save extracted memories
        await this.storage.saveMemories(userId, enrichedMemories);

        return {
          extractedMemories: enrichedMemories,
          conversation,
          timestamp: new Date(),
        };
      }

      return {
        extractedMemories: [],
        conversation,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('[MemoryService] Failed to extract memories:', error);
      return {
        extractedMemories: [],
        conversation,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Handle explicit memory commands
   */
  async handleExplicitCommand(
    command: string,
    userId: string
  ): Promise<KuzuCommandResult> {
    if (!this.config.enableExplicitCommands) {
      return {
        command,
        result: 'Memory commands are disabled.',
        action: undefined,
      };
    }

    const lowerCommand = command.toLowerCase();

    // Remember command
    if (
      lowerCommand.startsWith('remember') ||
      lowerCommand.startsWith('save') ||
      lowerCommand.startsWith('store')
    ) {
      const content = command
        .replace(/^(remember|save|store)\s+/i, '')
        .trim();

      if (content) {
        const memory: Memory = {
          id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          content,
          type: 'semantic',
          timestamp: new Date(),
          tags: [],
          accessCount: 0,
          importance: 0.5,
          decay: 0.1,
          relations: [],
          metadata: {
            type: 'explicit',
            createdAt: new Date().toISOString(),
            userId,
          },
        };

        await this.storage.saveMemory(userId, memory);

        return {
          command,
          result: `I'll remember that: "${content}"`,
          memories: [memory],
          action: 'save',
        };
      }

      return {
        command,
        result: 'What would you like me to remember?',
        action: 'save',
      };
    }

    // Recall command
    if (
      lowerCommand.startsWith('recall') ||
      lowerCommand.startsWith('what do you remember') ||
      lowerCommand.includes('my memories')
    ) {
      const query = command
        .replace(/^(recall|what do you remember about)\s*/i, '')
        .trim();

      if (query) {
        const memories = await this.storage.searchMemories(userId, query, 5);
        if (memories.length > 0) {
          const memoryList = memories
            .map((m) => `• ${m.content}`)
            .join('\n');
          return {
            command,
            result: `Here's what I remember about "${query}":\n${memoryList}`,
            memories,
            action: 'recall',
          };
        }
        return {
          command,
          result: `I don't have any memories about "${query}".`,
          memories: [],
          action: 'recall',
        };
      }

      const memories = await this.storage.getMemories(userId, 10);
      if (memories.length > 0) {
        const memoryList = memories
          .map((m) => `• ${m.content}`)
          .join('\n');
        return {
          command,
          result: `Here are your recent memories:\n${memoryList}`,
          memories,
          action: 'recall',
        };
      }
      return {
        command,
        result: "I don't have any memories stored for you yet.",
        memories: [],
        action: 'recall',
      };
    }

    // Clear memories command
    if (
      lowerCommand.includes('clear') &&
      lowerCommand.includes('memor')
    ) {
      await this.storage.clearMemories(userId);
      return {
        command,
        result: 'All your memories have been cleared.',
        action: 'clear',
      };
    }

    // Memory stats command
    if (
      lowerCommand.includes('memory stats') ||
      lowerCommand.includes('memory status')
    ) {
      const stats = await this.storage.getUserStats(userId);
      return {
        command,
        result: `Memory Statistics:\n• Total memories: ${stats.count}\n• Last updated: ${
          stats.lastUpdated ? stats.lastUpdated.toLocaleString() : 'Never'
        }`,
        action: 'stats',
      };
    }

    // Not a memory command
    return {
      command,
      result: '',
      action: undefined,
    };
  }

  /**
   * Store assistant memory from a conversation
   */
  async storeAssistantMemory(context: AssistantMemoryContext): Promise<void> {
    try {
      const { userId, userPrompt, assistantResponse, conversationId } = context;

      // Extract key information from assistant response
      // Look for factual statements, preferences learned, or commitments made
      const extractedInfo: string[] = [];

      // Pattern to identify learning about user
      const learningPatterns = [
        /I understand (?:that )?you ([^.!?]+)/gi,
        /You (?:mentioned|said|told me) (?:that )?([^.!?]+)/gi,
        /(?:So|It seems) you ([^.!?]+)/gi,
        /I'll remember (?:that )?([^.!?]+)/gi,
      ];

      for (const pattern of learningPatterns) {
        const matches = assistantResponse.match(pattern);
        if (matches) {
          extractedInfo.push(...matches.map(m => m.trim()));
        }
      }

      // Store assistant's understanding as memories
      const assistantMemories: Memory[] = [];

      // Store the conversation context as an episodic memory
      const conversationMemory: Memory = {
        id: `asst_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: `User asked: "${userPrompt.slice(0, 200)}${userPrompt.length > 200 ? '...' : ''}" - I responded with insights about: ${this.extractTopics(assistantResponse).join(', ')}`,
        type: 'episodic',
        source: 'assistant',
        conversationId,
        timestamp: new Date(),
        tags: this.extractTopics(userPrompt).concat(this.extractTopics(assistantResponse)),
        accessCount: 0,
        importance: 0.6,
        decay: 0.05,
        relations: [],
        visibility: 'private',
        metadata: {
          userId,
          modelUsed: context.modelUsed,
          tokensUsed: context.tokensUsed,
          searchPerformed: context.searchPerformed,
          memoryEnriched: context.memoryEnriched,
          responseLength: assistantResponse.length,
        }
      };

      assistantMemories.push(conversationMemory);

      // Store extracted learnings as semantic memories
      for (const info of extractedInfo.slice(0, 3)) { // Limit to 3 extractions per response
        const semanticMemory: Memory = {
          id: `asst_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          content: info,
          type: 'semantic',
          source: 'assistant',
          conversationId,
          timestamp: new Date(),
          tags: this.extractTopics(info),
          accessCount: 0,
          importance: 0.7,
          decay: 0.03,
          relations: [conversationMemory.id],
          visibility: 'private',
          metadata: {
            userId,
            extractedFrom: 'assistant_response',
            originalContext: userPrompt.slice(0, 100),
          }
        };
        assistantMemories.push(semanticMemory);
      }

      // Save all assistant memories
      if (assistantMemories.length > 0) {
        await this.storage.saveMemories(userId, assistantMemories);
        console.log(`[MemoryService] Stored ${assistantMemories.length} assistant memories for user ${userId}`);
      }
    } catch (error) {
      console.error('[MemoryService] Failed to store assistant memory:', error);
      // Don't throw - this is a non-critical operation
    }
  }

  /**
   * Extract topics from text for tagging
   */
  private extractTopics(text: string): string[] {
    // Simple topic extraction - can be enhanced with NLP
    const topics: string[] = [];

    // Common topic patterns
    const patterns = [
      /about ([a-z]+(?:\s+[a-z]+)?)/gi,
      /regarding ([a-z]+(?:\s+[a-z]+)?)/gi,
      /(?:discussing|discuss) ([a-z]+(?:\s+[a-z]+)?)/gi,
    ];

    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        topics.push(...matches.map(m => m.replace(pattern, '$1').toLowerCase()));
      }
    }

    // Extract significant nouns (simple heuristic)
    const words = text.toLowerCase().split(/\s+/);
    const significantWords = words.filter(w =>
      w.length > 5 &&
      !['about', 'would', 'could', 'should', 'there', 'where', 'which'].includes(w)
    ).slice(0, 3);

    topics.push(...significantWords);

    // Remove duplicates
    return [...new Set(topics)].slice(0, 5);
  }

  /**
   * Get user memories with filtering
   */
  async getUserMemories(
    userId: string,
    limit?: number,
    filter?: MemoryFilter
  ): Promise<Memory[]> {
    return this.storage.getMemories(userId, limit, filter);
  }

  /**
   * Search user memories with filtering
   */
  async searchUserMemories(
    userId: string,
    query: string,
    limit?: number,
    filter?: MemoryFilter
  ): Promise<Memory[]> {
    return this.storage.searchMemories(userId, query, limit, filter);
  }

  /**
   * Clear user memories with optional filtering
   */
  async clearUserMemories(userId: string, filter?: MemoryFilter): Promise<void> {
    return this.storage.clearMemories(userId, filter);
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string): Promise<MemoryStats> {
    return this.storage.getUserStats(userId);
  }

  /**
   * Validate user access to a memory
   */
  async validateUserAccess(userId: string, memoryId: string): Promise<boolean> {
    return this.storage.validateUserAccess(userId, memoryId);
  }

  /**
   * Save a single memory
   */
  async saveMemory(userId: string, content: string, metadata?: any): Promise<void> {
    // Create memory object directly without using kuzu.create() to avoid IndexedDB issues
    const memory: Memory = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content,
      type: 'semantic',
      source: 'user',  // Default to user-created memory
      timestamp: new Date(),
      tags: [],
      accessCount: 0,
      importance: 0.5,
      decay: 0.1,
      relations: [],
      visibility: 'private',
      metadata: {
        ...metadata,
        createdAt: new Date().toISOString(),
        userId,
      },
    };
    return this.storage.saveMemory(userId, memory);
  }

  /**
   * Create appropriate storage adapter based on environment
   */
  private createStorageAdapter(): StorageAdapter {
    const storageType = this.config.storage;

    if (storageType === 'vercel') {
      return new VercelBlobAdapter(
        'memories',
        this.config.maxMemoriesPerUser,
        this.config.memoryTTLDays
      );
    }

    if (storageType === 'local') {
      return new LocalStorageAdapter(
        '.kuzu_memory',
        this.config.maxMemoriesPerUser,
        this.config.memoryTTLDays
      );
    }

    // Auto-detect based on environment
    const isVercel = process.env.VERCEL === '1';
    const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN;

    if (isVercel && hasBlobToken) {
      console.log('[MemoryService] Using Vercel Blob storage');
      return new VercelBlobAdapter(
        'memories',
        this.config.maxMemoriesPerUser,
        this.config.memoryTTLDays
      );
    }

    console.log('[MemoryService] Using local filesystem storage');
    return new LocalStorageAdapter(
      '.kuzu_memory',
      this.config.maxMemoriesPerUser,
      this.config.memoryTTLDays
    );
  }

}