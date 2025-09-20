import { NextRequest } from 'next/server'
import { withAuth, createSuccessResponse, createErrorResponse, createApiError, validateRequestBody, parsePaginationParams, getUserIdFromRequestContext } from '@/lib/auth'
import { db } from '@/lib/turso'
import type { AuthContext, CreateEntityRequest, EntityResponse, ErrorCode } from '@/types/memory'

/**
 * GET /api/memory/entities
 * List entities for the authenticated user or specified email user
 */
export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    const { page, limit, offset } = parsePaginationParams(request)

    // Parse optional query parameters
    const url = new URL(request.url)
    const userEmail = url.searchParams.get('user_email') || undefined

    // Resolve user ID from email or use authenticated user
    const userId = await getUserIdFromRequestContext(context, userEmail)

    // Get entities for the user
    const entities = await db.getEntitiesByUserId(userId, limit, offset)

    // Transform database rows to API response format
    const entitiesResponse: EntityResponse[] = entities.map(entity => ({
      id: entity.id as string,
      entity_type: entity.entity_type as string,
      name: entity.name as string,
      description: entity.description as string || undefined,
      metadata: JSON.parse(entity.metadata as string || '{}'),
      created_at: entity.created_at as string,
      updated_at: entity.updated_at as string
    }))

    // For simplicity, we'll return the entities without total count
    // In a production system, you might want to add a separate count query
    const response = {
      data: entitiesResponse,
      pagination: {
        page,
        limit,
        total: entitiesResponse.length,
        has_next: entitiesResponse.length === limit,
        has_prev: page > 1
      }
    }

    return createSuccessResponse(response)
  } catch (error) {
    console.error('Error fetching entities:', error)
    return createErrorResponse(
      createApiError(
        'DATABASE_ERROR' as ErrorCode,
        'Failed to fetch entities'
      ),
      500
    )
  }
})

/**
 * POST /api/memory/entities
 * Create a new entity for the authenticated user or specified email user
 */
export const POST = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    // Validate request body
    const body = await validateRequestBody<CreateEntityRequest>(request, [
      'entity_type',
      'name'
    ])

    // Resolve user ID from email in body or use authenticated user
    const userId = await getUserIdFromRequestContext(context, body.user_email)

    // Validate entity_type
    const validEntityTypes = ['person', 'organization', 'project', 'concept', 'location', 'event', 'other']
    if (!validEntityTypes.includes(body.entity_type)) {
      return createErrorResponse(
        createApiError(
          'VALIDATION_ERROR' as ErrorCode,
          `Invalid entity_type. Must be one of: ${validEntityTypes.join(', ')}`
        ),
        400
      )
    }

    // Validate name length
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

    // Validate description length if provided
    if (body.description && body.description.length > 1000) {
      return createErrorResponse(
        createApiError(
          'VALIDATION_ERROR' as ErrorCode,
          'Entity description must be 1000 characters or less'
        ),
        400
      )
    }

    // Create the entity
    const newEntity = await db.createEntity(
      userId,
      body.entity_type,
      body.name.trim(),
      body.description?.trim() || undefined,
      body.metadata || {}
    )

    if (!newEntity) {
      return createErrorResponse(
        createApiError(
          'DATABASE_ERROR' as ErrorCode,
          'Failed to create entity'
        ),
        500
      )
    }

    // Transform to API response format
    const entityResponse: EntityResponse = {
      id: newEntity.id as string,
      entity_type: newEntity.entity_type as string,
      name: newEntity.name as string,
      description: newEntity.description as string || undefined,
      metadata: JSON.parse(newEntity.metadata as string || '{}'),
      created_at: newEntity.created_at as string,
      updated_at: newEntity.updated_at as string
    }

    return createSuccessResponse(entityResponse, 'Entity created successfully', 201)
  } catch (error) {
    console.error('Error creating entity:', error)

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
        'Failed to create entity'
      ),
      500
    )
  }
})