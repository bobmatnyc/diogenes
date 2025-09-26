import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Custom middleware that bypasses Clerk for memory/test routes and development mode
 * Memory routes use their own Bearer token authentication (not JWT)
 * Clerk middleware is only applied to routes that need it
 * In development mode on localhost, all Clerk authentication is bypassed
 */

// Check if running in development mode on localhost
const isDevelopmentLocalhost = (req: NextRequest): boolean => {
  const host = req.headers.get('host') || '';
  const isDev = process.env.NODE_ENV === 'development';
  const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1') || host.startsWith('192.168.');

  // Allow override via environment variable to force auth even in dev
  if (process.env.NEXT_PUBLIC_FORCE_AUTH_IN_DEV === 'true') {
    return false;
  }

  return isDev && isLocalhost;
};

// Define which routes should be protected by Clerk (in production)
const isProtectedRoute = createRouteMatcher(['/chat(.*)', '/api/chat(.*)']);

// Routes that should completely bypass Clerk
const shouldBypassClerk = (pathname: string, req: NextRequest): boolean => {
  // In development mode on localhost, bypass all Clerk auth
  if (isDevelopmentLocalhost(req)) {
    return true;
  }

  // Memory API routes (have their own auth)
  if (pathname.startsWith('/api/memory/')) return true;

  // Test routes (public for diagnostics)
  if (pathname === '/test' || pathname.startsWith('/api/test/')) return true;

  return false;
};

// Create the Clerk middleware function
const clerkHandler = clerkMiddleware(async (auth, req) => {
  // Handle locale prefixes
  const url = new URL(req.url);
  const pathname = url.pathname;
  const localePattern = /^\/[a-z]{2}(\/|$)/i;

  if (localePattern.test(pathname)) {
    // Strip the locale prefix and redirect
    const newPathname = pathname.replace(/^\/[a-z]{2}/i, '').replace(/^\//, '/') || '/';
    const newUrl = new URL(newPathname, req.url);
    newUrl.search = url.search; // Preserve query parameters
    return NextResponse.redirect(newUrl);
  }

  // Protect routes that match the protected pattern
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

// Main middleware function that handles routing
export default async function middleware(req: NextRequest, evt: any) {
  const pathname = req.nextUrl.pathname;

  // BYPASS Clerk completely for memory, test routes, and development localhost
  if (shouldBypassClerk(pathname, req)) {
    // In development, inject a mock user header for consistent behavior
    if (isDevelopmentLocalhost(req)) {
      const response = NextResponse.next();
      response.headers.set('x-dev-mode', 'true');
      response.headers.set('x-dev-user-id', 'dev_user_bob_matsuoka');
      return response;
    }
    // These routes handle their own authentication
    return NextResponse.next();
  }

  // For all other routes, use Clerk middleware
  return clerkHandler(req, evt);
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
