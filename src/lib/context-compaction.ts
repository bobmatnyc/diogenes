import { getEncoding } from 'js-tiktoken';

// Cache the encoding to avoid re-initialization
let encodingCache: ReturnType<typeof getEncoding> | null = null;

function getTokenEncoder() {
  if (!encodingCache) {
    encodingCache = getEncoding('cl100k_base'); // GPT-4 tokenizer
  }
  return encodingCache;
}
import type { Message } from '@/types/chat';
import type { MemoryResponse, CreateMemoryRequest } from '@/types/memory';

// Context window configuration
const MAX_CONTEXT_TOKENS = 128000; // Claude 3.5 Sonnet context window
const COMPACTION_THRESHOLD = 0.8; // Trigger compaction at 80% usage
const MAX_RECENT_MESSAGES = 10; // Keep last 10 messages in full
const SUMMARY_CHUNK_SIZE = 20; // Summarize every 20 older messages
const RESERVED_TOKENS = 4000; // Reserve tokens for system prompt and response

export interface CompactionResult {
  messages: Message[];
  summaries: CompactionSummary[];
  totalTokens: number;
  wasCompacted: boolean;
  removedMessages: number;
}

export interface CompactionSummary {
  id: string;
  messageIds: string[];
  summary: string;
  tokenCount: number;
  importance: number;
  timestamp: Date;
  messageCount: number;
}

export interface ContextWindow {
  messages: Message[];
  summaries: CompactionSummary[];
  currentTokens: number;
  maxTokens: number;
  utilizationPercent: number;
}

/**
 * Calculate the total token count for a set of messages and summaries
 */
export function calculateTotalTokens(
  messages: Message[],
  summaries: CompactionSummary[] = []
): number {
  let totalTokens = 0;

  // Count tokens in messages
  for (const message of messages) {
    if (message.tokenUsage?.totalTokens) {
      totalTokens += message.tokenUsage.totalTokens;
    } else {
      // Fallback to estimation if token usage not tracked
      const tokens = getTokenEncoder().encode(message.content).length;
      totalTokens += tokens;
    }
  }

  // Count tokens in summaries
  for (const summary of summaries) {
    totalTokens += summary.tokenCount;
  }

  return totalTokens + RESERVED_TOKENS;
}

/**
 * Check if context compaction is needed
 */
export function needsCompaction(
  messages: Message[],
  summaries: CompactionSummary[] = []
): boolean {
  const totalTokens = calculateTotalTokens(messages, summaries);
  const threshold = MAX_CONTEXT_TOKENS * COMPACTION_THRESHOLD;
  return totalTokens >= threshold;
}

/**
 * Calculate message importance based on various factors
 */
function calculateMessageImportance(message: Message, index: number, totalMessages: number): number {
  let importance = 0;

  // Recency factor (more recent = more important)
  const recencyScore = (index / totalMessages) * 30;
  importance += recencyScore;

  // User messages are slightly more important
  if (message.role === 'user') {
    importance += 10;
  }

  // Longer messages might contain more context
  const lengthScore = Math.min(message.content.length / 100, 20);
  importance += lengthScore;

  // Messages with questions are important
  if (message.content.includes('?')) {
    importance += 15;
  }

  // Messages with code blocks are important
  if (message.content.includes('```')) {
    importance += 20;
  }

  // Messages with search delegation are important
  if (message.content.includes('[Search:') || message.content.includes('According to recent')) {
    importance += 25;
  }

  return Math.min(importance, 100); // Cap at 100
}

/**
 * Generate a summary of a chunk of messages
 */
