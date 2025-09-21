/**
 * Test endpoint to check configuration without exposing sensitive data
 */
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  try {
    const config = {
      app: {
        name: 'Diogenes',
        version: '0.4.1',
        environment: process.env.NODE_ENV || 'development'
      },
      features: {
        authEnabled: !!process.env.CLERK_SECRET_KEY,
        searchEnabled: true,
        memoryEnabled: true,
        analyticsEnabled: !!process.env.NEXT_PUBLIC_GA_ID
      },
      api: {
        chatEndpoint: '/api/chat',
        memoryEndpoint: '/api/memory',
        streaming: true,
        edge: true
      }
    };

    return NextResponse.json(config);
  } catch (error) {
    console.error('Config check error:', error);
    return NextResponse.json(
      { error: 'Failed to get configuration' },
      { status: 500 }
    );
  }
}