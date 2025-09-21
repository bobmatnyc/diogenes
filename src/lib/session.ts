import type { ChatSession, Message, TokenUsage } from '@/types/chat';
import { calculateCost, estimateTokens } from './tokens';
import { MemoryClient } from './memory/client';
import { generateSessionSummary, extractTopics } from './memory/client';
import type { CompactionSummary } from './context-compaction';
import {
  compactContext,
  needsCompaction,
  loadContextFromMemory,
  saveCompactionToMemory
} from './context-compaction';

const SESSION_KEY = 'chat_session';
const LAST_USER_KEY = 'last_user_id';
const ENTITY_KEY = 'memory_entity_id';

// Track the current user for session management
let currentUserId: string | null = null;
let memoryClient: MemoryClient | null = null;
let currentEntityId: string | null = null;

export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Initialize memory client with API key
 */
export function initializeMemoryClient(apiKey: string): void {
  memoryClient = new MemoryClient({ apiKey });
}

/**
 * Check if user has changed (new login)
 */
export function hasUserChanged(userId: string): boolean {
  if (typeof window === 'undefined') return false;

  const lastUserId = localStorage.getItem(LAST_USER_KEY);
  return lastUserId !== userId;
}

/**
 * Handle user login - clear session and save summary if needed
 */
export async function handleUserLogin(
  userId: string,
  userName: string,
  userEmail?: string
): Promise<void> {
  if (typeof window === 'undefined') return;

  // Check if this is a new user login
  if (hasUserChanged(userId)) {
    console.log('New user login detected, handling session transition');

    // Save current session summary before clearing
    const currentSession = getSession();
    if (currentSession && currentSession.messages.length > 0) {
      await saveSessionSummaryToMemory(currentSession);
    }

    // Clear the session for the new user
    clearSession();

    // Update stored user ID
    localStorage.setItem(LAST_USER_KEY, userId);
    currentUserId = userId;

    // Get or create memory entity for the user
    if (memoryClient) {
      const entity = await memoryClient.getOrCreateUserEntity(userId, userName, userEmail);
      if (entity) {
        currentEntityId = entity.id;
        localStorage.setItem(ENTITY_KEY, entity.id);
      }
    }
  } else {
    // Same user, just update current user ID
    currentUserId = userId;

    // Restore entity ID from storage
    const storedEntityId = localStorage.getItem(ENTITY_KEY);
    if (storedEntityId) {
      currentEntityId = storedEntityId;
    }
  }
}

/**
 * Save session summary to memory system
 */
async function saveSessionSummaryToMemory(session: ChatSession): Promise<void> {
  if (!memoryClient || !currentEntityId || !currentUserId) {
    console.log('Cannot save session summary: missing client or entity');
    return;
  }

  try {
    const summary = generateSessionSummary(session.messages);
    const topics = extractTopics(session.messages);

    await memoryClient.storeMemory(
      {
        entity_id: currentEntityId,
        memory_type: 'experience',
        title: `Chat Session - ${new Date(session.createdAt).toLocaleDateString()}`,
        content: summary,
        metadata: {
          sessionId: session.id,
          messageCount: session.messages.length,
          totalTokens: session.totalTokens,
          totalCost: session.totalCost,
          topics,
          userId: currentUserId
        },
        importance: Math.min(50 + (session.messages.length * 2), 90)
      },
      currentUserId
    );

    console.log('Session summary saved to memory');
  } catch (error) {
    console.error('Failed to save session summary:', error);
  }
}

export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function getSession(): ChatSession | null {
  if (typeof window === 'undefined') return null;

  const sessionData = localStorage.getItem(SESSION_KEY);
  if (!sessionData) return null;

  try {
    const session = JSON.parse(sessionData) as ChatSession;
    // Convert date strings back to Date objects
    session.createdAt = new Date(session.createdAt);
    session.updatedAt = new Date(session.updatedAt);
    session.messages = session.messages.map((msg: any) => ({
      ...msg,
      timestamp: new Date(msg.timestamp),
    }));

    // Migrate old sessions without token tracking
    if (session.totalTokens === undefined) {
      session.totalTokens = 0;
      session.totalCost = 0;

      // Calculate tokens for existing messages
      for (const message of session.messages) {
        if (!message.tokenUsage) {
          const tokens = estimateTokens(message.content);
          message.tokenUsage = {
            promptTokens: message.role === 'user' ? tokens : 0,
            completionTokens: message.role === 'assistant' ? tokens : 0,
            totalTokens: tokens,
            cost: calculateCost(
              message.role === 'user' ? tokens : 0,
              message.role === 'assistant' ? tokens : 0,
            ),
          };
        }
        session.totalTokens += message.tokenUsage.totalTokens;
        session.totalCost += message.tokenUsage.cost;
      }
    }

    return session;
  } catch (error) {
    console.error('Failed to parse session:', error);
    return null;
  }
}

