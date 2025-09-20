import { NextRequest } from 'next/server'
import { createHash } from 'crypto'
import { db } from './turso'
import type { AuthenticatedUser, AuthContext, ApiError, ErrorCode } from '@/types/memory'

/**
 * Hash an API key using SHA-256
 */
export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex')
}

/**
 * Extract API key from Authorization header
 */
export function extractApiKey(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')

  if (!authHeader) {
    return null
  }

  // Support both "Bearer <key>" and "ApiKey <key>" formats
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i)
  const apiKeyMatch = authHeader.match(/^ApiKey\s+(.+)$/i)

  if (bearerMatch) {
    return bearerMatch[1]
  }

  if (apiKeyMatch) {
    return apiKeyMatch[1]
  }

  // Also support raw API key without prefix
  if (authHeader && !authHeader.includes(' ')) {
    return authHeader
  }

  return null
}

/**
 * Check if the request has internal API key for server-to-server communication
 */
export function hasInternalApiKey(request: NextRequest): boolean {
  const apiKey = extractApiKey(request)
  const internalKey = process.env.MEMORY_API_INTERNAL_KEY

  if (!apiKey || !internalKey) {
    return false
  }

  return apiKey === internalKey
}

/**
 * Create an API error response
 */
export function createApiError(
  code: ErrorCode,
  message: string,
  details?: Record<string, any>
): ApiError {
  return {
    code,
    message,
    details
  }
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: ApiError,
  status: number = 500
): Response {
  return Response.json(
    {
      success: false,
      error: error.message,
      code: error.code,
      details: error.details
    },
    { status }
  )
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): Response {
  return Response.json(
    {
      success: true,
      data,
      message
    },
    { status }
  )
}

/**
 * Extract email from request headers or body
 */
export function extractEmail(request: NextRequest): string | null {
  // Check X-User-Email header
  const emailHeader = request.headers.get('x-user-email')
  if (emailHeader) {
    return emailHeader
  }

  // Check URL parameters
  const url = new URL(request.url)
  const emailParam = url.searchParams.get('user_email')
  if (emailParam) {
    return emailParam
  }

  return null
}

/**
 * Authenticate a request using API key or email-based authentication
 * In development mode, supports email-only authentication with automatic user creation
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthContext> {
  try {
    // Check if we're in development mode
    const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV

    // Extract API key from request
    const apiKey = extractApiKey(request)

    // Check if this is an internal API request
    if (apiKey === process.env.MEMORY_API_INTERNAL_KEY) {
      // For internal API requests, use a system user context
      // This allows the Diogenes app to interact with the memory system
      const systemUser: AuthenticatedUser = {
        id: 'system-internal',
        email: 'system@diogenes.internal',
        name: 'Diogenes System',
        is_active: true
      }
      return {
        user: systemUser,
        isAuthenticated: true
      }
    }

    // Extract email for email-based auth
    const email = extractEmail(request)

    // Default email for local development
    const defaultEmail = 'bob@matsuoka.com'

    let userRow = null

    // Try API key authentication first (production mode)
    if (apiKey) {
      // Hash the API key
      const apiKeyHash = hashApiKey(apiKey)

      // Look up user by API key hash
      userRow = await db.getUserByApiKeyHash(apiKeyHash)

      if (!userRow) {
        throw createApiError(
          'UNAUTHORIZED' as ErrorCode,
          'Invalid API key'
        )
      }
    }
    // Try email-based authentication (development mode)
    else if (email && isDevelopment) {
      // Get or create user by email
      userRow = await db.createOrGetUserByEmail(email)

      if (!userRow) {
        throw createApiError(
          'DATABASE_ERROR' as ErrorCode,
          'Failed to create or retrieve user'
        )
      }
    }
    // Use default user in development mode when no auth is provided
    else if (isDevelopment) {
      // Use default bob@matsuoka.com user
      userRow = await db.createOrGetUserByEmail(defaultEmail, 'Bob Matsuoka')

      if (!userRow) {
        throw createApiError(
          'DATABASE_ERROR' as ErrorCode,
          'Failed to create or retrieve default user'
        )
      }

      console.log(`Using default development user: ${defaultEmail}`)
    }
    // Production mode requires API key
    else {
      throw createApiError(
        'UNAUTHORIZED' as ErrorCode,
        'Missing API key in Authorization header'
      )
    }

    // Check if user is active
    if (!userRow.is_active) {
      throw createApiError(
        'FORBIDDEN' as ErrorCode,
        'User account is inactive'
      )
    }

    // Convert database row to typed user object
    const user: AuthenticatedUser = {
      id: userRow.id as string,
      email: userRow.email as string,
      name: userRow.name as string,
      is_active: Boolean(userRow.is_active)
    }

    return {
      user,
      isAuthenticated: true
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error) {
      throw error // Re-throw API errors
    }

    console.error('Authentication error:', error)
    throw createApiError(
      'INTERNAL_ERROR' as ErrorCode,
      'Authentication failed'
    )
  }
}

/**
 * Middleware wrapper for API routes that require authentication
 */
