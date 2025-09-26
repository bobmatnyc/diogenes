import { NextRequest, NextResponse } from 'next/server';
import { MemoryService } from '@/lib/kuzu/service';
import type { Memory, MemoryFilter } from '@/lib/kuzu/types';

// Conditionally import Clerk for production
let currentUser: any = null;
if (process.env.NODE_ENV === 'production') {
  try {
    const clerkModule = require('@clerk/nextjs/server');
    currentUser = clerkModule.currentUser;
  } catch (e) {
    // Clerk not available
    console.log('[Memory API] Clerk not available in this environment');
  }
}

// Use Node.js runtime because kuzu-memory uses Node.js-specific modules
export const runtime = 'nodejs';

/**
 * GET /api/memory - Get user's memories
 * POST /api/memory - Add a memory
 * DELETE /api/memory - Clear all memories
 */

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user (or use local dev user if no auth)
    let userId = 'local-dev-user';

    // First check if we're in development mode
    const isDevMode = request.headers.get('x-dev-mode') === 'true' ||
                     process.env.NODE_ENV === 'development';

    if (isDevMode) {
      // In dev mode, use the dev user ID from headers or default
      userId = request.headers.get('x-dev-user-id') || 'local-dev-user';
      console.log('[Memory API] Using dev mode user ID:', userId);
    } else {
      // In production on Vercel, authentication is REQUIRED
      if (!currentUser) {
        console.log('[Memory API] Clerk not available in production');
        return NextResponse.json(
          {
            error: 'Configuration error',
            message: 'Memory system is initializing. Please try again in a moment.',
            details: 'Authentication service not available'
          },
          { status: 503 }
        );
      }

      try {
        const user = await currentUser();
        if (!user?.id) {
          return NextResponse.json(
            { error: 'Authentication required', message: 'Please sign in to use memory features' },
            { status: 401 }
          );
        }
        userId = user.id;
      } catch (error) {
        console.error('[Memory API] Clerk auth error:', error);
        return NextResponse.json(
          {
            error: 'Authentication error',
            message: 'Unable to verify authentication. Please sign in again.',
            details: process.env.NODE_ENV === 'development' ? String(error) : undefined
          },
          { status: 401 }
        );
      }
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const limit = searchParams.get('limit');
    const source = searchParams.get('source') as 'user' | 'assistant' | 'system' | null;
    const type = searchParams.get('type') as 'semantic' | 'episodic' | 'procedural' | null;
    const visibility = searchParams.get('visibility') as 'private' | 'shared' | null;

    // Build filter object
    const filter: MemoryFilter = {};
    if (source) filter.source = source;
    if (type) filter.type = type;
    if (visibility) filter.visibility = visibility;

    // Initialize memory service
    const memoryService = MemoryService.getInstance();
    await memoryService.initialize();

    // Search or get memories with filtering
    let memories: Memory[];
    if (query) {
      memories = await memoryService.searchUserMemories(
        userId,
        query,
        limit ? parseInt(limit, 10) : 10,
        filter
      );
    } else {
      memories = await memoryService.getUserMemories(
        userId,
        limit ? parseInt(limit, 10) : 50,
        filter
      );
    }

    // Get stats
    const stats = await memoryService.getUserStats(userId);

    return NextResponse.json({
      success: true,
      data: {
        memories,
        stats,
        query: query || undefined,
      },
    });
  } catch (error) {
    console.error('[Memory API] GET error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to retrieve memories',
        details: process.env.NODE_ENV === 'development' ? error : undefined,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user (or use local dev user if no auth)
    let userId = 'local-dev-user';

    // First check if we're in development mode
    const isDevMode = request.headers.get('x-dev-mode') === 'true' ||
                     process.env.NODE_ENV === 'development';

    if (isDevMode) {
      // In dev mode, use the dev user ID from headers or default
      userId = request.headers.get('x-dev-user-id') || 'local-dev-user';
      console.log('[Memory API POST] Using dev mode user ID:', userId);
    } else {
      // In production on Vercel, authentication is REQUIRED
      if (!currentUser) {
        return NextResponse.json(
          { error: 'Authentication required', message: 'User must be logged in to save memories' },
          { status: 401 }
        );
      }

      try {
        const user = await currentUser();
        if (!user?.id) {
          return NextResponse.json(
            { error: 'Authentication required', message: 'Valid user session required' },
            { status: 401 }
          );
        }
        userId = user.id;
      } catch (error) {
        console.error('[Memory API POST] Clerk auth error:', error);
        return NextResponse.json(
          { error: 'Authentication failed', message: 'Unable to verify user authentication' },
          { status: 401 }
        );
      }
    }

    // Parse request body
    const body = await request.json();
    const { content, metadata, source = 'user', type = 'semantic' } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Bad request', message: 'Content is required and must be a string' },
        { status: 400 }
      );
    }

    // Initialize memory service
    const memoryService = MemoryService.getInstance();
    await memoryService.initialize();

    // Save the memory with source and type
    await memoryService.saveMemory(userId, content, {
      ...metadata,
      source,
      type,
      createdVia: 'api',
    });

    // Get updated stats
    const stats = await memoryService.getUserStats(userId);

    return NextResponse.json({
      success: true,
      message: 'Memory saved successfully',
      data: {
        stats,
      },
    });
  } catch (error) {
    console.error('[Memory API] POST error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to save memory',
        details: process.env.NODE_ENV === 'development' ? error : undefined,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Get authenticated user (or use local dev user if no auth)
    let userId = 'local-dev-user';

    // First check if we're in development mode
    const isDevMode = request.headers.get('x-dev-mode') === 'true' ||
                     process.env.NODE_ENV === 'development';

    if (isDevMode) {
      // In dev mode, use the dev user ID from headers or default
      userId = request.headers.get('x-dev-user-id') || 'local-dev-user';
      console.log('[Memory API DELETE] Using dev mode user ID:', userId);
    } else {
      // In production on Vercel, authentication is REQUIRED
      if (!currentUser) {
        return NextResponse.json(
          { error: 'Authentication required', message: 'User must be logged in to delete memories' },
          { status: 401 }
        );
      }

      try {
        const user = await currentUser();
        if (!user?.id) {
          return NextResponse.json(
            { error: 'Authentication required', message: 'Valid user session required' },
            { status: 401 }
          );
        }
        userId = user.id;
      } catch (error) {
        console.error('[Memory API DELETE] Clerk auth error:', error);
        return NextResponse.json(
          { error: 'Authentication failed', message: 'Unable to verify user authentication' },
          { status: 401 }
        );
      }
    }

    // Parse query parameters for selective deletion
    const searchParams = request.nextUrl.searchParams;
    const source = searchParams.get('source') as 'user' | 'assistant' | 'system' | null;
    const type = searchParams.get('type') as 'semantic' | 'episodic' | 'procedural' | null;

    // Build filter object
    const filter: MemoryFilter | undefined = (source || type) ? {} : undefined;
    if (filter) {
      if (source) filter.source = source;
      if (type) filter.type = type;
    }

    // Initialize memory service
    const memoryService = MemoryService.getInstance();
    await memoryService.initialize();

    // Clear memories with optional filter
    await memoryService.clearUserMemories(userId, filter);

    const message = filter
      ? `Memories matching filter cleared successfully`
      : 'All memories cleared successfully';

    return NextResponse.json({
      success: true,
      message,
      filter: filter || null,
    });
  } catch (error) {
    console.error('[Memory API] DELETE error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to clear memories',
        details: process.env.NODE_ENV === 'development' ? error : undefined,
      },
      { status: 500 }
    );
  }
}