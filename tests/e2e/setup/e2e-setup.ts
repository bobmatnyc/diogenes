/**
 * Setup file for e2e tests
 * This runs in a Node environment, not jsdom
 */
import { beforeAll, afterAll } from 'vitest';

// Global setup for all e2e tests
beforeAll(async () => {
  console.log('🚀 Starting e2e test suite...');

  // Set test environment variables if needed
  if (!process.env.OPENROUTER_API_KEY) {
    process.env.OPENROUTER_API_KEY = 'test-sk-or-v1-dummy';
  }

  // Set memory API internal key for testing
  if (!process.env.MEMORY_API_INTERNAL_KEY) {
    process.env.MEMORY_API_INTERNAL_KEY = 'internal-api-key-for-server-side-calls';
  }

  // Ensure we're in test mode (but keep development for API endpoints)
  // @ts-ignore - Need to override readonly property for testing
  process.env.NODE_ENV = 'development';
});

afterAll(async () => {
  console.log('✅ E2E test suite completed');
});