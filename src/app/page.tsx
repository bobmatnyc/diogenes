'use client';

import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { shouldBypassAuth } from '@/lib/env';

export default function Home() {
  const { isLoaded, isSignedIn, user } = useUser();

  // Check if auth should be bypassed (development mode)
  const isDevMode = shouldBypassAuth();
  const effectivelySignedIn = isDevMode || isSignedIn;

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-4">
      <div className="text-center max-w-4xl mx-auto">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">AI Assistant Suite</h1>
        <p className="text-lg sm:text-xl text-gray-300 mb-4 sm:mb-8">Professional Support & Philosophical Wisdom</p>
        <p className="text-sm sm:text-base text-gray-400 mb-6 sm:mb-8 max-w-md mx-auto px-4">
          Choose from an Executive Assistant with zero sycophancy, the contrarian philosopher Diogenes,
          or tech leader Bob Matsuoka.
        </p>

        <Link
          href="/chat"
          className="inline-block px-6 sm:px-8 py-3 sm:py-4 bg-diogenes-primary text-white rounded-lg hover:bg-diogenes-secondary transition-colors font-medium text-base sm:text-lg"
        >
          {effectivelySignedIn ? 'Continue to Chat' : 'Enter the Arena'}
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

        <div className="mt-8 sm:mt-12 text-xs sm:text-sm text-gray-500">
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
