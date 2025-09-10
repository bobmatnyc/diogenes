# Diogenes Test Suite

This directory contains all test files organized by test type.

## Directory Structure

### `/unit`
Unit tests for individual functions and components in isolation.
- *Currently empty - will contain unit tests when test framework is configured*

### `/integration`
Integration tests for features and API endpoints.
- `test-character.js` - Diogenes character behavior tests
- `test-chat.js` - Chat functionality tests
- `test-comprehensive.js` - Comprehensive integration tests
- `test-delegation.js` - Agent delegation tests
- `test-integration.js` - General integration tests
- `test-integration-fixed.js` - Fixed integration test suite
- `test-search-delegation.js` - Search delegation tests
- `test-search-detailed.js` - Detailed search tests
- `test-tool-calling.js` - Tool calling tests
- `test-web-search.js` - Web search functionality tests

### `/e2e`
End-to-end tests using browser automation.
- `test-stream.html` - Streaming functionality test
- `test-ui.html` - UI interaction tests
- `test-vercel-stream.html` - Vercel streaming tests

### `/scripts`
Test utilities, helpers, and mock data generators.
- `quick-test.js` - Quick test runner script

## Running Tests

Currently, the test suite is not fully configured. To set up testing:

```bash
# Initialize test framework (Jest + Testing Library)
make setup-tests

# After setup, run tests with:
make test

# Or run specific test files directly:
node tests/integration/test-chat.js
```

## Test Standards

### Naming Conventions
- Unit tests: `*.test.ts` or `*.spec.ts`
- Integration tests: `test-*.js` or `*.test.js`
- E2E tests: `test-*.html` or `*.e2e.js`

### Test Organization
1. **Unit Tests**: Test single functions/components
2. **Integration Tests**: Test feature workflows
3. **E2E Tests**: Test complete user journeys

### Writing Tests
- Use descriptive test names
- Follow AAA pattern: Arrange, Act, Assert
- Mock external dependencies
- Test both success and failure cases
- Include edge cases

## Test Commands

```bash
# List all test files
make list-tests

# Run specific test category
node tests/integration/test-chat.js

# Open HTML test in browser
open tests/e2e/test-ui.html
```

## Future Improvements

1. **Configure Jest**: Set up proper test runner
2. **Add React Testing Library**: For component tests
3. **Implement CI/CD Tests**: Automated test runs
4. **Coverage Reports**: Track test coverage
5. **Performance Tests**: Add performance benchmarks