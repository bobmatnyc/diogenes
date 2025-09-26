'use client';

import { useUser } from '@clerk/nextjs';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

/**
 * Admin setup helper page
 * This page helps you understand how to set up admin access
 */
export default function SetAdminPage() {
  const { user } = useUser();
  const [showInstructions, setShowInstructions] = useState(false);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">Admin Setup</h1>
          <p className="text-gray-600 dark:text-gray-400">Please sign in to view admin setup instructions.</p>
          <Link href="/chat" className="text-blue-500 hover:underline mt-4 inline-block">
            Go to Chat →
          </Link>
        </div>
      </div>
    );
  }

  const userEmail = user.emailAddresses?.[0]?.emailAddress;
  const isAdminEmail = userEmail === 'bob@matsuoka.com';
  const hasAdminMetadata = user.publicMetadata?.isAdmin === true;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/chat" className="text-blue-500 hover:underline mb-4 inline-block">
          ← Back to Chat
        </Link>

        <h1 className="text-3xl font-bold mb-8">Admin Setup Instructions</h1>

        {/* Current Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Your Current Status</h2>
          <div className="space-y-2">
            <p className="text-sm">
              <span className="font-medium">Email:</span> {userEmail}
            </p>
            <p className="text-sm">
              <span className="font-medium">User ID:</span> {user.id}
            </p>
            <p className="text-sm">
              <span className="font-medium">Email Admin Status:</span>{' '}
              <span className={isAdminEmail ? 'text-green-600' : 'text-red-600'}>
                {isAdminEmail ? '✓ Admin email detected' : '✗ Not an admin email'}
              </span>
            </p>
            <p className="text-sm">
              <span className="font-medium">Metadata Admin Status:</span>{' '}
              <span className={hasAdminMetadata ? 'text-green-600' : 'text-red-600'}>
                {hasAdminMetadata ? '✓ isAdmin: true' : '✗ isAdmin not set'}
              </span>
            </p>
            <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded">
              <p className="text-sm font-medium">
                Overall Admin Access:{' '}
                {isAdminEmail || hasAdminMetadata ? (
                  <span className="text-green-600">✓ GRANTED</span>
                ) : (
                  <span className="text-red-600">✗ DENIED</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Access Methods */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">How to Get Admin Access</h2>

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-2">Method 1: Email Whitelist (Automatic)</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                If your email is <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">bob@matsuoka.com</code>,
                you automatically have admin access.
              </p>
              {isAdminEmail && (
                <p className="text-green-600 font-medium">✓ You have admin access via email!</p>
              )}
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Method 2: Clerk Public Metadata (Recommended)</h3>
              <Button
                onClick={() => setShowInstructions(!showInstructions)}
                variant="outline"
                className="mb-3"
              >
                {showInstructions ? 'Hide' : 'Show'} Setup Instructions
              </Button>

              {showInstructions && (
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Go to <a href="https://dashboard.clerk.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">dashboard.clerk.com</a></li>
                    <li>Select your application (Diogenes)</li>
                    <li>Navigate to "Users" in the left sidebar</li>
                    <li>Find your user: <strong>{userEmail}</strong></li>
                    <li>Click on your user to open the profile</li>
                    <li>Scroll down to "Public metadata" section</li>
                    <li>Click "Edit" button</li>
                    <li>Add the following JSON:
                      <pre className="bg-gray-800 text-white p-3 rounded mt-2 overflow-x-auto">
{`{
  "isAdmin": true
}`}
                      </pre>
                    </li>
                    <li>Save the changes</li>
                    <li>Refresh this page to see the updated status</li>
                  </ol>
                </div>
              )}
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Method 3: User ID Whitelist</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Your user ID can be added to the whitelist in the code.
                Current whitelisted ID: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">user_2qGtyVyDeeYjKKkkbobj6LfLRHH</code>
              </p>
              {user.id === 'user_2qGtyVyDeeYjKKkkbobj6LfLRHH' && (
                <p className="text-green-600 font-medium">✓ You have admin access via user ID!</p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            {(isAdminEmail || hasAdminMetadata) ? (
              <>
                <Link
                  href="/admin"
                  className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 inline-block"
                >
                  Go to Admin Panel →
                </Link>
                <p className="text-green-600 flex items-center">
                  ✓ You have admin access!
                </p>
              </>
            ) : (
              <p className="text-gray-600 dark:text-gray-400">
                Follow the instructions above to enable admin access.
              </p>
            )}
          </div>
        </div>

        {/* Debug Info */}
        <details className="mt-8">
          <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
            Show Debug Information
          </summary>
          <div className="mt-2 p-4 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">
            <pre>{JSON.stringify({
              email: userEmail,
              userId: user.id,
              publicMetadata: user.publicMetadata,
              isAdminEmail,
              hasAdminMetadata
            }, null, 2)}</pre>
          </div>
        </details>
      </div>
    </div>
  );
}