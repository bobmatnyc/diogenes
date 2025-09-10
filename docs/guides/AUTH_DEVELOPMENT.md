# Authentication in Development vs Production

## Overview

The Diogenes application has different authentication behaviors based on the environment:

- **Development Mode** (`NODE_ENV=development`): Authentication is automatically bypassed for easier local development
- **Production Mode** (`NODE_ENV=production`): Full authentication is required with password protection

## Development Mode Features

When running in development mode:

1. **Auto-Authentication**: No password required
2. **Auto-Redirect**: Login page automatically redirects to chat
3. **Visual Indicator**: Yellow banner shows "Development Mode - Authentication Bypassed"
4. **Simplified Testing**: Focus on feature development without auth friction

## Production Mode Features

When running in production mode:

1. **Password Protection**: Users must enter the correct password
2. **Session Management**: 24-hour session expiry with automatic re-authentication
3. **Secure Storage**: Authentication tokens stored in localStorage
4. **Periodic Checks**: Session validity checked every minute

## Running the Application

### Development Mode (Default)
```bash
# Runs with NODE_ENV=development by default
npm run dev

# Access at http://localhost:3000 - no password needed
```

### Production Mode
```bash
# Build for production
npm run build

# Run in production mode
NODE_ENV=production npm start

# Access at http://localhost:3000 - password required
```

## Testing Authentication

Run the included test script to verify authentication behavior:

```bash
node test-auth.js
```

This will test:
- Root path redirects to /chat
- Chat page accessibility
- Login page behavior
- API endpoint access

## Configuration

### Password Configuration
Set the password via environment variable:
```bash
# In .env.local or .env.production
NEXT_PUBLIC_APP_PASSWORD=your_secure_password
```

Default password (if not set): `diogenes2024`

## Security Notes

- **Never deploy to production without setting NODE_ENV=production**
- **Always use a strong, unique password in production**
- **Consider implementing additional security measures for production deployments**:
  - HTTPS/TLS encryption
  - Rate limiting
  - Session management improvements
  - Secure cookie implementation

## Implementation Details

The authentication bypass is implemented through:

1. **`src/lib/env.ts`**: Environment detection utilities
2. **`src/lib/auth.ts`**: Authentication logic with development bypass
3. **`src/components/AuthGate.tsx`**: Auto-authentication in development
4. **`src/app/login/page.tsx`**: Auto-redirect in development
5. **`src/middleware.ts`**: Request handling based on environment

## Troubleshooting

### Authentication not bypassed in development?
- Check that `NODE_ENV` is not explicitly set to `production`
- Verify the dev server is running with `npm run dev`
- Clear browser cache and localStorage

### Password not working in production?
- Verify `NEXT_PUBLIC_APP_PASSWORD` is set correctly
- Check that `NODE_ENV=production` is set
- Ensure the build was created with `npm run build`

### Session expires too quickly?
- Session duration is set to 24 hours
- Check system time synchronization
- Clear localStorage and re-authenticate