import { ChatSession, Message, TokenUsage } from '@/types/chat';
import { estimateTokens, calculateCost } from './tokens';

const SESSION_KEY = 'chat_session';

export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function getSession(): ChatSession | null {
  if (typeof window === 'undefined') return null;
  
  const sessionData = localStorage.getItem(SESSION_KEY);
  if (!sessionData) return null;
  
  try {
    const session = JSON.parse(sessionData);
    // Convert date strings back to Date objects
    session.createdAt = new Date(session.createdAt);
    session.updatedAt = new Date(session.updatedAt);
    session.messages = session.messages.map((msg: any) => ({
      ...msg,
      timestamp: new Date(msg.timestamp)
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
              message.role === 'assistant' ? tokens : 0
            )
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

export function createNewSession(): ChatSession {
  const now = new Date();
  return {
    id: generateSessionId(),
    messages: [],
    createdAt: now,
    updatedAt: now,
    totalTokens: 0,
    totalCost: 0
  };
}

export function addMessageToSession(session: ChatSession, message: Message): ChatSession {
  // If message doesn't have token usage, estimate it
  if (!message.tokenUsage) {
    const tokens = estimateTokens(message.content);
    message.tokenUsage = {
      promptTokens: message.role === 'user' ? tokens : 0,
      completionTokens: message.role === 'assistant' ? tokens : 0,
      totalTokens: tokens,
      cost: calculateCost(
        message.role === 'user' ? tokens : 0,
        message.role === 'assistant' ? tokens : 0
      )
    };
  }
  
  const updatedSession = {
    ...session,
    messages: [...session.messages, message],
    updatedAt: new Date(),
    totalTokens: session.totalTokens + (message.tokenUsage?.totalTokens || 0),
    totalCost: session.totalCost + (message.tokenUsage?.cost || 0)
  };
  saveSession(updatedSession);
  return updatedSession;
}

export function updateMessageTokenUsage(session: ChatSession, messageId: string, tokenUsage: TokenUsage): ChatSession {
  const messageIndex = session.messages.findIndex(m => m.id === messageId);
  if (messageIndex === -1) return session;
  
  const oldTokenUsage = session.messages[messageIndex].tokenUsage;
  const updatedMessages = [...session.messages];
  updatedMessages[messageIndex] = {
    ...updatedMessages[messageIndex],
    tokenUsage
  };
  
  // Update session totals
  const tokenDiff = tokenUsage.totalTokens - (oldTokenUsage?.totalTokens || 0);
  const costDiff = tokenUsage.cost - (oldTokenUsage?.cost || 0);
  
  const updatedSession = {
    ...session,
    messages: updatedMessages,
    totalTokens: session.totalTokens + tokenDiff,
    totalCost: session.totalCost + costDiff,
    updatedAt: new Date()
  };
  
  saveSession(updatedSession);
  return updatedSession;
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
}