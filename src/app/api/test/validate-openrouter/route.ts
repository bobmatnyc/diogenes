/**
 * Test endpoint to validate OpenRouter API key format
 */
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { apiKey } = await req.json();

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    // OpenRouter keys should start with 'sk-or-v1-'
    const validFormat = apiKey.startsWith('sk-or-v1-');

    return NextResponse.json({
      validFormat,
      keyPrefix: apiKey.substring(0, 10) + '...'
    });
  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate API key' },
      { status: 500 }
    );
  }
}