export function withAuth<T extends any[]>(
  handler: (request: NextRequest, context: AuthContext, ...args: T) => Promise<Response>
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    try {
      const authContext = await authenticateRequest(request)
      return await handler(request, authContext, ...args)
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        const apiError = error as ApiError
        const statusMap: Record<ErrorCode, number> = {
          UNAUTHORIZED: 401,
          FORBIDDEN: 403,
          NOT_FOUND: 404,
          VALIDATION_ERROR: 400,
          DATABASE_ERROR: 500,
          INTERNAL_ERROR: 500
        }

        return createErrorResponse(apiError, statusMap[apiError.code] || 500)
      }

      console.error('Unexpected error in auth middleware:', error)
      return createErrorResponse(
        createApiError(
          'INTERNAL_ERROR' as ErrorCode,
          'Internal server error'
        ),
        500
      )
    }
  }
}

/**
 * Validate request parameters
 */
export function validateRequestParams(
  params: Record<string, any>,
  required: string[] = []
): void {
  const missing = required.filter(key => !(key in params) || params[key] === undefined)

  if (missing.length > 0) {
    throw createApiError(
      'VALIDATION_ERROR' as ErrorCode,
      `Missing required parameters: ${missing.join(', ')}`
    )
  }
}

/**
 * Validate JSON request body
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  requiredFields: string[] = []
): Promise<T> {
  try {
    const body = await request.json()

    if (!body || typeof body !== 'object') {
      throw createApiError(
        'VALIDATION_ERROR' as ErrorCode,
        'Invalid JSON in request body'
      )
    }

    validateRequestParams(body, requiredFields)

    return body as T
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error) {
      throw error // Re-throw API errors
    }

    throw createApiError(
      'VALIDATION_ERROR' as ErrorCode,
      'Invalid or malformed JSON in request body'
    )
  }
}

/**
 * Parse pagination parameters from URL
 */
export function parsePaginationParams(request: NextRequest) {
  const url = new URL(request.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)))
  const offset = (page - 1) * limit

  return { page, limit, offset }
}

/**
 * Create a paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
) {
  const totalPages = Math.ceil(total / limit)

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_prev: page > 1
    }
  }
}

/**
 * Resolve email to user ID
 * Creates user if doesn't exist in development mode
 */
export async function resolveEmailToUserId(email: string | undefined): Promise<string | null> {
  if (!email) {
    return null
  }

  const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV

  if (isDevelopment) {
    // In development, create user if doesn't exist
    const user = await db.createOrGetUserByEmail(email)
    return user ? user.id as string : null
  } else {
    // In production, only look up existing users
    const user = await db.getUserByEmail(email)
    return user ? user.id as string : null
  }
}

/**
 * Get user ID from request context or email parameter
 * Falls back to bob@matsuoka.com in development mode
 */
export async function getUserIdFromRequestContext(
  context: AuthContext,
  email?: string
): Promise<string> {
  // If email is provided, try to resolve it
  if (email) {
    const userIdFromEmail = await resolveEmailToUserId(email)
    if (userIdFromEmail) {
      return userIdFromEmail
    }
  }

  // Fall back to authenticated user
  return context.user.id
}

/**
 * Log API request for debugging and monitoring
 */
export function logApiRequest(
  request: NextRequest,
  user: AuthenticatedUser,
  method: string,
  endpoint: string,
  duration?: number
) {
  const timestamp = new Date().toISOString()
  const logData = {
    timestamp,
    user_id: user.id,
    user_email: user.email,
    method,
    endpoint,
    url: request.url,
    user_agent: request.headers.get('user-agent'),
    duration_ms: duration
  }

  console.log('API Request:', JSON.stringify(logData))
}

/**
 * Utility to measure API request duration
 */
export function withRequestLogging<T extends any[]>(
  handler: (request: NextRequest, context: AuthContext, ...args: T) => Promise<Response>,
  endpoint: string
) {
  return async (request: NextRequest, context: AuthContext, ...args: T): Promise<Response> => {
    const startTime = Date.now()

    try {
      const response = await handler(request, context, ...args)
      const duration = Date.now() - startTime

      logApiRequest(request, context.user, request.method, endpoint, duration)

      return response
    } catch (error) {
      const duration = Date.now() - startTime

      logApiRequest(request, context.user, request.method, endpoint, duration)

      throw error
    }
  }
}