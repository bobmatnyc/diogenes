'use client';

import { useEffect, useState, useRef } from 'react';
import { useChat } from 'ai/react';
import MessageBubble from './MessageBubble';
import InputForm from './InputForm';
import { Message } from '@/types/chat';
import {
  getSession,
  createNewSession,
  addMessageToSession,
  generateMessageId,
  clearSession,
} from '@/lib/session';
import { getRandomStarter } from '@/lib/prompts/core-principles';

export default function ChatInterface() {
  const [session, setSession] = useState(() => getSession() || createNewSession());
  const [isInitialized, setIsInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } = useChat({
    api: '/api/chat',
    initialMessages: session.messages.map(msg => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    onFinish: (message) => {
      const newMessage: Message = {
        id: message.id,
        role: message.role as 'assistant',
        content: message.content,
        timestamp: new Date(),
      };
      const updatedSession = addMessageToSession(session, newMessage);
      setSession(updatedSession);
    },
  });

  useEffect(() => {
    if (!isInitialized && session.messages.length === 0) {
      const welcomeMessage: Message = {
        id: generateMessageId(),
        role: 'assistant',
        content: getRandomStarter(),
        timestamp: new Date(),
      };
      const updatedSession = addMessageToSession(session, welcomeMessage);
      setSession(updatedSession);
      setMessages([{
        id: welcomeMessage.id,
        role: 'assistant',
        content: welcomeMessage.content,
      }]);
      setIsInitialized(true);
    }
  }, [isInitialized, session, setMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (message: string) => {
    const userMessage: Message = {
      id: generateMessageId(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    const updatedSession = addMessageToSession(session, userMessage);
    setSession(updatedSession);
    
    // Use the built-in chat hook submit
    handleSubmit(new Event('submit') as any, {
      data: {
        message: message,
      }
    });
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
      {/* Header */}
      <div className="bg-diogenes-primary text-white p-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Diogenes</h1>
            <p className="text-sm opacity-90">The Digital Cynic</p>
          </div>
          <button
            onClick={handleNewConversation}
            className="px-4 py-2 bg-diogenes-secondary hover:bg-diogenes-accent rounded-lg transition-colors"
          >
            New Conversation
          </button>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto">
          {messages.map((message) => (
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