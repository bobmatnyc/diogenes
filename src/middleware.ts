import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // In development mode, allow all requests
  if (process.env.NODE_ENV === 'development') {
    // Auto-redirect root to chat in development
    if (request.nextUrl.pathname === '/') {
      return NextResponse.redirect(new URL('/chat', request.url));
    }
    return NextResponse.next();
  }

  // Production mode: Allow API routes and login page to be accessed without auth
  if (
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname === '/login'
  ) {
    return NextResponse.next();
  }

  // For now, we'll handle auth check on the client side
  // In production, you might want to check a secure cookie here
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};