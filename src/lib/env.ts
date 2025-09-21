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
 * Check if authentication should be bypassed
 * Normally bypassed in development, unless FORCE_AUTH_IN_DEV is set
 */
export function shouldBypassAuth(): boolean {
  // Log environment variables for debugging
  if (typeof window === 'undefined') { // Only log on server side
    console.log('Environment check:', {
      NODE_ENV: process.env.NODE_ENV,
      FORCE_AUTH_IN_DEV: process.env.FORCE_AUTH_IN_DEV,
      isDevelopment: isDevelopment()
    });
  }

  if (process.env.FORCE_AUTH_IN_DEV === 'true') {
    return false; // Don't bypass auth even in development
  }
  return isDevelopment(); // Default: bypass in development
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
    requiresAuth: !shouldBypassAuth(), // Auth required unless explicitly bypassed
    authBypass: shouldBypassAuth(), // Bypass auth based on shouldBypassAuth logic
  };
}
