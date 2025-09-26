import { del, head, list, put } from '@vercel/blob';
import type { Memory, MemoryFilter, MemoryStats } from '../types';
import { BaseStorageAdapter } from './adapter';
import type { StoredUserMemories } from '../types';

/**
 * Vercel Blob storage adapter for memories
 */
export class VercelBlobAdapter extends BaseStorageAdapter {
  private readonly prefix: string;
  private readonly maxMemoriesPerUser: number;
  private readonly ttlDays: number;
  private readonly token?: string;

  constructor(
    prefix = 'memories',
    maxMemoriesPerUser = 1000,
    ttlDays = 30,
    token?: string
  ) {
    super();
    this.prefix = prefix;
    this.maxMemoriesPerUser = maxMemoriesPerUser;
    this.ttlDays = ttlDays;
    this.token = token || process.env.BLOB_READ_WRITE_TOKEN;
  }

  async initialize(): Promise<void> {
    if (!this.token) {
      throw new Error(
        'BLOB_READ_WRITE_TOKEN is required for Vercel Blob storage'
      );
    }

    try {
      // Test connection by listing blobs with limit 1
      await list({
        prefix: this.prefix,
        limit: 1,
        token: this.token,
      });
      this.initialized = true;
    } catch (error) {
      console.error('[VercelBlobAdapter] Failed to initialize:', error);
      throw new Error('Failed to initialize Vercel Blob storage');
    }
  }

  async saveMemory(userId: string, memory: Memory): Promise<void> {
    await this.ensureInitialized();
    const memories = await this.getMemories(userId);
    memories.push(memory);
    await this.saveUserMemories(userId, memories);
  }

  async saveMemories(userId: string, newMemories: Memory[]): Promise<void> {
    await this.ensureInitialized();
    const existingMemories = await this.getMemories(userId);
    const allMemories = [...existingMemories, ...newMemories];
    await this.saveUserMemories(userId, allMemories);
  }

  async getMemories(userId: string, limit?: number, filter?: MemoryFilter): Promise<Memory[]> {
    await this.ensureInitialized();
    const blobName = this.getBlobName(userId);

    try {
      const response = await fetch(
        `https://api.vercel.com/blob/${blobName}`,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }
        throw new Error(`Failed to fetch memories: ${response.statusText}`);
      }

      const stored: StoredUserMemories = await response.json();

      // Ensure userId matches for security
      if (stored.userId !== userId) {
        console.error('[VercelBlobAdapter] User ID mismatch - potential security issue');
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
      console.error('[VercelBlobAdapter] Failed to read memories:', error);
      return [];
    }
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

  async searchMemories(
    userId: string,
    query: string,
    limit = 10,
    filter?: MemoryFilter
  ): Promise<Memory[]> {
    await this.ensureInitialized();
    const memories = await this.getMemories(userId, undefined, filter);

    // Simple text-based search (same as local adapter)
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

    // Add relevance scores
    const scoredResults = results.map((memory) => {
      let score = 0;
      const content = memory.content?.toLowerCase() || '';

      if (content === queryLower) score += 10;
      else if (content.startsWith(queryLower)) score += 5;
      else if (content.includes(queryLower)) score += 2;

      return {
        ...memory,
        metadata: {
          ...memory.metadata,
          relevanceScore: score,
        },
      };
    });

    const sorted = this.sortMemories(scoredResults, 'relevance');
    return sorted.slice(0, limit);
  }

  async clearMemories(userId: string, filter?: MemoryFilter): Promise<void> {
    await this.ensureInitialized();

    if (!filter) {
      // Clear all memories
      const blobName = this.getBlobName(userId);
      try {
        await del(blobName, { token: this.token });
      } catch (error) {
        // Ignore 404 errors (blob doesn't exist)
        if ((error as any).code !== 'BLOB_NOT_FOUND') {
          console.error('[VercelBlobAdapter] Failed to clear memories:', error);
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
    const blobName = this.getBlobName(userId);

    try {
      // Get blob metadata
      const metadata = await head(blobName, { token: this.token });

      // Fetch the actual data to get detailed stats
      const memories = await this.getMemories(userId);

      // Calculate statistics by source and type
      const bySource = {
        user: memories.filter(m => m.source === 'user').length,
        assistant: memories.filter(m => m.source === 'assistant').length,
        system: memories.filter(m => m.source === 'system').length,
      };

      const byType = {
        semantic: memories.filter(m => m.type === 'semantic').length,
        episodic: memories.filter(m => m.type === 'episodic').length,
        procedural: memories.filter(m => m.type === 'procedural').length,
      };

      const oldestMemory = memories.length > 0
        ? new Date(Math.min(...memories.map(m => new Date(m.timestamp).getTime())))
        : undefined;

      return {
        count: memories.length,
        lastUpdated: new Date(metadata.uploadedAt),
        oldestMemory,
        bySource,
        byType,
        storageUsed: metadata.size || 0,
        categories: {},  // Could be enhanced with tag analysis
      };
    } catch (error) {
      // Blob doesn't exist
      if ((error as any).code === 'BLOB_NOT_FOUND') {
        return {
          count: 0,
          lastUpdated: null,
          bySource: { user: 0, assistant: 0, system: 0 },
          byType: { semantic: 0, episodic: 0, procedural: 0 },
        };
      }
      console.error('[VercelBlobAdapter] Failed to get stats:', error);
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
    return this.getBlobName(userId);
  }

  private getBlobName(userId: string): string {
    const sanitizedId = this.sanitizeUserId(userId);
    return `${this.prefix}/${sanitizedId}.json`;
  }

  private async saveUserMemories(
    userId: string,
    memories: Memory[]
  ): Promise<void> {
    const blobName = this.getBlobName(userId);

    // Apply TTL filter
    let filteredMemories = this.filterByTTL(memories, this.ttlDays);

    // Limit memories per user
    if (filteredMemories.length > this.maxMemoriesPerUser) {
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

    // Upload to Vercel Blob
    await put(blobName, JSON.stringify(stored, null, 2), {
      access: 'public',
      contentType: 'application/json',
      token: this.token,
    });
  }
}