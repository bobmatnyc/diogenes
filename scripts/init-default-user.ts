#!/usr/bin/env tsx

/**
 * Initialize Default User Script
 *
 * This script ensures that the default bob@matsuoka.com user exists in the database
 * and creates a default entity for testing purposes.
 *
 * Usage:
 *   pnpm tsx scripts/init-default-user.ts
 *   tsx scripts/init-default-user.ts
 *   npx tsx scripts/init-default-user.ts
 */

import { db } from '../src/lib/turso'
import { createHash } from 'crypto'

const DEFAULT_EMAIL = 'bob@matsuoka.com'
const DEFAULT_NAME = 'Bob Matsuoka'

async function initializeDefaultUser() {
  console.log('🚀 Initializing default user...')

  try {
    // Test database connection
    const isConnected = await db.testConnection()
    if (!isConnected) {
      console.error('❌ Failed to connect to database')
      process.exit(1)
    }
    console.log('✅ Database connection successful')

    // Check if user already exists
    let user = await db.getUserByEmail(DEFAULT_EMAIL)

    if (user) {
      console.log(`✅ User ${DEFAULT_EMAIL} already exists`)
      console.log(`   ID: ${user.id}`)
      console.log(`   Name: ${user.name}`)
    } else {
      // Create new user
      const userId = crypto.randomUUID()
      const defaultApiKey = `dev-key-${userId}`
      const apiKeyHash = createHash('sha256').update(defaultApiKey).digest('hex')
      const now = new Date().toISOString()

      await db.execute(
        `INSERT INTO users (id, email, name, api_key_hash, is_active, created_at)
         VALUES (?, ?, ?, ?, 1, ?)`,
        [userId, DEFAULT_EMAIL, DEFAULT_NAME, apiKeyHash, now]
      )

      user = await db.getUserById(userId)

      console.log(`✅ Created user ${DEFAULT_EMAIL}`)
      console.log(`   ID: ${userId}`)
      console.log(`   Name: ${DEFAULT_NAME}`)
      console.log(`   API Key: ${defaultApiKey}`)
      console.log('')
      console.log('   Save this API key for development use!')
    }

    // Check if user has any entities
    const entities = await db.getEntitiesByUserId(user.id as string, 10, 0)

    if (entities.length === 0) {
      // Create a default entity for testing
      console.log('')
      console.log('📝 Creating default entity for testing...')

      const entity = await db.createEntity(
        user.id as string,
        'person',
        'Test User',
        'A test entity for development purposes',
        { role: 'developer', environment: 'local' }
      )

      if (entity) {
        console.log(`✅ Created default entity: ${entity.name} (ID: ${entity.id})`)
      }
    } else {
      console.log(`✅ User has ${entities.length} existing entities`)
    }

    // Create a sample memory if no memories exist
    if (entities.length > 0) {
      const entityId = entities[0].id as string
      const memories = await db.getMemoriesByUserId(user.id as string, entityId, 1, 0)

      if (memories.length === 0) {
        console.log('')
        console.log('💭 Creating sample memory...')

        const memory = await db.createMemory(
          user.id as string,
          entityId,
          'fact',
          'Welcome to Diogenes Memory System',
          'This is a sample memory created during initialization. The Diogenes memory system allows you to store and retrieve contextual information about entities, maintaining long-term knowledge across conversations.',
          { initialized: true, created_by: 'init-script' },
          5
        )

        if (memory) {
          console.log(`✅ Created sample memory: ${memory.title}`)
        }
      } else {
        console.log(`✅ Entity has ${memories.length} existing memories`)
      }
    }

    console.log('')
    console.log('🎉 Initialization complete!')
    console.log('')
    console.log('📚 Quick Start Guide:')
    console.log('   1. Start the development server: pnpm dev')
    console.log('   2. The memory API will use bob@matsuoka.com by default in development mode')
    console.log('   3. You can specify a different email with the user_email parameter')
    console.log('   4. API endpoints:')
    console.log('      - GET  /api/memory/entities')
    console.log('      - POST /api/memory/entities')
    console.log('      - GET  /api/memory/memories')
    console.log('      - POST /api/memory/memories')
    console.log('      - POST /api/memory/search')
    console.log('')
    console.log('📧 Email-based authentication examples:')
    console.log('   - Default (bob@matsuoka.com): No parameters needed in dev mode')
    console.log('   - Custom email via header: X-User-Email: alice@example.com')
    console.log('   - Custom email via query: ?user_email=alice@example.com')
    console.log('   - Custom email in body: { "user_email": "alice@example.com", ... }')

  } catch (error) {
    console.error('❌ Initialization failed:', error)
    process.exit(1)
  }
}

// Run the initialization
initializeDefaultUser()