async function generateSummary(
  messages: Message[],
  previousContext?: string
): Promise<string> {
  // In a real implementation, this would call an AI model to generate summaries
  // For now, we'll create a structured summary

  const userMessages = messages.filter(m => m.role === 'user');
  const assistantMessages = messages.filter(m => m.role === 'assistant');

  const topics = new Set<string>();
  const keyPoints: string[] = [];

  // Extract topics and key points
  for (const message of messages) {
    // Simple topic extraction (in production, use NLP)
    if (message.content.includes('?')) {
      keyPoints.push(`Question: ${message.content.slice(0, 100)}...`);
    }

    // Extract mentioned technologies/concepts
    const techTerms = message.content.match(/\b(?:AI|API|database|function|code|search|web|memory|context)\b/gi);
    if (techTerms) {
      techTerms.forEach(term => topics.add(term.toLowerCase()));
    }
  }

  const summary = `[Context Summary of ${messages.length} messages]
Topics discussed: ${Array.from(topics).join(', ')}
User queries: ${userMessages.length}
Assistant responses: ${assistantMessages.length}
${keyPoints.length > 0 ? `Key points:\n${keyPoints.slice(0, 3).join('\n')}` : ''}
${previousContext ? `\nBuilds on: ${previousContext.slice(0, 100)}...` : ''}`;

  return summary;
}

/**
 * Perform sliding window compaction with progressive summarization
 */
