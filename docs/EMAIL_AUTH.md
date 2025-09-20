# Email-Based Memory Authentication

The Diogenes memory system now supports email-based authentication alongside traditional API key authentication. This makes it easier to manage multi-tenant memory storage during development and allows for seamless user association.

## Features

- **Dual Authentication**: Supports both API key and email-based authentication
- **Auto User Creation**: Automatically creates users when first referenced (development mode)
- **Default User**: Falls back to `bob@matsuoka.com` in development mode
- **Multi-Tenant Isolation**: Each user has completely isolated entities and memories
- **Backward Compatible**: Existing API key authentication continues to work

## How It Works

### Development Mode (Default)

In development mode, the system operates with relaxed authentication:

1. **No Authentication**: Defaults to `bob@matsuoka.com`
2. **Email Authentication**: Specify any email to create/use that user
3. **API Key Authentication**: Still works if provided

### Production Mode

In production mode (`NODE_ENV=production`), API key authentication is required.

## Usage Examples

### 1. Default User (Development)

When no authentication is provided, the system uses `bob@matsuoka.com`:

```bash
# Get entities for default user
curl http://localhost:3000/api/memory/entities

# Create entity for default user
curl -X POST http://localhost:3000/api/memory/entities \
  -H "Content-Type: application/json" \
  -d '{
    "entity_type": "person",
    "name": "John Doe"
  }'
```

### 2. Email via Header

Specify a user email in the `X-User-Email` header:

```bash
# Get entities for alice@example.com
curl http://localhost:3000/api/memory/entities \
  -H "X-User-Email: alice@example.com"

# Create entity for alice@example.com
curl -X POST http://localhost:3000/api/memory/entities \
  -H "Content-Type: application/json" \
  -H "X-User-Email: alice@example.com" \
  -d '{
    "entity_type": "project",
    "name": "Alice Project"
  }'
```

### 3. Email via Query Parameter

Include the email as a query parameter:

```bash
# Get entities for charlie@test.com
curl "http://localhost:3000/api/memory/entities?user_email=charlie@test.com"

# Get memories for a specific user
curl "http://localhost:3000/api/memory/memories?user_email=charlie@test.com&entity_id=123"
```

### 4. Email in Request Body

For POST requests, include the email in the request body:

```bash
# Create entity with email in body
curl -X POST http://localhost:3000/api/memory/entities \
  -H "Content-Type: application/json" \
  -d '{
    "entity_type": "organization",
    "name": "Tech Corp",
    "user_email": "admin@techcorp.com"
  }'

# Search memories for specific user
curl -X POST http://localhost:3000/api/memory/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "meeting notes",
    "user_email": "manager@company.com"
  }'
```

## API Endpoints

All memory API endpoints support email-based authentication:

### Entities

- **GET /api/memory/entities** - List entities
  - Query param: `?user_email=email@example.com`
  - Header: `X-User-Email: email@example.com`

- **POST /api/memory/entities** - Create entity
  - Body field: `"user_email": "email@example.com"`
  - Header: `X-User-Email: email@example.com`

- **GET /api/memory/entities/[id]** - Get specific entity
- **PUT /api/memory/entities/[id]** - Update entity
- **DELETE /api/memory/entities/[id]** - Delete entity

### Memories

- **GET /api/memory/memories** - List memories
  - Query param: `?user_email=email@example.com`
  - Header: `X-User-Email: email@example.com`

- **POST /api/memory/memories** - Create memory
  - Body field: `"user_email": "email@example.com"`
  - Header: `X-User-Email: email@example.com`

- **GET /api/memory/memories/[id]** - Get specific memory
- **PUT /api/memory/memories/[id]** - Update memory
- **DELETE /api/memory/memories/[id]** - Delete memory

### Search

- **POST /api/memory/search** - Search memories
  - Body field: `"user_email": "email@example.com"`
  - Header: `X-User-Email: email@example.com`

## Setup Scripts

### Initialize Default User

Create the default `bob@matsuoka.com` user with sample data:

```bash
pnpm init:user
```

This script:
- Creates the default user if it doesn't exist
- Creates a sample entity
- Creates a sample memory
- Displays the generated API key (for development)

### Test Email Authentication

Run comprehensive tests of the email-based authentication:

```bash
pnpm test:email-auth
```

This script tests:
- Default user authentication
- Email via header
- Email via query parameter
- Email in request body
- Multi-tenant isolation

## Security Considerations

### Development Mode

- Users are automatically created when first referenced
- No password or additional authentication required
- Suitable for local development and testing
- Each user's data is isolated

### Production Mode

- Requires API key authentication
- Email-based auth is disabled
- Users must be pre-created with valid API keys
- Full multi-tenant isolation maintained

## Implementation Details

### Database Schema

The users table includes:
- `id` - Unique user identifier
- `email` - User email address (unique)
- `name` - Display name
- `api_key_hash` - Hashed API key for production auth
- `is_active` - Account status flag
- `created_at` - Timestamp

### User Resolution Order

When processing a request, the system checks for user identity in this order:

1. API Key (if provided) - Works in all modes
2. Email from request (if in development mode):
   - Request body `user_email` field
   - Header `X-User-Email`
   - Query parameter `user_email`
3. Default to `bob@matsuoka.com` (development only)

### Auto User Creation

In development mode, when an unknown email is provided:
1. A new user record is created
2. A development API key is generated
3. The user is immediately available for use
4. The API key is logged to console (dev only)

## Troubleshooting

### Common Issues

1. **"User not found" in production**
   - Ensure API key is provided
   - Email-only auth doesn't work in production

2. **Data not appearing for user**
   - Check you're using consistent email
   - Verify user was created successfully
   - Each user's data is isolated

3. **Can't access another user's data**
   - This is by design for security
   - Each user can only access their own entities/memories

### Debug Tips

- Check server logs for user creation messages
- Use `pnpm init:user` to ensure default user exists
- Run `pnpm test:email-auth` to verify setup
- API responses include user context in errors

## Migration from API-Key Only

Existing implementations using API keys will continue to work without changes. The email-based authentication is additive and doesn't affect existing API key authentication.

To migrate existing code:
1. No changes required for production
2. In development, optionally remove API key headers
3. Add `user_email` parameter for multi-tenant testing

## Best Practices

1. **Development**: Use email-based auth for easier testing
2. **Production**: Always use API key authentication
3. **Testing**: Create separate users for different test scenarios
4. **Integration**: Include user email in audit logs
5. **Security**: Never expose API keys in client-side code