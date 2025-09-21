import { NextRequest, NextResponse } from 'next/server';
import { getMemoryClientEdge } from '@/lib/memory/client-edge';
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

    console.log('[Memory Store API] Request received:', {
      entityId,
      userInputLength: userInput?.length,
      assistantResponseLength: assistantResponse?.length,
      persona,
      model,
    });

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

    const memoryClient = getMemoryClientEdge();
    console.log('[Memory Store API] Memory client initialized:', !!memoryClient);
    if (!memoryClient) {
      console.error('[Memory Store API] Memory system not configured - check MEMORY_API_INTERNAL_KEY');
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
    console.log('[Memory Store API] Saving interaction with context:', context);
    const memory = await memoryClient.saveInteraction(
      entityId,
      userInput,
      assistantResponse,
      context,
      metadata
    );

    console.log('[Memory Store API] Memory save result:', memory?.id || 'failed');
    if (!memory) {
      console.error('[Memory Store API] Failed to save interaction - memory is null');
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to save interaction',
        },
        { status: 500 }
      );
    }

    console.log('[Memory Store API] Successfully saved memory:', memory.id);
    return NextResponse.json({
      success: true,
      data: {
        memoryId: memory.id,
        importance: memory.importance,
      },
    });
  } catch (error) {
    console.error('[Memory Store API] Error:', error);
    if (error instanceof Error) {
      console.error('[Memory Store API] Error details:', error.message);
      console.error('[Memory Store API] Error stack:', error.stack);
    }
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}