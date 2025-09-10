/**
 * Environment Configuration Module
 * CRITICAL: This module ensures .env files ALWAYS take priority over shell environment
 * 
 * This solves the issue where shell environment variables can override .env.local values,
 * which can lead to using invalid or outdated API keys.
 */

import fs from 'fs';
import path from 'path';

// Cache for parsed environment variables
let envCache: Record<string, string | undefined> = {};
let isInitialized = false;

/**
 * Parse .env file and return key-value pairs
 * Ignores comments and empty lines
 */
function parseEnvFile(filePath: string): Record<string, string> {
  const envVars: Record<string, string> = {};
  
  try {
    if (!fs.existsSync(filePath)) {
      return envVars;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    for (const line of lines) {
      // Skip comments and empty lines
      if (line.trim().startsWith('#') || line.trim() === '') {
        continue;
      }
      
      // Parse KEY=VALUE format
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        
        envVars[key] = value;
      }
    }
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
  }
  
  return envVars;
}

/**
 * Initialize environment configuration
 * Priority order (highest to lowest):
 * 1. .env.local (user overrides)
 * 2. .env.development or .env.production (environment-specific)
 * 3. .env (defaults)
 * 
 * Shell environment variables are IGNORED to prevent contamination
 */
export function initializeEnv(): void {
  if (isInitialized) {
    return;
  }
  
  const nodeEnv = process.env.NODE_ENV || 'development';
  const rootDir = process.cwd();
  
  // Clear cache
  envCache = {};
  
  // Load in priority order (lowest to highest, so later overwrites earlier)
  const envFiles = [
    '.env',
    `.env.${nodeEnv}`,
    '.env.local',
  ];
  
  for (const envFile of envFiles) {
    const filePath = path.join(rootDir, envFile);
    const vars = parseEnvFile(filePath);
    Object.assign(envCache, vars);
  }
  
  isInitialized = true;
  
  // Log initialization (without exposing sensitive values)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔒 Environment initialized from .env files');
    console.log('📁 Loaded files:', envFiles.filter(f => 
      fs.existsSync(path.join(rootDir, f))
    ));
    console.log('🔑 Keys loaded:', Object.keys(envCache).map(k => 
      k.includes('KEY') || k.includes('SECRET') || k.includes('PASSWORD') 
        ? `${k} (hidden)` 
        : k
    ));
  }
}

/**
 * Get environment variable value
 * ALWAYS returns value from .env files, ignoring shell environment
 * 
 * @param key - Environment variable key
 * @param defaultValue - Optional default value if not found
 * @returns Value from .env files or default
 */
export function getEnvVar(key: string, defaultValue?: string): string | undefined {
  if (!isInitialized) {
    initializeEnv();
  }
  
  // CRITICAL: Return from cache (loaded from .env files) ONLY
  // This prevents shell environment from overriding .env values
  return envCache[key] ?? defaultValue;
}

/**
 * Get required environment variable
 * Throws error if not found in .env files
 * 
 * @param key - Environment variable key
 * @returns Value from .env files
 * @throws Error if variable not found
 */
export function requireEnvVar(key: string): string {
  const value = getEnvVar(key);
  
  if (!value) {
    throw new Error(
      `Required environment variable ${key} not found in .env files.\n` +
      `Please ensure it's defined in .env.local or .env`
    );
  }
  
  return value;
}

/**
 * Validate environment configuration
 * Ensures all required variables are present
 * 
 * @param requiredVars - Array of required variable names
 * @throws Error if any required variables are missing
 */
export function validateEnv(requiredVars: string[]): void {
  if (!isInitialized) {
    initializeEnv();
  }
  
  const missing: string[] = [];
  
  for (const varName of requiredVars) {
    if (!envCache[varName]) {
      missing.push(varName);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables in .env files:\n` +
      missing.map(v => `  - ${v}`).join('\n') +
      `\n\nPlease add these to your .env.local file`
    );
  }
}

/**
 * Get all environment variables from .env files
 * Useful for debugging (excludes sensitive values)
 * 
 * @param hideSensitive - Whether to hide sensitive values (default: true)
 * @returns Object with all env vars
 */
export function getAllEnvVars(hideSensitive = true): Record<string, string | undefined> {
  if (!isInitialized) {
    initializeEnv();
  }
  
  if (!hideSensitive) {
    return { ...envCache };
  }
  
  const result: Record<string, string | undefined> = {};
  
  for (const [key, value] of Object.entries(envCache)) {
    if (key.includes('KEY') || key.includes('SECRET') || key.includes('PASSWORD') || key.includes('TOKEN')) {
      // Show first 10 chars only for sensitive values
      result[key] = value ? `${value.substring(0, 10)}...(hidden)` : undefined;
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Reset environment configuration (mainly for testing)
 */
export function resetEnv(): void {
  envCache = {};
  isInitialized = false;
}

// Auto-initialize on module load
if (typeof window === 'undefined') {
  // Only auto-initialize on server-side
  initializeEnv();
}