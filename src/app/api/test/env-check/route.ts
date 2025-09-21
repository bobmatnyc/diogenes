import { NextResponse } from 'next/server';

/**
 * Check environment variables without exposing their values
 */
export async function GET() {
  try {
    const checks = {
      hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
      hasClerkSecretKey: !!process.env.CLERK_SECRET_KEY,
      hasClerkPublishableKey: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      hasTavilyKey: !!process.env.TAVILY_API_KEY,
      hasGoogleAnalyticsId: !!process.env.NEXT_PUBLIC_GA_ID,
      nodeEnv: process.env.NODE_ENV,
      isProduction: process.env.NODE_ENV === 'production',
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(checks);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check environment variables' },
      { status: 500 }
    );
  }
}