/**
 * Test server helper for e2e tests
 * Ensures development server is running before tests
 */
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const TEST_BASE_URL = 'http://localhost:3000';

/**
 * Check if the development server is running
 */
async function isServerRunning(url: string = TEST_BASE_URL): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(3000)
    });
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

/**
 * Wait for the server to be ready
 */
async function waitForServer(
  url: string = TEST_BASE_URL,
  maxAttempts: number = 20,
  delayMs: number = 1000
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    if (await isServerRunning(url)) {
      console.log(`✅ Server is ready at ${url}`);
      return;
    }
    console.log(`⏳ Waiting for server... (${i + 1}/${maxAttempts})`);
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  throw new Error(`Server failed to start at ${url} after ${maxAttempts} attempts`);
}

/**
 * Ensure the test server is running
 * Returns the base URL for tests to use
 */
export async function ensureTestServer(): Promise<string> {
  // Check if server is already running
  if (await isServerRunning()) {
    console.log('✅ Development server is already running');
    return TEST_BASE_URL;
  }

  console.log('⚠️  Development server not running. Starting it now...');

  try {
    // Start the dev server in the background
    exec('cd /Users/masa/Projects/managed/diogenes && pnpm run dev', {
      detached: true,
      stdio: 'ignore'
    });

    // Wait for server to be ready
    await waitForServer();
    return TEST_BASE_URL;
  } catch (error) {
    console.error('❌ Failed to start development server:', error);
    throw new Error(
      'Development server is not running. Please start it with "pnpm run dev" in another terminal.'
    );
  }
}

/**
 * Helper to make authenticated API requests
 */
export async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {},
  token?: string
): Promise<Response> {
  const url = endpoint.startsWith('http') ? endpoint : `${TEST_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Generate a test bearer token for memory API
 */
export function getTestBearerToken(): string {
  // Use the internal API key if available, otherwise use test key
  const internalKey = process.env.MEMORY_API_INTERNAL_KEY;
  if (internalKey) {
    return internalKey;
  }
  // Use the same default value as in .env.local
  return 'internal-api-key-for-server-side-calls';
}

/**
 * Clean up test data from memory system
 */
export async function cleanupTestData(entityId: string): Promise<void> {
  const token = getTestBearerToken();

  try {
    // Delete all memories for the test entity
    const memoriesResponse = await fetchWithAuth(
      `/api/memory/memories?entityId=${entityId}`,
      { method: 'GET' },
      token
    );

    if (memoriesResponse.ok) {
      const memoriesData = await memoriesResponse.json();
      const memories = memoriesData.success ? memoriesData.data : memoriesData;
      if (Array.isArray(memories)) {
        for (const memory of memories) {
          await fetchWithAuth(
            `/api/memory/memories/${memory.id}`,
            { method: 'DELETE' },
            token
          );
        }
      }
    }

    // Delete the test entity
    await fetchWithAuth(
      `/api/memory/entities/${entityId}`,
      { method: 'DELETE' },
      token
    );
  } catch (error) {
    console.warn('Cleanup warning:', error);
  }
}

/**
 * Generate unique test IDs to avoid conflicts
 */
export function generateTestId(prefix: string = 'test'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `${prefix}_${timestamp}_${random}`;
}