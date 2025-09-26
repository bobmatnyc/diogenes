// Main exports for kuzu-memory integration
export { MemoryService } from './service';
export { MemoryMiddleware } from './middleware';
export type { MemoryMiddlewareOptions, MemoryMiddlewareResult } from './middleware';

// Storage adapters
export { LocalStorageAdapter } from './storage/local-adapter';
export { VercelBlobAdapter } from './storage/vercel-adapter';
export { BaseStorageAdapter } from './storage/adapter';

// Types
export type {
  StorageAdapter,
  KuzuMemoryConfig,
  MemoryOperationResult,
  MemoryStats,
  EnrichedPromptResult,
  StoredUserMemories,
  KuzuMemoryEnrichment,
  KuzuMemoryExtraction,
  KuzuCommandResult,
} from './types';

// Export our type aliases
export type { Memory, MemoryContext } from './types';