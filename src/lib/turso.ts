import { createClient } from '@libsql/client'
import { createHash } from 'crypto'

// Database configuration
const dbConfig = {
  url: process.env.TURSO_DATABASE_URL || 'libsql://ai-memory-bobmatnyc.aws-us-east-1.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NTY1NTk2MzcsImlkIjoiYmUyMTI0NTktYThiMC00NTNiLWI2ZTgtMTU1ZDFmNjZiNzU0IiwicmlkIjoiZjBiOWEyM2YtNTE5ZC00NzZlLTg4ZWUtNzFmZTFkNjI3Y2VlIn0.DkRcXMV06bVVKlOyuWqEfQTHFff3QBiVxT27iKNlzllxIz5bVJBjs_HhtGYLctIQFzBA2s1n7CttyJlqh1lSDw'
}

// Create the database client
export const tursoClient = createClient(dbConfig)

// Database utility functions
export class TursoDatabase {
  private client = tursoClient

  /**
   * Execute a SQL query with parameters
   */
  async execute(sql: string, params?: any[]) {
    try {
      const result = await this.client.execute({
        sql,
        args: params || []
      })
      return result
    } catch (error) {
      console.error('Database query error:', error)
      throw new Error(`Database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Execute multiple SQL statements in a transaction
   */
  async batch(statements: Array<{ sql: string; args?: any[] }>) {
    try {
      const result = await this.client.batch(statements)
      return result
    } catch (error) {
      console.error('Database batch error:', error)
      throw new Error(`Database batch failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.execute('SELECT 1 as test')
      return true
    } catch (error) {
      console.error('Database connection test failed:', error)
      return false
    }
  }

  /**
   * Get user by API key hash
   */
  async getUserByApiKeyHash(apiKeyHash: string) {
    const result = await this.execute(
      'SELECT id, email, name, is_active FROM users WHERE api_key_hash = ? AND is_active = 1',
      [apiKeyHash]
    )
    return result.rows[0] || null
  }

  /**
   * Get user by email address
   */
  async getUserByEmail(email: string) {
    const result = await this.execute(
      'SELECT id, email, name, is_active, api_key_hash FROM users WHERE email = ?',
      [email]
    )
    return result.rows[0] || null
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string) {
    const result = await this.execute(
      'SELECT id, email, name, is_active, api_key_hash FROM users WHERE id = ?',
      [userId]
    )
    return result.rows[0] || null
  }

  /**
   * Create or get user by email
   * For development mode, creates user with default API key if doesn't exist
   */
  async createOrGetUserByEmail(email: string, name?: string) {
    // First check if user exists
    let user = await this.getUserByEmail(email)

    if (!user) {
      // Create new user with a default API key for development
      const userId = crypto.randomUUID()
      const defaultApiKey = `dev-key-${userId}`
      const apiKeyHash = createHash('sha256').update(defaultApiKey).digest('hex')
      const now = new Date().toISOString()

      await this.execute(
        `INSERT INTO users (id, email, name, api_key_hash, is_active, created_at)
         VALUES (?, ?, ?, ?, 1, ?)`,
        [userId, email, name || email.split('@')[0], apiKeyHash, now]
      )

      user = await this.getUserById(userId)

      // In development mode, log the API key for convenience
      if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
        console.log(`Created user ${email} with API key: ${defaultApiKey}`)
      }
    }

    return user
  }

  /**
   * Ensure default user exists for development
   */
  async ensureDefaultUser() {
    const defaultEmail = 'bob@matsuoka.com'
    const user = await this.createOrGetUserByEmail(defaultEmail, 'Bob Matsuoka')

    if (user && (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV)) {
      console.log(`Default user ${defaultEmail} is ready`)
    }

    return user
  }

