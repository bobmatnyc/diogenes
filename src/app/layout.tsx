import { ClerkProvider } from '@clerk/nextjs';
import { Analytics } from '@vercel/analytics/react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Diogenes - The Digital Cynic',
  description:
    'A contrarian AI chatbot that challenges conventional thinking through Socratic dialogue and philosophical provocation.',
  keywords: 'AI, chatbot, philosophy, Diogenes, Cynic, contrarian',
  authors: [{ name: 'Diogenes Team' }],
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '192x192', type: 'image/png' }],
    shortcut: '/favicon.ico',
  },
  openGraph: {
    title: 'Diogenes - The Digital Cynic',
    description: 'Challenge your thinking with a contrarian AI philosopher',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Use the test key from environment variable for localhost development
  const clerkPubKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  // Check if we're in development mode
  const isDev = process.env.NODE_ENV === 'development';
  const forceAuth = process.env.NEXT_PUBLIC_FORCE_AUTH_IN_DEV === 'true';

  // In development mode, Clerk can be optional or use test keys
  // The middleware will handle bypassing authentication entirely
  const shouldUseClerk = !isDev || forceAuth || !!clerkPubKey;

  // If Clerk is not needed (dev mode without keys), render without ClerkProvider
  if (!shouldUseClerk) {
    return (
      <html lang="en">
        <body className={inter.className}>
          {/* Development mode indicator */}
          {isDev && (
            <div className="fixed bottom-4 left-4 z-50 pointer-events-none">
              <div className="bg-yellow-500/90 text-black px-3 py-1 rounded-full text-xs font-semibold">
                DEV MODE: Auth Bypassed
              </div>
            </div>
          )}
          {children}
          <Analytics />
          <GoogleAnalytics />
        </body>
      </html>
    );
  }

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignInUrl="/chat"
      afterSignUpUrl="/chat"
      appearance={{
        elements: {
          rootBox: isDev ? 'dev-mode-clerk' : undefined,
        },
      }}
    >
      <html lang="en">
        <body className={inter.className}>
          {children}
          <Analytics />
          <GoogleAnalytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
