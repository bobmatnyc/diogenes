import { ChatSession, Message } from '@/types/chat';

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
    updatedAt: now
  };
}

export function addMessageToSession(session: ChatSession, message: Message): ChatSession {
  const updatedSession = {
    ...session,
    messages: [...session.messages, message],
    updatedAt: new Date()
  };
  saveSession(updatedSession);
  return updatedSession;
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
}