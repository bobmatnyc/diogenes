'use client';

import CustomSignIn from '@/components/auth/CustomSignIn';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <CustomSignIn redirectUrl="/chat" />
    </div>
  );
}