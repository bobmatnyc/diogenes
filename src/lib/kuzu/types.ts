// Define MemoryItem type locally to avoid dependency issues
export interface MemoryItem {
  id: string;
  content: string;
  type: 'semantic' | 'episodic' | 'procedural';
  timestamp: Date;
  tags: string[];
  accessCount: number;
  importance: number;
  decay: number;
  relations: string[];
  metadata?: Record<string, any>;
}

// Extended memory type with source classification
export interface Memory extends MemoryItem {
  source?: 'user' | 'assistant' | 'system';  // Track who created the memory
  conversationId?: string;  // Link to conversation context
  visibility?: 'private' | 'shared';  // Control memory visibility
}
export type MemoryContext = {
  memories: MemoryItem[];
  query: string;
  scores?: Map<string, number>;
};

export interface StorageAdapter {
  initialize(): Promise<void>;
  saveMemory(userId: string, memory: Memory): Promise<void>;
  saveMemories(userId: string, memories: Memory[]): Promise<void>;
  getMemories(userId: string, limit?: number, filter?: MemoryFilter): Promise<Memory[]>;
  searchMemories(userId: string, query: string, limit?: number, filter?: MemoryFilter): Promise<Memory[]>;
  clearMemories(userId: string, filter?: MemoryFilter): Promise<void>;
  getUserStats(userId: string): Promise<MemoryStats>;
  // New methods for user isolation
  validateUserAccess(userId: string, memoryId: string): Promise<boolean>;
  getUserStoragePath(userId: string): string;
}

export interface MemoryFilter {
  source?: 'user' | 'assistant' | 'system';
  type?: 'semantic' | 'episodic' | 'procedural';
  tags?: string[];
  dateRange?: { start: Date; end: Date };
  visibility?: 'private' | 'shared';
}

export interface KuzuMemoryConfig {
  maxMemoriesPerUser: number;
  memoryTTLDays: number;
  enableAutoExtraction: boolean;
  enableExplicitCommands: boolean;
  storage?: 'local' | 'vercel' | 'auto';
}

export interface MemoryOperationResult {
  success: boolean;
  message?: string;
  memories?: Memory[];
  error?: string;
}

export interface MemoryStats {
  count: number;
  lastUpdated: Date | null;
  oldestMemory?: Date;
  categories?: Record<string, number>;
  bySource?: {
    user: number;
    assistant: number;
    system: number;
  };
  byType?: {
    semantic: number;
    episodic: number;
    procedural: number;
  };
  storageUsed?: number;  // in bytes
}

export interface EnrichedPromptResult {
  enrichedPrompt: string;
  memoriesUsed: number;
  contexts: MemoryContext[];
}

export interface StoredUserMemories {
  userId: string;
  memories: Memory[];
  metadata: {
    count: number;
    lastUpdated: string;
    version: string;
  };
}


// Re-export for convenience
export interface KuzuMemoryEnrichment {
  originalPrompt: string;
  enrichedPrompt: string;
  relevantMemories: Memory[];
  memoryCount: number;
}

export interface KuzuMemoryExtraction {
  extractedMemories: Memory[];
  conversation: string;
  timestamp: Date;
}

export interface KuzuCommandResult {
  command: string;
  result: string;
  memories?: Memory[];
  action?: 'save' | 'recall' | 'clear' | 'stats' | 'enrich';
  enrichmentApplied?: boolean;
}

// New interface for assistant memory storage
export interface AssistantMemoryContext {
  userId: string;
  conversationId: string;
  userPrompt: string;
  assistantResponse: string;
  timestamp: Date;
  modelUsed?: string;
  tokensUsed?: number;
  searchPerformed?: boolean;
  memoryEnriched?: boolean;
}

// New interface for prompt enrichment result
export interface PromptEnrichmentResult {
  originalPrompt: string;
  enrichedContent: string;  // The actual enrichment text to add
  relevantMemories: Memory[];
  confidenceScore: number;  // 0-1 score for relevance
  enrichmentMethod: 'keyword' | 'semantic' | 'pattern' | 'combined';
}