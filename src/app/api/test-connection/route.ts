import { NextRequest, NextResponse } from 'next/server';
import { getOpenRouterClient } from '@/lib/openrouter';

// Test endpoint to verify OpenRouter API connection
export async function GET(req: NextRequest) {
  try {
    // Check if API key exists
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey || apiKey === '') {
      return NextResponse.json({
        status: 'error',
        message: 'OpenRouter API key not configured',
        details: 'OPENROUTER_API_KEY environment variable is missing or empty'
      }, { status: 503 });
    }

    // Get OpenRouter client
    const openrouter = getOpenRouterClient();

    // Make a minimal test request
    console.log('[Test Connection] Making test request to OpenRouter...');
    
    const response = await openrouter.chat.completions.create({
      model: 'openai/gpt-3.5-turbo',  // Using a simpler model for testing
      messages: [
        { role: 'system', content: 'You are a test assistant. Reply with exactly: "Connection successful!"' },
        { role: 'user', content: 'Test' }
      ],
      max_tokens: 10,
      stream: false
    });

    // Check if we got a valid response
    const content = response.choices?.[0]?.message?.content;
    
    if (content) {
      return NextResponse.json({
        status: 'success',
        message: 'OpenRouter API connection successful',
        response: content,
        model: response.model,
        usage: response.usage
      });
    } else {
      return NextResponse.json({
        status: 'error',
        message: 'Unexpected response format',
        details: response
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error('[Test Connection] Error:', error);
    
    // Parse error details
    let errorDetails = {
      status: 'error',
      message: 'Connection test failed',
      error: error.message || 'Unknown error',
      type: 'UnknownError'
    };

    // Handle specific error types
    if (error?.status === 401 || error?.message?.includes('User not found')) {
      errorDetails = {
        status: 'error',
        message: 'Authentication failed - Invalid API key',
        error: error.message,
        type: 'AuthenticationError'
      };
      return NextResponse.json(errorDetails, { status: 401 });
    }

    if (error?.status === 402 || error?.message?.includes('credit')) {
      errorDetails = {
        status: 'error',
        message: 'Insufficient credits in OpenRouter account',
        error: error.message,
        type: 'QuotaExceededError'
      };
      return NextResponse.json(errorDetails, { status: 402 });
    }

    if (error?.status === 429) {
      errorDetails = {
        status: 'error',
        message: 'Rate limit exceeded',
        error: error.message,
        type: 'RateLimitError'
      };
      return NextResponse.json(errorDetails, { status: 429 });
    }

    if (error?.status === 404 || error?.message?.includes('model')) {
      errorDetails = {
        status: 'error',
        message: 'Model not available',
        error: error.message,
        type: 'ModelNotFoundError'
      };
      return NextResponse.json(errorDetails, { status: 404 });
    }

    // Network errors
    if (error?.code === 'ECONNREFUSED' || error?.message?.includes('fetch failed')) {
      errorDetails = {
        status: 'error',
        message: 'Unable to connect to OpenRouter API',
        error: error.message,
        type: 'NetworkError'
      };
      return NextResponse.json(errorDetails, { status: 503 });
    }

    return NextResponse.json(errorDetails, { status: 500 });
  }
}