'use client';

import { useState } from 'react';
import { useSignUp } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

interface EmailVerificationProps {
  email: string;
  onBack: () => void;
}

export default function EmailVerification({ email, onBack }: EmailVerificationProps) {
  const { signUp, setActive } = useSignUp();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUp) return;

    try {
      setIsLoading(true);
      setError('');

      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (completeSignUp.status === 'complete') {
        await setActive({ session: completeSignUp.createdSessionId });
        router.push('/chat');
      } else {
        setError('Verification incomplete. Please try again.');
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      setError(err.errors?.[0]?.message || 'Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const resendCode = async () => {
    if (!signUp) return;

    try {
      setIsLoading(true);
      setError('');
      
      await signUp.prepareEmailAddressVerification({ 
        strategy: 'email_code' 
      });
      
      setError(''); // Clear any previous errors
      alert('Verification code resent! Check your email.');
    } catch (err: any) {
      console.error('Resend error:', err);
      setError(err.errors?.[0]?.message || 'Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Verify Your Email
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            We've sent a verification code to
          </p>
          <p className="font-medium text-gray-900 dark:text-white">
            {email}
          </p>
        </div>

        <form onSubmit={handleVerification} className="space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Verification Code
            </label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              placeholder="Enter 6-digit code"
              maxLength={6}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white text-center text-lg font-mono"
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || code.length !== 6}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              'Verify Email'
            )}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={onBack}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-500"
          >
            ← Back to sign up
          </button>
          
          <button
            onClick={resendCode}
            disabled={isLoading}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500"
          >
            Resend code
          </button>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 italic">
            "The foundation of every state is the education of its youth."
            <br />- Diogenes of Sinope
          </p>
        </div>
      </div>
    </div>
  );
}