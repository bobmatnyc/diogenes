import { NextRequest, NextResponse } from 'next/server';
import { MemoryService } from '@/lib/kuzu/service';

// Use Node.js runtime because kuzu-memory uses Node.js-specific modules
export const runtime = 'nodejs';

/**
 * GET /api/memory/stats - Get detailed memory statistics for current user
 */
export async function GET(request: NextRequest) {
  try {
    // For local development, use a default user ID
    // In production with Clerk, you would use: const user = await currentUser();
    const userId = 'local-dev-user';
    const userName = 'Local Developer';

    // Initialize memory service
    const memoryService = MemoryService.getInstance();
    await memoryService.initialize();

    // Get detailed stats
    const stats = await memoryService.getUserStats(userId);

    // Get recent memories for additional stats
    const recentMemories = await memoryService.getUserMemories(userId, 100);

    // Calculate additional statistics
    const categoryCount: Record<string, number> = {};
    const typeCount: Record<string, number> = {};
    let totalCharacters = 0;
    let oldestMemory: Date | null = null;
    let newestMemory: Date | null = null;

    recentMemories.forEach((memory) => {
      // Count by type
      const type = (memory.metadata?.type as string) || 'general';
      typeCount[type] = (typeCount[type] || 0) + 1;

      // Count by category (if available)
      const category = (memory.metadata?.category as string) || 'uncategorized';
      categoryCount[category] = (categoryCount[category] || 0) + 1;

      // Character count
      totalCharacters += memory.content?.length || 0;

      // Date tracking
      const createdAt = memory.metadata?.createdAt as string;
      if (createdAt) {
        const memoryDate = new Date(createdAt);
        if (!oldestMemory || memoryDate < oldestMemory) {
          oldestMemory = memoryDate;
        }
        if (!newestMemory || memoryDate > newestMemory) {
          newestMemory = memoryDate;
        }
      }
    });

    const averageLength = recentMemories.length > 0
      ? Math.round(totalCharacters / recentMemories.length)
      : 0;

    // Calculate storage size (approximate)
    const storageSizeKB = Math.round(totalCharacters / 1024);

    return NextResponse.json({
      success: true,
      data: {
        // Basic stats
        totalMemories: stats.count,
        lastUpdated: stats.lastUpdated,

        // Detailed stats
        memoryTypes: typeCount,
        categories: categoryCount,
        averageMemoryLength: averageLength,
        totalCharacters,
        storageSizeKB,

        // Date ranges
        oldestMemory,
        newestMemory,

        // Health indicators
        isActive: stats.count > 0,
        utilizationPercent: Math.round((stats.count / 1000) * 100), // Assuming 1000 max

        // User info
        userId: userId,
        userName: userName,
      },
    });
  } catch (error) {
    console.error('[Memory Stats API] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to retrieve memory statistics',
        details: process.env.NODE_ENV === 'development' ? error : undefined,
      },
      { status: 500 }
    );
  }
}