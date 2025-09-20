/**
 * Comprehensive Memory API Test Suite
 *
 * Tests all memory API endpoints with authentication, validation,
 * multi-tenant isolation, and error handling scenarios.
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest'
import { NextRequest } from 'next/server'
import { createHash } from 'crypto'

// Import API route handlers
import { GET as healthGET, POST as healthPOST } from '@/app/api/memory/health/route'
import { GET as entitiesGET, POST as entitiesPOST } from '@/app/api/memory/entities/route'
import { GET as entityGET, PUT as entityPUT, DELETE as entityDELETE } from '@/app/api/memory/entities/[id]/route'
import { GET as memoriesGET, POST as memoriesPOST } from '@/app/api/memory/memories/route'
import { GET as memoryGET, PUT as memoryPUT, DELETE as memoryDELETE } from '@/app/api/memory/memories/[id]/route'
import { POST as searchPOST } from '@/app/api/memory/search/route'
import { GET as testGET } from '@/app/api/memory/test/route'

// Import types
import type {
  CreateEntityRequest,
  UpdateEntityRequest,
  CreateMemoryRequest,
  UpdateMemoryRequest,
  SearchMemoriesRequest,
  EntityResponse,
  MemoryResponse
} from '@/types/memory'

// Test utilities
import { createTestUser, createTestEntity, createTestMemory, cleanupTestData } from '../utils/test-helpers'

// Mock database and auth modules
vi.mock('@/lib/turso', () => ({
  db: {
    testConnection: vi.fn(),
    execute: vi.fn(),
    getUserByApiKeyHash: vi.fn(),
    createUser: vi.fn(),
    createEntity: vi.fn(),
    getEntitiesByUserId: vi.fn(),
    getEntityById: vi.fn(),
    updateEntity: vi.fn(),
    deleteEntity: vi.fn(),
    createMemory: vi.fn(),
    getMemoriesByUserId: vi.fn(),
    getMemoryById: vi.fn(),
    updateMemory: vi.fn(),
    deleteMemory: vi.fn(),
    searchMemories: vi.fn(),
  }
}))

// Test data constants
const TEST_USER_1 = {
  id: 'user-1',
  email: 'test1@example.com',
  name: 'Test User 1',
  api_key: 'test-api-key-1',
  api_key_hash: createHash('sha256').update('test-api-key-1').digest('hex'),
  is_active: 1
}

const TEST_USER_2 = {
  id: 'user-2',
  email: 'test2@example.com',
  name: 'Test User 2',
  api_key: 'test-api-key-2',
  api_key_hash: createHash('sha256').update('test-api-key-2').digest('hex'),
  is_active: 1
}

const TEST_ENTITY_1 = {
  id: 'entity-1',
  user_id: 'user-1',
  entity_type: 'person',
  name: 'John Doe',
  description: 'A test person',
  metadata: '{"role": "developer"}',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}

const TEST_MEMORY_1 = {
  id: 'memory-1',
  user_id: 'user-1',
  entity_id: 'entity-1',
  memory_type: 'personal',
  title: 'Meeting notes',
  content: 'Important discussion about project',
  metadata: '{"tags": ["meeting", "project"]}',
  importance: 8,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}

// Helper functions
function createMockRequest(
  method: string = 'GET',
  url: string = 'http://localhost:3000/api/memory/health',
  headers: Record<string, string> = {},
  body?: any
): NextRequest {
  const request = new NextRequest(url, {
    method,
    headers: new Headers(headers),
    body: body ? JSON.stringify(body) : undefined
  })
  return request
}

function createAuthHeaders(apiKey: string): Record<string, string> {
  return {
    'authorization': `Bearer ${apiKey}`,
    'content-type': 'application/json'
  }
}

async function parseJsonResponse(response: Response) {
  const text = await response.text()
  try {
    return JSON.parse(text)
  } catch {
    return { error: 'Invalid JSON response', body: text }
  }
}

describe('Memory API Test Suite', () => {
  let mockDb: any

  beforeAll(() => {
    // Import the mocked database
    const { db } = require('@/lib/turso')
    mockDb = db
  })

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()

    // Setup default mock responses
    mockDb.testConnection.mockResolvedValue(true)
    mockDb.execute.mockResolvedValue({ rows: [{ count: 0 }] })
  })

  afterEach(async () => {
    // Clean up any test data
    await cleanupTestData()
  })

  describe('Health Check Endpoints', () => {
    describe('GET /api/memory/health', () => {
      it('should return healthy status when database is accessible', async () => {
        const request = createMockRequest('GET', 'http://localhost:3000/api/memory/health')
        const response = await healthGET(request)
        const data = await parseJsonResponse(response)

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.status).toBe('healthy')
        expect(data.data.services.database.status).toBe('healthy')
        expect(data.data.endpoints).toMatchObject({
          entities: '/api/memory/entities',
          memories: '/api/memory/memories',
          search: '/api/memory/search',
          health: '/api/memory/health',
          test: '/api/memory/test'
        })
      })

      it('should return unhealthy status when database connection fails', async () => {
        mockDb.testConnection.mockResolvedValue(false)

        const request = createMockRequest('GET', 'http://localhost:3000/api/memory/health')
        const response = await healthGET(request)
        const data = await parseJsonResponse(response)

        expect(response.status).toBe(503)
        expect(data.success).toBe(false)
        expect(data.error).toContain('Health check failed')
      })

      it('should handle database connection errors gracefully', async () => {
        mockDb.testConnection.mockRejectedValue(new Error('Connection timeout'))

        const request = createMockRequest('GET', 'http://localhost:3000/api/memory/health')
        const response = await healthGET(request)
        const data = await parseJsonResponse(response)

        expect(response.status).toBe(503)
        expect(data.success).toBe(false)
        expect(data.error).toContain('Health check failed')
      })
    })

    describe('POST /api/memory/health', () => {
      it('should return basic health check without diagnostics', async () => {
        const request = createMockRequest(
          'POST',
          'http://localhost:3000/api/memory/health',
          { 'content-type': 'application/json' },
          {}
        )
        const response = await healthPOST(request)
        const data = await parseJsonResponse(response)

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.status).toBe('healthy')
        expect(data.data.diagnostics).toBeUndefined()
      })

      it('should return diagnostics when requested', async () => {
        mockDb.execute.mockResolvedValueOnce({ rows: [{ count: 5 }] }) // users
        mockDb.execute.mockResolvedValueOnce({ rows: [{ count: 10 }] }) // entities
        mockDb.execute.mockResolvedValueOnce({ rows: [{ count: 25 }] }) // memories
        mockDb.execute.mockResolvedValueOnce({ rows: [{ count: 3 }] }) // recent memories
        mockDb.execute.mockResolvedValueOnce({ rows: [{ count: 2 }] }) // recent entities

        const request = createMockRequest(
          'POST',
          'http://localhost:3000/api/memory/health',
          { 'content-type': 'application/json' },
          { diagnostics: true }
        )
        const response = await healthPOST(request)
        const data = await parseJsonResponse(response)

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.diagnostics).toBeDefined()
        expect(data.data.diagnostics.database_stats).toMatchObject({
          active_users: 5,
          total_entities: 10,
          total_memories: 25
        })
        expect(data.data.diagnostics.recent_activity).toMatchObject({
          recent_memories: 3,
          recent_entities: 2
        })
      })

      it('should handle diagnostics errors gracefully', async () => {
        mockDb.execute.mockRejectedValue(new Error('Query failed'))

        const request = createMockRequest(
          'POST',
          'http://localhost:3000/api/memory/health',
          { 'content-type': 'application/json' },
          { diagnostics: true }
        )
        const response = await healthPOST(request)
        const data = await parseJsonResponse(response)

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.diagnostics.error).toBe('Failed to collect diagnostics')
      })
    })
  })

  describe('Authentication', () => {
    beforeEach(() => {
      mockDb.getUserByApiKeyHash.mockImplementation((hash: string) => {
        if (hash === TEST_USER_1.api_key_hash) {
          return Promise.resolve(TEST_USER_1)
        }
        if (hash === TEST_USER_2.api_key_hash) {
          return Promise.resolve(TEST_USER_2)
        }
        return Promise.resolve(null)
      })
    })

    it('should reject requests without authorization header', async () => {
      const request = createMockRequest('GET', 'http://localhost:3000/api/memory/entities')
      const response = await entitiesGET(request)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Missing API key')
    })

    it('should reject requests with invalid API key', async () => {
      const request = createMockRequest(
        'GET',
        'http://localhost:3000/api/memory/entities',
        createAuthHeaders('invalid-api-key')
      )
      const response = await entitiesGET(request)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid API key')
    })

    it('should accept valid API key with Bearer format', async () => {
      mockDb.getEntitiesByUserId.mockResolvedValue([])

      const request = createMockRequest(
        'GET',
        'http://localhost:3000/api/memory/entities',
        createAuthHeaders(TEST_USER_1.api_key)
      )
      const response = await entitiesGET(request)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should accept valid API key with ApiKey format', async () => {
      mockDb.getEntitiesByUserId.mockResolvedValue([])

      const request = createMockRequest(
        'GET',
        'http://localhost:3000/api/memory/entities',
        {
          'authorization': `ApiKey ${TEST_USER_1.api_key}`,
          'content-type': 'application/json'
        }
      )
      const response = await entitiesGET(request)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should reject inactive users', async () => {
      const inactiveUser = { ...TEST_USER_1, is_active: 0 }
      mockDb.getUserByApiKeyHash.mockResolvedValue(inactiveUser)

      const request = createMockRequest(
        'GET',
        'http://localhost:3000/api/memory/entities',
        createAuthHeaders(TEST_USER_1.api_key)
      )
      const response = await entitiesGET(request)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error).toContain('User account is inactive')
    })
  })

  describe('Entity Endpoints', () => {
    beforeEach(() => {
      mockDb.getUserByApiKeyHash.mockResolvedValue(TEST_USER_1)
    })

    describe('GET /api/memory/entities', () => {
      it('should return user entities with pagination', async () => {
        const entities = [TEST_ENTITY_1]
        mockDb.getEntitiesByUserId.mockResolvedValue(entities)

        const request = createMockRequest(
          'GET',
          'http://localhost:3000/api/memory/entities',
          createAuthHeaders(TEST_USER_1.api_key)
        )
        const response = await entitiesGET(request)
        const data = await parseJsonResponse(response)

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.data).toHaveLength(1)
        expect(data.data.data[0].id).toBe(TEST_ENTITY_1.id)
        expect(data.data.pagination).toBeDefined()
      })

      it('should respect pagination parameters', async () => {
        const entities = Array.from({ length: 5 }, (_, i) => ({
          ...TEST_ENTITY_1,
          id: `entity-${i}`,
          name: `Entity ${i}`
        }))
        mockDb.getEntitiesByUserId.mockResolvedValue(entities.slice(0, 2))

        const request = createMockRequest(
          'GET',
          'http://localhost:3000/api/memory/entities?page=1&limit=2',
          createAuthHeaders(TEST_USER_1.api_key)
        )
        const response = await entitiesGET(request)
        const data = await parseJsonResponse(response)

        expect(response.status).toBe(200)
        expect(data.data.pagination.limit).toBe(2)
        expect(data.data.pagination.page).toBe(1)
      })

      it('should enforce multi-tenant isolation', async () => {
        mockDb.getEntitiesByUserId.mockImplementation((userId: string) => {
          return Promise.resolve(userId === TEST_USER_1.id ? [TEST_ENTITY_1] : [])
        })

        // User 1 should see their entities
        const request1 = createMockRequest(
          'GET',
          'http://localhost:3000/api/memory/entities',
          createAuthHeaders(TEST_USER_1.api_key)
        )
        const response1 = await entitiesGET(request1)
        const data1 = await parseJsonResponse(response1)

        expect(response1.status).toBe(200)
        expect(data1.data.data).toHaveLength(1)

        // User 2 should not see user 1's entities
        mockDb.getUserByApiKeyHash.mockResolvedValue(TEST_USER_2)
        const request2 = createMockRequest(
          'GET',
          'http://localhost:3000/api/memory/entities',
          createAuthHeaders(TEST_USER_2.api_key)
        )
        const response2 = await entitiesGET(request2)
        const data2 = await parseJsonResponse(response2)

        expect(response2.status).toBe(200)
        expect(data2.data.data).toHaveLength(0)
      })
    })

    describe('POST /api/memory/entities', () => {
      it('should create entity with valid data', async () => {
        const newEntity = { ...TEST_ENTITY_1, id: 'new-entity-id' }
        mockDb.createEntity.mockResolvedValue(newEntity)

        const createData: CreateEntityRequest = {
          entity_type: 'person',
          name: 'John Doe',
          description: 'A test person',
          metadata: { role: 'developer' }
        }

        const request = createMockRequest(
          'POST',
          'http://localhost:3000/api/memory/entities',
          createAuthHeaders(TEST_USER_1.api_key),
          createData
        )
        const response = await entitiesPOST(request)
        const data = await parseJsonResponse(response)

        expect(response.status).toBe(201)
        expect(data.success).toBe(true)
        expect(data.data.id).toBe('new-entity-id')
        expect(data.data.name).toBe('John Doe')
        expect(mockDb.createEntity).toHaveBeenCalledWith(
          expect.objectContaining({
            user_id: TEST_USER_1.id,
            entity_type: 'person',
            name: 'John Doe'
          })
        )
      })

      it('should validate required fields', async () => {
        const invalidData = { name: 'John Doe' } // missing entity_type

        const request = createMockRequest(
          'POST',
          'http://localhost:3000/api/memory/entities',
          createAuthHeaders(TEST_USER_1.api_key),
          invalidData
        )
        const response = await entitiesPOST(request)
        const data = await parseJsonResponse(response)

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toContain('entity_type')
      })

      it('should handle database errors', async () => {
        mockDb.createEntity.mockRejectedValue(new Error('Database error'))

        const createData: CreateEntityRequest = {
          entity_type: 'person',
          name: 'John Doe'
        }

        const request = createMockRequest(
          'POST',
          'http://localhost:3000/api/memory/entities',
          createAuthHeaders(TEST_USER_1.api_key),
          createData
        )
        const response = await entitiesPOST(request)
        const data = await parseJsonResponse(response)

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
      })
    })

    describe('GET /api/memory/entities/[id]', () => {
      it('should return entity by ID for owner', async () => {
        mockDb.getEntityById.mockResolvedValue(TEST_ENTITY_1)

        const request = createMockRequest(
          'GET',
          'http://localhost:3000/api/memory/entities/entity-1',
          createAuthHeaders(TEST_USER_1.api_key)
        )
        const response = await entityGET(request, { params: { id: 'entity-1' } })
        const data = await parseJsonResponse(response)

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.id).toBe('entity-1')
      })

      it('should return 404 for non-existent entity', async () => {
        mockDb.getEntityById.mockResolvedValue(null)

        const request = createMockRequest(
          'GET',
          'http://localhost:3000/api/memory/entities/non-existent',
          createAuthHeaders(TEST_USER_1.api_key)
        )
        const response = await entityGET(request, { params: { id: 'non-existent' } })
        const data = await parseJsonResponse(response)

        expect(response.status).toBe(404)
        expect(data.success).toBe(false)
        expect(data.error).toContain('Entity not found')
      })

      it('should enforce owner-only access', async () => {
        const otherUserEntity = { ...TEST_ENTITY_1, user_id: 'other-user' }
        mockDb.getEntityById.mockResolvedValue(otherUserEntity)

        const request = createMockRequest(
          'GET',
          'http://localhost:3000/api/memory/entities/entity-1',
          createAuthHeaders(TEST_USER_1.api_key)
        )
        const response = await entityGET(request, { params: { id: 'entity-1' } })
        const data = await parseJsonResponse(response)

        expect(response.status).toBe(404)
        expect(data.success).toBe(false)
        expect(data.error).toContain('Entity not found')
      })
    })

    describe('PUT /api/memory/entities/[id]', () => {
      it('should update entity with valid data', async () => {
        mockDb.getEntityById.mockResolvedValue(TEST_ENTITY_1)
        const updatedEntity = { ...TEST_ENTITY_1, name: 'Updated Name' }
        mockDb.updateEntity.mockResolvedValue(updatedEntity)

        const updateData: UpdateEntityRequest = {
          name: 'Updated Name',
          description: 'Updated description'
        }

        const request = createMockRequest(
          'PUT',
          'http://localhost:3000/api/memory/entities/entity-1',
          createAuthHeaders(TEST_USER_1.api_key),
          updateData
        )
        const response = await entityPUT(request, { params: { id: 'entity-1' } })
        const data = await parseJsonResponse(response)

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.name).toBe('Updated Name')
      })

      it('should return 404 for non-existent entity', async () => {
        mockDb.getEntityById.mockResolvedValue(null)

        const updateData: UpdateEntityRequest = { name: 'Updated Name' }

        const request = createMockRequest(
          'PUT',
          'http://localhost:3000/api/memory/entities/non-existent',
          createAuthHeaders(TEST_USER_1.api_key),
          updateData
        )
        const response = await entityPUT(request, { params: { id: 'non-existent' } })
        const data = await parseJsonResponse(response)

        expect(response.status).toBe(404)
        expect(data.success).toBe(false)
      })
    })

    describe('DELETE /api/memory/entities/[id]', () => {
      it('should delete entity by ID', async () => {
        mockDb.getEntityById.mockResolvedValue(TEST_ENTITY_1)
        mockDb.deleteEntity.mockResolvedValue(true)

        const request = createMockRequest(
          'DELETE',
          'http://localhost:3000/api/memory/entities/entity-1',
          createAuthHeaders(TEST_USER_1.api_key)
        )
        const response = await entityDELETE(request, { params: { id: 'entity-1' } })
        const data = await parseJsonResponse(response)

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.message).toContain('deleted successfully')
      })

      it('should return 404 for non-existent entity', async () => {
        mockDb.getEntityById.mockResolvedValue(null)

        const request = createMockRequest(
          'DELETE',
          'http://localhost:3000/api/memory/entities/non-existent',
          createAuthHeaders(TEST_USER_1.api_key)
        )
        const response = await entityDELETE(request, { params: { id: 'non-existent' } })
        const data = await parseJsonResponse(response)

        expect(response.status).toBe(404)
        expect(data.success).toBe(false)
      })
    })
  })

  describe('Memory Endpoints', () => {
    beforeEach(() => {
      mockDb.getUserByApiKeyHash.mockResolvedValue(TEST_USER_1)
      mockDb.getEntityById.mockResolvedValue(TEST_ENTITY_1)
    })

    describe('GET /api/memory/memories', () => {
      it('should return user memories with pagination', async () => {
        const memories = [TEST_MEMORY_1]
        mockDb.getMemoriesByUserId.mockResolvedValue(memories)

        const request = createMockRequest(
          'GET',
          'http://localhost:3000/api/memory/memories',
          createAuthHeaders(TEST_USER_1.api_key)
        )
        const response = await memoriesGET(request)
        const data = await parseJsonResponse(response)

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.data).toHaveLength(1)
        expect(data.data.data[0].id).toBe(TEST_MEMORY_1.id)
      })

      it('should filter memories by entity_id', async () => {
        const filteredMemories = [TEST_MEMORY_1]
        mockDb.getMemoriesByUserId.mockResolvedValue(filteredMemories)

        const request = createMockRequest(
          'GET',
          'http://localhost:3000/api/memory/memories?entity_id=entity-1',
          createAuthHeaders(TEST_USER_1.api_key)
        )
        const response = await memoriesGET(request)
        const data = await parseJsonResponse(response)

        expect(response.status).toBe(200)
        expect(data.data.data).toHaveLength(1)
        expect(mockDb.getMemoriesByUserId).toHaveBeenCalledWith(
          TEST_USER_1.id,
          expect.objectContaining({ entity_id: 'entity-1' })
        )
      })
    })

    describe('POST /api/memory/memories', () => {
      it('should create memory with valid data', async () => {
        const newMemory = { ...TEST_MEMORY_1, id: 'new-memory-id' }
        mockDb.createMemory.mockResolvedValue(newMemory)

        const createData: CreateMemoryRequest = {
          entity_id: 'entity-1',
          memory_type: 'personal',
          title: 'Meeting notes',
          content: 'Important discussion',
          importance: 8
        }

        const request = createMockRequest(
          'POST',
          'http://localhost:3000/api/memory/memories',
          createAuthHeaders(TEST_USER_1.api_key),
          createData
        )
        const response = await memoriesPOST(request)
        const data = await parseJsonResponse(response)

        expect(response.status).toBe(201)
        expect(data.success).toBe(true)
        expect(data.data.id).toBe('new-memory-id')
      })

      it('should validate entity exists and belongs to user', async () => {
        mockDb.getEntityById.mockResolvedValue(null)

        const createData: CreateMemoryRequest = {
          entity_id: 'non-existent',
          memory_type: 'personal',
          title: 'Test',
          content: 'Test content'
        }

        const request = createMockRequest(
          'POST',
          'http://localhost:3000/api/memory/memories',
          createAuthHeaders(TEST_USER_1.api_key),
          createData
        )
        const response = await memoriesPOST(request)
        const data = await parseJsonResponse(response)

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toContain('Entity not found')
      })

      it('should reject memories for entities not owned by user', async () => {
        const otherUserEntity = { ...TEST_ENTITY_1, user_id: 'other-user' }
        mockDb.getEntityById.mockResolvedValue(otherUserEntity)

        const createData: CreateMemoryRequest = {
          entity_id: 'entity-1',
          memory_type: 'personal',
          title: 'Test',
          content: 'Test content'
        }

        const request = createMockRequest(
          'POST',
          'http://localhost:3000/api/memory/memories',
          createAuthHeaders(TEST_USER_1.api_key),
          createData
        )
        const response = await memoriesPOST(request)
        const data = await parseJsonResponse(response)

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toContain('Entity not found')
      })
    })

    describe('GET /api/memory/memories/[id]', () => {
      it('should return memory by ID for owner', async () => {
        mockDb.getMemoryById.mockResolvedValue(TEST_MEMORY_1)

        const request = createMockRequest(
          'GET',
          'http://localhost:3000/api/memory/memories/memory-1',
          createAuthHeaders(TEST_USER_1.api_key)
        )
        const response = await memoryGET(request, { params: { id: 'memory-1' } })
        const data = await parseJsonResponse(response)

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.id).toBe('memory-1')
      })

      it('should enforce owner-only access', async () => {
        const otherUserMemory = { ...TEST_MEMORY_1, user_id: 'other-user' }
        mockDb.getMemoryById.mockResolvedValue(otherUserMemory)

        const request = createMockRequest(
          'GET',
          'http://localhost:3000/api/memory/memories/memory-1',
          createAuthHeaders(TEST_USER_1.api_key)
        )
        const response = await memoryGET(request, { params: { id: 'memory-1' } })
        const data = await parseJsonResponse(response)

        expect(response.status).toBe(404)
        expect(data.success).toBe(false)
      })
    })

    describe('PUT /api/memory/memories/[id]', () => {
      it('should update memory with valid data', async () => {
        mockDb.getMemoryById.mockResolvedValue(TEST_MEMORY_1)
        const updatedMemory = { ...TEST_MEMORY_1, title: 'Updated Title' }
        mockDb.updateMemory.mockResolvedValue(updatedMemory)

        const updateData: UpdateMemoryRequest = {
          title: 'Updated Title',
          importance: 9
        }

        const request = createMockRequest(
          'PUT',
          'http://localhost:3000/api/memory/memories/memory-1',
          createAuthHeaders(TEST_USER_1.api_key),
          updateData
        )
        const response = await memoryPUT(request, { params: { id: 'memory-1' } })
        const data = await parseJsonResponse(response)

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.title).toBe('Updated Title')
      })
    })

    describe('DELETE /api/memory/memories/[id]', () => {
      it('should delete memory by ID', async () => {
        mockDb.getMemoryById.mockResolvedValue(TEST_MEMORY_1)
        mockDb.deleteMemory.mockResolvedValue(true)

        const request = createMockRequest(
          'DELETE',
          'http://localhost:3000/api/memory/memories/memory-1',
          createAuthHeaders(TEST_USER_1.api_key)
        )
        const response = await memoryDELETE(request, { params: { id: 'memory-1' } })
        const data = await parseJsonResponse(response)

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })
    })
  })

  describe('Search Endpoint', () => {
    beforeEach(() => {
      mockDb.getUserByApiKeyHash.mockResolvedValue(TEST_USER_1)
    })

    describe('POST /api/memory/search', () => {
      it('should search memories with query', async () => {
        const searchResults = [TEST_MEMORY_1]
        mockDb.searchMemories.mockResolvedValue(searchResults)

        const searchData: SearchMemoriesRequest = {
          query: 'meeting notes',
          limit: 10
        }

        const request = createMockRequest(
          'POST',
          'http://localhost:3000/api/memory/search',
          createAuthHeaders(TEST_USER_1.api_key),
          searchData
        )
        const response = await searchPOST(request)
        const data = await parseJsonResponse(response)

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data).toHaveLength(1)
        expect(mockDb.searchMemories).toHaveBeenCalledWith(
          TEST_USER_1.id,
          'meeting notes',
          expect.objectContaining({ limit: 10 })
        )
      })

      it('should validate required query field', async () => {
        const searchData = { limit: 10 } // missing query

        const request = createMockRequest(
          'POST',
          'http://localhost:3000/api/memory/search',
          createAuthHeaders(TEST_USER_1.api_key),
          searchData
        )
        const response = await searchPOST(request)
        const data = await parseJsonResponse(response)

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toContain('query')
      })

      it('should respect entity_id filter', async () => {
        const searchResults = [TEST_MEMORY_1]
        mockDb.searchMemories.mockResolvedValue(searchResults)

        const searchData: SearchMemoriesRequest = {
          query: 'meeting',
          entity_id: 'entity-1',
          limit: 5
        }

        const request = createMockRequest(
          'POST',
          'http://localhost:3000/api/memory/search',
          createAuthHeaders(TEST_USER_1.api_key),
          searchData
        )
        const response = await searchPOST(request)
        const data = await parseJsonResponse(response)

        expect(response.status).toBe(200)
        expect(mockDb.searchMemories).toHaveBeenCalledWith(
          TEST_USER_1.id,
          'meeting',
          expect.objectContaining({
            entity_id: 'entity-1',
            limit: 5
          })
        )
      })
    })
  })

  describe('Test Endpoint', () => {
    beforeEach(() => {
      mockDb.getUserByApiKeyHash.mockResolvedValue(TEST_USER_1)
    })

    describe('GET /api/memory/test', () => {
      it('should return test information', async () => {
        const request = createMockRequest(
          'GET',
          'http://localhost:3000/api/memory/test',
          createAuthHeaders(TEST_USER_1.api_key)
        )
        const response = await testGET(request)
        const data = await parseJsonResponse(response)

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.message).toContain('Memory API test endpoint')
        expect(data.data.user).toMatchObject({
          id: TEST_USER_1.id,
          email: TEST_USER_1.email
        })
      })
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      mockDb.getUserByApiKeyHash.mockResolvedValue(TEST_USER_1)
    })

    it('should handle invalid JSON in request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/memory/entities', {
        method: 'POST',
        headers: new Headers(createAuthHeaders(TEST_USER_1.api_key)),
        body: 'invalid json'
      })

      const response = await entitiesPOST(request)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid')
    })

    it('should handle database connection failures gracefully', async () => {
      mockDb.testConnection.mockRejectedValue(new Error('Connection lost'))

      const request = createMockRequest('GET', 'http://localhost:3000/api/memory/health')
      const response = await healthGET(request)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(503)
      expect(data.success).toBe(false)
    })

    it('should handle unexpected database errors', async () => {
      mockDb.getEntitiesByUserId.mockRejectedValue(new Error('Unexpected database error'))

      const request = createMockRequest(
        'GET',
        'http://localhost:3000/api/memory/entities',
        createAuthHeaders(TEST_USER_1.api_key)
      )
      const response = await entitiesGET(request)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })
  })

  describe('Rate Limiting', () => {
    // Note: This would require actual rate limiting implementation
    // For now, we'll test that the endpoints handle high volumes gracefully

    it('should handle concurrent requests', async () => {
      mockDb.getUserByApiKeyHash.mockResolvedValue(TEST_USER_1)
      mockDb.getEntitiesByUserId.mockResolvedValue([])

      const requests = Array.from({ length: 10 }, () =>
        entitiesGET(createMockRequest(
          'GET',
          'http://localhost:3000/api/memory/entities',
          createAuthHeaders(TEST_USER_1.api_key)
        ))
      )

      const responses = await Promise.all(requests)

      responses.forEach(response => {
        expect(response.status).toBe(200)
      })
    })
  })

  describe('Performance Tests', () => {
    beforeEach(() => {
      mockDb.getUserByApiKeyHash.mockResolvedValue(TEST_USER_1)
    })

    it('should handle large entity lists efficiently', async () => {
      const largeEntityList = Array.from({ length: 1000 }, (_, i) => ({
        ...TEST_ENTITY_1,
        id: `entity-${i}`,
        name: `Entity ${i}`
      }))

      mockDb.getEntitiesByUserId.mockResolvedValue(largeEntityList.slice(0, 50)) // pagination

      const startTime = Date.now()

      const request = createMockRequest(
        'GET',
        'http://localhost:3000/api/memory/entities?limit=50',
        createAuthHeaders(TEST_USER_1.api_key)
      )
      const response = await entitiesGET(request)

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(response.status).toBe(200)
      expect(duration).toBeLessThan(1000) // Should complete within 1 second
    })

    it('should handle large search queries efficiently', async () => {
      const searchResults = Array.from({ length: 100 }, (_, i) => ({
        ...TEST_MEMORY_1,
        id: `memory-${i}`,
        title: `Memory ${i}`
      }))

      mockDb.searchMemories.mockResolvedValue(searchResults)

      const startTime = Date.now()

      const searchData: SearchMemoriesRequest = {
        query: 'test search with many results',
        limit: 100
      }

      const request = createMockRequest(
        'POST',
        'http://localhost:3000/api/memory/search',
        createAuthHeaders(TEST_USER_1.api_key),
        searchData
      )
      const response = await searchPOST(request)

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(response.status).toBe(200)
      expect(duration).toBeLessThan(2000) // Should complete within 2 seconds
    })
  })
})