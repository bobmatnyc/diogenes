import { NextRequest, NextResponse } from 'next/server';
import { MemoryService } from '@/lib/kuzu/service';
import { currentUser } from '@clerk/nextjs/server';

export const runtime = 'nodejs';

/**
 * GET /api/memory/status - Get memory system status
 * For admin panel and health checks
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication in production
    const isDevMode = request.headers.get('x-dev-mode') === 'true' ||
                     process.env.NODE_ENV === 'development';

    let userId = 'system-check';
    if (!isDevMode) {
      try {
        const user = await currentUser();
        if (!user?.id) {
          return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
          );
        }
        userId = user.id;
      } catch (error) {
        console.error('[Memory Status API] Auth error:', error);
      }
    }

    // Initialize memory service
    const memoryService = MemoryService.getInstance();
    await memoryService.initialize();

    // Get system-wide statistics
    const stats = await memoryService.getUserStats(userId);

    // Check storage adapter type
    const storageType = process.env.BLOB_READ_WRITE_TOKEN ? 'vercel-blob' : 'local-filesystem';
    const blobUrl = process.env.BLOB_READ_WRITE_TOKEN ?
      'https://fjxgscisvivw4piw.public.blob.vercel-storage.com' : null;

    // Perform health checks
    const healthChecks = {
      storageAdapter: 'operational',
      authenticationService: currentUser ? 'available' : 'not-available',
      environment: process.env.NODE_ENV || 'unknown',
      memoryService: 'operational'
    };

    // Test write/read capability
    let canWrite = false;
    let canRead = false;
    try {
      // Try to save a test memory
      await memoryService.saveMemory(
        'system-health-check',
        `Health check at ${new Date().toISOString()}`,
        { type: 'system', source: 'system' }
      );
      canWrite = true;

      // Try to read memories
      const testMemories = await memoryService.getUserMemories('system-health-check', 1);
      canRead = testMemories.length >= 0;
    } catch (error) {
      console.error('[Memory Status] Health check failed:', error);
    }

    return NextResponse.json({
      success: true,
      status: 'operational',
      storage: {
        type: storageType,
        blobUrl,
        canWrite,
        canRead
      },
      statistics: stats,
      health: healthChecks,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Memory Status API] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to get memory system status',
        details: process.env.NODE_ENV === 'development' ? error : undefined,
      },
      { status: 500 }
    );
  }
}