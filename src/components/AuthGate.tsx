'use client';

import { SignIn, UserButton, useUser } from '@clerk/nextjs';
import { isDevelopment } from '@/lib/env';

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
  const { isLoaded, isSignedIn, user } = useUser();

  // In development mode, bypass authentication entirely
  if (isDevelopment()) {
    return (
      <>
        {/* Show development mode indicator */}
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-semibold">
            DEV MODE: Bob
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

  // If authentication is required but user is not signed in, show sign-in
  if (requireAuth && !isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
              Welcome to Diogenes
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              The Digital Cynic awaits your questions
            </p>
            <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-500">
              Sign in to engage in philosophical discourse
            </p>
          </div>

          <div className="flex justify-center">
            <SignIn
              appearance={{
                elements: {
                  rootBox: 'w-full',
                  card: 'shadow-none bg-transparent',
                  headerTitle: 'hidden',
                  headerSubtitle: 'hidden',
                  socialButtonsBlockButton:
                    'w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200',
                  formButtonPrimary:
                    'w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500',
                  footerActionLink: 'text-indigo-600 hover:text-indigo-500',
                  identityPreviewText: 'text-gray-600 dark:text-gray-400',
                  identityPreviewEditButton: 'text-indigo-600 hover:text-indigo-500',
                  formFieldLabel: 'text-gray-700 dark:text-gray-300',
                  formFieldInput:
                    'mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white',
                  dividerLine: 'bg-gray-300 dark:bg-gray-700',
                  dividerText: 'text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 px-2',
                },
              }}
              routing="path"
              path="/sign-in"
              signUpUrl="/sign-up"
              afterSignInUrl="/chat"
            />
          </div>

          <div className="text-center space-y-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              By signing in, you agree to engage in philosophical debate
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 italic">
              "The only true wisdom is in knowing you know nothing" - Socrates
            </p>
          </div>
        </div>
      </div>
    );
  }

  // User is authenticated or auth is not required
  // If authenticated, show user button in top right
  return (
    <>
      {isSignedIn && (
        <div className="fixed top-4 right-4 z-50">
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: 'h-10 w-10',
                userButtonPopoverCard: 'shadow-lg',
                userButtonPopoverActionButton: 'hover:bg-gray-100 dark:hover:bg-gray-800',
              },
            }}
          />
        </div>
      )}
      {children}
    </>
  );
}
