import { NextRequest } from 'next/server'
import { createSuccessResponse, createErrorResponse, createApiError } from '@/lib/auth'
import { db } from '@/lib/turso'
import type { ErrorCode } from '@/types/memory'

/**
 * GET /api/memory/health
 * Health check endpoint for the memory API
 * This endpoint does not require authentication for monitoring purposes
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Test database connection
    const dbHealthy = await db.testConnection()

    if (!dbHealthy) {
      throw new Error('Database connection failed')
    }

    // Calculate response time
    const responseTime = Date.now() - startTime

    // Get basic system info
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        database: {
          status: 'healthy',
          connection: 'turso',
          response_time_ms: responseTime
        },
        api: {
          status: 'healthy',
          uptime: process.uptime(),
          memory_usage: process.memoryUsage(),
          node_version: process.version
        }
      },
      endpoints: {
        entities: '/api/memory/entities',
        memories: '/api/memory/memories',
        search: '/api/memory/search',
        health: '/api/memory/health',
        test: '/api/memory/test'
      }
    }

    return createSuccessResponse(healthData)
  } catch (error) {
    console.error('Health check failed:', error)

    const responseTime = Date.now() - startTime

    const errorData = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      error: error instanceof Error ? error.message : 'Unknown error',
      services: {
        database: {
          status: 'unhealthy',
          connection: 'turso',
          response_time_ms: responseTime,
          error: error instanceof Error ? error.message : 'Database connection failed'
        },
        api: {
          status: 'degraded',
          uptime: process.uptime(),
          memory_usage: process.memoryUsage(),
          node_version: process.version
        }
      }
    }

    return createErrorResponse(
      createApiError(
        'DATABASE_ERROR' as ErrorCode,
        'Health check failed'
      ),
      503
    )
  }
}

/**
 * POST /api/memory/health
 * Extended health check with optional diagnostics
 * This endpoint does not require authentication for monitoring purposes
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await request.json().catch(() => ({}))
    const includeDiagnostics = body.diagnostics === true

    // Test database connection
    const dbHealthy = await db.testConnection()

    if (!dbHealthy) {
      throw new Error('Database connection failed')
    }

    let diagnostics = {}

    if (includeDiagnostics) {
      try {
        // Run additional diagnostic queries
        const userCountResult = await db.execute('SELECT COUNT(*) as count FROM users WHERE is_active = 1')
        const entityCountResult = await db.execute('SELECT COUNT(*) as count FROM entities')
        const memoryCountResult = await db.execute('SELECT COUNT(*) as count FROM memories')

        diagnostics = {
          database_stats: {
            active_users: Number(userCountResult.rows[0]?.count || 0),
            total_entities: Number(entityCountResult.rows[0]?.count || 0),
            total_memories: Number(memoryCountResult.rows[0]?.count || 0)
          },
          recent_activity: {
            // Get recent memory creation count (last 24 hours)
            recent_memories: await db.execute(
              `SELECT COUNT(*) as count FROM memories
               WHERE created_at > datetime('now', '-1 day')`
            ).then(result => Number(result.rows[0]?.count || 0)),
            // Get recent entity creation count (last 24 hours)
            recent_entities: await db.execute(
              `SELECT COUNT(*) as count FROM entities
               WHERE created_at > datetime('now', '-1 day')`
            ).then(result => Number(result.rows[0]?.count || 0))
          }
        }
      } catch (diagError) {
        console.warn('Diagnostics failed:', diagError)
        diagnostics = {
          error: 'Failed to collect diagnostics',
          details: diagError instanceof Error ? diagError.message : 'Unknown error'
        }
      }
    }

    // Calculate response time
    const responseTime = Date.now() - startTime

    // Build comprehensive health data
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      response_time_ms: responseTime,
      services: {
        database: {
          status: 'healthy',
          connection: 'turso',
          response_time_ms: responseTime
        },
        api: {
          status: 'healthy',
          uptime: process.uptime(),
          memory_usage: process.memoryUsage(),
          node_version: process.version,
          environment: process.env.NODE_ENV || 'development'
        }
      },
      endpoints: {
        entities: '/api/memory/entities',
        memories: '/api/memory/memories',
        search: '/api/memory/search',
        health: '/api/memory/health',
        test: '/api/memory/test'
      },
      ...(includeDiagnostics && { diagnostics })
    }

    return createSuccessResponse(healthData)
  } catch (error) {
    console.error('Extended health check failed:', error)

    const responseTime = Date.now() - startTime

    const errorData = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      response_time_ms: responseTime,
      error: error instanceof Error ? error.message : 'Unknown error',
      services: {
        database: {
          status: 'unhealthy',
          connection: 'turso',
          response_time_ms: responseTime,
          error: error instanceof Error ? error.message : 'Database connection failed'
        },
        api: {
          status: 'degraded',
          uptime: process.uptime(),
          memory_usage: process.memoryUsage(),
          node_version: process.version,
          environment: process.env.NODE_ENV || 'development'
        }
      }
    }

    return Response.json(
      {
        success: false,
        data: errorData,
        error: 'Health check failed'
      },
      { status: 503 }
    )
  }
}