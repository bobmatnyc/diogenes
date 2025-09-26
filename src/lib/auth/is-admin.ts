import { User } from '@clerk/nextjs/server';

/**
 * Check if a user has admin privileges
 *
 * Admin access is granted if:
 * 1. User has isAdmin: true in publicMetadata (primary method)
 * 2. User email is bob@matsuoka.com (fallback for specific admin)
 * 3. User ID matches specific known admin (fallback)
 */
export function isUserAdmin(user: User | null): boolean {
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

/**
 * Instructions to set isAdmin in Clerk Dashboard:
 *
 * 1. Go to https://dashboard.clerk.com
 * 2. Select your application
 * 3. Navigate to "Users" in the sidebar
 * 4. Find the user (bob@matsuoka.com)
 * 5. Click on the user to open their profile
 * 6. Scroll to "Public metadata" section
 * 7. Click "Edit" and add:
 *    {
 *      "isAdmin": true
 *    }
 * 8. Save the changes
 *
 * The user will now have admin access through the isAdmin flag.
 */