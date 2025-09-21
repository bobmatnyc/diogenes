/**
 * Test endpoint to check available models
 */
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  try {
    // Return configured models (not actual API check in test endpoint)
    const models = {
      'anthropic/claude-3.5-sonnet': {
        available: true,
        name: 'Claude 3.5 Sonnet',
        provider: 'anthropic'
      },
      'anthropic/claude-3.5-sonnet-20241022': {
        available: true,
        name: 'Claude 3.5 Sonnet (Oct 2024)',
        provider: 'anthropic'
      },
      'perplexity/sonar-pro': {
        available: true,
        name: 'Perplexity Sonar Pro',
        provider: 'perplexity'
      },
      'perplexity/llama-3.1-sonar-large-128k-online': {
        available: true,
        name: 'Perplexity Llama 3.1 Sonar',
        provider: 'perplexity'
      }
    };

    return NextResponse.json({
      models,
      primaryModel: 'anthropic/claude-3.5-sonnet-20241022',
      searchModel: 'perplexity/sonar-pro',
      count: Object.keys(models).length
    });
  } catch (error) {
    console.error('Model check error:', error);
    return NextResponse.json(
      { error: 'Failed to check models' },
      { status: 500 }
    );
  }
}