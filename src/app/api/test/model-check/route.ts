import { NextResponse } from 'next/server';

/**
 * Check if a specific model is available via OpenRouter
 */
export async function POST(req: Request) {
  try {
    const { model } = await req.json();

    if (!model) {
      return NextResponse.json({ error: 'Model name is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        available: false,
        message: 'OpenRouter API key not configured'
      });
    }

    // For testing, we'll check against known models
    // In production, you might want to actually query OpenRouter's model endpoint
    const knownModels = [
      'anthropic/claude-3.5-sonnet-20241022',
      'anthropic/claude-3-opus-20240229',
      'anthropic/claude-3-sonnet-20240229',
      'anthropic/claude-3-haiku-20240307',
      'perplexity/sonar-pro',
      'perplexity/llama-3.1-sonar-large-128k-online',
      'perplexity/llama-3.1-sonar-small-128k-online',
      'openai/gpt-4-turbo',
      'openai/gpt-3.5-turbo',
      'google/gemini-pro',
      'meta-llama/llama-3.1-70b-instruct'
    ];

    const available = knownModels.includes(model);

    return NextResponse.json({
      model,
      available,
      message: available
        ? `Model ${model} is available`
        : `Model ${model} is not in the known models list`
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to check model availability', message: error.message },
      { status: 500 }
    );
  }
}