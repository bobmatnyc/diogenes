/**
 * Environment utility functions
 * Provides consistent environment checks across client and server components
 */

/**
 * Check if the application is running in development mode
 * This works on both client and server side
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Check if the application is running in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Get environment-specific configuration
 */
export function getEnvConfig() {
  return {
    isDevelopment: isDevelopment(),
    isProduction: isProduction(),
    requiresAuth: !isDevelopment(), // Auth required only in production
    authBypass: isDevelopment(), // Bypass auth in development
  };
}
