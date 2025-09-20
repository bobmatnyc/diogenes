# Memory API Test Suite

Comprehensive testing suite for the Diogenes Memory API, including unit tests, integration tests, and performance benchmarks.

## 📋 Overview

This test suite provides thorough coverage of the memory API functionality with:

- **Unit Tests**: Individual API endpoint testing with mocked dependencies
- **Integration Tests**: End-to-end testing with real HTTP requests
- **Multi-tenant Tests**: Verification of user data isolation
- **Performance Tests**: Response time and scalability validation
- **Error Handling Tests**: Edge cases and failure scenarios

## 🏗️ Test Structure

```
tests/
├── api/
│   └── memory.test.ts          # Comprehensive API endpoint tests
├── utils/
│   └── test-helpers.ts         # Test utilities and mock helpers
├── setup.ts                    # Global test configuration
├── integration/                # Legacy integration tests
├── e2e/                       # End-to-end browser tests
├── scripts/                   # Test utilities
└── README.md                   # This documentation
scripts/
└── test-memory-api.ts          # Integration test script
```

## 🚀 Quick Start

### Prerequisites

1. **Node.js 18+** and **pnpm** installed
2. **Environment variables** configured in `.env.local`:
   ```bash
   TURSO_URL=your-database-url
   TURSO_AUTH_TOKEN=your-auth-token
   NODE_ENV=test
   ```
3. **Development server** running (for integration tests):
   ```bash
   pnpm dev
   ```

### Running Tests

#### Unit Tests (Vitest)
```bash
# Run all tests
pnpm test

# Run with UI
pnpm test:ui

# Run with coverage
pnpm test:coverage

# Run specific test file
pnpm test tests/api/memory.test.ts

# Watch mode
pnpm test --watch
```

#### Integration Tests
```bash
# Run integration test script
pnpm tsx scripts/test-memory-api.ts

# Or with node
node -r tsx/register scripts/test-memory-api.ts

# With custom API URL
API_BASE_URL=http://localhost:3000 pnpm tsx scripts/test-memory-api.ts
```

## 📊 Test Coverage

### API Endpoints Tested

#### Health Check (`/api/memory/health`)
- ✅ Basic health check (GET)
- ✅ Extended health check with diagnostics (POST)
- ✅ Database connection failure handling
- ✅ Service status reporting

#### Authentication
- ✅ API key validation (Bearer, ApiKey, raw formats)
- ✅ Missing/invalid API key rejection
- ✅ Inactive user account handling
- ✅ Multi-user isolation

#### Entities (`/api/memory/entities`)
- ✅ Create entity (POST)
- ✅ List entities with pagination (GET)
- ✅ Get entity by ID (GET /[id])
- ✅ Update entity (PUT /[id])
- ✅ Delete entity (DELETE /[id])
- ✅ Owner-only access enforcement

#### Memories (`/api/memory/memories`)
- ✅ Create memory (POST)
- ✅ List memories with pagination (GET)
- ✅ Filter memories by entity (GET ?entity_id=...)
- ✅ Get memory by ID (GET /[id])
- ✅ Update memory (PUT /[id])
- ✅ Delete memory (DELETE /[id])
- ✅ Entity validation and ownership

#### Search (`/api/memory/search`)
- ✅ Text search across memories (POST)
- ✅ Entity-filtered search
- ✅ Query validation and limits
- ✅ Multi-tenant result isolation

#### Test Endpoint (`/api/memory/test`)
- ✅ Authentication verification
- ✅ User context validation

### Test Scenarios

#### Multi-Tenant Isolation
- ✅ Entity isolation between users
- ✅ Memory isolation between users
- ✅ Search result isolation
- ✅ Cross-user access prevention

#### Error Handling
- ✅ Invalid JSON handling
- ✅ Missing required fields
- ✅ Non-existent resource access
- ✅ Invalid entity references
- ✅ Database connection failures

#### Performance
- ✅ Bulk operations testing
- ✅ Large result set handling
- ✅ Search query performance
- ✅ Pagination efficiency
- ✅ Concurrent request handling

#### Validation
- ✅ Request body validation
- ✅ Parameter validation
- ✅ Data type enforcement
- ✅ Business rule validation

## 🔧 Test Configuration

### Environment Setup

The test suite uses these environment variables:

