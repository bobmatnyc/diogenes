/**
 * Enhanced Memory System Type Definitions
 * 3-Phase Architecture: Simple KV → Kuzu-inspired Patterns → Turo Graph (future)
 */

// Phase 1: Simple key-value memory
export interface SimpleMemory {
  id: string;
  userId: string;
  key: string;
  value: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

// Phase 2: Pattern-based memory with Kuzu-inspired extraction
export interface PatternMemory {
  id: string;
  userId: string;
  pattern: MemoryPattern;
  content: string;
  context?: string;
  confidence: number;
  metadata?: {
    sessionId?: string;
    messageId?: string;
    extractedFrom?: string;
    relatedMemories?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
  accessCount: number;
  lastAccessedAt: Date;
  expiresAt?: Date;
}

// Memory patterns inspired by Kuzu
export enum MemoryPattern {
  IDENTITY = 'identity',        // "My name is...", "I am..."
  PREFERENCE = 'preference',    // "I prefer...", "I like..."
  DECISION = 'decision',        // "Let's use...", "We decided..."
  INSTRUCTION = 'instruction',  // "Remember that...", "Don't forget..."
  CONTEXT = 'context',          // Current conversation state
  FACT = 'fact',               // "X is Y", factual information
  RELATIONSHIP = 'relationship', // "X relates to Y"
  GOAL = 'goal',               // "I want to...", "My goal is..."
  CONSTRAINT = 'constraint',    // "I can't...", "Must not..."
  EXPERIENCE = 'experience'     // Past events or experiences
}

// Pattern matcher configuration
export interface PatternMatcher {
  pattern: MemoryPattern;
  regex: RegExp[];
  keywords: string[];
  extractor: (text: string, match: RegExpMatchArray) => ExtractedMemory;
  confidence: (text: string, match: RegExpMatchArray) => number;
}

// Extracted memory from pattern matching
export interface ExtractedMemory {
  pattern: MemoryPattern;
  content: string;
  context?: string;
  confidence: number;
  metadata?: Record<string, any>;
}

// Storage adapter interface
export interface MemoryStorageAdapter {
  // Simple memory operations
  saveSimpleMemory(memory: SimpleMemory): Promise<void>;
  getSimpleMemory(userId: string, key: string): Promise<SimpleMemory | null>;
  listSimpleMemories(userId: string, limit?: number): Promise<SimpleMemory[]>;
  deleteSimpleMemory(userId: string, key: string): Promise<void>;

  // Pattern memory operations
  savePatternMemory(memory: PatternMemory): Promise<void>;
  getPatternMemory(id: string): Promise<PatternMemory | null>;
  searchPatternMemories(
    userId: string,
    options?: MemorySearchOptions
  ): Promise<PatternMemory[]>;
  updatePatternMemory(id: string, updates: Partial<PatternMemory>): Promise<void>;
  deletePatternMemory(id: string): Promise<void>;

  // Bulk operations
  bulkSavePatternMemories(memories: PatternMemory[]): Promise<void>;
  clearUserMemories(userId: string): Promise<void>;

  // Maintenance
  pruneExpiredMemories(): Promise<number>;
  getStorageStats(userId?: string): Promise<StorageStats>;
}

// Memory search options
export interface MemorySearchOptions {
  patterns?: MemoryPattern[];
  keywords?: string[];
  sessionId?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'recency' | 'frequency';
  minConfidence?: number;
  startDate?: Date;
  endDate?: Date;
}

// Storage statistics
export interface StorageStats {
  totalMemories: number;
  memoryByPattern: Record<MemoryPattern, number>;
  storageSize: number;
  oldestMemory?: Date;
  newestMemory?: Date;
  averageConfidence: number;
}

// Memory service configuration
export interface MemoryConfig {
  // Storage settings
  storageType: 'local' | 'vercel-blob';
  localStoragePath?: string;
  vercelBlobToken?: string;

  // Memory limits
  maxMemoriesPerUser: number;
  maxMemorySize: number; // in bytes
  memoryTTL: number; // in seconds

  // Pattern matching settings
  minConfidence: number;
  maxPatternsPerMessage: number;
  enableAutoExtraction: boolean;

  // Performance settings
  cacheEnabled: boolean;
  cacheTTL: number;
  batchSize: number;
}

// Memory enrichment result
export interface MemoryEnrichment {
  relevantMemories: PatternMemory[];
  contextSummary?: string;
  appliedPatterns: MemoryPattern[];
  totalMemoryCount: number;
}

// Memory extraction result
export interface MemoryExtractionResult {
  extracted: ExtractedMemory[];
  saved: PatternMemory[];
  errors: Array<{ memory: ExtractedMemory; error: string }>;
}

// Phase 3: Future Turo-memory enhancement (placeholder)
export interface TuroMemory {
  id: string;
  userId: string;
  graph: MemoryGraph;
  embeddings: Float32Array;
  relationships: MemoryRelationship[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryGraph {
  nodes: MemoryNode[];
  edges: MemoryEdge[];
}

export interface MemoryNode {
  id: string;
  type: string;
  content: string;
  embedding?: Float32Array;
  metadata?: Record<string, any>;
}

export interface MemoryEdge {
  source: string;
  target: string;
  relationship: string;
  weight: number;
  metadata?: Record<string, any>;
}

export interface MemoryRelationship {
  sourceId: string;
  targetId: string;
  type: string;
  strength: number;
}

// Memory middleware types
export interface MemoryMiddlewareOptions {
  enableEnrichment: boolean;
  enableExtraction: boolean;
  enrichmentPatterns?: MemoryPattern[];
  extractionPatterns?: MemoryPattern[];
}

// Memory command types
export type MemoryCommand =
  | { type: 'remember'; content: string; metadata?: Record<string, any> }
  | { type: 'recall'; query: string; patterns?: MemoryPattern[] }
  | { type: 'forget'; key?: string; pattern?: MemoryPattern }
  | { type: 'list'; limit?: number }
  | { type: 'clear'; confirm: boolean };

// Export a type guard for memory patterns
export function isValidMemoryPattern(value: string): value is MemoryPattern {
  return Object.values(MemoryPattern).includes(value as MemoryPattern);
}