/**
 * Unified user retrieval for both client and server contexts
 * Handles development mode auth bypass seamlessly
 */

import { currentUser } from '@clerk/nextjs/server';
import { getDevUser, DEV_USER } from './dev-user';

/**
 * Get the current user on the server side
 * Returns dev user in development mode, otherwise uses Clerk
 */
export async function getCurrentUser() {
  // Check if we're in development mode with auth bypass
  const isDev = process.env.NODE_ENV === 'development';
  const forceAuth = process.env.NEXT_PUBLIC_FORCE_AUTH_IN_DEV === 'true';

  if (isDev && !forceAuth) {
    // Return dev user for consistency
    return getDevUser();
  }

  // Use Clerk for production or when auth is forced
  try {
    const user = await currentUser();
    return user;
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
}

/**
 * Get the current user ID for API operations
 * Ensures consistent user ID across dev and production
 */
export async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id || null;
}

/**
 * Check if user is authenticated
 * In dev mode with bypass, always returns true
 */
export async function isAuthenticated(): Promise<boolean> {
  const isDev = process.env.NODE_ENV === 'development';
  const forceAuth = process.env.NEXT_PUBLIC_FORCE_AUTH_IN_DEV === 'true';

  if (isDev && !forceAuth) {
    return true; // Always authenticated in dev mode
  }

  const user = await getCurrentUser();
  return !!user;
}

/**
 * Get user metadata for memory/session operations
 */
export async function getUserMetadata() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  // Handle both dev user and Clerk user formats
  return {
    id: user.id,
    firstName: user.firstName || 'User',
    lastName: user.lastName || '',
    fullName: (user as any).fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User',
    email: (user as any).primaryEmailAddress?.emailAddress ||
           user.emailAddresses?.[0]?.emailAddress ||
           'user@example.com',
    username: (user as any).username || user.firstName?.toLowerCase() || 'user',
  };
}