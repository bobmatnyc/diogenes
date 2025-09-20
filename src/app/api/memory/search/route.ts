import { NextRequest } from 'next/server'
import { withAuth, createSuccessResponse, createErrorResponse, createApiError, validateRequestBody, getUserIdFromRequestContext } from '@/lib/auth'
import { db } from '@/lib/turso'
import type { AuthContext, SearchMemoriesRequest, MemoryResponse, ErrorCode } from '@/types/memory'

/**
 * POST /api/memory/search
 * Search memories for the authenticated user or specified email user
 */
export const POST = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    // Validate request body
    const body = await validateRequestBody<SearchMemoriesRequest>(request, ['query'])

    // Resolve user ID from email in body or use authenticated user
    const userId = await getUserIdFromRequestContext(context, body.user_email)

    // Validate query
    if (!body.query || body.query.trim().length === 0) {
      return createErrorResponse(
        createApiError(
          'VALIDATION_ERROR' as ErrorCode,
          'Search query cannot be empty'
        ),
        400
      )
    }

    if (body.query.length > 500) {
      return createErrorResponse(
        createApiError(
          'VALIDATION_ERROR' as ErrorCode,
          'Search query must be 500 characters or less'
        ),
        400
      )
    }

    // Validate limit
    const limit = Math.min(100, Math.max(1, body.limit || 50))

    // Validate entity_id if provided
    let entityId = body.entity_id
    if (entityId) {
      // Verify the entity exists and belongs to the user
      const entity = await db.getEntityById(entityId, userId)
      if (!entity) {
        return createErrorResponse(
          createApiError(
            'NOT_FOUND' as ErrorCode,
            'Entity not found or access denied'
          ),
          404
        )
      }
    }

    // Search memories
    const memories = await db.searchMemories(
      userId,
      body.query.trim(),
      entityId,
      limit
    )

    // Transform database rows to API response format
    const memoriesResponse: MemoryResponse[] = memories.map(memory => ({
      id: memory.id as string,
      entity_id: memory.entity_id as string,
      memory_type: memory.memory_type as string,
      title: memory.title as string,
      content: memory.content as string,
      metadata: JSON.parse(memory.metadata as string || '{}'),
      importance: memory.importance as number,
      created_at: memory.created_at as string,
      updated_at: memory.updated_at as string
    }))

    // Create search response with metadata
    const response = {
      query: body.query.trim(),
      entity_id: entityId || null,
      results: memoriesResponse,
      total_results: memoriesResponse.length,
      limit: limit
    }

    return createSuccessResponse(response)
  } catch (error) {
    console.error('Error searching memories:', error)

    // Check if this is a validation error we've already thrown
    if (error && typeof error === 'object' && 'code' in error) {
      const apiError = error as { code: ErrorCode; message: string }
      return createErrorResponse(
        createApiError(apiError.code, apiError.message),
        apiError.code === 'VALIDATION_ERROR' ? 400 : 500
      )
    }

    return createErrorResponse(
      createApiError(
        'DATABASE_ERROR' as ErrorCode,
        'Failed to search memories'
      ),
      500
    )
  }
})

/**
 * GET /api/memory/search
 * Alternative search endpoint using query parameters
 */
export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    const { user } = context
    const url = new URL(request.url)

    // Parse query parameters
    const query = url.searchParams.get('q') || url.searchParams.get('query')
    const entityId = url.searchParams.get('entity_id') || undefined
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)))

    // Validate query
    if (!query || query.trim().length === 0) {
      return createErrorResponse(
        createApiError(
          'VALIDATION_ERROR' as ErrorCode,
          'Search query parameter (q or query) is required'
        ),
        400
      )
    }

    if (query.length > 500) {
      return createErrorResponse(
        createApiError(
          'VALIDATION_ERROR' as ErrorCode,
          'Search query must be 500 characters or less'
        ),
        400
      )
    }

    // Validate entity_id if provided
    if (entityId) {
      // Verify the entity exists and belongs to the user
      const entity = await db.getEntityById(entityId, user.id)
      if (!entity) {
        return createErrorResponse(
          createApiError(
            'NOT_FOUND' as ErrorCode,
            'Entity not found or access denied'
          ),
          404
        )
      }
    }

    // Search memories
    const memories = await db.searchMemories(
      user.id,
      query.trim(),
      entityId,
      limit
    )

    // Transform database rows to API response format
    const memoriesResponse: MemoryResponse[] = memories.map(memory => ({
      id: memory.id as string,
      entity_id: memory.entity_id as string,
      memory_type: memory.memory_type as string,
      title: memory.title as string,
      content: memory.content as string,
      metadata: JSON.parse(memory.metadata as string || '{}'),
      importance: memory.importance as number,
      created_at: memory.created_at as string,
      updated_at: memory.updated_at as string
    }))

    // Create search response with metadata
    const response = {
      query: query.trim(),
      entity_id: entityId || null,
      results: memoriesResponse,
      total_results: memoriesResponse.length,
      limit: limit
    }

    return createSuccessResponse(response)
  } catch (error) {
    console.error('Error searching memories:', error)

    // Check if this is a validation error we've already thrown
    if (error && typeof error === 'object' && 'code' in error) {
      const apiError = error as { code: ErrorCode; message: string }
      return createErrorResponse(
        createApiError(apiError.code, apiError.message),
        apiError.code === 'VALIDATION_ERROR' ? 400 : 500
      )
    }

    return createErrorResponse(
      createApiError(
        'DATABASE_ERROR' as ErrorCode,
        'Failed to search memories'
      ),
      500
    )
  }
})