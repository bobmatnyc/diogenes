'use client';

import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { isDevelopment } from '@/lib/env';

export default function Home() {
  const { isLoaded, isSignedIn, user } = useUser();

  // In development mode, simulate signed-in state
  const isDevMode = isDevelopment();
  const effectivelySignedIn = isDevMode || isSignedIn;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-white mb-4">Diogenes</h1>
        <p className="text-xl text-gray-300 mb-8">The Digital Cynic</p>
        <p className="text-gray-400 mb-8 max-w-md mx-auto">
          Challenge your thinking with a contrarian AI philosopher who questions everything,
          especially the obvious.
        </p>

        <Link
          href="/chat"
          className="inline-block px-8 py-4 bg-diogenes-primary text-white rounded-lg hover:bg-diogenes-secondary transition-colors font-medium text-lg"
        >
          {effectivelySignedIn ? 'Continue to Chat' : 'Enter the Philosophical Arena'}
        </Link>

        {isDevMode && (
          <div className="mt-6 text-sm text-gray-400">
            <div className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded inline-block">
              Development Mode: Signed in as Bob
            </div>
          </div>
        )}

        {!isDevMode && isSignedIn && user && (
          <div className="mt-6 text-sm text-gray-400">
            Welcome back, {user.firstName || user.emailAddresses?.[0]?.emailAddress}
          </div>
        )}

        <div className="mt-12 text-sm text-gray-500">
          <p className="italic">"I am looking for an honest man."</p>
          <p className="mt-1">- Diogenes of Sinope</p>
        </div>

        {!isDevMode && isLoaded && !isSignedIn && (
          <div className="mt-8 text-xs text-gray-500">
            <p>Sign in with Google to begin your philosophical journey</p>
          </div>
        )}
      </div>
    </div>
  );
}
