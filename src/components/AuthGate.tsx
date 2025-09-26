'use client';

import { UserButton, useUser } from '@clerk/nextjs';
import { shouldBypassAuth } from '@/lib/env';
import { useDevUser } from '@/lib/auth/dev-user';

interface AuthGateProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

/**
 * Authentication gate component using Clerk with Google OAuth
 * In development: Bypasses authentication and renders children directly
 * In production: Protects routes and provides sign-in UI when authentication is required
 */
export default function AuthGate({ children, requireAuth = false }: AuthGateProps) {
  // Try to get Clerk user first, fallback to dev user if auth is bypassed
  const clerkUser = useUser();
  const devUser = useDevUser();

  // Use dev user in bypass mode, otherwise use Clerk user
  const bypassAuth = shouldBypassAuth();
  const { isLoaded, isSignedIn, user } = bypassAuth ? devUser : clerkUser;

  // Check if authentication should be bypassed
  if (bypassAuth) {
    return (
      <>
        {/* Show development mode indicator */}
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-semibold">
            DEV MODE: {user?.firstName || 'Bob'}
          </div>
        </div>
        {children}
      </>
    );
  }

  // Show loading state while Clerk is initializing
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // If authentication is required but user is not signed in, redirect to custom sign-in
  if (requireAuth && !isSignedIn) {
    // Use client-side navigation for better UX
    if (typeof window !== 'undefined') {
      window.location.href = '/sign-in';
    }
    
    // Show loading state while redirecting
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Redirecting to sign in...</p>
        </div>
      </div>
    );
  }

  // User is authenticated or auth is not required
  // If authenticated, show user button in top right (adjusted position to not conflict with header)
  return (
    <>
      {isSignedIn && (
        <div className="fixed top-4 right-4 z-[100]">
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: 'h-10 w-10 ring-2 ring-border shadow-md',
                userButtonPopoverCard: 'shadow-xl border border-border',
                userButtonPopoverActionButton: 'hover:bg-gray-100 dark:hover:bg-gray-800',
                userButtonPopoverActionButtonText: 'text-sm',
                userButtonPopoverFooter: 'hidden',
              },
            }}
            showName={false}
          />
        </div>
      )}
      {children}
    </>
  );
}
