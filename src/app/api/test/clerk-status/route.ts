/**
 * Test endpoint to check Clerk authentication status
 */
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  try {
    const clerkStatus = {
      initialized: !!process.env.CLERK_SECRET_KEY && !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?
        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.substring(0, 10) + '...' : null,
      hasSecretKey: !!process.env.CLERK_SECRET_KEY,
      environment: process.env.NODE_ENV || 'development'
    };

    return NextResponse.json(clerkStatus);
  } catch (error) {
    console.error('Clerk status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check Clerk status' },
      { status: 500 }
    );
  }
}