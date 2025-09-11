/**
 * Simplified token estimation for Edge Runtime
 * Uses approximate character-to-token ratios instead of tiktoken
 * which is too large for Edge Function size limits
 */

export function estimateMessagesTokens(messages: Array<{ role: string; content: string }>): number {
  // Approximate token estimation without tiktoken
  // Rule of thumb: ~4 characters per token for English text
  // Add overhead for message structure
  let totalChars = 0;
  
  for (const message of messages) {
    // Add role tokens (approximately 3-5 tokens per message for structure)
    totalChars += 20; // Role + message structure overhead
    
    // Add content
    totalChars += message.content.length;
  }
  
  // Approximate conversion: 4 characters ≈ 1 token
  return Math.ceil(totalChars / 4);
}

export function estimateTokens(text: string): number {
  // Simple character-based estimation
  // Average of 4 characters per token for English text
  return Math.ceil(text.length / 4);
}