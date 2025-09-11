/**
 * Lightweight Anti-Sycophancy for Edge Runtime
 * Optimized for SSE streaming without corruption
 */

// Lightweight detection patterns
const SYCOPHANTIC_PATTERNS = [
  /you['']?re (absolutely|completely|totally) (right|correct)/gi,
  /i (completely|totally|absolutely) agree/gi,
  /excellent (point|observation|question)/gi,
  /brilliant (idea|insight|analysis)/gi,
  /perfect(ly)?/gi,
  /you['']?ve (clearly|obviously) thought/gi,
];

const CONTRARIAN_INJECTIONS = [
  "\n\nHowever, consider this: ",
  "\n\nBut wait - ",
  "\n\nThat said, ",
  "\n\nOn the other hand, ",
  "\n\nLet's examine the assumptions: ",
  "\n\nWhat evidence supports this? ",
];

/**
 * Lightweight anti-sycophancy processor for Edge Runtime
 * Maintains SSE format integrity while adding contrarian elements
 */
export class AntiSycophancyEdge {
  private aggressiveness: number;
  
  constructor(aggressiveness: number = 7) {
    this.aggressiveness = Math.max(1, Math.min(10, aggressiveness));
  }

  /**
   * Process text while preserving SSE format
   * Critical: Only modifies content within data: lines
   */
  processChunk(chunk: string): string {
    // Don't process empty chunks or SSE control messages
    if (!chunk || chunk.trim() === '' || chunk === '[DONE]') {
      return chunk;
    }

    // Check if this is an SSE formatted chunk
    const isSSE = chunk.includes('data:');
    
    if (isSSE) {
      // Process SSE format carefully
      return chunk.split('\n').map(line => {
        if (line.startsWith('data: ') && !line.includes('[DONE]')) {
          // Extract content after 'data: '
          const content = line.substring(6);
          const processed = this.transformContent(content);
          return `data: ${processed}`;
        }
        return line;
      }).join('\n');
    }
    
    // Non-SSE content - process directly
    return this.transformContent(chunk);
  }

  /**
   * Transform content to be less sycophantic
   */
  private transformContent(content: string): string {
    // Skip if too short or just whitespace
    if (content.length < 10 || !content.trim()) {
      return content;
    }

    let hasSycophancy = false;
    
    // Check for sycophantic patterns
    for (const pattern of SYCOPHANTIC_PATTERNS) {
      if (pattern.test(content)) {
        hasSycophancy = true;
        break;
      }
    }

    // If sycophantic, add contrarian element based on aggressiveness
    if (hasSycophancy && Math.random() < (this.aggressiveness / 10)) {
      // Replace obvious sycophancy
      let modified = content;
      
      // Soften extreme agreement
      modified = modified.replace(
        /you['']?re (absolutely|completely|totally) (right|correct)/gi,
        "that's an interesting perspective"
      );
      
      modified = modified.replace(
        /i (completely|totally|absolutely) agree/gi,
        "I see your point, though"
      );
      
      // Add contrarian injection occasionally
      if (Math.random() < 0.3) {
        const injection = CONTRARIAN_INJECTIONS[
          Math.floor(Math.random() * CONTRARIAN_INJECTIONS.length)
        ];
        modified += injection + "have you considered alternative viewpoints?";
      }
      
      return modified;
    }

    // Add philosophical challenge based on aggressiveness
    if (Math.random() < (this.aggressiveness / 20) && content.length > 50) {
      const shouldChallenge = !content.includes('?') && !content.includes('However');
      if (shouldChallenge) {
        return content + " But is that really the complete picture?";
      }
    }

    return content;
  }
}

/**
 * Create a transform stream that preserves SSE format
 * This version properly handles Uint8Array chunks without corrupting SSE
 */
export function createAntiSycophancyTransform(
  aggressiveness: number = 7
): TransformStream<Uint8Array, Uint8Array> {
  const processor = new AntiSycophancyEdge(aggressiveness);
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  
  // Buffer for incomplete SSE messages
  let buffer = '';
  
  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      // Decode the chunk
      const text = decoder.decode(chunk, { stream: true });
      
      // Add to buffer
      buffer += text;
      
      // Process complete SSE messages (ending with \n\n or \n)
      const lines = buffer.split('\n');
      
      // Keep last line if incomplete
      const incomplete = lines[lines.length - 1];
      const complete = lines.slice(0, -1);
      
      if (complete.length > 0) {
        // Process complete lines
        const processed = complete
          .map(line => processor.processChunk(line))
          .join('\n');
        
        // Re-encode and send
        if (processed) {
          controller.enqueue(encoder.encode(processed + '\n'));
        }
      }
      
      // Keep incomplete line in buffer
      buffer = incomplete;
    },
    
    flush(controller) {
      // Process any remaining buffer
      if (buffer) {
        const processed = processor.processChunk(buffer);
        if (processed) {
          controller.enqueue(encoder.encode(processed));
        }
      }
    }
  });
}

/**
 * Simplified anti-sycophancy enhancement for system prompts
 */
export const ANTI_SYCOPHANCY_PROMPT = `
CRITICAL: Maintain intellectual independence. Challenge assumptions. Never validate for comfort.
- Question everything, especially "obvious" truths
- Demand evidence for all claims
- Present alternative perspectives
- Use Socratic questioning
- Avoid agreement without scrutiny`;