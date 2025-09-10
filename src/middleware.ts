import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

/**
 * Clerk middleware for route protection
 * In development: Bypasses authentication completely
 * In production: Protects /chat routes while allowing public access to other pages
 */

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// Define which routes should be protected (in production only)
const isProtectedRoute = createRouteMatcher(['/chat(.*)', '/api/chat(.*)']);

export default clerkMiddleware(async (auth, req) => {
  // Skip authentication in development mode
  if (isDevelopment) {
    // In development, don't protect any routes
    return;
  }

  // In production, protect routes that match the protected pattern
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
