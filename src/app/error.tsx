'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="text-center text-white">
        <h1 className="text-6xl font-bold text-red-500 mb-4">500</h1>
        <h2 className="text-2xl font-semibold mb-4">Something went wrong!</h2>
        <p className="text-gray-300 mb-8 max-w-md mx-auto">
          Even philosophers encounter unexpected errors. Let's try to find wisdom again.
        </p>
        <button
          onClick={reset}
          className="inline-block bg-diogenes-primary text-white px-6 py-3 rounded-lg hover:bg-diogenes-secondary transition-colors mr-4"
        >
          Try Again
        </button>
        <a
          href="/"
          className="inline-block bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
        >
          Return Home
        </a>
      </div>
    </div>
  );
}
