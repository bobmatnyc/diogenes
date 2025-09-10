/**
 * Anti-Sycophancy Middleware for Vercel AI SDK
 * Transforms responses to be more contrarian and less agreeable
 */

import {
  ANTI_SYCOPHANCY_ENHANCEMENT,
  type AntiSycophancyConfig,
  AntiSycophancyProcessor,
  type ContrarianMetrics,
} from './anti-sycophancy';

export interface MiddlewareConfig extends AntiSycophancyConfig {
  injectSystemPrompt?: boolean;
  logMetrics?: boolean;
  metricsCallback?: (metrics: ContrarianMetrics) => void;
}

/**
 * Anti-sycophancy middleware for streaming responses
 * Works with Vercel AI SDK's streaming architecture
 */
export class AntiSycophancyMiddleware {
  private processor: AntiSycophancyProcessor;
  private config: MiddlewareConfig;
  private lastUserMessage = '';

  constructor(config: Partial<MiddlewareConfig> = {}) {
    this.config = {
      aggressiveness: 7,
      enableSocraticQuestions: true,
      enableEvidenceDemands: true,
      enablePerspectiveMultiplication: true,
      injectSystemPrompt: true,
      logMetrics: false,
      verboseLogging: false,
      ...config,
    };

    this.processor = new AntiSycophancyProcessor(this.config);
  }

  /**
   * Transform the input messages before sending to the model
   * Adds anti-sycophancy system prompt if enabled
   */
  async transformMessages(messages: any[]): Promise<any[]> {
    // Store the last user message for response processing
    const userMessages = messages.filter((m) => m.role === 'user');
    if (userMessages.length > 0) {
      this.lastUserMessage = userMessages[userMessages.length - 1].content;
    }

    if (!this.config.injectSystemPrompt) {
      return messages;
    }

    // Check if there's already a system message
    const hasSystemMessage = messages.some((m) => m.role === 'system');

    if (hasSystemMessage) {
      // Enhance existing system message
      return messages.map((message) => {
        if (message.role === 'system') {
          return {
            ...message,
            content: `${message.content}\n\n${ANTI_SYCOPHANCY_ENHANCEMENT}`,
          };
        }
        return message;
      });
    }
    // Add new system message at the beginning
    return [
      {
        role: 'system',
        content: ANTI_SYCOPHANCY_ENHANCEMENT,
      },
      ...messages,
    ];
  }

  /**
   * Transform a streaming chunk of text
   * Processes the response to remove sycophancy
   */
  transformChunk(chunk: string): string {
    if (!chunk || chunk.trim() === '') {
      return chunk;
    }

    // Process the chunk through anti-sycophancy filter
    const { processedResponse, metrics } = this.processor.processResponse(
      chunk,
      this.lastUserMessage,
    );

    // Log metrics if enabled
    if (this.config.logMetrics && metrics) {
      console.log('Chunk metrics:', metrics);
      if (this.config.metricsCallback) {
        this.config.metricsCallback(metrics);
      }
    }

    return processedResponse;
  }

  /**
   * Create a transform stream for processing streaming responses
   * CRITICAL: This MUST handle Uint8Array chunks from OpenAIStream, not strings!
   * OpenAIStream outputs Uint8Array chunks that need to be decoded to text.
   */
  createTransformStream(): TransformStream<Uint8Array, Uint8Array> {
    // CRITICAL: Use TextDecoder/TextEncoder for Uint8Array <-> string conversion
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let buffer = '';
    const sentenceEndRegex = /[.!?]\s/;

    return new TransformStream({
      transform: (chunk, controller) => {
        // CRITICAL: Decode Uint8Array chunk to string
        // The { stream: true } option is important for handling partial UTF-8 sequences
        const text = decoder.decode(chunk, { stream: true });

        // Add decoded text to buffer
        buffer += text;

        // Process complete sentences
        let lastSentenceEnd = -1;
        let match;
        const regex = new RegExp(sentenceEndRegex, 'g');

        while ((match = regex.exec(buffer)) !== null) {
          lastSentenceEnd = match.index + match[0].length;
        }

        if (lastSentenceEnd > -1) {
          // Process complete sentences
          const completeText = buffer.substring(0, lastSentenceEnd);
          const remaining = buffer.substring(lastSentenceEnd);

          // Transform the complete text
          const transformed = this.transformChunk(completeText);

          // CRITICAL: Encode the transformed string back to Uint8Array
          controller.enqueue(encoder.encode(transformed));

          // Keep the remaining text in buffer
          buffer = remaining;
        }

        // If buffer is getting too large, process it anyway
        if (buffer.length > 500) {
          const transformed = this.transformChunk(buffer);
          // CRITICAL: Encode to Uint8Array before enqueuing
          controller.enqueue(encoder.encode(transformed));
          buffer = '';
        }
      },

      flush: (controller) => {
        // Process any remaining text in buffer
        if (buffer.length > 0) {
          const transformed = this.transformChunk(buffer);
          // CRITICAL: Encode to Uint8Array before enqueuing
          controller.enqueue(encoder.encode(transformed));
        }
      },
    });
  }

