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
import { estimateTokens, calculateCost, estimateMessagesTokens } from '@/lib/tokens';

export default function ChatInterface() {
  const [session, setSession] = useState(() => getSession() || createNewSession());
  const [isInitialized, setIsInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } = useChat({
    api: '/api/chat',
    initialMessages: session.messages.map(msg => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    onFinish: (message) => {
      // After receiving the assistant's response, save both user and assistant messages
      // The messages array now contains both
      const allMessages = messages;
      
      // Find the last user message (should be second to last in the array)
      const userMsgIndex = allMessages.length - 1;
      if (userMsgIndex >= 0) {
        const userMsg = allMessages[userMsgIndex];
        if (userMsg && userMsg.role === 'user') {
          // Calculate and save user message with tokens
          const userTokens = estimateTokens(userMsg.content);
          const userMessage: Message = {
            id: userMsg.id,
            role: 'user',
            content: userMsg.content,
            timestamp: new Date(),
            tokenUsage: {
              promptTokens: userTokens,
              completionTokens: 0,
              totalTokens: userTokens,
              cost: calculateCost(userTokens, 0),
            },
          };
          
          setLocalMessages(prev => {
            const exists = prev.some(m => m.id === userMsg.id);
            if (!exists) {
              const updated = [...prev, userMessage];
              setSession(currentSession => addMessageToSession(currentSession, userMessage));
              return updated;
            }
            return prev;
          });
        }
      }
      
      // Calculate and save assistant message with tokens
      const completionTokens = estimateTokens(message.content);
      const promptTokens = estimateMessagesTokens(allMessages.map(m => ({
        role: m.role,
        content: m.content
      })));
      
      const assistantMessage: Message = {
        id: message.id,
        role: message.role as 'assistant',
        content: message.content,
        timestamp: new Date(),
        tokenUsage: {
          promptTokens: promptTokens,
          completionTokens: completionTokens,
          totalTokens: promptTokens + completionTokens,
          cost: calculateCost(promptTokens, completionTokens),
        },
      };
      
      setLocalMessages(prev => {
        const exists = prev.some(m => m.id === message.id);
        if (!exists) {
          const updated = [...prev, assistantMessage];
          setSession(currentSession => addMessageToSession(currentSession, assistantMessage));
          return updated;
        }
        return prev;
      });
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

  // Monitor messages changes for debugging (can be removed in production)
  useEffect(() => {
    // Uncomment for debugging:
    // console.log('Messages state updated:', messages);
  }, [messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleNewConversation = () => {
    if (confirm('Start a new conversation? Current conversation will be cleared.')) {
      clearSession();
      const newSession = createNewSession();
      setSession(newSession);
      setMessages([]);
      setLocalMessages([]);
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
          {messages.map((message) => {
            // Find the corresponding local message for token usage
            const localMessage = localMessages.find(m => m.id === message.id);
            
            return (
              <MessageBubble
                key={message.id}
                message={{
                  id: message.id,
                  role: message.role as 'user' | 'assistant',
                  content: message.content,
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
        <form onSubmit={handleSubmit} className="flex gap-2 p-4 border-t">
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