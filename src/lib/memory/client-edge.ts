/**
 * Edge Runtime compatible memory client
 * This version works with Vercel Edge Runtime and Next.js Edge API Routes
 */

import { MemoryClient } from './client';
import type { MemoryConfig } from './types';

// Singleton instance for the application
let memoryClientInstance: MemoryClient | null = null;

/**
 * Get or create the memory client instance for Edge Runtime
 * The API key must be available as an environment variable at build time
 */
export function getMemoryClientEdge(): MemoryClient | null {
  if (!memoryClientInstance) {
    // In Edge Runtime, environment variables are available at build time
    // They are replaced during the build process
    const apiKey = process.env.MEMORY_API_INTERNAL_KEY;

    if (!apiKey) {
      console.warn('[MemoryClient Edge] MEMORY_API_INTERNAL_KEY not configured');
      return null;
    }

    console.log('[MemoryClient Edge] Initializing with API key (length:', apiKey.length, ')');

    // In Edge Runtime, we need absolute URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/memory`
      : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}/api/memory`
      : 'http://localhost:3000/api/memory';

    const config: Partial<MemoryConfig> & { apiKey: string } = {
      apiKey,
      debugMode: process.env.NODE_ENV === 'development',
      baseUrl,
      // Edge Runtime specific settings
      maxRetries: 2,
      timeout: 8000, // Shorter timeout for Edge Runtime
    };

    memoryClientInstance = new MemoryClient(config);
    console.log('[MemoryClient Edge] Client initialized successfully');
  }

  return memoryClientInstance;
}

// Re-export the MemoryClient class and types for convenience
export { MemoryClient } from './client';
export type * from './types';