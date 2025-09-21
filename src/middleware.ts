import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Custom middleware that bypasses Clerk for memory/test routes
 * Memory routes use their own Bearer token authentication (not JWT)
 * Clerk middleware is only applied to routes that need it
 */

// Define which routes should be protected by Clerk
const isProtectedRoute = createRouteMatcher(['/chat(.*)', '/api/chat(.*)']);

// Routes that should completely bypass Clerk
const shouldBypassClerk = (pathname: string): boolean => {
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
export default async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // BYPASS Clerk completely for memory and test routes
  if (shouldBypassClerk(pathname)) {
    // These routes handle their own authentication
    return NextResponse.next();
  }

  // For all other routes, use Clerk middleware
  return clerkHandler(req);
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
