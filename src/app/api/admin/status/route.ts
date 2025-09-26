import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { isUserAdmin } from '@/lib/auth/is-admin';

export const runtime = 'edge';

export async function GET() {
  try {
    // Check authentication
    const user = await currentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check admin privileges
    if (!isUserAdmin(user)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Gather system status information
    const status = {
      environment: {
        mode: process.env.NODE_ENV || 'production',
        vercelEnv: process.env.VERCEL_ENV || 'production',
        region: process.env.VERCEL_REGION || 'unknown'
      },
      storage: {
        blobUrl: process.env.NEXT_PUBLIC_BLOB_URL || 'https://fjxgscisvivw4piw.public.blob.vercel-storage.com',
        hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN
      },
      apiKeys: {
        openrouter: !!process.env.OPENROUTER_API_KEY,
        clerk: !!process.env.CLERK_SECRET_KEY,
        tavily: !!process.env.TAVILY_API_KEY,
        googleAnalytics: !!process.env.NEXT_PUBLIC_GA_ID
      },
      memory: {
        configured: true,
        endpoint: '/api/memory',
        available: false as boolean,
        note: '' as string,
        error: undefined as string | undefined
      },
      user: {
        id: user.id,
        email: user.emailAddresses?.[0]?.emailAddress || 'unknown',
        isAdmin: true
      },
      deployment: {
        timestamp: new Date().toISOString(),
        version: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'local'
      }
    };

    // Try to get memory stats
    try {
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';

      // Note: We can't make internal API calls from edge runtime
      // So we'll just indicate the endpoint is available
      status.memory = {
        ...status.memory,
        available: true,
        note: 'Check /api/memory directly for stats'
      };
    } catch (e) {
      status.memory = {
        ...status.memory,
        error: 'Unable to fetch memory stats from edge runtime'
      };
    }

    return NextResponse.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Admin status error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}