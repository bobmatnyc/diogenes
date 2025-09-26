import type { Memory, StorageAdapter, MemoryFilter, MemoryStats } from '../types';

/**
 * Abstract base class for memory storage adapters
 */
export abstract class BaseStorageAdapter implements StorageAdapter {
  protected initialized = false;

  /**
   * Initialize the storage adapter
   */
  abstract initialize(): Promise<void>;

  /**
   * Save a single memory for a user
   */
  abstract saveMemory(userId: string, memory: Memory): Promise<void>;

  /**
   * Save multiple memories for a user
   */
  abstract saveMemories(userId: string, memories: Memory[]): Promise<void>;

  /**
   * Get all memories for a user with optional filtering
   */
  abstract getMemories(userId: string, limit?: number, filter?: MemoryFilter): Promise<Memory[]>;

  /**
   * Search memories by query string with optional filtering
   */
  abstract searchMemories(
    userId: string,
    query: string,
    limit?: number,
    filter?: MemoryFilter
  ): Promise<Memory[]>;

  /**
   * Clear memories for a user with optional filtering
   */
  abstract clearMemories(userId: string, filter?: MemoryFilter): Promise<void>;

  /**
   * Get user statistics
   */
  abstract getUserStats(userId: string): Promise<MemoryStats>;

  /**
   * Validate user access to a memory
   */
  abstract validateUserAccess(userId: string, memoryId: string): Promise<boolean>;

  /**
   * Get user storage path
   */
  abstract getUserStoragePath(userId: string): string;

  /**
   * Ensure the adapter is initialized before operations
   */
  protected async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
      this.initialized = true;
    }
  }

  /**
   * Sanitize user ID for safe file/key naming
   */
  protected sanitizeUserId(userId: string): string {
    return userId.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 64);
  }

  /**
   * Apply TTL filter to memories if configured
   */
  protected filterByTTL(memories: Memory[], ttlDays: number): Memory[] {
    if (ttlDays <= 0) return memories;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ttlDays);

    return memories.filter((memory) => {
      const memoryDate = new Date(memory.metadata?.createdAt || 0);
      return memoryDate > cutoffDate;
    });
  }

  /**
   * Sort memories by relevance or recency
   */
  protected sortMemories(
    memories: Memory[],
    sortBy: 'recency' | 'relevance' = 'recency'
  ): Memory[] {
    return memories.sort((a, b) => {
      if (sortBy === 'relevance') {
        const scoreA = (a.metadata?.relevanceScore as number) || 0;
        const scoreB = (b.metadata?.relevanceScore as number) || 0;
        return scoreB - scoreA;
      } else {
        const dateA = new Date(a.metadata?.createdAt || 0).getTime();
        const dateB = new Date(b.metadata?.createdAt || 0).getTime();
        return dateB - dateA;
      }
    });
  }
}