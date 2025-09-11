'use client';

import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';

export default function SSOCallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <AuthenticateWithRedirectCallback 
        afterSignInUrl="/chat"
        afterSignUpUrl="/chat"
        redirectUrl="/chat"
      />
    </div>
  );
}