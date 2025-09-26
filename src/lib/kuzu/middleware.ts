import { MemoryService } from './service';
import type {
  KuzuMemoryEnrichment,
  KuzuCommandResult,
  AssistantMemoryContext,
  PromptEnrichmentResult,
} from './types';

// Define Message type locally to avoid circular dependencies
export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface MemoryMiddlewareOptions {
  enableAutoExtraction?: boolean;
  enableEnrichment?: boolean;
  enableCommands?: boolean;
  extractionDelay?: number;
}

export interface MemoryMiddlewareResult {
  messages: Message[];
  memoryOperations: {
    enrichment?: PromptEnrichmentResult | KuzuMemoryEnrichment;  // Support both types
    extraction?: boolean;
    command?: KuzuCommandResult;
    assistantMemoryStored?: boolean;
  };
  headers: Record<string, string>;
  systemPromptEnrichment?: string;  // Enrichment to add to system prompt
}

/**
 * Middleware for integrating memory operations into chat flow
 */
export class MemoryMiddleware {
  private memoryService: MemoryService;
  private options: MemoryMiddlewareOptions;

  constructor(options: MemoryMiddlewareOptions = {}) {
    this.memoryService = MemoryService.getInstance();
    this.options = {
      enableAutoExtraction: true,
      enableEnrichment: true,
      enableCommands: true,
      extractionDelay: 500,
      ...options,
    };
  }

  /**
   * Process messages before sending to LLM
   */
  async processRequest(
    messages: Message[],
    userId: string
  ): Promise<MemoryMiddlewareResult> {
    let processedMessages = [...messages];
    const memoryOperations: MemoryMiddlewareResult['memoryOperations'] = {};
    const headers: Record<string, string> = {};

    if (messages.length === 0) {
      return { messages: processedMessages, memoryOperations, headers };
    }

    const lastMessage = messages[messages.length - 1];

    // Check for explicit memory commands first
    if (
      this.options.enableCommands &&
      lastMessage.role === 'user'
    ) {
      const commandResult = await this.handleMemoryCommand(
        lastMessage.content,
        userId
      );

      if (commandResult && commandResult.result) {
        memoryOperations.command = commandResult;
        headers['X-Memory-Command'] = commandResult.action || 'processed';

        // If it's a pure memory command, return the result directly
        if (this.isPureMemoryCommand(lastMessage.content)) {
          // Replace the user message with the command result
          processedMessages = [
            ...messages.slice(0, -1),
            {
              role: 'assistant',
              content: commandResult.result,
            },
          ];
          return { messages: processedMessages, memoryOperations, headers };
        }
      }
    }

    // Enrich the prompt with relevant memories (behind the scenes)
    let systemPromptEnrichment: string | undefined;
    if (
      this.options.enableEnrichment &&
      lastMessage.role === 'user'
    ) {
      const enrichmentResult = await this.memoryService.enrichPromptBehindTheScenes(
        lastMessage.content,
        userId
      );

      if (enrichmentResult.relevantMemories.length > 0) {
        memoryOperations.enrichment = enrichmentResult;
        headers['X-Memory-Enriched'] = enrichmentResult.relevantMemories.length.toString();
        headers['X-Memory-Confidence'] = enrichmentResult.confidenceScore.toFixed(2);

        // Store enrichment to be added to system prompt (transparent to user)
        systemPromptEnrichment = enrichmentResult.enrichedContent;

        // Don't modify the user message - keep enrichment transparent
        // The enrichment will be added to the system prompt in the chat route
      }
    }

    return {
      messages: processedMessages,
      memoryOperations,
      headers,
      systemPromptEnrichment,
    };
  }

  /**
   * Process response after receiving from LLM
   */
  async processResponse(
    messages: Message[],
    response: string,
    userId: string
  ): Promise<void> {
    if (!this.options.enableAutoExtraction) {
      return;
    }

    // Build conversation context for extraction
    const conversation = this.buildConversationContext(messages, response);

    // Extract memories asynchronously (don't block the response)
    setTimeout(async () => {
      try {
        const extraction = await this.memoryService.extractMemories(
          conversation,
          userId
        );

        if (extraction.extractedMemories.length > 0) {
          console.log(
            `[MemoryMiddleware] Extracted ${extraction.extractedMemories.length} memories for user ${userId}`
          );
        }
      } catch (error) {
        console.error('[MemoryMiddleware] Failed to extract memories:', error);
      }
    }, this.options.extractionDelay);
  }

  /**
   * Handle explicit memory commands
   */
  private async handleMemoryCommand(
    content: string,
    userId: string
  ): Promise<KuzuCommandResult | null> {
    const result = await this.memoryService.handleExplicitCommand(
      content,
      userId
    );

    if (result.action) {
      return result;
    }

    return null;
  }

  /**
   * Check if a message is a pure memory command
   */
  private isPureMemoryCommand(content: string): boolean {
    const lowerContent = content.toLowerCase();
    const pureCommands = [
      /^remember\s+/,
      /^save\s+/,
      /^store\s+/,
      /^recall\s*/,
      /^what do you remember/,
      /^show.*memories/,
      /^list.*memories/,
      /^clear.*memories/,
      /^delete.*memories/,
      /^memory (stats|status)/,
    ];

    return pureCommands.some((pattern) => pattern.test(lowerContent));
  }

  /**
   * Format memory context for injection into conversation
   */
  private formatMemoryContext(memories: any[]): string {
    if (memories.length === 0) {
      return '';
    }

    const contextLines = [
      'Based on our previous conversations, I remember:',
      ...memories.map((m, i) => `${i + 1}. ${m.content}`),
    ];

    return contextLines.join('\n');
  }

  /**
   * Build conversation context for memory extraction
   */
  private buildConversationContext(
    messages: Message[],
    response: string
  ): string {
    // Take last few messages for context
    const recentMessages = messages.slice(-4);

    const lines: string[] = [];

    for (const msg of recentMessages) {
      if (msg.role === 'user') {
        lines.push(`User: ${msg.content}`);
      } else if (msg.role === 'assistant') {
        lines.push(`Assistant: ${msg.content}`);
      }
    }

    // Add the current response
    lines.push(`Assistant: ${response}`);

    return lines.join('\n\n');
  }

  /**
   * Initialize the middleware
   */
  async initialize(): Promise<void> {
    await this.memoryService.initialize();
  }

  /**
   * Get memory service instance
   */
  getMemoryService(): MemoryService {
    return this.memoryService;
  }

  /**
   * Store assistant response as memory
   */
  async storeAssistantResponse(
    userId: string,
    userPrompt: string,
    assistantResponse: string,
    metadata?: Partial<AssistantMemoryContext>
  ): Promise<void> {
    const context: AssistantMemoryContext = {
      userId,
      conversationId: metadata?.conversationId || `conv_${Date.now()}`,
      userPrompt,
      assistantResponse,
      timestamp: new Date(),
      ...metadata,
    };

    await this.memoryService.storeAssistantMemory(context);
  }
}