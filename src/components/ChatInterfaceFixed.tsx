'use client';

import { useEffect, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import MessageBubble from './MessageBubble';
import TokenMetrics from './TokenMetrics';
import VersionBadge, { VersionFooter } from './VersionBadge';
import { 
  getSession, 
  createNewSession, 
  addMessageToSession,
  clearSession
} from '@/lib/session';
import { getRandomStarter } from '@/lib/prompts/core-principles';
import { isDevelopment } from '@/lib/env';
import { estimateTokens, calculateCost, estimateMessagesTokens } from '@/lib/tokens';
import { Message } from '@/types/chat';

export default function ChatInterfaceFixed() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [welcomeShown, setWelcomeShown] = useState(false);
  
  // Initialize session
  const session = getSession() || createNewSession();
  
  // Use the useChat hook - SIMPLIFIED VERSION with API compatibility fixes
  const chatHook = useChat({});
  
  // Extract properties with API compatibility handling
  const messages = (chatHook as any).messages || [];
  const input = (chatHook as any).input || '';
  const handleInputChange = (chatHook as any).handleInputChange || ((e: any) => {});
  const handleSubmit = (chatHook as any).handleSubmit || ((e: any) => {});
  const isLoading = (chatHook as any).isLoading || false;
  const setMessages = (chatHook as any).setMessages || (() => {});

  // Add welcome message on first load
  useEffect(() => {
    if (!welcomeShown && messages.length === 0 && setMessages) {
      const welcomeMessage = {
        id: Date.now().toString(),
        role: 'assistant' as const,
        content: getRandomStarter(),
      };
      
      console.log('[DEBUG] Setting welcome message');
      setMessages([welcomeMessage]);
      setWelcomeShown(true);
      
      // Save welcome message to session
      const newSession = createNewSession();
      addMessageToSession(newSession, {
        ...welcomeMessage,
        timestamp: new Date(),
      });
    }
  }, [messages, setMessages, welcomeShown]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleNewConversation = () => {
    if (confirm('Start a new conversation? Current conversation will be cleared.')) {
      clearSession();
      window.location.reload();
    }
  };

  // Custom submit handler to track user messages
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    console.log('[DEBUG] Form submit triggered');
    console.log('[DEBUG] Input value:', input);
    console.log('[DEBUG] handleSubmit function:', !!handleSubmit);
    
    e.preventDefault();
    
    if (!input?.trim()) {
      console.log('[DEBUG] Input is empty, not submitting');
      return;
    }
    
    if (!handleSubmit) {
      console.error('[DEBUG] handleSubmit is not defined!');
      return;
    }
    
    // Save user message to session
    const userTokens = estimateTokens(input);
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
      tokenUsage: {
        promptTokens: userTokens,
        completionTokens: 0,
        totalTokens: userTokens,
        cost: calculateCost(userTokens, 0),
      },
    };
    
    const currentSession = getSession() || createNewSession();
    addMessageToSession(currentSession, userMessage);
    
    // Call the original handleSubmit
    console.log('[DEBUG] Calling handleSubmit');
    try {
      handleSubmit(e);
      console.log('[DEBUG] handleSubmit completed');
    } catch (error) {
      console.error('[DEBUG] Error in handleSubmit:', error);
    }
  };

  // Get current session for token metrics
  const currentSession = getSession() || createNewSession();

  console.log('[DEBUG] Render state:', {
    messagesCount: messages.length,
    inputValue: input,
    isLoading,
    hasHandleSubmit: !!handleSubmit,
    hasHandleInputChange: !!handleInputChange,
  });

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
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold">Diogenes</h1>
              <p className="text-sm opacity-90">The Digital Cynic (Fixed)</p>
            </div>
            <VersionBadge variant="minimal" showEnvironment={false} className="text-white" />
          </div>
          <div className="flex items-center gap-4">
            <TokenMetrics session={currentSession} />
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
          {messages.map((message: any) => (
            <MessageBubble
              key={message.id}
              message={{
                id: message.id,
                role: message.role as 'user' | 'assistant',
                content: message.content,
                timestamp: new Date(),
              }}
            />
          ))}
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
        <form onSubmit={handleFormSubmit} className="flex gap-2 p-4 border-t">
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
            disabled={isLoading || !input?.trim()}
            className="px-6 py-2 bg-diogenes-primary text-white rounded-lg hover:bg-diogenes-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </div>
      
      {/* Version Footer */}
      <VersionFooter className="border-t" />
    </div>
  );
}