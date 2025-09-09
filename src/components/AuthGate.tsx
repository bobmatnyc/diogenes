'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, login } from '@/lib/auth';
import { isDevelopment } from '@/lib/env';

interface AuthGateProps {
  children: React.ReactNode;
}

export default function AuthGate({ children }: AuthGateProps) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      // In development mode, auto-authenticate
      if (isDevelopment()) {
        // Auto-login if not already authenticated
        if (!isAuthenticated()) {
          login(''); // Password doesn't matter in dev mode
        }
        setIsAuthed(true);
        setIsChecking(false);
        return;
      }

      // Production mode - normal authentication flow
      const authenticated = isAuthenticated();
      setIsAuthed(authenticated);
      setIsChecking(false);
      
      if (!authenticated) {
        router.push('/login');
      }
    };

    checkAuth();
    
    // Check auth status periodically (only in production)
    let interval: NodeJS.Timeout | null = null;
    if (!isDevelopment()) {
      interval = setInterval(checkAuth, 60000); // Check every minute
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [router]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-diogenes-primary"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthed) {
    return null;
  }

  return <>{children}</>;
}