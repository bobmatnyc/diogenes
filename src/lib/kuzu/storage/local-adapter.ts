import { promises as fs } from 'fs';
import path from 'path';
import type { Memory, MemoryFilter, MemoryStats } from '../types';
import { BaseStorageAdapter } from './adapter';
import type { StoredUserMemories } from '../types';

/**
 * Simple in-memory lock manager for file operations
 */
class LockManager {
  private locks: Map<string, Promise<void>> = new Map();

  async acquire(key: string): Promise<() => void> {
    // Wait for any existing lock on this key
    while (this.locks.has(key)) {
      await this.locks.get(key);
    }

    // Create a new lock
    let releaseLock: (() => void) | null = null;
    const lockPromise = new Promise<void>(resolve => {
      releaseLock = resolve;
    });

    this.locks.set(key, lockPromise);

    // Return release function
    return () => {
      this.locks.delete(key);
      if (releaseLock) releaseLock();
    };
  }
}

/**
 * Local filesystem storage adapter for memories
 */
export class LocalStorageAdapter extends BaseStorageAdapter {
  private readonly basePath: string;
  private readonly maxMemoriesPerUser: number;
  private readonly ttlDays: number;
  private readonly lockManager: LockManager;

  constructor(
    basePath = '.kuzu_memory',
    maxMemoriesPerUser = 1000,
    ttlDays = 30
  ) {
    super();
    this.basePath = basePath;
    this.maxMemoriesPerUser = maxMemoriesPerUser;
    this.ttlDays = ttlDays;
    this.lockManager = new LockManager();
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
      this.initialized = true;
    } catch (error) {
      console.error('[LocalStorageAdapter] Failed to initialize:', error);
      throw new Error('Failed to initialize local storage');
    }
  }

  async saveMemory(userId: string, memory: Memory): Promise<void> {
    await this.ensureInitialized();

    // CRITICAL FIX: Use lock to prevent race conditions
    const lockKey = `user:${userId}`;
    const release = await this.lockManager.acquire(lockKey);

    try {
      const memories = await this.getMemories(userId);
      memories.push(memory);
      await this.saveUserMemories(userId, memories);
    } finally {
      release();
    }
  }

  async saveMemories(userId: string, newMemories: Memory[]): Promise<void> {
    await this.ensureInitialized();

    // CRITICAL FIX: Use lock to prevent race conditions
    const lockKey = `user:${userId}`;
    const release = await this.lockManager.acquire(lockKey);

    try {
      const existingMemories = await this.getMemories(userId);
      const allMemories = [...existingMemories, ...newMemories];
      await this.saveUserMemories(userId, allMemories);
    } finally {
      release();
    }
  }

  async getMemories(userId: string, limit?: number, filter?: MemoryFilter): Promise<Memory[]> {
    await this.ensureInitialized();
    const sanitizedId = this.sanitizeUserId(userId);
    const filePath = this.getUserFilePath(sanitizedId);

    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const stored: StoredUserMemories = JSON.parse(data);

      // Ensure userId matches for security
      if (stored.userId !== userId) {
        console.error('[LocalStorageAdapter] User ID mismatch - potential security issue');
        return [];
      }

      let memories = this.filterByTTL(stored.memories, this.ttlDays);

      // Apply additional filters
      if (filter) {
        memories = this.applyMemoryFilter(memories, filter);
      }

      memories = this.sortMemories(memories, 'recency');

      if (limit && limit > 0) {
        memories = memories.slice(0, limit);
      }

      return memories;
    } catch (error) {
      // File doesn't exist or is corrupted - return empty array
      if ((error as any).code === 'ENOENT') {
        return [];
      }
      console.error('[LocalStorageAdapter] Failed to read memories:', error);
      return [];
    }
  }

  async searchMemories(
    userId: string,
    query: string,
    limit = 10,
    filter?: MemoryFilter
  ): Promise<Memory[]> {
    await this.ensureInitialized();
    const memories = await this.getMemories(userId, undefined, filter);

    // Simple text-based search
    const queryLower = query.toLowerCase();
    const results = memories.filter((memory) => {
      const content = memory.content?.toLowerCase() || '';
      const tags = (memory.metadata?.tags as string[])?.join(' ').toLowerCase() || '';
      const context = (memory.metadata?.context as string)?.toLowerCase() || '';

      return (
        content.includes(queryLower) ||
        tags.includes(queryLower) ||
        context.includes(queryLower)
      );
    });

    // Add relevance scores based on match quality
    const scoredResults = results.map((memory) => {
      let score = 0;
      const content = memory.content?.toLowerCase() || '';

      // Exact match gets highest score
      if (content === queryLower) score += 10;
      // Starting with query gets high score
      else if (content.startsWith(queryLower)) score += 5;
      // Contains query gets moderate score
      else if (content.includes(queryLower)) score += 2;

      return {
        ...memory,
        metadata: {
          ...memory.metadata,
          relevanceScore: score,
        },
      };
    });

    // Sort by relevance score
    const sorted = this.sortMemories(scoredResults, 'relevance');
    return sorted.slice(0, limit);
  }

  async clearMemories(userId: string, filter?: MemoryFilter): Promise<void> {
    await this.ensureInitialized();
    const sanitizedId = this.sanitizeUserId(userId);
    const filePath = this.getUserFilePath(sanitizedId);

    if (!filter) {
      // Clear all memories
      const userDir = path.join(this.basePath, sanitizedId);
      try {
        await fs.unlink(filePath);
        // Try to remove the user directory if empty
        try {
          await fs.rmdir(userDir);
        } catch {
          // Directory not empty or doesn't exist - ignore
        }
      } catch (error) {
        if ((error as any).code !== 'ENOENT') {
          console.error('[LocalStorageAdapter] Failed to clear memories:', error);
          throw new Error('Failed to clear memories');
        }
      }
    } else {
      // Clear only filtered memories
      const memories = await this.getMemories(userId);
      const remainingMemories = memories.filter(m => !this.matchesFilter(m, filter));
      await this.saveUserMemories(userId, remainingMemories);
    }
  }

  async getUserStats(userId: string): Promise<MemoryStats> {
    await this.ensureInitialized();
    const sanitizedId = this.sanitizeUserId(userId);
    const filePath = this.getUserFilePath(sanitizedId);

    try {
      const stats = await fs.stat(filePath);
      const data = await fs.readFile(filePath, 'utf-8');
      const stored: StoredUserMemories = JSON.parse(data);

      const activeMemories = this.filterByTTL(stored.memories, this.ttlDays);

      // Calculate statistics by source and type
      const bySource = {
        user: activeMemories.filter(m => m.source === 'user').length,
        assistant: activeMemories.filter(m => m.source === 'assistant').length,
        system: activeMemories.filter(m => m.source === 'system').length,
      };

      const byType = {
        semantic: activeMemories.filter(m => m.type === 'semantic').length,
        episodic: activeMemories.filter(m => m.type === 'episodic').length,
        procedural: activeMemories.filter(m => m.type === 'procedural').length,
      };

      const oldestMemory = activeMemories.length > 0
        ? new Date(Math.min(...activeMemories.map(m => new Date(m.timestamp).getTime())))
        : undefined;

      return {
        count: activeMemories.length,
        lastUpdated: stats.mtime,
        oldestMemory,
        bySource,
        byType,
        storageUsed: stats.size,
        categories: {},  // Could be enhanced with tag analysis
      };
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return {
          count: 0,
          lastUpdated: null,
          bySource: { user: 0, assistant: 0, system: 0 },
          byType: { semantic: 0, episodic: 0, procedural: 0 },
        };
      }
      console.error('[LocalStorageAdapter] Failed to get stats:', error);
      return {
        count: 0,
        lastUpdated: null,
        bySource: { user: 0, assistant: 0, system: 0 },
        byType: { semantic: 0, episodic: 0, procedural: 0 },
      };
    }
  }

  /**
   * Validate that a user has access to a specific memory
   */
  async validateUserAccess(userId: string, memoryId: string): Promise<boolean> {
    await this.ensureInitialized();
    const memories = await this.getMemories(userId);
    return memories.some(m => m.id === memoryId);
  }

  /**
   * Get the storage path for a user (for debugging/admin)
   */
  getUserStoragePath(userId: string): string {
    const sanitizedId = this.sanitizeUserId(userId);
    return path.join(this.basePath, sanitizedId);
  }

  private getUserFilePath(sanitizedUserId: string): string {
    // Ensure user isolation with dedicated directory
    return path.join(this.basePath, sanitizedUserId, 'memories.json');
  }

  /**
   * Apply memory filter to a list of memories
   */
  private applyMemoryFilter(memories: Memory[], filter: MemoryFilter): Memory[] {
    return memories.filter(m => this.matchesFilter(m, filter));
  }

  /**
   * Check if a memory matches the filter criteria
   */
  private matchesFilter(memory: Memory, filter: MemoryFilter): boolean {
    if (filter.source && memory.source !== filter.source) return false;
    if (filter.type && memory.type !== filter.type) return false;
    if (filter.visibility && memory.visibility !== filter.visibility) return false;

    if (filter.tags && filter.tags.length > 0) {
      const memoryTags = memory.tags || [];
      const hasMatchingTag = filter.tags.some(tag => memoryTags.includes(tag));
      if (!hasMatchingTag) return false;
    }

    if (filter.dateRange) {
      const memoryDate = new Date(memory.timestamp);
      if (memoryDate < filter.dateRange.start || memoryDate > filter.dateRange.end) {
        return false;
      }
    }

    return true;
  }

  private async saveUserMemories(
    userId: string,
    memories: Memory[]
  ): Promise<void> {
    const sanitizedId = this.sanitizeUserId(userId);
    const userDir = path.join(this.basePath, sanitizedId);
    const filePath = this.getUserFilePath(sanitizedId);

    // Ensure user directory exists
    await fs.mkdir(userDir, { recursive: true });

    // Apply TTL filter
    let filteredMemories = this.filterByTTL(memories, this.ttlDays);

    // Limit memories per user
    if (filteredMemories.length > this.maxMemoriesPerUser) {
      // Keep the most recent memories
      filteredMemories = this.sortMemories(filteredMemories, 'recency')
        .slice(0, this.maxMemoriesPerUser);
    }

    // Prepare storage object with user validation
    const stored: StoredUserMemories = {
      userId,  // Store userId for validation
      memories: filteredMemories,
      metadata: {
        count: filteredMemories.length,
        lastUpdated: new Date().toISOString(),
        version: '2.0.0',  // Updated version for new schema
      },
    };

    // CRITICAL FIX: Atomic file write to prevent race conditions
    // Write to temp file first, then atomically rename
    const tempPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Write to temporary file
      await fs.writeFile(tempPath, JSON.stringify(stored, null, 2), 'utf-8');

      // Atomic rename - this is an atomic operation on most filesystems
      // If another process is writing, one will win and the other will get ENOENT
      await fs.rename(tempPath, filePath);
    } catch (error) {
      // Clean up temp file on error
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }
}