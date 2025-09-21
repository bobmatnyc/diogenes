# End-to-End Tests

This directory contains comprehensive end-to-end tests for the Diogenes application.

## Test Coverage

### 1. Memory System (`memory.e2e.test.ts`)
- Entity CRUD operations (Create, Read, Update, Delete)
- Memory CRUD operations
- Memory search functionality
- Authentication with Bearer tokens
- Error handling (invalid auth, missing fields, etc.)
- Batch operations
- Clean up test data after each test

### 2. API Keys (`api-keys.e2e.test.ts`)
- OpenRouter API key validation
- Clerk authentication keys verification
- Memory API internal key testing
- Environment variable presence checks
- Model availability verification
- Security checks (no key exposure)
- Rate limiting headers

### 3. Personas (`personas.e2e.test.ts`)
- Diogenes persona (philosophical cynicism)
- Bob Matsuoka persona (tech expertise)
- Executive Assistant persona (professional assistance)
- Robot persona (technical precision)
- Name addressing functionality
- Persona switching
- Error handling

## Running the Tests

### Prerequisites
The development server must be running at `http://localhost:3000`. The tests will automatically check for this and provide helpful error messages if the server is not available.

### Commands

```bash
# Run all e2e tests once
pnpm test:e2e
# or
make test-e2e

# Run e2e tests in watch mode (for development)
pnpm test:e2e:watch
# or
make test-e2e-watch

# Run specific test file
pnpm test:e2e memory
pnpm test:e2e api-keys
pnpm test:e2e personas

# Run with coverage
pnpm test:coverage tests/e2e
```

### Test Environment

The tests are configured to:
- Use Node environment (not jsdom) for e2e tests
- Have 30-second timeouts for API calls
- Automatically start the dev server if needed (with prompt)
- Clean up test data after each test
- Use unique IDs to avoid conflicts between parallel tests

### Test Helpers

The `setup/test-server.ts` file provides:
- `ensureTestServer()` - Ensures dev server is running
- `fetchWithAuth()` - Helper for authenticated API requests
- `getTestBearerToken()` - Generate test bearer tokens
- `cleanupTestData()` - Clean up test entities and memories
- `generateTestId()` - Create unique test IDs

## Writing New E2E Tests

When adding new e2e tests:

1. Import the test server helpers:
```typescript
import { ensureTestServer, fetchWithAuth } from './setup/test-server';
```

2. Ensure server is running in `beforeAll`:
```typescript
beforeAll(async () => {
  baseUrl = await ensureTestServer();
});
```

3. Clean up test data in `afterEach` or `afterAll`:
```typescript
afterEach(async () => {
  await cleanupTestData(testEntityId);
});
```

4. Use descriptive test names and organize with `describe` blocks
5. Test both success and error cases
6. Make tests independent and idempotent

## Troubleshooting

### Server Not Running
If you see "Development server not running", start it with:
```bash
pnpm run dev
# or
make dev
```

### Authentication Errors
Ensure your `.env.local` file has valid API keys:
- `OPENROUTER_API_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

### Test Failures
- Check the dev server console for errors
- Verify all required environment variables are set
- Ensure no other tests are interfering (tests should clean up after themselves)
- Try running a single test file to isolate issues

### Timeout Issues
If tests timeout, you can increase the timeout in `vitest.config.ts`:
```typescript
testTimeout: 60000, // 60 seconds
```