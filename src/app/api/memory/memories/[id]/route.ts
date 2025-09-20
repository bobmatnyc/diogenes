import { NextRequest } from 'next/server'
import { withAuth, createSuccessResponse, createErrorResponse, createApiError, validateRequestBody } from '@/lib/auth'
import { db } from '@/lib/turso'
import type { AuthContext, UpdateMemoryRequest, MemoryResponse, ErrorCode } from '@/types/memory'

/**
 * GET /api/memory/memories/[id]
 * Get a specific memory by ID for the authenticated user
 */
export const GET = withAuth(async (
  request: NextRequest,
  context: AuthContext,
  props: { params: Promise<{ id: string }> }
) => {
  try {
    const { user } = context
    const params = await props.params
    const memoryId = params.id

    if (!memoryId || typeof memoryId !== 'string') {
      return createErrorResponse(
        createApiError(
          'VALIDATION_ERROR' as ErrorCode,
          'Invalid memory ID'
        ),
        400
      )
    }

    // Get the memory
    const memory = await db.getMemoryById(memoryId, user.id)

    if (!memory) {
      return createErrorResponse(
        createApiError(
          'NOT_FOUND' as ErrorCode,
          'Memory not found'
        ),
        404
      )
    }

    // Transform to API response format
    const memoryResponse: MemoryResponse = {
      id: memory.id as string,
      entity_id: memory.entity_id as string,
      memory_type: memory.memory_type as string,
      title: memory.title as string,
      content: memory.content as string,
      metadata: JSON.parse(memory.metadata as string || '{}'),
      importance: memory.importance as number,
      created_at: memory.created_at as string,
      updated_at: memory.updated_at as string
    }

    return createSuccessResponse(memoryResponse)
  } catch (error) {
    console.error('Error fetching memory:', error)
    return createErrorResponse(
      createApiError(
        'DATABASE_ERROR' as ErrorCode,
        'Failed to fetch memory'
      ),
      500
    )
  }
})

/**
 * PUT /api/memory/memories/[id]
 * Update a specific memory for the authenticated user
 */
export const PUT = withAuth(async (
  request: NextRequest,
  context: AuthContext,
  props: { params: Promise<{ id: string }> }
) => {
  try {
    const { user } = context
    const params = await props.params
    const memoryId = params.id

    if (!memoryId || typeof memoryId !== 'string') {
      return createErrorResponse(
        createApiError(
          'VALIDATION_ERROR' as ErrorCode,
          'Invalid memory ID'
        ),
        400
      )
    }

    // Validate request body
    const body = await validateRequestBody<UpdateMemoryRequest>(request)

    // Check if the memory exists and belongs to the user
    const existingMemory = await db.getMemoryById(memoryId, user.id)
    if (!existingMemory) {
      return createErrorResponse(
        createApiError(
          'NOT_FOUND' as ErrorCode,
          'Memory not found'
        ),
        404
      )
    }

    // Validate updates
    const updates: UpdateMemoryRequest = {}

    if (body.title !== undefined) {
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

      updates.title = body.title.trim()
    }

    if (body.content !== undefined) {
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

      updates.content = body.content.trim()
    }

    if (body.importance !== undefined) {
      if (body.importance < 1 || body.importance > 10) {
        return createErrorResponse(
          createApiError(
            'VALIDATION_ERROR' as ErrorCode,
            'Memory importance must be between 1 and 10'
          ),
          400
        )
      }

      updates.importance = body.importance
    }

    if (body.metadata !== undefined) {
      updates.metadata = body.metadata
    }

    // Check if there are any updates to apply
    if (Object.keys(updates).length === 0) {
      return createErrorResponse(
        createApiError(
          'VALIDATION_ERROR' as ErrorCode,
          'No valid updates provided'
        ),
        400
      )
    }

    // Update the memory
    const updatedMemory = await db.updateMemory(memoryId, user.id, updates)

    if (!updatedMemory) {
      return createErrorResponse(
        createApiError(
          'DATABASE_ERROR' as ErrorCode,
          'Failed to update memory'
        ),
        500
      )
    }

    // Transform to API response format
    const memoryResponse: MemoryResponse = {
      id: updatedMemory.id as string,
      entity_id: updatedMemory.entity_id as string,
      memory_type: updatedMemory.memory_type as string,
      title: updatedMemory.title as string,
      content: updatedMemory.content as string,
      metadata: JSON.parse(updatedMemory.metadata as string || '{}'),
      importance: updatedMemory.importance as number,
      created_at: updatedMemory.created_at as string,
      updated_at: updatedMemory.updated_at as string
    }

    return createSuccessResponse(memoryResponse, 'Memory updated successfully')
  } catch (error) {
    console.error('Error updating memory:', error)

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
        'Failed to update memory'
      ),
      500
    )
  }
})

/**
 * DELETE /api/memory/memories/[id]
 * Delete a specific memory for the authenticated user
 */
export const DELETE = withAuth(async (
  request: NextRequest,
  context: AuthContext,
  props: { params: Promise<{ id: string }> }
) => {
  try {
    const { user } = context
    const params = await props.params
    const memoryId = params.id

    if (!memoryId || typeof memoryId !== 'string') {
      return createErrorResponse(
        createApiError(
          'VALIDATION_ERROR' as ErrorCode,
          'Invalid memory ID'
        ),
        400
      )
    }

    // Check if the memory exists and belongs to the user
    const existingMemory = await db.getMemoryById(memoryId, user.id)
    if (!existingMemory) {
      return createErrorResponse(
        createApiError(
          'NOT_FOUND' as ErrorCode,
          'Memory not found'
        ),
        404
      )
    }

    // Delete the memory
    const deleted = await db.deleteMemory(memoryId, user.id)

    if (!deleted) {
      return createErrorResponse(
        createApiError(
          'DATABASE_ERROR' as ErrorCode,
          'Failed to delete memory'
        ),
        500
      )
    }

    return createSuccessResponse(
      { id: memoryId },
      'Memory deleted successfully'
    )
  } catch (error) {
    console.error('Error deleting memory:', error)
    return createErrorResponse(
      createApiError(
        'DATABASE_ERROR' as ErrorCode,
        'Failed to delete memory'
      ),
      500
    )
  }
})