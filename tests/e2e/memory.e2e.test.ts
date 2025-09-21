/**
 * E2E tests for Memory System API
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import {
  ensureTestServer,
  fetchWithAuth,
  getTestBearerToken,
  cleanupTestData,
  generateTestId
} from './setup/test-server';

describe('Memory System E2E Tests', () => {
  let baseUrl: string;
  let testToken: string;
  let testEntityId: string;

  beforeAll(async () => {
    baseUrl = await ensureTestServer();
    testToken = getTestBearerToken();
  });

  beforeEach(() => {
    // Generate unique IDs for each test to avoid conflicts
    testEntityId = generateTestId('entity');
  });

  afterEach(async () => {
    // Clean up test data after each test
    if (testEntityId) {
      await cleanupTestData(testEntityId);
    }
  });

  describe('Entity CRUD Operations', () => {
    it('should create a new entity', async () => {
      const response = await fetchWithAuth(
        '/api/memory/entities',
        {
          method: 'POST',
          body: JSON.stringify({
            id: testEntityId,
            name: 'Test User',
            type: 'user',
            metadata: { role: 'tester' }
          })
        },
        testToken
      );

      expect(response.status).toBe(201);
      const entity = await response.json();
      expect(entity.id).toBe(testEntityId);
      expect(entity.name).toBe('Test User');
      expect(entity.type).toBe('user');
    });

    it('should retrieve an entity by ID', async () => {
      // First create an entity
      await fetchWithAuth(
        '/api/memory/entities',
        {
          method: 'POST',
          body: JSON.stringify({
            id: testEntityId,
            name: 'Test User',
            type: 'user'
          })
        },
        testToken
      );

      // Then retrieve it
      const response = await fetchWithAuth(
        `/api/memory/entities/${testEntityId}`,
        { method: 'GET' },
        testToken
      );

      expect(response.status).toBe(200);
      const entity = await response.json();
      expect(entity.id).toBe(testEntityId);
      expect(entity.name).toBe('Test User');
    });

    it('should update an entity', async () => {
      // Create an entity
      await fetchWithAuth(
        '/api/memory/entities',
        {
          method: 'POST',
          body: JSON.stringify({
            id: testEntityId,
            name: 'Original Name',
            type: 'user'
          })
        },
        testToken
      );

      // Update it
      const response = await fetchWithAuth(
        `/api/memory/entities/${testEntityId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            name: 'Updated Name',
            metadata: { updated: true }
          })
        },
        testToken
      );

      expect(response.status).toBe(200);
      const entity = await response.json();
      expect(entity.name).toBe('Updated Name');
      expect(entity.metadata?.updated).toBe(true);
    });

    it('should delete an entity', async () => {
      // Create an entity
      await fetchWithAuth(
        '/api/memory/entities',
        {
          method: 'POST',
          body: JSON.stringify({
            id: testEntityId,
            name: 'To Be Deleted',
            type: 'user'
          })
        },
        testToken
      );

      // Delete it
      const deleteResponse = await fetchWithAuth(
        `/api/memory/entities/${testEntityId}`,
        { method: 'DELETE' },
        testToken
      );

      expect(deleteResponse.status).toBe(204);

      // Verify it's gone
      const getResponse = await fetchWithAuth(
        `/api/memory/entities/${testEntityId}`,
        { method: 'GET' },
        testToken
      );

      expect(getResponse.status).toBe(404);
    });
  });

  describe('Memory CRUD Operations', () => {
    let memoryId: string;

    beforeEach(async () => {
      // Create a test entity for memories
      await fetchWithAuth(
        '/api/memory/entities',
        {
          method: 'POST',
          body: JSON.stringify({
            id: testEntityId,
            name: 'Memory Test User',
            type: 'user'
          })
        },
        testToken
      );
    });

    it('should create a new memory', async () => {
      const response = await fetchWithAuth(
        '/api/memory/memories',
        {
          method: 'POST',
          body: JSON.stringify({
            entityId: testEntityId,
            content: 'This is a test memory',
            type: 'fact',
            tags: ['test', 'e2e']
          })
        },
        testToken
      );

      expect(response.status).toBe(201);
      const memory = await response.json();
      memoryId = memory.id;
      expect(memory.entityId).toBe(testEntityId);
      expect(memory.content).toBe('This is a test memory');
      expect(memory.type).toBe('fact');
      expect(memory.tags).toContain('test');
    });

    it('should retrieve memories for an entity', async () => {
      // Create multiple memories
      await fetchWithAuth(
        '/api/memory/memories',
        {
          method: 'POST',
          body: JSON.stringify({
            entityId: testEntityId,
            content: 'Memory 1',
            type: 'fact'
          })
        },
        testToken
      );

      await fetchWithAuth(
        '/api/memory/memories',
        {
          method: 'POST',
          body: JSON.stringify({
            entityId: testEntityId,
            content: 'Memory 2',
            type: 'preference'
          })
        },
        testToken
      );

      // Retrieve memories
      const response = await fetchWithAuth(
        `/api/memory/memories?entityId=${testEntityId}`,
        { method: 'GET' },
        testToken
      );

      expect(response.status).toBe(200);
      const memories = await response.json();
      expect(memories).toHaveLength(2);
      expect(memories[0].entityId).toBe(testEntityId);
      expect(memories[1].entityId).toBe(testEntityId);
    });

    it('should update a memory', async () => {
      // Create a memory
      const createResponse = await fetchWithAuth(
        '/api/memory/memories',
        {
          method: 'POST',
          body: JSON.stringify({
            entityId: testEntityId,
            content: 'Original content',
            type: 'fact'
          })
        },
        testToken
      );
      const memory = await createResponse.json();

      // Update it
      const updateResponse = await fetchWithAuth(
        `/api/memory/memories/${memory.id}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            content: 'Updated content',
            importance: 0.9
          })
        },
        testToken
      );

      expect(updateResponse.status).toBe(200);
      const updatedMemory = await updateResponse.json();
      expect(updatedMemory.content).toBe('Updated content');
      expect(updatedMemory.importance).toBe(0.9);
    });

    it('should delete a memory', async () => {
      // Create a memory
      const createResponse = await fetchWithAuth(
        '/api/memory/memories',
        {
          method: 'POST',
          body: JSON.stringify({
            entityId: testEntityId,
            content: 'To be deleted',
            type: 'fact'
          })
        },
        testToken
      );
      const memory = await createResponse.json();

      // Delete it
      const deleteResponse = await fetchWithAuth(
        `/api/memory/memories/${memory.id}`,
        { method: 'DELETE' },
        testToken
      );

      expect(deleteResponse.status).toBe(204);

      // Verify it's gone
      const getResponse = await fetchWithAuth(
        `/api/memory/memories?entityId=${testEntityId}`,
        { method: 'GET' },
        testToken
      );
      const memories = await getResponse.json();
      expect(memories).toHaveLength(0);
    });
  });

  describe('Memory Search Functionality', () => {
    beforeEach(async () => {
      // Create test entity and memories for search
      await fetchWithAuth(
        '/api/memory/entities',
        {
          method: 'POST',
          body: JSON.stringify({
            id: testEntityId,
            name: 'Search Test User',
            type: 'user'
          })
        },
        testToken
      );

      // Create memories with different content
      await fetchWithAuth(
        '/api/memory/memories',
        {
          method: 'POST',
          body: JSON.stringify({
            entityId: testEntityId,
            content: 'User likes TypeScript programming',
            type: 'preference',
            tags: ['programming', 'typescript']
          })
        },
        testToken
      );

      await fetchWithAuth(
        '/api/memory/memories',
        {
          method: 'POST',
          body: JSON.stringify({
            entityId: testEntityId,
            content: 'User prefers dark mode',
            type: 'preference',
            tags: ['ui', 'theme']
          })
        },
        testToken
      );

      await fetchWithAuth(
        '/api/memory/memories',
        {
          method: 'POST',
          body: JSON.stringify({
            entityId: testEntityId,
            content: 'User works on AI projects',
            type: 'fact',
            tags: ['work', 'ai']
          })
        },
        testToken
      );
    });

    it('should search memories by query', async () => {
      const response = await fetchWithAuth(
        `/api/memory/search?entityId=${testEntityId}&query=typescript`,
        { method: 'GET' },
        testToken
      );

      expect(response.status).toBe(200);
      const results = await response.json();
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].content).toContain('TypeScript');
    });

    it('should filter memories by type', async () => {
      const response = await fetchWithAuth(
        `/api/memory/memories?entityId=${testEntityId}&type=preference`,
        { method: 'GET' },
        testToken
      );

      expect(response.status).toBe(200);
      const memories = await response.json();
      expect(memories.length).toBe(2);
      memories.forEach((memory: any) => {
        expect(memory.type).toBe('preference');
      });
    });

    it('should filter memories by tags', async () => {
      const response = await fetchWithAuth(
        `/api/memory/memories?entityId=${testEntityId}&tags=programming`,
        { method: 'GET' },
        testToken
      );

      expect(response.status).toBe(200);
      const memories = await response.json();
      expect(memories.length).toBe(1);
      expect(memories[0].tags).toContain('programming');
    });
  });

  describe('Authentication and Error Handling', () => {
    it('should reject requests without authentication', async () => {
      const response = await fetchWithAuth(
        '/api/memory/entities',
        { method: 'GET' }
        // No token provided
      );

      expect(response.status).toBe(401);
      const error = await response.json();
      expect(error.error).toContain('Authorization');
    });

    it('should reject requests with invalid token', async () => {
      const response = await fetchWithAuth(
        '/api/memory/entities',
        { method: 'GET' },
        'invalid_token_123'
      );

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent entity', async () => {
      const response = await fetchWithAuth(
        '/api/memory/entities/non_existent_id',
        { method: 'GET' },
        testToken
      );

      expect(response.status).toBe(404);
    });

    it('should validate required fields when creating entity', async () => {
      const response = await fetchWithAuth(
        '/api/memory/entities',
        {
          method: 'POST',
          body: JSON.stringify({
            // Missing required 'id' field
            name: 'Test User',
            type: 'user'
          })
        },
        testToken
      );

      expect(response.status).toBe(400);
      const error = await response.json();
      expect(error.error).toBeDefined();
    });

    it('should validate required fields when creating memory', async () => {
      const response = await fetchWithAuth(
        '/api/memory/memories',
        {
          method: 'POST',
          body: JSON.stringify({
            // Missing required 'entityId' field
            content: 'Test memory',
            type: 'fact'
          })
        },
        testToken
      );

      expect(response.status).toBe(400);
    });

    it('should handle malformed JSON', async () => {
      const response = await fetch(`${baseUrl}/api/memory/entities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testToken}`
        },
        body: 'invalid json {]'
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Batch Operations', () => {
    it('should handle creating multiple memories efficiently', async () => {
      await fetchWithAuth(
        '/api/memory/entities',
        {
          method: 'POST',
          body: JSON.stringify({
            id: testEntityId,
            name: 'Batch Test User',
            type: 'user'
          })
        },
        testToken
      );

      const memoryPromises = [];
      for (let i = 0; i < 10; i++) {
        memoryPromises.push(
          fetchWithAuth(
            '/api/memory/memories',
            {
              method: 'POST',
              body: JSON.stringify({
                entityId: testEntityId,
                content: `Memory ${i}`,
                type: 'fact',
                importance: i / 10
              })
            },
            testToken
          )
        );
      }

      const responses = await Promise.all(memoryPromises);
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Verify all memories were created
      const getResponse = await fetchWithAuth(
        `/api/memory/memories?entityId=${testEntityId}`,
        { method: 'GET' },
        testToken
      );
      const memories = await getResponse.json();
      expect(memories).toHaveLength(10);
    });
  });
});