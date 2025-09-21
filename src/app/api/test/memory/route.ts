import { NextResponse } from 'next/server';
import { getMemoryClientEdge } from '@/lib/memory/client-edge';

export const runtime = 'edge';

export async function GET() {
  console.log('[Test Memory] Starting memory test...');

  const memoryClient = getMemoryClientEdge();
  console.log('[Test Memory] Memory client initialized:', !!memoryClient);

  if (!memoryClient) {
    return NextResponse.json({
      success: false,
      error: 'Memory client not initialized'
    });
  }

  try {
    // Test creating/getting user entity
    const testUserId = 'test-user-' + Date.now();
    const testUserName = 'Test User';
    const testUserEmail = `test-${Date.now()}@example.com`;

    console.log('[Test Memory] Creating user entity:', { testUserId, testUserName, testUserEmail });

    const userEntity = await memoryClient.getOrCreateUserEntity(
      testUserId,
      testUserName,
      testUserEmail
    );

    console.log('[Test Memory] User entity result:', userEntity);

    if (!userEntity) {
      return NextResponse.json({
        success: false,
        error: 'Failed to create user entity',
        details: {
          userId: testUserId,
          userName: testUserName,
          userEmail: testUserEmail
        }
      });
    }

    // Test saving an interaction
    const testInteraction = await memoryClient.saveInteraction(
      userEntity.id,
      'Test user input',
      'Test assistant response',
      {
        persona: 'executive',
        model: 'test-model',
        search_performed: false,
        timestamp: new Date().toISOString()
      }
    );

    console.log('[Test Memory] Save interaction result:', testInteraction);

    return NextResponse.json({
      success: true,
      data: {
        userEntity: {
          id: userEntity.id,
          name: userEntity.name,
          type: userEntity.entity_type
        },
        memoryCreated: !!testInteraction,
        memoryId: testInteraction?.id || null
      }
    });
  } catch (error) {
    console.error('[Test Memory] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}