import { NextRequest } from 'next/server'
import { withAuth, createSuccessResponse, createErrorResponse, createApiError, validateRequestBody } from '@/lib/auth'
import { db } from '@/lib/turso'
import type { AuthContext, UpdateEntityRequest, EntityResponse, ErrorCode } from '@/types/memory'

/**
 * GET /api/memory/entities/[id]
 * Get a specific entity by ID for the authenticated user
 */
export const GET = withAuth(async (
  request: NextRequest,
  context: AuthContext,
  props: { params: Promise<{ id: string }> }
) => {
  try {
    const { user } = context
    const params = await props.params
    const entityId = params.id

    if (!entityId || typeof entityId !== 'string') {
      return createErrorResponse(
        createApiError(
          'VALIDATION_ERROR' as ErrorCode,
          'Invalid entity ID'
        ),
        400
      )
    }

    // Get the entity
    const entity = await db.getEntityById(entityId, user.id)

    if (!entity) {
      return createErrorResponse(
        createApiError(
          'NOT_FOUND' as ErrorCode,
          'Entity not found'
        ),
        404
      )
    }

    // Transform to API response format
    const entityResponse: EntityResponse = {
      id: entity.id as string,
      entity_type: entity.entity_type as string,
      name: entity.name as string,
      description: entity.description as string || undefined,
      metadata: JSON.parse(entity.metadata as string || '{}'),
      created_at: entity.created_at as string,
      updated_at: entity.updated_at as string
    }

    return createSuccessResponse(entityResponse)
  } catch (error) {
    console.error('Error fetching entity:', error)
    return createErrorResponse(
      createApiError(
        'DATABASE_ERROR' as ErrorCode,
        'Failed to fetch entity'
      ),
      500
    )
  }
})

/**
 * PUT /api/memory/entities/[id]
 * Update a specific entity for the authenticated user
 */
export const PUT = withAuth(async (
  request: NextRequest,
  context: AuthContext,
  props: { params: Promise<{ id: string }> }
) => {
  try {
    const { user } = context
    const params = await props.params
    const entityId = params.id

    if (!entityId || typeof entityId !== 'string') {
      return createErrorResponse(
        createApiError(
          'VALIDATION_ERROR' as ErrorCode,
          'Invalid entity ID'
        ),
        400
      )
    }

    // Validate request body
    const body = await validateRequestBody<UpdateEntityRequest>(request)

    // Check if the entity exists and belongs to the user
    const existingEntity = await db.getEntityById(entityId, user.id)
    if (!existingEntity) {
      return createErrorResponse(
        createApiError(
          'NOT_FOUND' as ErrorCode,
          'Entity not found'
        ),
        404
      )
    }

    // Validate updates
    const updates: UpdateEntityRequest = {}

    if (body.name !== undefined) {
      if (!body.name || body.name.trim().length === 0) {
        return createErrorResponse(
          createApiError(
            'VALIDATION_ERROR' as ErrorCode,
            'Entity name cannot be empty'
          ),
          400
        )
      }

      if (body.name.length > 255) {
        return createErrorResponse(
          createApiError(
            'VALIDATION_ERROR' as ErrorCode,
            'Entity name must be 255 characters or less'
          ),
          400
        )
      }

      updates.name = body.name.trim()
    }

    if (body.description !== undefined) {
      if (body.description && body.description.length > 1000) {
        return createErrorResponse(
          createApiError(
            'VALIDATION_ERROR' as ErrorCode,
            'Entity description must be 1000 characters or less'
          ),
          400
        )
      }

      updates.description = body.description?.trim() || undefined
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

    // Update the entity
    const updatedEntity = await db.updateEntity(entityId, user.id, updates)

    if (!updatedEntity) {
      return createErrorResponse(
        createApiError(
          'DATABASE_ERROR' as ErrorCode,
          'Failed to update entity'
        ),
        500
      )
    }

    // Transform to API response format
    const entityResponse: EntityResponse = {
      id: updatedEntity.id as string,
      entity_type: updatedEntity.entity_type as string,
      name: updatedEntity.name as string,
      description: updatedEntity.description as string || undefined,
      metadata: JSON.parse(updatedEntity.metadata as string || '{}'),
      created_at: updatedEntity.created_at as string,
      updated_at: updatedEntity.updated_at as string
    }

    return createSuccessResponse(entityResponse, 'Entity updated successfully')
  } catch (error) {
    console.error('Error updating entity:', error)

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
        'Failed to update entity'
      ),
      500
    )
  }
})

/**
 * DELETE /api/memory/entities/[id]
 * Delete a specific entity for the authenticated user
 */
export const DELETE = withAuth(async (
  request: NextRequest,
  context: AuthContext,
  props: { params: Promise<{ id: string }> }
) => {
  try {
    const { user } = context
    const params = await props.params
    const entityId = params.id

    if (!entityId || typeof entityId !== 'string') {
      return createErrorResponse(
        createApiError(
          'VALIDATION_ERROR' as ErrorCode,
          'Invalid entity ID'
        ),
        400
      )
    }

    // Check if the entity exists and belongs to the user
    const existingEntity = await db.getEntityById(entityId, user.id)
    if (!existingEntity) {
      return createErrorResponse(
        createApiError(
          'NOT_FOUND' as ErrorCode,
          'Entity not found'
        ),
        404
      )
    }

    // Delete the entity
    const deleted = await db.deleteEntity(entityId, user.id)

    if (!deleted) {
      return createErrorResponse(
        createApiError(
          'DATABASE_ERROR' as ErrorCode,
          'Failed to delete entity'
        ),
        500
      )
    }

    return createSuccessResponse(
      { id: entityId },
      'Entity deleted successfully'
    )
  } catch (error) {
    console.error('Error deleting entity:', error)
    return createErrorResponse(
      createApiError(
        'DATABASE_ERROR' as ErrorCode,
        'Failed to delete entity'
      ),
      500
    )
  }
})