'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useRef, useState, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Database, Bug } from 'lucide-react';
import { isDevelopment, shouldBypassAuth } from '@/lib/env';
import { useDevUser } from '@/lib/auth/dev-user';
import { getConversationStarter } from '@/lib/personality/composer';
import { type PersonalityType } from '@/components/PersonalitySelector';
import {
  addMessageToSession,
  clearSession,
  createNewSession,
  getSession,
  handleUserLogin,
  initializeMemoryClient,
  getSessionContextSummaries
} from '@/lib/session';
import { getContextWindowStatus } from '@/lib/context-compaction';
import {
  calculateCost,
  estimateMessagesTokens,
  estimateTokens
} from '@/lib/tokens';
import { DEFAULT_MODEL_ID } from '@/types/chat';
import type { Message } from '@/types/chat';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import ChatHeader from './ChatHeader';
import ErrorMessage from './ErrorMessage';
import LoadingIndicator from './LoadingIndicator';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { cn } from '@/lib/utils';
import type { MemoryDebugInfo } from '@/lib/memory/types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isError?: boolean;
  errorType?: string;
  errorDetails?: any;
}

export default function ChatInterface() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL_ID);
  const [selectedPersonality, setSelectedPersonality] = useState<PersonalityType>('executive');
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [lastError, setLastError] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [contextUsage, setContextUsage] = useState<{
    tokens: number;
    maxTokens: number;
    percent: number;
    wasCompacted: boolean;
    summaryCount: number;
  }>({ tokens: 0, maxTokens: 128000, percent: 0, wasCompacted: false, summaryCount: 0 });
  const [debugMode, setDebugMode] = useState(false);
  const [memoryDebugInfo, setMemoryDebugInfo] = useState<MemoryDebugInfo | null>(null);
  const [memoryUsed, setMemoryUsed] = useState(false);
  const [pendingMemoryStorage, setPendingMemoryStorage] = useState<{
    entityId: string;
    userInput: string;
    assistantResponse: string;
  } | null>(null);
  const [kuzuMemoryCount, setKuzuMemoryCount] = useState(0);
  const [kuzuCommand, setKuzuCommand] = useState<string | null>(null);

  // Get appropriate user based on auth bypass mode
  const clerkUser = useUser();
  const devUser = useDevUser();
  const bypassAuth = shouldBypassAuth();
  const { user } = bypassAuth ? devUser : clerkUser;

  const [sessionInitialized, setSessionInitialized] = useState(false);

  // Initialize session state (will be async initialized)
  const [session, setSession] = useState(getSession());

  // Get user's first name for personalization
  const firstName = user?.firstName || user?.username || 'wanderer';

  // Initialize memory client and handle user login
  useEffect(() => {
    const initializeSession = async () => {
      if (user) {
        // Initialize memory client with API key from environment
        const memoryApiKey = process.env.NEXT_PUBLIC_MEMORY_API_KEY || 'internal_diogenes_key';
        initializeMemoryClient(memoryApiKey);

        // Handle user login and session management
        await handleUserLogin(
          user.id,
          user.fullName || user.username || 'User',
          user.primaryEmailAddress?.emailAddress || (bypassAuth ? 'bob@localhost.dev' : undefined)
        );

        // Create or get session
        let currentSession = getSession();
        if (!currentSession) {
          currentSession = await createNewSession();
          setSession(currentSession);
        }

        setSessionInitialized(true);
      }
    };

    initializeSession();
  }, [user]);

  // Update context usage when messages change
  useEffect(() => {
    if (session) {
      const summaries = getSessionContextSummaries();
      const status = getContextWindowStatus(session.messages, summaries);
      setContextUsage({
        tokens: status.currentTokens,
        maxTokens: status.maxTokens,
        percent: status.utilizationPercent,
        wasCompacted: summaries.length > 0,
        summaryCount: summaries.length
      });
    }
  }, [session, messages]);

  // Load saved preferences on mount and listen for updates
  useEffect(() => {
    // Load preferences from localStorage
    const loadPreferences = () => {
      const stored = localStorage.getItem('user-preferences');
      if (stored) {
        try {
          const preferences = JSON.parse(stored);
          setSelectedModel(preferences.model || DEFAULT_MODEL_ID);
          setSelectedPersonality(preferences.personality || 'executive');
          setDebugMode(preferences.debugMode || false);
        } catch (error) {
          console.error('Failed to load preferences:', error);
          // Fallback to legacy storage format
          const savedModel = localStorage.getItem('preferredModel');
          if (savedModel) setSelectedModel(savedModel);
          const savedPersonality = localStorage.getItem('preferredPersonality') as PersonalityType;
          if (savedPersonality) setSelectedPersonality(savedPersonality);
        }
      } else {
        // Try legacy format
        const savedModel = localStorage.getItem('preferredModel');
        if (savedModel) setSelectedModel(savedModel);
        const savedPersonality = localStorage.getItem('preferredPersonality') as PersonalityType;
        if (savedPersonality) setSelectedPersonality(savedPersonality);
      }
    };

    loadPreferences();

    // Listen for preference updates
    const handlePreferencesUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      const preferences = customEvent.detail;
      setSelectedModel(preferences.model);
      setSelectedPersonality(preferences.personality);
      setDebugMode(preferences.debugMode);
    };

    window.addEventListener('preferences-updated', handlePreferencesUpdate);
    return () => window.removeEventListener('preferences-updated', handlePreferencesUpdate);
  }, []);

  // Add welcome message on first load
  useEffect(() => {
    const initializeWelcome = async () => {
      if (!sessionInitialized) return;

      const currentSession = getSession();
      if (!currentSession || currentSession.messages.length === 0) {
      const welcomeContent = getConversationStarter(selectedPersonality, firstName);

      const welcomeMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: welcomeContent,
      };

      setMessages([welcomeMessage]);

      // Save welcome message to session
      const newSession = await createNewSession();
      await addMessageToSession(newSession, {
        ...welcomeMessage,
        timestamp: new Date(),
      });
        setSession(newSession);
      } else {
      // Load messages from session
      const sessionMessages: ChatMessage[] = currentSession.messages.map((msg) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));
      setMessages(sessionMessages);
      }
    };

    initializeWelcome();
  }, [sessionInitialized, selectedPersonality]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingContent]);

  const handleNewConversation = useCallback(() => {
    setShowNewChatDialog(true);
  }, []);

  const handleConfirmNewChat = useCallback(async () => {
    await clearSession();
    window.location.reload();
  }, []);

  const handleDownloadTranscript = useCallback(() => {
    // Format the conversation as markdown
    const timestamp = new Date().toISOString().split('T')[0];
    let transcript = '# Diogenes Conversation Transcript\n';
    transcript += `Date: ${new Date().toLocaleDateString()}\n`;
    transcript += `Time: ${new Date().toLocaleTimeString()}\n`;
    transcript += `User: ${firstName}\n`;
    transcript += `Model: ${selectedModel}\n\n`;
    transcript += '---\n\n';

    messages.forEach((msg) => {
      const role = msg.role === 'user' ? `**${firstName}**` : '**Diogenes**';
      transcript += `${role}:\n${msg.content}\n\n`;
    });

    transcript += '---\n\n';
    transcript += '_Generated by Diogenes - The Digital Cynic_\n';

    // Create and download the file
    const blob = new Blob([transcript], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diogenes-chat-${timestamp}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [messages, firstName, selectedModel]);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) {
      return;
    }

    // Add user message to UI
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setStreamingContent('');

    // Save user message to session
    const userTokens = estimateTokens(content.trim());
    const sessionUserMessage: Message = {
      id: userMessage.id,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
      tokenUsage: {
        promptTokens: userTokens,
        completionTokens: 0,
        totalTokens: userTokens,
        cost: calculateCost(userTokens, 0),
      },
    };

    const currentSession = getSession() || await createNewSession();
    const updatedSession = await addMessageToSession(currentSession, sessionUserMessage);
    setSession(updatedSession);

    // Check if context was compacted
    const summaries = getSessionContextSummaries();
    if (summaries.length > 0) {
      console.log(`Using ${summaries.length} context summaries in request`);
    }

    try {
      // Send to API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          firstName: firstName,
          model: selectedModel,
          personality: selectedPersonality,
          userId: user?.id,
          userEmail: user?.primaryEmailAddress?.emailAddress,
          debugMode: debugMode,
          contextSummaries: summaries, // Include context summaries
        }),
      });

      if (!response.ok) {
        // Try to parse error response
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { 
            error: 'API Error',
            message: `Request failed with status ${response.status}` 
          };
        }
        
        // Throw with parsed error data
        const error = new Error(errorData.message || `API error: ${response.status}`);
        (error as any).errorData = errorData;
        (error as any).status = response.status;
        throw error;
      }

      // Check if search was delegated
      const searchDelegated = response.headers.get('X-Search-Delegated') === 'true';
      setIsSearching(searchDelegated);

      // Check if memory was used
      const memoryContextUsed = response.headers.get('X-Memory-Context-Used') === 'true';
      setMemoryUsed(memoryContextUsed);

      // Check kuzu-memory usage
      const kuzuMemoriesUsed = response.headers.get('X-Kuzu-Memories-Used');
      const kuzuCommandHeader = response.headers.get('X-Kuzu-Command');
      const memoryEnriched = response.headers.get('X-Memory-Enriched');

      if (kuzuMemoriesUsed) {
        setKuzuMemoryCount(parseInt(kuzuMemoriesUsed, 10));
      }
      if (kuzuCommandHeader) {
        setKuzuCommand(kuzuCommandHeader);
      }
      if (memoryEnriched) {
        setKuzuMemoryCount(parseInt(memoryEnriched, 10));
      }

      // Get memory debug info if available
      const memoryDebugHeader = response.headers.get('X-Memory-Debug');
      if (memoryDebugHeader && debugMode) {
        try {
          const debugInfo = JSON.parse(memoryDebugHeader);
          setMemoryDebugInfo(debugInfo);
        } catch (e) {
          console.error('Failed to parse memory debug info:', e);
        }
      }

      // Check if we should store interaction in memory
      const memoryEntityId = response.headers.get('X-Memory-Entity-Id');
      const shouldStoreMemory = response.headers.get('X-Memory-Should-Store') === 'true';
      console.log('[ChatInterface] Memory headers - EntityId:', memoryEntityId, 'ShouldStore:', shouldStoreMemory);

      // Update context usage from headers
      const contextTokensHeader = response.headers.get('X-Context-Tokens');
      const maxContextTokensHeader = response.headers.get('X-Context-Max-Tokens');
      const contextPercentHeader = response.headers.get('X-Context-Usage-Percent');
      const contextCompactedHeader = response.headers.get('X-Context-Compacted');
      const contextSummariesHeader = response.headers.get('X-Context-Summaries');

      if (contextTokensHeader && maxContextTokensHeader && contextPercentHeader) {
        setContextUsage({
          tokens: parseInt(contextTokensHeader, 10),
          maxTokens: parseInt(maxContextTokensHeader, 10),
          percent: parseFloat(contextPercentHeader),
          wasCompacted: contextCompactedHeader === 'true',
          summaryCount: contextSummariesHeader ? parseInt(contextSummariesHeader, 10) : 0
        });
      }

      // Read the streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      // Create assistant message
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '',
      };

      setMessages((prev) => [...prev, assistantMessage]);

      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        fullContent += chunk;
        setStreamingContent(fullContent);

        // Update the assistant message with accumulated content
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessage.id ? { ...msg, content: fullContent } : msg
          )
        );
      }

      // Save assistant response to session
      const completionTokens = estimateTokens(fullContent);
      const promptTokens = estimateMessagesTokens(
        [...messages, userMessage].map((msg) => ({
          role: msg.role,
          content: msg.content,
        }))
      );

      const sessionAssistantMessage: Message = {
        id: assistantMessage.id,
        role: 'assistant',
        content: fullContent,
        timestamp: new Date(),
        tokenUsage: {
          promptTokens: promptTokens,
          completionTokens: completionTokens,
          totalTokens: promptTokens + completionTokens,
          cost: calculateCost(promptTokens, completionTokens),
        },
      };

      const finalSession = await addMessageToSession(currentSession, sessionAssistantMessage);
      setSession(finalSession);

      // Update context usage after adding message
      const finalSummaries = getSessionContextSummaries();
      const finalStatus = getContextWindowStatus(finalSession.messages, finalSummaries);
      setContextUsage({
        tokens: finalStatus.currentTokens,
        maxTokens: finalStatus.maxTokens,
        percent: finalStatus.utilizationPercent,
        wasCompacted: finalSummaries.length > 0,
        summaryCount: finalSummaries.length
      });

      // Store interaction in memory using kuzu memory system if indicated
      if ((memoryEntityId || shouldStoreMemory) && fullContent && user?.id) {
        console.log('[ChatInterface] Storing interaction in kuzu memory...');
        try {
          // Format the interaction for kuzu memory storage
          const memoryContent = JSON.stringify({
            userInput: content.trim(),
            assistantResponse: fullContent,
            persona: selectedPersonality,
            model: selectedModel,
            timestamp: new Date().toISOString(),
            searchPerformed: searchDelegated,
          });

          const storeResponse = await fetch('/api/memory', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              content: memoryContent,
              metadata: {
                type: 'conversation',
                persona: selectedPersonality,
                model: selectedModel,
                searchPerformed: searchDelegated,
                tokenUsage: sessionAssistantMessage.tokenUsage,
              },
            }),
          });
          const storeResult = await storeResponse.json();
          console.log('[ChatInterface] Kuzu memory store result:', storeResult);
          if (storeResult.success) {
            console.log('[Memory] Interaction stored successfully');
          } else {
            console.error('[Memory] Store failed:', storeResult.error || storeResult.message);
          }
        } catch (error) {
          console.error('[Memory] Failed to store interaction:', error);
        }
      } else {
        console.log('[ChatInterface] Skipping memory storage - ShouldStore:', shouldStoreMemory, 'Content:', !!fullContent, 'UserId:', user?.id);
      }
    } catch (error: any) {
      console.error('Error sending message:', error);

      // Store error for display
      const errorData = error.errorData || {
        type: 'UnknownError',
        message: error.message || 'An unexpected error occurred. Please try again.',
        details: isDevelopment() ? { originalError: error.toString() } : undefined
      };

      setLastError(errorData);

      // Show error message
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: errorData.message,
        isError: true,
        errorType: errorData.type,
        errorDetails: errorData.details
      };

      setMessages((prev) => [...prev, errorMessage]);
      
      // Remove any empty loading messages
      setMessages((prev) => prev.filter(msg => !(msg.role === 'assistant' && msg.content === '')));
    } finally {
      setIsLoading(false);
      setStreamingContent('');
      setIsSearching(false);
      setKuzuMemoryCount(0);
      setKuzuCommand(null);
    }
  }, [messages, isLoading, firstName, selectedModel, selectedPersonality]);

  // Get current session for token metrics
  // Use the session state, or create an empty placeholder
  const currentSession = session || {
    id: 'temp',
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    totalTokens: 0,
    totalCost: 0
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <ChatHeader
        session={currentSession}
        selectedPersonality={selectedPersonality}
        onNewConversation={handleNewConversation}
        onDownloadTranscript={handleDownloadTranscript}
        userName={firstName}
        messagesCount={messages.length}
        contextUsage={contextUsage}
      />

      {/* Context Usage Bar */}
      {contextUsage.tokens > 0 && (
        <div className="px-2 sm:px-4 py-2 border-b bg-muted/30">
          <div className="max-w-4xl mx-auto flex flex-wrap items-center gap-2 sm:gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-mono text-muted-foreground truncate">
                  <span className="hidden sm:inline">Context: </span>
                  {contextUsage.tokens.toLocaleString()} / <span className="hidden xs:inline">{contextUsage.maxTokens.toLocaleString()}</span><span className="xs:hidden">128K</span> tokens
                </span>
                <span className={cn(
                  "font-mono font-medium",
                  contextUsage.percent > 80 ? "text-red-600" :
                  contextUsage.percent > 60 ? "text-yellow-600" :
                  "text-green-600"
                )}>
                  {contextUsage.percent.toFixed(2)}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-500",
                    contextUsage.percent > 80 ? "bg-red-500" :
                    contextUsage.percent > 60 ? "bg-yellow-500" :
                    "bg-green-500"
                  )}
                  style={{ width: `${Math.min(contextUsage.percent, 100)}%` }}
                />
              </div>
            </div>
            {isSearching && (
              <Badge variant="secondary" className="text-xs">
                <Search className="h-3 w-3 mr-1" />
                Search Active
              </Badge>
            )}
            {memoryUsed && (
              <Badge variant="secondary" className="text-xs">
                <Database className="h-3 w-3 mr-1" />
                Memory
              </Badge>
            )}
            {kuzuMemoryCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                <Database className="h-3 w-3 mr-1" />
                {kuzuMemoryCount} Memories
              </Badge>
            )}
            {kuzuCommand && (
              <Badge variant="outline" className="text-xs">
                Memory: {kuzuCommand}
              </Badge>
            )}
            <Button
              size="sm"
              variant={debugMode ? "default" : "ghost"}
              onClick={() => {
                const newMode = !debugMode;
                setDebugMode(newMode);
                // Update the preferences in localStorage
                const prefs = JSON.parse(localStorage.getItem('user-preferences') || '{}');
                prefs.debugMode = newMode;
                localStorage.setItem('user-preferences', JSON.stringify(prefs));
              }}
              className="text-xs"
            >
              <Bug className="h-3 w-3 mr-1" />
              Debug
            </Button>
          </div>
        </div>
      )}

      {/* Memory Debug Info Panel */}
      {debugMode && memoryDebugInfo && (
        <div className="px-2 sm:px-4 py-2 border-b bg-muted/50 overflow-x-auto">
          <div className="max-w-4xl mx-auto">
            <div className="text-xs font-mono space-y-1 min-w-max">
              <div className="font-semibold text-muted-foreground mb-1">Memory Debug Info:</div>
              {memoryDebugInfo.retrieval && (
                <div>
                  <span className="text-muted-foreground">Retrieval:</span>{' '}
                  Query: "{memoryDebugInfo.retrieval.query}" |
                  Found: {memoryDebugInfo.retrieval.memoriesFound} memories |
                  Time: {memoryDebugInfo.retrieval.timeMs}ms
                </div>
              )}
              {memoryDebugInfo.storage && (
                <div>
                  <span className="text-muted-foreground">Storage:</span>{' '}
                  Entity: {memoryDebugInfo.storage.entityId.substring(0, 8)}... |
                  Memory: {memoryDebugInfo.storage.memoryId.substring(0, 8)}... |
                  Importance: {memoryDebugInfo.storage.importance}/10 |
                  Time: {memoryDebugInfo.storage.timeMs}ms
                </div>
              )}
              {memoryDebugInfo.errors && memoryDebugInfo.errors.length > 0 && (
                <div className="text-red-600">
                  <span className="text-muted-foreground">Errors:</span>{' '}
                  {memoryDebugInfo.errors.join(', ')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <ScrollArea
        ref={scrollAreaRef}
        className="flex-1 px-2 sm:px-4 overflow-y-auto"
      >
        <div className="max-w-4xl mx-auto py-4 sm:py-6 space-y-3 sm:space-y-4">
          {messages.length === 0 && (
            <Card className="p-4 sm:p-8 text-center">
              <h2 className="text-xl sm:text-2xl font-semibold mb-2">Welcome, {firstName}</h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Challenge me with your questions. I shall respond with the brutal honesty
                that modern society desperately needs.
              </p>
            </Card>
          )}

          {messages.map((message) => (
            message.isError ? (
              <ErrorMessage
                key={message.id}
                type={message.errorType}
                message={message.content}
                details={message.errorDetails}
                isDevelopment={isDevelopment()}
                onRetry={() => {
                  // Remove the error message and retry
                  setMessages((prev) => prev.filter(m => m.id !== message.id));
                  setLastError(null);
                }}
              />
            ) : (
              <ChatMessage
                key={message.id}
                message={message}
                userName={firstName}
              />
            )
          ))}

          {isLoading && streamingContent === '' && (
            <LoadingIndicator 
              searchDelegated={isSearching}
              contextTokens={estimateMessagesTokens(messages.map(m => ({ role: m.role, content: m.content })))}
              maxContextTokens={128000}
            />
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-4xl mx-auto px-2 sm:px-4">
          <ChatInput
            onSubmit={handleSendMessage}
            isLoading={isLoading}
            placeholder={selectedPersonality === 'executive' ? "State your request..." : "Challenge Diogenes with your question..."}
          />
        </div>
      </div>

      {/* Confirmation Dialog for New Chat */}
      <ConfirmationDialog
        open={showNewChatDialog}
        onOpenChange={setShowNewChatDialog}
        title="Start New Conversation"
        description="Are you sure you want to start a new conversation? Your current conversation will be cleared."
        confirmText="Start New"
        cancelText="Cancel"
        onConfirm={handleConfirmNewChat}
        variant="destructive"
      />
    </div>
  );
}