```bash
# Required for integration tests
API_BASE_URL=http://localhost:3000    # Default test target
TURSO_URL=your-test-database-url      # Test database
TURSO_AUTH_TOKEN=your-test-auth-token # Database auth

# Test execution settings
NODE_ENV=test                         # Enables test mode
TEST_TIMEOUT=30000                    # Request timeout (ms)
PERFORMANCE_THRESHOLD_MS=1000         # Performance limit
```

### Vitest Configuration

Key settings in `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    environment: 'jsdom',          // Browser-like environment
    globals: true,                 # Global test functions
    setupFiles: ['./tests/setup.ts'], // Global setup
    coverage: {
      thresholds: {
        statements: 80,            // Minimum coverage
        branches: 80,
        functions: 80,
        lines: 80
      }
    },
    testTimeout: 10000,           // Individual test timeout
    isolate: true,                // Test isolation
    mockReset: true,              // Reset mocks between tests
  }
})
```

## 🛠️ Writing New Tests

### Unit Test Example

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTestUser, mockTursoDatabase, ApiAssertions } from '../utils/test-helpers'

describe('My New API Endpoint', () => {
  let mockDb: any
  let testUser: TestUser

  beforeEach(() => {
    mockDb = mockTursoDatabase()
    testUser = createTestUser()
  })

  it('should handle valid request', async () => {
    // Arrange
    mockDb.someMethod.mockResolvedValue(expectedResult)

    // Act
    const response = await myApiHandler(request)

    // Assert
    ApiAssertions.expectSuccess(response, 200)
    expect(response.data.result).toEqual(expectedResult)
  })
})
```

### Integration Test Example

```typescript
async function testNewEndpoint() {
  const client = new ApiClient(API_BASE_URL, testUser.apiKey)

  const response = await client.post('/api/my-endpoint', {
    field: 'value'
  })

  if (response.status !== 201) {
    throw new Error(`Expected 201, got ${response.status}`)
  }

  return response.data
}
```

### Using Test Helpers

```typescript
import {
  createTestUser,
  createTestEntity,
  ApiAssertions,
  PerformanceHelper,
  DatabaseInspector
} from '../utils/test-helpers'

// Create test data
const user = createTestUser({ name: 'Custom User' })
const entity = createTestEntity(user.id, { entity_type: 'person' })

// Performance testing
const { result, duration } = await PerformanceHelper.measureAsync(
  'operation-name',
  () => performOperation()
)
PerformanceHelper.expectPerformance(duration, 1000, 'My Operation')

// Data assertions
ApiAssertions.expectSuccess(response)
ApiAssertions.expectEntityStructure(entity)
ApiAssertions.expectUserIsolation(results, user.id)

// Database inspection
const entityCount = DatabaseInspector.getEntityCount(user.id)
const memories = DatabaseInspector.getAllMemories(user.id)
```

## 🧪 Test Data Management

### Mock Database

The test suite uses an in-memory mock database that simulates the real Turso database:

```typescript
// Setup mock data
const mockData = setupMockDatabase()
// Returns: { users: TestUser[], entities: TestEntity[], memories: TestMemory[] }

// Access mock state
import { mockDbState } from '../utils/test-helpers'
console.log(mockDbState.entities.size) // Number of entities

// Cleanup after tests
await cleanupTestData()
```

### Test User Creation

```typescript
// Basic test user
const user = createTestUser()

// Custom test user
const user = createTestUser({
  email: 'custom@example.com',
  name: 'Custom User',
  is_active: 1
})

// The user automatically gets:
// - Unique ID
// - Generated API key
// - Hashed API key for storage
// - Registration in mock database
```

### Bulk Test Data

```typescript
// Create multiple entities
const entities = createTestEntities(userId, 10)

// Create multiple memories
const memories = createTestMemories(userId, entityId, 20)

// All data is automatically stored in mock database
```

## 🚨 Troubleshooting

### Common Issues

#### Tests Failing with "Module not found"
```bash
# Ensure proper TypeScript setup
pnpm typecheck

# Check path aliases in vitest.config.ts
alias: {
  '@': path.resolve(__dirname, './src')
}
```

#### Integration Tests Failing with Connection Errors
```bash
# Ensure dev server is running
pnpm dev

# Check API_BASE_URL environment variable
echo $API_BASE_URL

