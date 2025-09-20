import { NextRequest, NextResponse } from 'next/server';
import { getMemoryClient } from '@/lib/memory/client';
import type { SaveInteractionRequest } from '@/lib/memory/types';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      entityId,
      userInput,
      assistantResponse,
      persona,
      model,
      searchPerformed,
      searchResults,
      tokenUsage,
    } = body;

    // Validate required fields
    if (!entityId || !userInput || !assistantResponse) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
        },
        { status: 400 }
      );
    }

    const memoryClient = getMemoryClient();
    if (!memoryClient) {
      return NextResponse.json(
        {
          success: false,
          error: 'Memory system not configured',
        },
        { status: 503 }
      );
    }

    // Create the interaction context
    const context: SaveInteractionRequest['context'] = {
      persona: persona || 'executive',
      model: model || 'unknown',
      search_performed: searchPerformed || false,
      search_results: searchResults,
      timestamp: new Date().toISOString(),
    };

    // Create metadata if token usage is provided
    const metadata: SaveInteractionRequest['metadata'] = tokenUsage
      ? { token_usage: tokenUsage }
      : undefined;

    // Save the interaction
    const memory = await memoryClient.saveInteraction(
      entityId,
      userInput,
      assistantResponse,
      context,
      metadata
    );

    if (!memory) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to save interaction',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        memoryId: memory.id,
        importance: memory.importance,
      },
    });
  } catch (error) {
    console.error('[Memory Store API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}