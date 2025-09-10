import { type NextRequest, NextResponse } from 'next/server';
import { getVersionHeaders, getVersionReport } from '@/lib/version';

// Use edge runtime for consistency
export const runtime = 'edge';

/**
 * GET /api/version
 * Returns comprehensive version and system information
 * Useful for debugging, health checks, and system monitoring
 */
export async function GET(req: NextRequest) {
  try {
    // Get the full version report
    const versionReport = getVersionReport();

    // Add request metadata
    const metadata = {
      ...versionReport,
      request: {
        url: req.url,
        headers: {
          'user-agent': req.headers.get('user-agent'),
          'x-forwarded-for': req.headers.get('x-forwarded-for'),
          'x-real-ip': req.headers.get('x-real-ip'),
        },
        timestamp: new Date().toISOString(),
      },
      api: {
        endpoint: '/api/version',
        method: 'GET',
        runtime: 'edge',
      },
    };

    // Get version headers for response
    const headers = getVersionHeaders();

    // Return JSON response with version headers
    return NextResponse.json(metadata, {
      status: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating version report:', error);

    return NextResponse.json(
      {
        error: 'Failed to generate version report',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }
}

/**
 * POST /api/version
 * Health check endpoint that can receive a payload
 * Returns version info plus echo of the payload
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const versionReport = getVersionReport();

    const response = {
      ...versionReport,
      health: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        // uptime not available in edge runtime
      },
      echo: body,
    };

    const headers = getVersionHeaders();

    return NextResponse.json(response, {
      status: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Health check failed:', error);

    return NextResponse.json(
      {
        health: {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }
}