# Verify database connection
pnpm tsx -e "console.log(process.env.TURSO_URL)"
```

#### Mock Database State Issues
```bash
# Mocks not resetting between tests
# Add to beforeEach:
vi.clearAllMocks()
await cleanupTestData()
```

#### Performance Tests Failing
```bash
# Adjust thresholds in test files or environment
PERFORMANCE_THRESHOLD_MS=2000 pnpm test

# Check system load during tests
# Performance tests may fail on slow systems
```

### Debug Mode

Enable verbose test output:

```bash
# Vitest debug mode
pnpm test --reporter=verbose

# Integration test debug
DEBUG=1 pnpm tsx scripts/test-memory-api.ts

# Coverage with detailed output
pnpm test:coverage --reporter=verbose
```

### Test Data Inspection

```typescript
// In test files, inspect mock database state
import { DatabaseInspector } from '../utils/test-helpers'

it('should debug test data', () => {
  console.log('Users:', DatabaseInspector.getUserCount())
  console.log('Entities:', DatabaseInspector.getEntityCount())
  console.log('Memories:', DatabaseInspector.getMemoryCount())

  const allUsers = DatabaseInspector.getAllUsers()
  console.log('User details:', allUsers)
})
```

## 📈 Performance Benchmarks

Expected performance thresholds:

| Operation | Threshold | Notes |
|-----------|-----------|-------|
| Health Check | 200ms | Database ping + status |
| Entity CRUD | 500ms | Single record operations |
| Memory CRUD | 500ms | Single record operations |
| Search Query | 1000ms | Text search across records |
| Bulk Operations | 2000ms | 10+ concurrent operations |
| Pagination | 300ms | Page retrieval |

## 🔄 Continuous Integration

### GitHub Actions Example

```yaml
name: Memory API Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: pnpm install
      - run: pnpm test:coverage
      - run: pnpm tsx scripts/test-memory-api.ts
    env:
      TURSO_URL: ${{ secrets.TEST_TURSO_URL }}
      TURSO_AUTH_TOKEN: ${{ secrets.TEST_TURSO_AUTH_TOKEN }}
```

### Pre-commit Hooks

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
pnpm test --run
pnpm typecheck
```

## 📝 Contributing

### Adding New Tests

1. **Unit Tests**: Add to `tests/api/memory.test.ts` or create new files
2. **Integration Tests**: Extend `scripts/test-memory-api.ts`
3. **Utilities**: Add helpers to `tests/utils/test-helpers.ts`

### Test Guidelines

- **Descriptive Names**: Use clear, specific test names
- **Arrange-Act-Assert**: Structure tests clearly
- **Isolated Tests**: Each test should be independent
- **Mock External Dependencies**: Use provided mock helpers
- **Performance Aware**: Consider test execution time
- **Multi-tenant Safe**: Always test user isolation

### Code Review Checklist

- [ ] Tests cover positive and negative scenarios
- [ ] Error cases are tested
- [ ] Performance implications considered
- [ ] Multi-tenant isolation verified
- [ ] Mock dependencies properly set up
- [ ] Clear assertions and error messages
- [ ] Test data properly cleaned up

## Legacy Test Files

### `/integration`
Legacy integration tests for chat and web functionality:
- `test-character.js` - Diogenes character behavior tests
- `test-chat.js` - Chat functionality tests
- `test-comprehensive.js` - Comprehensive integration tests
- `test-delegation.js` - Agent delegation tests
- `test-integration.js` - General integration tests
- `test-search-delegation.js` - Search delegation tests
- `test-tool-calling.js` - Tool calling tests
- `test-web-search.js` - Web search functionality tests

### `/e2e`
End-to-end browser tests:
- `test-stream.html` - Streaming functionality test
- `test-ui.html` - UI interaction tests
- `test-vercel-stream.html` - Vercel streaming tests

### `/scripts`
Test utilities and helpers:
- `quick-test.js` - Quick test runner script

## 📚 Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Docs](https://testing-library.com/)
- [Node.js Fetch API](https://nodejs.org/api/globals.html#fetch)
- [Memory API Documentation](../docs/developer/memory.md)
- [Turso Database Docs](https://docs.turso.tech/)

---

**Happy Testing! 🎯**

For questions or issues with the test suite, please check the troubleshooting section above or create an issue in the project repository.