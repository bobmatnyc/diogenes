import { NextResponse } from 'next/server';
import { getMemoryClientEdge } from '@/lib/memory/client-edge';

export const runtime = 'edge';

export async function GET() {
  const apiKeyExists = !!process.env.MEMORY_API_INTERNAL_KEY;
  const apiKeyLength = process.env.MEMORY_API_INTERNAL_KEY?.length || 0;
  const memoryClient = getMemoryClientEdge();

  return NextResponse.json({
    debug: {
      apiKeyExists,
      apiKeyLength,
      memoryClientInitialized: !!memoryClient,
      envVars: {
        NODE_ENV: process.env.NODE_ENV,
        TURSO_DATABASE_URL: !!process.env.TURSO_DATABASE_URL,
        TURSO_AUTH_TOKEN: !!process.env.TURSO_AUTH_TOKEN,
        MEMORY_API_INTERNAL_KEY: !!process.env.MEMORY_API_INTERNAL_KEY,
        OPENROUTER_API_KEY: !!process.env.OPENROUTER_API_KEY,
      },
      runtime: 'edge',
      timestamp: new Date().toISOString()
    }
  });
}