export async function compactContext(
  messages: Message[],
  existingSummaries: CompactionSummary[] = []
): Promise<CompactionResult> {
  // If we don't need compaction, return as-is
  if (!needsCompaction(messages, existingSummaries)) {
    return {
      messages,
      summaries: existingSummaries,
      totalTokens: calculateTotalTokens(messages, existingSummaries),
      wasCompacted: false,
      removedMessages: 0
    };
  }

  // Sort messages by timestamp (oldest first)
  const sortedMessages = [...messages].sort((a, b) =>
    a.timestamp.getTime() - b.timestamp.getTime()
  );

  // Keep the most recent messages
  const recentMessages = sortedMessages.slice(-MAX_RECENT_MESSAGES);
  const olderMessages = sortedMessages.slice(0, -MAX_RECENT_MESSAGES);

  // Group older messages into chunks for summarization
  const chunks: Message[][] = [];
  for (let i = 0; i < olderMessages.length; i += SUMMARY_CHUNK_SIZE) {
    chunks.push(olderMessages.slice(i, i + SUMMARY_CHUNK_SIZE));
  }

  // Generate summaries for each chunk
  const newSummaries: CompactionSummary[] = [];
  let previousContext = '';

  for (const chunk of chunks) {
    const summary = await generateSummary(chunk, previousContext);
    const tokenCount = getTokenEncoder().encode(summary).length;

    // Calculate average importance of messages in chunk
    const avgImportance = chunk.reduce((sum, msg, idx) =>
      sum + calculateMessageImportance(msg, idx, chunk.length), 0
    ) / chunk.length;

    newSummaries.push({
      id: `summary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      messageIds: chunk.map(m => m.id),
      summary,
      tokenCount,
      importance: avgImportance,
      timestamp: chunk[chunk.length - 1].timestamp,
      messageCount: chunk.length
    });

    previousContext = summary.slice(0, 200);
  }

  // Combine with existing summaries, keeping only the most important ones
  const allSummaries = [...existingSummaries, ...newSummaries]
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 5); // Keep top 5 most important summaries

  const totalTokens = calculateTotalTokens(recentMessages, allSummaries);

  return {
    messages: recentMessages,
    summaries: allSummaries,
    totalTokens,
    wasCompacted: true,
    removedMessages: messages.length - recentMessages.length
  };
}

/**
 * Get the current context window status
 */
export function getContextWindowStatus(
  messages: Message[],
  summaries: CompactionSummary[] = []
): ContextWindow {
  const currentTokens = calculateTotalTokens(messages, summaries);
  const utilizationPercent = (currentTokens / MAX_CONTEXT_TOKENS) * 100;

  return {
    messages,
    summaries,
    currentTokens,
    maxTokens: MAX_CONTEXT_TOKENS,
    utilizationPercent
  };
}

/**
 * Format compacted context for the API
 * Combines summaries and recent messages into a format suitable for the chat API
 */
export function formatCompactedContext(
  messages: Message[],
  summaries: CompactionSummary[]
): Message[] {
  const formattedMessages: Message[] = [];

  // Add summaries as system messages at the beginning
  if (summaries.length > 0) {
    const contextSummary = summaries
      .map(s => s.summary)
      .join('\n\n---\n\n');

    formattedMessages.push({
      id: 'context_summary',
      role: 'system',
      content: `[Previous Conversation Context]\n${contextSummary}\n\n[End of Context Summary]`,
      timestamp: new Date()
    });
  }

  // Add the recent messages
  formattedMessages.push(...messages);

  return formattedMessages;
}

/**
 * Save compaction summary to memory system
 */
export async function saveCompactionToMemory(
  summary: CompactionSummary,
  userEmail: string,
  entityId: string
): Promise<MemoryResponse | null> {
  try {
    const memoryRequest: CreateMemoryRequest = {
      entity_id: entityId,
      memory_type: 'context_summary',
      title: `Chat Context Summary - ${new Date(summary.timestamp).toLocaleDateString()}`,
      content: summary.summary,
      metadata: {
        messageIds: summary.messageIds,
        messageCount: summary.messageCount,
        tokenCount: summary.tokenCount,
        compactedAt: new Date().toISOString()
      },
      importance: summary.importance,
      user_email: userEmail
    };

    const response = await fetch('/api/memory/memories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(memoryRequest)
    });

    if (!response.ok) {
      console.error('Failed to save compaction to memory:', await response.text());
      return null;
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error saving compaction to memory:', error);
    return null;
  }
}

/**
 * Load relevant context summaries from memory
 */
export async function loadContextFromMemory(
  userEmail: string,
  entityId?: string,
  limit: number = 3
): Promise<CompactionSummary[]> {
  try {
    const params = new URLSearchParams({
      query: 'context_summary',
      limit: limit.toString(),
      user_email: userEmail
    });

    if (entityId) {
      params.append('entity_id', entityId);
    }

    const response = await fetch(`/api/memory/search?${params}`);

    if (!response.ok) {
      console.error('Failed to load context from memory:', await response.text());
      return [];
    }

    const result = await response.json();
    const memories: MemoryResponse[] = result.data || [];

    // Convert memories to CompactionSummary format
    return memories.map(memory => ({
      id: memory.id,
      messageIds: memory.metadata?.messageIds || [],
      summary: memory.content,
      tokenCount: memory.metadata?.tokenCount || getTokenEncoder().encode(memory.content).length,
      importance: memory.importance,
      timestamp: new Date(memory.created_at),
      messageCount: memory.metadata?.messageCount || 0
    }));
  } catch (error) {
    console.error('Error loading context from memory:', error);
    return [];
  }
}

/**
 * Calculate optimal compaction strategy based on current usage
 */
export function getCompactionStrategy(
  messages: Message[],
  summaries: CompactionSummary[] = []
): {
  shouldCompact: boolean;
  strategy: 'none' | 'light' | 'moderate' | 'aggressive';
  estimatedTokenReduction: number;
} {
  const currentTokens = calculateTotalTokens(messages, summaries);
  const utilizationPercent = (currentTokens / MAX_CONTEXT_TOKENS) * 100;

  if (utilizationPercent < 60) {
    return {
      shouldCompact: false,
      strategy: 'none',
      estimatedTokenReduction: 0
    };
  }

  if (utilizationPercent < 80) {
    // Light compaction - summarize oldest 30% of messages
    const messagesToCompact = Math.floor(messages.length * 0.3);
    const estimatedReduction = messagesToCompact * 100; // Rough estimate

    return {
      shouldCompact: false, // Not yet needed, but prepare
      strategy: 'light',
      estimatedTokenReduction: estimatedReduction
    };
  }

  if (utilizationPercent < 95) {
    // Moderate compaction - keep only recent messages
    const messagesToRemove = messages.length - MAX_RECENT_MESSAGES;
    const estimatedReduction = messagesToRemove * 150; // Rough estimate

    return {
      shouldCompact: true,
      strategy: 'moderate',
      estimatedTokenReduction: estimatedReduction
    };
  }

  // Aggressive compaction - minimize context to essentials
  const messagesToRemove = messages.length - 5; // Keep only last 5
  const estimatedReduction = currentTokens * 0.7; // Estimate 70% reduction

  return {
    shouldCompact: true,
    strategy: 'aggressive',
    estimatedTokenReduction: estimatedReduction
  };
}