  /**
   * Get entities for a user
   */
  async getEntitiesByUserId(userId: string, limit = 50, offset = 0) {
    const result = await this.execute(
      `SELECT id, entity_type, name, description, metadata, created_at, updated_at
       FROM entities
       WHERE user_id = ?
       ORDER BY updated_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit.toString(), offset.toString()]
    )
    return result.rows
  }

  /**
   * Get entity by ID for a specific user
   */
  async getEntityById(entityId: string, userId: string) {
    const result = await this.execute(
      `SELECT id, entity_type, name, description, metadata, created_at, updated_at
       FROM entities
       WHERE id = ? AND user_id = ?`,
      [entityId, userId]
    )
    return result.rows[0] || null
  }

  /**
   * Create a new entity
   */
  async createEntity(userId: string, entityType: string, name: string, description?: string, metadata?: any) {
    const entityId = crypto.randomUUID()
    const now = new Date().toISOString()

    await this.execute(
      `INSERT INTO entities (id, user_id, entity_type, name, description, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [entityId, userId, entityType, name, description || null, JSON.stringify(metadata || {}), now, now]
    )

    return this.getEntityById(entityId, userId)
  }

  /**
   * Update an entity
   */
  async updateEntity(entityId: string, userId: string, updates: Partial<{
    name: string
    description: string
    metadata: any
  }>) {
    const setParts: string[] = []
    const params: any[] = []

    if (updates.name !== undefined) {
      setParts.push('name = ?')
      params.push(updates.name)
    }

    if (updates.description !== undefined) {
      setParts.push('description = ?')
      params.push(updates.description)
    }

    if (updates.metadata !== undefined) {
      setParts.push('metadata = ?')
      params.push(JSON.stringify(updates.metadata))
    }

    if (setParts.length === 0) {
      throw new Error('No updates provided')
    }

    setParts.push('updated_at = ?')
    params.push(new Date().toISOString())

    params.push(entityId, userId)

    await this.execute(
      `UPDATE entities SET ${setParts.join(', ')} WHERE id = ? AND user_id = ?`,
      params
    )

    return this.getEntityById(entityId, userId)
  }

  /**
   * Delete an entity
   */
  async deleteEntity(entityId: string, userId: string) {
    const result = await this.execute(
      'DELETE FROM entities WHERE id = ? AND user_id = ?',
      [entityId, userId]
    )
    return result.rowsAffected > 0
  }

  /**
   * Get memories for a user
   */
  async getMemoriesByUserId(userId: string, entityId?: string, limit = 50, offset = 0) {
    let sql = `SELECT id, entity_id, memory_type, title, content, metadata, importance, created_at, updated_at
               FROM memories
               WHERE user_id = ?`
    const params = [userId]

    if (entityId) {
      sql += ' AND entity_id = ?'
      params.push(entityId)
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    params.push(limit.toString(), offset.toString())

    const result = await this.execute(sql, params)
    return result.rows
  }

  /**
   * Get memory by ID for a specific user
   */
  async getMemoryById(memoryId: string, userId: string) {
    const result = await this.execute(
      `SELECT id, entity_id, memory_type, title, content, metadata, importance, created_at, updated_at
       FROM memories
       WHERE id = ? AND user_id = ?`,
      [memoryId, userId]
    )
    return result.rows[0] || null
  }

  /**
   * Create a new memory
   */
  async createMemory(
    userId: string,
    entityId: string,
    memoryType: string,
    title: string,
    content: string,
    metadata?: any,
    importance = 1
  ) {
    const memoryId = crypto.randomUUID()
    const now = new Date().toISOString()

    // Verify entity belongs to user
    const entity = await this.getEntityById(entityId, userId)
    if (!entity) {
      throw new Error('Entity not found or access denied')
    }

    await this.execute(
      `INSERT INTO memories (id, user_id, entity_id, memory_type, title, content, metadata, importance, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [memoryId, userId, entityId, memoryType, title, content, JSON.stringify(metadata || {}), importance.toString(), now, now]
    )

    return this.getMemoryById(memoryId, userId)
  }

  /**
   * Update a memory
   */
  async updateMemory(memoryId: string, userId: string, updates: Partial<{
    title: string
    content: string
    metadata: any
    importance: number
  }>) {
    const setParts: string[] = []
    const params: any[] = []

    if (updates.title !== undefined) {
      setParts.push('title = ?')
      params.push(updates.title)
    }

    if (updates.content !== undefined) {
      setParts.push('content = ?')
      params.push(updates.content)
    }

    if (updates.metadata !== undefined) {
      setParts.push('metadata = ?')
      params.push(JSON.stringify(updates.metadata))
    }

    if (updates.importance !== undefined) {
      setParts.push('importance = ?')
      params.push(updates.importance.toString())
    }

    if (setParts.length === 0) {
      throw new Error('No updates provided')
    }

    setParts.push('updated_at = ?')
    params.push(new Date().toISOString())

    params.push(memoryId, userId)

    await this.execute(
      `UPDATE memories SET ${setParts.join(', ')} WHERE id = ? AND user_id = ?`,
      params
    )

    return this.getMemoryById(memoryId, userId)
  }

  /**
   * Delete a memory
   */
  async deleteMemory(memoryId: string, userId: string) {
    const result = await this.execute(
      'DELETE FROM memories WHERE id = ? AND user_id = ?',
      [memoryId, userId]
    )
    return result.rowsAffected > 0
  }

  /**
   * Search memories by content
   */
  async searchMemories(userId: string, query: string, entityId?: string, limit = 50) {
    let sql = `SELECT id, entity_id, memory_type, title, content, metadata, importance, created_at, updated_at
               FROM memories
               WHERE user_id = ? AND (title LIKE ? OR content LIKE ?)`
    const params = [userId, `%${query}%`, `%${query}%`]

    if (entityId) {
      sql += ' AND entity_id = ?'
      params.push(entityId)
    }

    sql += ' ORDER BY importance DESC, created_at DESC LIMIT ?'
    params.push(limit.toString())

    const result = await this.execute(sql, params)
    return result.rows
  }
}

// Export a singleton instance
export const db = new TursoDatabase()

// Export types for better TypeScript support
export type DatabaseResult = Awaited<ReturnType<TursoDatabase['execute']>>
export type DatabaseRow = Record<string, any>