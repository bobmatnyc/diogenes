/**
 * Development user configuration for local development
 * Provides a consistent user object when authentication is bypassed
 */

import type { User } from '@clerk/nextjs/server';

/**
 * Mock user object for development environment
 * This ensures consistent user data across the application when auth is bypassed
 */
export const DEV_USER = {
  id: 'dev_user_bob_matsuoka',
  firstName: 'Bob',
  lastName: 'Matsuoka',
  fullName: 'Bob Matsuoka',
  username: 'bobmatsuoka',
  primaryEmailAddress: {
    emailAddress: 'bob@localhost.dev',
    id: 'email_dev_1',
  },
  emailAddresses: [{
    emailAddress: 'bob@localhost.dev',
    id: 'email_dev_1',
  }],
  hasImage: false,
  imageUrl: null,
  profileImageUrl: null,
  publicMetadata: {},
  privateMetadata: {},
  unsafeMetadata: {
    environment: 'development',
    autoAuth: true,
  },
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date(),
} as const;

/**
 * Hook-like function to get dev user in components
 * Mimics the useUser hook behavior for development
 */
export function useDevUser() {
  return {
    isLoaded: true,
    isSignedIn: true,
    user: DEV_USER,
  };
}

/**
 * Get dev user for server-side operations
 */
export function getDevUser() {
  return DEV_USER;
}

/**
 * Check if current user is the dev user
 */
export function isDevUser(userId: string | undefined | null): boolean {
  return userId === DEV_USER.id;
}

/**
 * Get user ID for development environment
 * Returns consistent dev user ID for memory and session management
 */
export function getDevUserId(): string {
  return DEV_USER.id;
}

/**
 * Get user display name for development
 */
export function getDevUserName(): string {
  return DEV_USER.firstName || 'Bob';
}