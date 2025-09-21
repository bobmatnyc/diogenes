/**
 * Test endpoint to check model configuration
 */
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  try {
    const modelConfig = {
      primaryModel: 'anthropic/claude-3.5-sonnet-20241022',
      searchModel: 'perplexity/sonar-pro',
      fallbackSearchModel: 'perplexity/llama-3.1-sonar-large-128k-online',
      available: true,
      streaming: true,
      maxTokens: 4096,
      temperature: 0.7,
      topP: 0.9,
      provider: 'openrouter'
    };

    return NextResponse.json(modelConfig);
  } catch (error) {
    console.error('Model config error:', error);
    return NextResponse.json(
      { error: 'Failed to get model configuration' },
      { status: 500 }
    );
  }
}