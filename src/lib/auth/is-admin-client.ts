import { UserResource } from '@clerk/types';

/**
 * Client-side version of isUserAdmin for use in client components
 *
 * Admin access is granted if:
 * 1. User has isAdmin: true in publicMetadata (primary method)
 * 2. User email is bob@matsuoka.com (fallback for specific admin)
 * 3. User ID matches specific known admin (fallback)
 */
export function isUserAdminClient(user: UserResource | null | undefined): boolean {
  if (!user) return false;

  // Primary check: publicMetadata.isAdmin
  if (user.publicMetadata?.isAdmin === true) {
    return true;
  }

  // Fallback: Check for specific admin email
  const adminEmails = ['bob@matsuoka.com'];
  const userEmail = user.emailAddresses?.[0]?.emailAddress;
  if (userEmail && adminEmails.includes(userEmail)) {
    return true;
  }

  // Fallback: Check for specific admin user IDs
  const adminUserIds = ['user_2qGtyVyDeeYjKKkkbobj6LfLRHH'];
  if (adminUserIds.includes(user.id)) {
    return true;
  }

  return false;
}