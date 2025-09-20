# Multi-Tenant Memory API Documentation

This document describes the multi-tenant memory API system implemented in the diogenes Next.js project.

## Overview

The Memory API provides a complete multi-tenant system for managing entities and memories with strict data isolation between users. All operations are authenticated via API keys and users can only access their own data.

## Database Connection

The API uses **Turso** (cloud SQLite) database with the following credentials:
- **URL**: `libsql://ai-memory-bobmatnyc.aws-us-east-1.turso.io`
- **Auth Token**: Configured in `.env.local`

## API Endpoints

### Base URL
All memory API endpoints are prefixed with `/api/memory/`

### Authentication
All endpoints (except health) require authentication via the `Authorization` header:

```bash
# Using Bearer token format
Authorization: Bearer your-api-key-here

# Using ApiKey format
Authorization: ApiKey your-api-key-here

# Or raw API key
Authorization: your-api-key-here
```

### Endpoints

#### Health Check
- **GET** `/api/memory/health` - Basic health check (no auth required)
- **POST** `/api/memory/health` - Extended health check with diagnostics

```bash
curl http://localhost:3004/api/memory/health
curl -X POST http://localhost:3004/api/memory/health -d '{"diagnostics": true}'
```

#### Entities Management
- **GET** `/api/memory/entities` - List user's entities
- **POST** `/api/memory/entities` - Create new entity
- **GET** `/api/memory/entities/[id]` - Get specific entity
- **PUT** `/api/memory/entities/[id]` - Update entity
- **DELETE** `/api/memory/entities/[id]` - Delete entity

#### Memories Management
- **GET** `/api/memory/memories` - List user's memories
- **POST** `/api/memory/memories` - Create new memory
- **GET** `/api/memory/memories/[id]` - Get specific memory
- **PUT** `/api/memory/memories/[id]` - Update memory
- **DELETE** `/api/memory/memories/[id]` - Delete memory

#### Search
- **POST** `/api/memory/search` - Search memories by content
- **GET** `/api/memory/search?q=query` - Alternative search via query params

#### Testing & Monitoring
- **GET** `/api/memory/test` - Multi-tenant isolation tests
- **POST** `/api/memory/test` - Advanced test scenarios

## Example Usage

### Create an Entity

```bash
curl -X POST http://localhost:3004/api/memory/entities \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "entity_type": "person",
    "name": "John Doe",
    "description": "Software engineer",
    "metadata": {"role": "developer", "team": "backend"}
  }'
```

### Create a Memory

```bash
curl -X POST http://localhost:3004/api/memory/memories \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "entity_id": "entity-uuid-here",
    "memory_type": "preference",
    "title": "Preferred Programming Language",
    "content": "John prefers TypeScript for backend development",
    "importance": 7,
    "metadata": {"category": "work"}
  }'
```

### Search Memories

```bash
curl -X POST http://localhost:3004/api/memory/search \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "TypeScript",
    "entity_id": "entity-uuid-here",
    "limit": 20
  }'
```

## Data Types

### Entity Types
- `person` - Individual people
- `organization` - Companies, teams, groups
- `project` - Work projects or initiatives
- `concept` - Ideas, principles, concepts
- `location` - Places, addresses, venues
- `event` - Meetings, conferences, occasions
- `other` - Any other type

### Memory Types
- `fact` - Factual information
- `preference` - User preferences
- `experience` - Past experiences
- `instruction` - Specific instructions
- `context` - Contextual information
- `relationship` - Relationship details
- `skill` - Skills and abilities
- `goal` - Goals and objectives
- `other` - Any other type

## Multi-Tenant Security

The API enforces strict multi-tenant isolation:

1. **Authentication**: API keys are hashed and stored securely
2. **Authorization**: All queries filter by `user_id`
3. **Data Isolation**: Users can only access their own data
4. **Validation**: All operations verify ownership before execution

## Testing Multi-Tenant Isolation

Use the test endpoint to verify isolation:

```bash
# Basic isolation test
curl -H "Authorization: Bearer your-api-key" \
  http://localhost:3004/api/memory/test?type=isolation

# Advanced test scenarios
curl -X POST http://localhost:3004/api/memory/test \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"scenarios": ["tenant_isolation", "api_endpoints", "data_consistency"]}'
```

## Response Format

All API responses follow this format:

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

Error responses:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

## Error Codes

- `UNAUTHORIZED` - Missing or invalid API key
- `FORBIDDEN` - User account inactive
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Invalid request data
- `DATABASE_ERROR` - Database operation failed
- `INTERNAL_ERROR` - Unexpected server error

## Implementation Details

### Architecture
- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Turso** (LibSQL) for database
- **@libsql/client** for database connectivity

### Key Files
- `src/lib/turso.ts` - Database connection and operations
- `src/lib/auth.ts` - Authentication middleware
- `src/types/memory.ts` - TypeScript type definitions
- `src/app/api/memory/` - API route handlers

### Database Schema
The API connects to an existing Turso database with these tables:
- `users` - User accounts and API keys
- `entities` - User entities (people, organizations, etc.)
- `memories` - Memory records linked to entities
- `interactions` - User interaction history
- `learned_patterns` - AI learning patterns

## Production Deployment

1. **Environment Variables**: Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`
2. **Build**: `npm run build`
3. **Deploy**: Standard Next.js deployment (Vercel, etc.)
4. **Monitoring**: Use `/api/memory/health` for health checks

## Getting Started

1. Install dependencies: `npm install`
2. Configure environment: Add Turso credentials to `.env.local`
3. Start development: `npm run dev`
4. Test health: `curl http://localhost:3004/api/memory/health`
5. Create API user in database with API key hash
6. Test authentication with your API key

The system is now ready for production use with complete multi-tenant isolation and comprehensive API functionality.