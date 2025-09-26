/**
 * Storage Adapter Base
 * Abstract base class for memory storage implementations
 */

import type {
  SimpleMemory,
  PatternMemory,
  MemoryStorageAdapter,
  MemorySearchOptions,
  StorageStats,
  MemoryPattern,
  MemoryConfig
} from '../types';

export abstract class BaseMemoryStorageAdapter implements MemoryStorageAdapter {
  protected config: MemoryConfig;
  protected cache: Map<string, PatternMemory>;
  protected cacheExpiry: Map<string, number>;

  constructor(config: MemoryConfig) {
    this.config = config;
    this.cache = new Map();
    this.cacheExpiry = new Map();
  }

  // Abstract methods that must be implemented by subclasses
  abstract saveSimpleMemory(memory: SimpleMemory): Promise<void>;
  abstract getSimpleMemory(userId: string, key: string): Promise<SimpleMemory | null>;
  abstract listSimpleMemories(userId: string, limit?: number): Promise<SimpleMemory[]>;
  abstract deleteSimpleMemory(userId: string, key: string): Promise<void>;
  abstract savePatternMemory(memory: PatternMemory): Promise<void>;
  abstract getPatternMemory(id: string): Promise<PatternMemory | null>;
  abstract searchPatternMemories(
    userId: string,
    options?: MemorySearchOptions
  ): Promise<PatternMemory[]>;
  abstract updatePatternMemory(id: string, updates: Partial<PatternMemory>): Promise<void>;
  abstract deletePatternMemory(id: string): Promise<void>;
  abstract bulkSavePatternMemories(memories: PatternMemory[]): Promise<void>;
  abstract clearUserMemories(userId: string): Promise<void>;
  abstract pruneExpiredMemories(): Promise<number>;
  abstract getStorageStats(userId?: string): Promise<StorageStats>;

  // Common helper methods
  protected generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  protected isExpired(expiresAt?: Date): boolean {
    if (!expiresAt) return false;
    return new Date() > expiresAt;
  }

  protected getFromCache(key: string): PatternMemory | null {
    if (!this.config.cacheEnabled) return null;

    const expiry = this.cacheExpiry.get(key);
    if (expiry && Date.now() > expiry) {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
      return null;
    }

    return this.cache.get(key) || null;
  }

  protected setInCache(key: string, memory: PatternMemory): void {
    if (!this.config.cacheEnabled) return;

    this.cache.set(key, memory);
    this.cacheExpiry.set(key, Date.now() + (this.config.cacheTTL * 1000));

    // Clean up old cache entries
    this.cleanCache();
  }

  protected cleanCache(): void {
    const now = Date.now();
    for (const [key, expiry] of this.cacheExpiry.entries()) {
      if (expiry < now) {
        this.cache.delete(key);
        this.cacheExpiry.delete(key);
      }
    }
  }

  protected calculateConfidence(text: string, pattern: MemoryPattern): number {
    // Basic confidence calculation - can be overridden by subclasses
    const patternWeights: Record<MemoryPattern, number> = {
      identity: 0.95,
      preference: 0.85,
      decision: 0.9,
      instruction: 0.95,
      context: 0.7,
      fact: 0.8,
      relationship: 0.75,
      goal: 0.85,
      constraint: 0.9,
      experience: 0.8
    };

    const baseConfidence = patternWeights[pattern] || 0.5;

    // Adjust based on text length and quality
    const lengthFactor = Math.min(1, text.length / 100);
    const qualityFactor = text.includes('!') || text.includes('important') ? 1.1 : 1;

    return Math.min(1, baseConfidence * lengthFactor * qualityFactor);
  }

  protected filterMemories(
    memories: PatternMemory[],
    options?: MemorySearchOptions
  ): PatternMemory[] {
    let filtered = [...memories];

    if (options?.patterns) {
      filtered = filtered.filter(m =>
        options.patterns!.includes(m.pattern)
      );
    }

    if (options?.minConfidence) {
      filtered = filtered.filter(m =>
        m.confidence >= options.minConfidence!
      );
    }

    if (options?.sessionId) {
      filtered = filtered.filter(m =>
        m.metadata?.sessionId === options.sessionId
      );
    }

    if (options?.startDate) {
      filtered = filtered.filter(m =>
        new Date(m.createdAt) >= options.startDate!
      );
    }

    if (options?.endDate) {
      filtered = filtered.filter(m =>
        new Date(m.createdAt) <= options.endDate!
      );
    }

    if (options?.keywords) {
      const keywords = options.keywords.map(k => k.toLowerCase());
      filtered = filtered.filter(m => {
        const content = m.content.toLowerCase();
        return keywords.some(k => content.includes(k));
      });
    }

    // Sort results
    if (options?.sortBy) {
      switch (options.sortBy) {
        case 'recency':
          filtered.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          break;
        case 'frequency':
          filtered.sort((a, b) => b.accessCount - a.accessCount);
          break;
        case 'relevance':
          filtered.sort((a, b) => b.confidence - a.confidence);
          break;
      }
    }

    // Apply pagination
    if (options?.offset) {
      filtered = filtered.slice(options.offset);
    }

    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  protected validateMemorySize(content: string): boolean {
    return new TextEncoder().encode(content).length <= this.config.maxMemorySize;
  }

  protected sanitizeMemory(memory: PatternMemory): PatternMemory {
    // Ensure all required fields are present and valid
    return {
      ...memory,
      id: memory.id || this.generateId(),
      createdAt: memory.createdAt || new Date(),
      updatedAt: new Date(),
      accessCount: memory.accessCount || 0,
      lastAccessedAt: memory.lastAccessedAt || new Date(),
      confidence: Math.max(0, Math.min(1, memory.confidence))
    };
  }
}