export function saveSession(session: ChatSession): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function createNewSession(): Promise<ChatSession> {
  const now = new Date();
  const session: ChatSession = {
    id: generateSessionId(),
    messages: [],
    createdAt: now,
    updatedAt: now,
    totalTokens: 0,
    totalCost: 0,
  };

  // Load any relevant context from memory
  if (memoryClient && currentEntityId && currentUserId) {
    try {
      const previousSummaries = await loadContextFromMemory(
        currentUserId,
        currentEntityId,
        3 // Load last 3 context summaries
      );

      if (previousSummaries.length > 0) {
        // Store summaries in session metadata for later use
        (session as any).contextSummaries = previousSummaries;
        console.log(`Loaded ${previousSummaries.length} context summaries from memory`);
      }
    } catch (error) {
      console.error('Failed to load context from memory:', error);
    }
  }

  return session;
}

export async function addMessageToSession(
  session: ChatSession,
  message: Message
): Promise<ChatSession> {
  // If message doesn't have token usage, estimate it
  if (!message.tokenUsage) {
    const tokens = estimateTokens(message.content);
    message.tokenUsage = {
      promptTokens: message.role === 'user' ? tokens : 0,
      completionTokens: message.role === 'assistant' ? tokens : 0,
      totalTokens: tokens,
      cost: calculateCost(
        message.role === 'user' ? tokens : 0,
        message.role === 'assistant' ? tokens : 0,
      ),
    };
  }

  let updatedSession = {
    ...session,
    messages: [...session.messages, message],
    updatedAt: new Date(),
    totalTokens: session.totalTokens + (message.tokenUsage?.totalTokens || 0),
    totalCost: session.totalCost + (message.tokenUsage?.cost || 0),
  };

  // Check if we need compaction
  const existingSummaries = (updatedSession as any).contextSummaries || [];
  if (needsCompaction(updatedSession.messages, existingSummaries)) {
    console.log('Context compaction needed, performing compaction...');

    try {
      const compactionResult = await compactContext(
        updatedSession.messages,
        existingSummaries
      );

      if (compactionResult.wasCompacted) {
        console.log(`Compacted context: removed ${compactionResult.removedMessages} messages`);

        // Update session with compacted messages
        updatedSession.messages = compactionResult.messages;
        (updatedSession as any).contextSummaries = compactionResult.summaries;

        // Save compaction summaries to memory
        if (memoryClient && currentEntityId && currentUserId) {
          for (const summary of compactionResult.summaries) {
            if (!summary.id.startsWith('memory_')) { // Don't re-save loaded summaries
              await saveCompactionToMemory(
                summary,
                currentUserId,
                currentEntityId
              );
            }
          }
        }
      }
    } catch (error) {
      console.error('Context compaction failed:', error);
    }
  }

  saveSession(updatedSession);
  return updatedSession;
}

export function updateMessageTokenUsage(
  session: ChatSession,
  messageId: string,
  tokenUsage: TokenUsage,
): ChatSession {
  const messageIndex = session.messages.findIndex((m) => m.id === messageId);
  if (messageIndex === -1) return session;

  const oldTokenUsage = session.messages[messageIndex].tokenUsage;
  const updatedMessages = [...session.messages];
  updatedMessages[messageIndex] = {
    ...updatedMessages[messageIndex],
    tokenUsage,
  };

  // Update session totals
  const tokenDiff = tokenUsage.totalTokens - (oldTokenUsage?.totalTokens || 0);
  const costDiff = tokenUsage.cost - (oldTokenUsage?.cost || 0);

  const updatedSession = {
    ...session,
    messages: updatedMessages,
    totalTokens: session.totalTokens + tokenDiff,
    totalCost: session.totalCost + costDiff,
    updatedAt: new Date(),
  };

  saveSession(updatedSession);
  return updatedSession;
}

export async function clearSession(): Promise<void> {
  if (typeof window === 'undefined') return;

  // Save summary before clearing
  const session = getSession();
  if (session && session.messages.length > 0) {
    await saveSessionSummaryToMemory(session);
  }

  localStorage.removeItem(SESSION_KEY);
}

/**
 * Get context summaries from the current session
 */
export function getSessionContextSummaries(): CompactionSummary[] {
  const session = getSession();
  if (!session) return [];

  return (session as any).contextSummaries || [];
}

/**
 * Get current memory entity ID
 */
export function getCurrentEntityId(): string | null {
  return currentEntityId;
}

/**
 * Get memory client instance
 */
export function getMemoryClientInstance(): MemoryClient | null {
  return memoryClient;
}
