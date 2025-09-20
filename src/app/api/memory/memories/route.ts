import { NextRequest } from 'next/server'
import { withAuth, createSuccessResponse, createErrorResponse, createApiError, validateRequestBody, parsePaginationParams, getUserIdFromRequestContext } from '@/lib/auth'
import { db } from '@/lib/turso'
import type { AuthContext, CreateMemoryRequest, MemoryResponse, ErrorCode } from '@/types/memory'

/**
 * GET /api/memory/memories
 * List memories for the authenticated user or specified email user
 */
export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    const { page, limit, offset } = parsePaginationParams(request)

    // Parse optional query parameters
    const url = new URL(request.url)
    const entityId = url.searchParams.get('entity_id') || undefined
    const userEmail = url.searchParams.get('user_email') || undefined

    // Resolve user ID from email or use authenticated user
    const userId = await getUserIdFromRequestContext(context, userEmail)

    // Get memories for the user
    const memories = await db.getMemoriesByUserId(userId, entityId, limit, offset)

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

    // Create paginated response
    const response = {
      data: memoriesResponse,
      pagination: {
        page,
        limit,
        total: memoriesResponse.length,
        has_next: memoriesResponse.length === limit,
        has_prev: page > 1
      }
    }

    return createSuccessResponse(response)
  } catch (error) {
    console.error('Error fetching memories:', error)
    return createErrorResponse(
      createApiError(
        'DATABASE_ERROR' as ErrorCode,
        'Failed to fetch memories'
      ),
      500
    )
  }
})

/**
 * POST /api/memory/memories
 * Create a new memory for the authenticated user or specified email user
 */
export const POST = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    // Validate request body
    const body = await validateRequestBody<CreateMemoryRequest>(request, [
      'entity_id',
      'memory_type',
      'title',
      'content'
    ])

    // Resolve user ID from email in body or use authenticated user
    const userId = await getUserIdFromRequestContext(context, body.user_email)

    // Validate memory_type
    const validMemoryTypes = [
      'fact',
      'preference',
      'experience',
      'instruction',
      'context',
      'relationship',
      'skill',
      'goal',
      'other'
    ]
    if (!validMemoryTypes.includes(body.memory_type)) {
      return createErrorResponse(
        createApiError(
          'VALIDATION_ERROR' as ErrorCode,
          `Invalid memory_type. Must be one of: ${validMemoryTypes.join(', ')}`
        ),
        400
      )
    }

    // Validate title
    if (!body.title || body.title.trim().length === 0) {
      return createErrorResponse(
        createApiError(
          'VALIDATION_ERROR' as ErrorCode,
          'Memory title cannot be empty'
        ),
        400
      )
    }

    if (body.title.length > 255) {
      return createErrorResponse(
        createApiError(
          'VALIDATION_ERROR' as ErrorCode,
          'Memory title must be 255 characters or less'
        ),
        400
      )
    }

    // Validate content
    if (!body.content || body.content.trim().length === 0) {
      return createErrorResponse(
        createApiError(
          'VALIDATION_ERROR' as ErrorCode,
          'Memory content cannot be empty'
        ),
        400
      )
    }

    if (body.content.length > 10000) {
      return createErrorResponse(
        createApiError(
          'VALIDATION_ERROR' as ErrorCode,
          'Memory content must be 10000 characters or less'
        ),
        400
      )
    }

    // Validate importance
    const importance = body.importance || 1
    if (importance < 1 || importance > 10) {
      return createErrorResponse(
        createApiError(
          'VALIDATION_ERROR' as ErrorCode,
          'Memory importance must be between 1 and 10'
        ),
        400
      )
    }

    // Verify the entity exists and belongs to the user
    const entity = await db.getEntityById(body.entity_id, userId)
    if (!entity) {
      return createErrorResponse(
        createApiError(
          'NOT_FOUND' as ErrorCode,
          'Entity not found or access denied'
        ),
        404
      )
    }

    // Create the memory
    const newMemory = await db.createMemory(
      userId,
      body.entity_id,
      body.memory_type,
      body.title.trim(),
      body.content.trim(),
      body.metadata || {},
      importance
    )

    if (!newMemory) {
      return createErrorResponse(
        createApiError(
          'DATABASE_ERROR' as ErrorCode,
          'Failed to create memory'
        ),
        500
      )
    }

    // Transform to API response format
    const memoryResponse: MemoryResponse = {
      id: newMemory.id as string,
      entity_id: newMemory.entity_id as string,
      memory_type: newMemory.memory_type as string,
      title: newMemory.title as string,
      content: newMemory.content as string,
      metadata: JSON.parse(newMemory.metadata as string || '{}'),
      importance: newMemory.importance as number,
      created_at: newMemory.created_at as string,
      updated_at: newMemory.updated_at as string
    }

    return createSuccessResponse(memoryResponse, 'Memory created successfully', 201)
  } catch (error) {
    console.error('Error creating memory:', error)

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
        'Failed to create memory'
      ),
      500
    )
  }
})