  /**
   * Process a complete response (non-streaming)
   */
  async processCompleteResponse(
    response: string,
    userMessage?: string,
  ): Promise<{
    response: string;
    metrics: ContrarianMetrics;
  }> {
    const messageToUse = userMessage || this.lastUserMessage;
    const { processedResponse, metrics } = this.processor.processResponse(response, messageToUse);

    if (this.config.logMetrics) {
      console.log('Response metrics:', metrics);
      if (this.config.metricsCallback) {
        this.config.metricsCallback(metrics);
      }
    }

    return {
      response: processedResponse,
      metrics,
    };
  }

  /**
   * Update middleware configuration
   */
  updateConfig(config: Partial<MiddlewareConfig>): void {
    Object.assign(this.config, config);
    this.processor.updateConfig(config);
  }

  /**
   * Get current configuration
   */
  getConfig(): MiddlewareConfig {
    return { ...this.config };
  }

  /**
   * Reset the middleware state
   */
  reset(): void {
    this.lastUserMessage = '';
  }
}

/**
 * Factory function to create anti-sycophancy middleware
 */
export function createAntiSycophancyMiddleware(
  config?: Partial<MiddlewareConfig>,
): AntiSycophancyMiddleware {
  return new AntiSycophancyMiddleware(config);
}

/**
 * Wrap a ReadableStream with anti-sycophancy transformation
 * This is useful for integrating with existing streaming APIs
 *
 * CRITICAL: This function expects a ReadableStream<Uint8Array> (e.g., from OpenAIStream)
 * The middleware's createTransformStream() MUST handle Uint8Array chunks!
 * Common usage: wrapStreamWithAntiSycophancy(OpenAIStream(response))
 */
export function wrapStreamWithAntiSycophancy(
  stream: ReadableStream<Uint8Array>, // CRITICAL: Must be Uint8Array stream!
  config?: Partial<MiddlewareConfig>,
): ReadableStream<Uint8Array> {
  // Returns Uint8Array stream
  const middleware = createAntiSycophancyMiddleware(config);
  return stream.pipeThrough(middleware.createTransformStream());
}

/**
 * Higher-order function to wrap any async text generator with anti-sycophancy
 */
export function withAntiSycophancy<T extends (...args: any[]) => Promise<string>>(
  fn: T,
  config?: Partial<MiddlewareConfig>,
): T {
  const middleware = createAntiSycophancyMiddleware(config);

  return (async (...args: Parameters<T>): Promise<string> => {
    const response = await fn(...args);
    const { response: processed } = await middleware.processCompleteResponse(response);
    return processed;
  }) as T;
}

/**
 * Metrics aggregator for tracking anti-sycophancy performance over time
 */
export class MetricsAggregator {
  private metrics: ContrarianMetrics[] = [];
  private maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  addMetrics(metrics: ContrarianMetrics): void {
    this.metrics.push(metrics);
    if (this.metrics.length > this.maxSize) {
      this.metrics.shift();
    }
  }

  getAverageMetrics(): ContrarianMetrics | null {
    if (this.metrics.length === 0) {
      return null;
    }

    const sum = this.metrics.reduce(
      (acc, m) => ({
        sycophancyScore: acc.sycophancyScore + m.sycophancyScore,
        contrarianScore: acc.contrarianScore + m.contrarianScore,
        socraticDensity: acc.socraticDensity + m.socraticDensity,
        evidenceDemands: acc.evidenceDemands + m.evidenceDemands,
        perspectiveCount: acc.perspectiveCount + m.perspectiveCount,
      }),
      {
        sycophancyScore: 0,
        contrarianScore: 0,
        socraticDensity: 0,
        evidenceDemands: 0,
        perspectiveCount: 0,
      },
    );

    const count = this.metrics.length;
    return {
      sycophancyScore: sum.sycophancyScore / count,
      contrarianScore: sum.contrarianScore / count,
      socraticDensity: sum.socraticDensity / count,
      evidenceDemands: sum.evidenceDemands / count,
      perspectiveCount: sum.perspectiveCount / count,
    };
  }

  getLatestMetrics(): ContrarianMetrics | null {
    return this.metrics[this.metrics.length - 1] || null;
  }

  clear(): void {
    this.metrics = [];
  }

  getMetricsHistory(): ContrarianMetrics[] {
    return [...this.metrics];
  }
}
