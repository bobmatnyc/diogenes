'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useChat } from 'ai/react';
import MessageBubble from './MessageBubble';
import InputForm from './InputForm';
import TokenMetrics from './TokenMetrics';
import { Message, TokenUsage } from '@/types/chat';
import {
  getSession,
  createNewSession,
  addMessageToSession,
  generateMessageId,
  clearSession,
  updateMessageTokenUsage,
} from '@/lib/session';
import { getRandomStarter } from '@/lib/prompts/core-principles';
import { isDevelopment } from '@/lib/env';
import { estimateTokens, calculateCost } from '@/lib/tokens';

export default function ChatInterface() {
  const [session, setSession] = useState(() => getSession() || createNewSession());
  const [isInitialized, setIsInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);

  // Parse token usage from the streaming response
  const parseTokenUsageFromContent = useCallback((content: string): { content: string; tokenUsage?: TokenUsage } => {
    const tokenMatch = content.match(/\n##TOKEN_USAGE##(.+?)##END_TOKEN_USAGE##/);
    if (tokenMatch) {
      try {
        const tokenData = JSON.parse(tokenMatch[1]);
        const cleanContent = content.replace(tokenMatch[0], '').trim();
        return { content: cleanContent, tokenUsage: tokenData.tokenUsage };
      } catch (error) {
        console.error('Failed to parse token usage:', error);
      }
    }
    return { content, tokenUsage: undefined };
  }, []);

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages, append } = useChat({
    api: '/api/chat',
    initialMessages: session.messages.map(msg => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    onFinish: (message) => {
      // Parse token usage from the message content
      const { content, tokenUsage } = parseTokenUsageFromContent(message.content);
      
      const newMessage: Message = {
        id: message.id,
        role: message.role as 'assistant',
        content: content,
        timestamp: new Date(),
        tokenUsage: tokenUsage,
      };
      
      // Add to local messages state
      setLocalMessages(prev => [...prev, newMessage]);
      
      // Update session with the new message
      setSession(currentSession => {
        const updatedSession = addMessageToSession(currentSession, newMessage);
        return updatedSession;
      });
      
      // Update the displayed message to remove token usage markers
      if (content !== message.content) {
        setMessages(messages => messages.map(m => 
          m.id === message.id ? { ...m, content } : m
        ));
      }
    },
  });

  // Initialize messages from session on mount
  useEffect(() => {
    if (!isInitialized) {
      if (session.messages.length === 0) {
        // Create welcome message for new sessions
        const welcomeMessage: Message = {
          id: generateMessageId(),
          role: 'assistant',
          content: getRandomStarter(),
          timestamp: new Date(),
        };
        const updatedSession = addMessageToSession(session, welcomeMessage);
        setSession(updatedSession);
        setLocalMessages([welcomeMessage]);
        setMessages([{
          id: welcomeMessage.id,
          role: 'assistant',
          content: welcomeMessage.content,
        }]);
      } else {
        // Load existing messages from session
        setLocalMessages(session.messages);
        setMessages(session.messages.map(msg => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })));
      }
      setIsInitialized(true);
    }
  }, [isInitialized, session.messages, setMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const message = input.trim();
    
    // Calculate token usage for user message
    const userTokens = estimateTokens(message);
    const userTokenUsage: TokenUsage = {
      promptTokens: userTokens,
      completionTokens: 0,
      totalTokens: userTokens,
      cost: calculateCost(userTokens, 0),
    };
    
    const userMessage: Message = {
      id: generateMessageId(),
      role: 'user',
      content: message,
      timestamp: new Date(),
      tokenUsage: userTokenUsage,
    };
    
    // Add to local messages state
    setLocalMessages(prev => [...prev, userMessage]);
    
    // Update session with user message
    setSession(currentSession => {
      const updatedSession = addMessageToSession(currentSession, userMessage);
      return updatedSession;
    });
    
    // Use the built-in chat hook submit
    handleSubmit(e);
  };

  const handleNewConversation = () => {
    if (confirm('Start a new conversation? Current conversation will be cleared.')) {
      clearSession();
      const newSession = createNewSession();
      setSession(newSession);
      setMessages([]);
      setIsInitialized(false);
      window.location.reload();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Development Mode Banner */}
      {isDevelopment() && (
        <div className="bg-yellow-500 text-black text-center py-2 text-sm font-medium">
          Development Mode - Authentication Bypassed
        </div>
      )}
      
      {/* Header */}
      <div className="bg-diogenes-primary text-white p-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Diogenes</h1>
            <p className="text-sm opacity-90">The Digital Cynic</p>
          </div>
          <div className="flex items-center gap-4">
            <TokenMetrics session={session} />
            <button
              onClick={handleNewConversation}
              className="px-4 py-2 bg-diogenes-secondary hover:bg-diogenes-accent rounded-lg transition-colors"
            >
              New Conversation
            </button>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto">
          {messages.map((message, index) => {
            // Find the corresponding local message for token usage
            const localMessage = localMessages.find(m => m.id === message.id);
            const { content } = parseTokenUsageFromContent(message.content);
            
            return (
              <MessageBubble
                key={message.id}
                message={{
                  id: message.id,
                  role: message.role as 'user' | 'assistant',
                  content: content,
                  timestamp: localMessage?.timestamp || new Date(),
                  tokenUsage: localMessage?.tokenUsage,
                }}
              />
            );
          })}
          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className="bg-gray-200 dark:bg-gray-700 px-4 py-3 rounded-lg">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Form */}
      <div className="max-w-4xl mx-auto w-full">
        <form onSubmit={handleSendMessage} className="flex gap-2 p-4 border-t">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Challenge Diogenes with your question..."
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-diogenes-primary disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-2 bg-diogenes-primary text-white rounded-lg hover:bg-diogenes-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}