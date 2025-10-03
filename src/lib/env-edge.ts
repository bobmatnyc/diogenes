/**
 * Edge-Compatible Environment Configuration
 * For use in Edge Runtime (API routes with streaming)
 * 
 * Since Edge Runtime doesn't support fs module, we rely on 
 * Next.js's built-in environment variable loading from .env files
 */

/**
 * Get environment variable value
 * Uses process.env which is populated by Next.js from .env files
 * 
 * @param key - Environment variable key
 * @param defaultValue - Optional default value if not found
 * @returns Value from environment or default
 */
export function getEnvVar(key: string, defaultValue?: string): string | undefined {
  // In Edge Runtime, process.env is already populated from .env files by Next.js
  const value = process.env[key] ?? defaultValue;
  // Trim whitespace to prevent issues with newlines in environment variables
  return value?.trim();
}

/**
 * Get required environment variable
 * Throws error if not found
 * 
 * @param key - Environment variable key
 * @returns Value from environment
 * @throws Error if variable not found
 */
export function requireEnvVar(key: string): string {
  const value = getEnvVar(key);

  if (!value) {
    throw new Error(
      `Required environment variable ${key} not found. ` +
      `Please ensure it's defined in .env.local or .env`
    );
  }

  // Additional trim for safety (getEnvVar already trims, but double-check)
  return value.trim();
}

/**
 * Validate environment configuration for Edge Runtime
 * Ensures all required variables are present
 * 
 * @param requiredVars - Array of required variable names
 * @throws Error if any required variables are missing
 */
export function validateEnvEdge(requiredVars: string[]): void {
  const missing: string[] = [];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n` +
      missing.map(v => `  - ${v}`).join('\n') +
      `\n\nPlease add these to your .env.local file`
    );
  }
}

/**
 * Get validated OpenRouter API key for Edge Runtime
 */
export function getValidatedOpenRouterKey(): string {
  const key = getEnvVar('OPENROUTER_API_KEY');

  if (!key) {
    throw new Error(
      'OPENROUTER_API_KEY not found. ' +
      'Please add it to your .env.local file.'
    );
  }

  // Trim whitespace to prevent HTTP header issues
  const trimmedKey = key.trim();

  // Additional validation: Check key format
  if (!trimmedKey.startsWith('sk-or-v1-')) {
    console.warn(
      '⚠️  OpenRouter API key format may be invalid. ' +
      'Expected format: sk-or-v1-...'
    );
  }

  return trimmedKey;
}

/**
 * Check if running in mock mode
 */
export function isMockMode(): boolean {
  return getEnvVar('ENABLE_MOCK_SEARCH') === 'true';
}

/**
 * Validate environment for Edge Runtime
 * Simplified version that works in Edge Runtime
 */
export function validateEnvironmentEdge(): void {
  const requiredVars = ['OPENROUTER_API_KEY'];
  
  try {
    validateEnvEdge(requiredVars);
    
    // In development, log status (without using fs)
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Edge Runtime environment validation successful');
      console.log(`📊 OpenRouter API Key: ${getValidatedOpenRouterKey().substring(0, 20)}...`);
    }
  } catch (error) {
    console.error('❌ Environment validation failed:', error);
    throw error;
  }
}