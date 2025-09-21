import { NextResponse } from 'next/server';

/**
 * Check OpenRouter API key validity
 */
export async function GET() {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ hasKey: false, message: 'API key not configured' });
    }

    // Check key format (basic validation)
    const isValidFormat = apiKey.startsWith('sk-or-') && apiKey.length > 20;

    if (!isValidFormat) {
      return NextResponse.json({
        hasKey: true,
        validFormat: false,
        message: 'API key exists but has invalid format'
      });
    }

    // Optionally, make a test request to OpenRouter to verify the key works
    // For now, we'll just check the format to avoid using API quota

    return NextResponse.json({
      hasKey: true,
      validFormat: true,
      message: 'OpenRouter API key is configured and has valid format'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check OpenRouter configuration', hasKey: false },
      { status: 500 }
    );
  }
}