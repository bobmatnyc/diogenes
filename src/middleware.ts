import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

/**
 * Clerk middleware for route protection
 * Protects /chat routes while allowing public access to other pages
 */

// Define which routes should be protected
const isProtectedRoute = createRouteMatcher([
  '/chat(.*)',
  '/api/chat(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  // Protect routes that match the protected pattern
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