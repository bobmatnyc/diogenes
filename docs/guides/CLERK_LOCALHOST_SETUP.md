# Clerk Localhost Development Setup Guide

## Problem Resolution: SSL Error (ERR_SSL_VERSION_OR_CIPHER_MISMATCH)

This guide resolves the SSL error that occurs when Clerk tries to redirect to a custom domain (accounts.diogenes.live) during localhost development.

## Root Cause

The SSL error occurs when:
1. The Clerk publishable key is hardcoded instead of using environment variables
2. There's a mismatch between development keys and custom domain configuration
3. The browser attempts to access a production domain from localhost

## Solution Implemented

### 1. Environment Variable Configuration

Ensure your `.env.local` file contains the correct Clerk test keys:

```env
# Clerk Authentication Configuration - Test Keys for Localhost Development
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_cGVyZmVjdC13YWxsZXllLTQ1LmNsZXJrLmFjY291bnRzLmRldiQ
CLERK_SECRET_KEY=sk_test_NwZwOneXR10sLVqXSPdeN6TDj1V2lkqkFcFd2gQLik
```

**Key Points:**
- `pk_test_` prefix indicates development/test mode
- The domain `perfect-walleye-45.clerk.accounts.dev` is Clerk's development domain
- These are test keys specifically for localhost development

### 2. ClerkProvider Configuration

The `src/app/layout.tsx` file has been updated to:
- Use environment variables instead of hardcoded keys
- Specify proper redirect URLs for authentication flow
- Ensure localhost-compatible configuration

```typescript
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Use the test key from environment variable for localhost development
  const clerkPubKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  
  return (
    <ClerkProvider 
      publishableKey={clerkPubKey}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignInUrl="/chat"
      afterSignUpUrl="/chat"
    >
      <html lang="en">
        <body className={inter.className}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
```

### 3. Middleware Configuration

The middleware at `src/middleware.ts` correctly protects routes:

```typescript
const isProtectedRoute = createRouteMatcher([
  '/chat(.*)',
  '/api/chat(.*)',
]);
```

## How to Verify the Fix

1. **Restart the development server:**
   ```bash
   # Stop current server (Ctrl+C)
   # Clear Next.js cache
   rm -rf .next
   # Start fresh
   make dev
   ```

2. **Access the application:**
   - Go to http://localhost:3000
   - Click "Get Started" or navigate to /chat
   - You should be redirected to /sign-in (Clerk's sign-in page)
   - The URL should remain on localhost:3000, not redirect to accounts.diogenes.live

3. **Check for SSL errors:**
   - No SSL errors should appear
   - Authentication should work with the Clerk development domain
   - Sign in/up flow should complete successfully

## Troubleshooting

### If SSL Error Persists:

1. **Clear browser cache and cookies:**
   - Chrome: Settings → Privacy → Clear browsing data
   - Include cookies and cached images/files

2. **Check environment variables are loaded:**
   ```bash
   # In your terminal where dev server is running
   echo $NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
   ```

3. **Verify Clerk Dashboard Settings:**
   - Log into clerk.com
   - Check that your development instance uses test keys
   - Ensure no custom domain is configured for development

### Common Issues and Solutions:

| Issue | Solution |
|-------|----------|
| Still redirecting to custom domain | Clear all site data for localhost:3000 and diogenes.live |
| "Missing publishableKey" error | Ensure .env.local is at project root, not in /src |
| Authentication not working | Check that test keys match your Clerk dashboard |
| SSL error on sign-in page | Use incognito/private browsing to bypass cache |

## Best Practices for Clerk Development

1. **Always use environment variables** - Never hardcode keys in source files
2. **Use test keys for development** - Keys with `pk_test_` and `sk_test_` prefixes
3. **Keep development and production separate** - Different Clerk instances for each environment
4. **Explicit configuration** - Specify all redirect URLs in ClerkProvider
5. **Regular cache clearing** - Clear .next folder when changing auth configuration

## Production Deployment

When deploying to production:

1. Use production keys (`pk_live_` and `sk_live_` prefixes)
2. Configure custom domain in Clerk dashboard if needed
3. Update environment variables in Vercel/hosting platform
4. Ensure SSL certificates are properly configured for custom domains

## Additional Resources

- [Clerk NextJS Quickstart](https://clerk.com/docs/quickstarts/nextjs)
- [Clerk Environment Variables](https://clerk.com/docs/deployments/clerk-environment-variables)
- [Clerk Localhost Development](https://clerk.com/docs/deployments/overview)