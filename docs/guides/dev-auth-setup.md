# Development Authentication Setup Guide

## Overview

Diogenes now supports seamless local development with automatic authentication bypass. When running on localhost in development mode, you don't need Clerk API keys or any authentication setup - the app automatically uses a mock development user.

## Quick Start

### 1. Automatic Setup (Recommended)

Run the setup script to configure your environment:

```bash
./scripts/setup-dev-auth.sh
```

This will:
- Create/update `.env.local` with development configuration
- Set up the development user (Bob Matsuoka)
- Configure memory system integration
- Install dependencies if needed

### 2. Manual Setup

If you prefer manual configuration:

1. Copy the example environment file:
```bash
cp .env.local.example .env.local
```

2. Add your OpenRouter API key (required):
```bash
OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

3. Leave Clerk keys empty for automatic auth bypass:
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

### 3. Start Development

```bash
pnpm run dev
# or
make dev
```

Navigate to http://localhost:3000 - you'll be automatically logged in!

## How It Works

### Authentication Bypass Flow

1. **Middleware Detection**: The middleware (`src/middleware.ts`) detects when running on localhost in development mode
2. **Automatic Bypass**: All Clerk authentication is bypassed for localhost requests
3. **Dev User Injection**: A consistent development user is provided to all components
4. **Memory Integration**: The dev user ID (`dev_user_bob_matsuoka`) is used consistently across sessions

### Development User Details

When auth is bypassed, you're automatically logged in as:

- **Name**: Bob Matsuoka
- **User ID**: `dev_user_bob_matsuoka`
- **Email**: `bob@localhost.dev`
- **Username**: `bobmatsuoka`

This user is consistent across:
- Chat interface
- Memory system
- Session management
- API routes

### Visual Indicators

In development mode with auth bypass, you'll see:

1. **Top Right**: Yellow "DEV MODE: Bob" badge
2. **Bottom Left**: Yellow "DEV MODE: Auth Bypassed" indicator

These help distinguish development from production environments.

## Configuration Options

### Force Authentication in Development

If you need to test with real Clerk authentication in development:

1. Set in `.env.local`:
```bash
NEXT_PUBLIC_FORCE_AUTH_IN_DEV=true
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key
CLERK_SECRET_KEY=sk_test_your_key
```

2. Restart the dev server

### Custom Development User

To customize the dev user, edit `/src/lib/auth/dev-user.ts`:

```typescript
export const DEV_USER = {
  id: 'dev_user_custom',
  firstName: 'Your',
  lastName: 'Name',
  // ... other properties
};
```

## File Structure

Key files for auth bypass functionality:

```
src/
├── lib/
│   ├── auth/
│   │   ├── dev-user.ts           # Development user configuration
│   │   └── get-current-user.ts   # Unified user retrieval
│   └── env.ts                    # Environment helpers
├── middleware.ts                 # Request-level auth bypass
├── app/
│   └── layout.tsx               # ClerkProvider configuration
└── components/
    └── AuthGate.tsx            # Component-level auth handling
```

## API Routes

API routes automatically work with the dev user:

```typescript
// In your API route
import { getCurrentUser } from '@/lib/auth/get-current-user';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  // user will be DEV_USER in development mode
  console.log(user.id); // 'dev_user_bob_matsuoka'
}
```

## Memory System Integration

The memory system automatically uses the dev user ID:

- All memories are associated with `dev_user_bob_matsuoka`
- Session management uses the consistent dev user
- Memory retrieval works seamlessly

## Testing Different Scenarios

### Test Without Auth (Default)

```bash
# Just run normally
pnpm run dev
```

### Test With Clerk Auth

```bash
# Set in .env.local
NEXT_PUBLIC_FORCE_AUTH_IN_DEV=true
# Add valid Clerk keys
# Restart server
```

### Test Production Build Locally

```bash
# Build and run production version
pnpm run build
pnpm run start
# Note: Auth bypass only works in development mode
```

## Troubleshooting

### Issue: Still Being Redirected to Sign-In

**Solution**: Check that:
1. `NODE_ENV` is not set in `.env.local` (Next.js manages this)
2. You're accessing via `localhost` not `127.0.0.1` or IP address
3. `NEXT_PUBLIC_FORCE_AUTH_IN_DEV` is not set to `true`

### Issue: Dev User Not Appearing

**Solution**: Ensure:
1. The middleware is detecting development mode correctly
2. Check browser console for any errors
3. Clear browser cache/localStorage

### Issue: Memory System Not Working

**Solution**: Verify:
1. Dev user ID is consistent (`dev_user_bob_matsuoka`)
2. Memory API key is set (even if just a placeholder)
3. Check network tab for memory API calls

## Production Deployment

**Important**: Auth bypass only works in development mode on localhost. Production deployments will always use proper Clerk authentication.

When deploying to production:
1. Set proper Clerk API keys in production environment
2. Remove any `NEXT_PUBLIC_FORCE_AUTH_IN_DEV` variable
3. Ensure `NODE_ENV=production` (usually set automatically)

## Security Notes

- Auth bypass ONLY activates when `NODE_ENV=development` AND accessing via localhost
- Production deployments are always secure with proper authentication
- The dev user cannot access production data
- All bypass logic is contained in clearly marked development checks

## Benefits

1. **Instant Setup**: No need for Clerk account during development
2. **Consistent Testing**: Same user ID across all sessions
3. **Memory Integration**: Seamless memory system testing
4. **Fast Iteration**: No auth delays during development
5. **Production Safety**: Bypass never affects production