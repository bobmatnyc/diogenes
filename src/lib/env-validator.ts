/**
 * Environment Validator
 * Runs on startup to ensure environment is properly configured
 * and warns about potential issues with shell environment overrides
 */

import { initializeEnv, validateEnv, getEnvVar, getAllEnvVars } from './env-config';

// Required environment variables for the application
const REQUIRED_ENV_VARS = [
  'OPENROUTER_API_KEY',
  // Add other required vars here as needed
];

// Optional but recommended environment variables
const OPTIONAL_ENV_VARS = [
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
  'NEXT_PUBLIC_GA_ID',
  'TAVILY_API_KEY',
  'ENABLE_MOCK_SEARCH',
];

/**
 * Validate environment on application startup
 * This function should be called as early as possible
 */
export function validateEnvironment(): void {
  console.log('🔒 Validating environment configuration...');
  
  try {
    // Initialize environment from .env files ONLY
    initializeEnv();
    
    // Validate required variables
    validateEnv(REQUIRED_ENV_VARS);
    
    // Check for shell environment contamination
    checkForShellContamination();
    
    // Log environment status
    logEnvironmentStatus();
    
    console.log('✅ Environment validation successful');
  } catch (error) {
    console.error('❌ Environment validation failed:', error);
    
    // In development, provide helpful guidance
    if (process.env.NODE_ENV === 'development') {
      console.error('\n📝 To fix this issue:');
      console.error('1. Create or update your .env.local file');
      console.error('2. Add the missing environment variables');
      console.error('3. Restart the development server');
      console.error('\nExample .env.local:');
      console.error('OPENROUTER_API_KEY=sk-or-v1-your-key-here');
    }
    
    throw error;
  }
}

/**
 * Check if shell environment variables might be contaminating the configuration
 * Warns if shell env vars differ from .env file values
 */
function checkForShellContamination(): void {
  const warnings: string[] = [];
  
  // Check critical variables for contamination
  const criticalVars = ['OPENROUTER_API_KEY', 'CLERK_SECRET_KEY'];
  
  for (const varName of criticalVars) {
    const shellValue = process.env[varName];
    const envFileValue = getEnvVar(varName);
    
    if (shellValue && envFileValue && shellValue !== envFileValue) {
      warnings.push(
        `⚠️  ${varName}: Shell environment (${shellValue.substring(0, 20)}...) ` +
        `differs from .env file (${envFileValue.substring(0, 20)}...)`
      );
    }
  }
  
  if (warnings.length > 0) {
    console.warn('\n⚠️  Environment Contamination Detected:');
    console.warn('Shell environment variables are different from .env files.');
    console.warn('The application will use .env file values (as intended).\n');
    warnings.forEach(w => console.warn(w));
    console.warn('\nTo fix: Unset these variables from your shell or use the start-dev.sh script');
  }
}

/**
 * Log the current environment status for debugging
 */
function logEnvironmentStatus(): void {
  if (process.env.NODE_ENV !== 'development') {
    return; // Only log in development
  }
  
  const allVars = getAllEnvVars(true); // Hide sensitive values
  
  console.log('\n📊 Environment Status:');
  console.log('─'.repeat(50));
  
  // Required variables
  console.log('Required Variables:');
  for (const varName of REQUIRED_ENV_VARS) {
    const value = allVars[varName];
    const status = value ? '✅' : '❌';
    console.log(`  ${status} ${varName}: ${value || 'NOT SET'}`);
  }
  
  // Optional variables
  console.log('\nOptional Variables:');
  for (const varName of OPTIONAL_ENV_VARS) {
    const value = allVars[varName];
    const status = value ? '✅' : '⚪';
    console.log(`  ${status} ${varName}: ${value || 'not set'}`);
  }
  
  console.log('─'.repeat(50));
}

/**
 * Get validated OpenRouter API key
 * Ensures the key is from .env files and not shell environment
 */
export function getValidatedOpenRouterKey(): string {
  const key = getEnvVar('OPENROUTER_API_KEY');
  
  if (!key) {
    throw new Error(
      'OPENROUTER_API_KEY not found in .env files. ' +
      'Please add it to your .env.local file.'
    );
  }
  
  // Additional validation: Check key format
  if (!key.startsWith('sk-or-v1-')) {
    console.warn(
      '⚠️  OpenRouter API key format may be invalid. ' +
      'Expected format: sk-or-v1-...'
    );
  }
  
  return key;
}

/**
 * Check if running in mock mode
 * Returns true if ENABLE_MOCK_SEARCH is set to 'true' in .env files
 */
export function isMockMode(): boolean {
  const mockMode = getEnvVar('ENABLE_MOCK_SEARCH');
  return mockMode === 'true';
}