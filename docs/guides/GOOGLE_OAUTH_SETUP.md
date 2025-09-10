# Google OAuth Authentication Setup Guide

## Overview

The Diogenes project now uses NextAuth.js v5 (Auth.js) with Google OAuth for authentication, replacing the previous password-based system.

## Implementation Summary

### 1. Dependencies
- **Removed**: `@clerk/nextjs` 
- **Added**: 
  - `next-auth@beta` - NextAuth.js v5 for authentication
  - `@auth/core` - Core authentication utilities

### 2. Key Files Created/Modified

#### Authentication Configuration
- `/src/lib/auth.config.ts` - Edge-compatible auth configuration
- `/src/lib/auth.ts` - Main NextAuth configuration with Google provider
- `/src/app/api/auth/[...nextauth]/route.ts` - API route handler for auth

#### Components
- `/src/components/SessionProvider.tsx` - Client-side session provider
- `/src/components/AuthGate.tsx` - Updated for Google sign-in
- `/src/components/UserInfo.tsx` - User information display with sign-out
- `/src/app/layout.tsx` - Wrapped with SessionProvider
- `/src/app/page.tsx` - Updated home page with session awareness

#### Middleware
- `/src/middleware.ts` - NextAuth middleware for route protection

#### Configuration
- `.env.example` - Updated with NextAuth and Google OAuth variables
- `.env.local` - Configured with NextAuth secret and placeholders

### 3. Protected Routes
- `/chat` - Requires authentication to access
- Middleware automatically redirects unauthenticated users to sign-in

## Setting Up Google OAuth

### Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Navigate to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure the OAuth consent screen if prompted
6. Set application type to "Web application"
7. Add authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://your-domain.com/api/auth/callback/google`
8. Copy the **Client ID** and **Client Secret**

### Step 2: Configure Environment Variables

Update your `.env.local` file:

```env
# NextAuth.js Configuration
NEXTAUTH_SECRET=your_generated_secret_here
NEXTAUTH_URL=http://localhost:3000

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
```

To generate a NextAuth secret:
```bash
openssl rand -base64 32
```

### Step 3: Test the Authentication Flow

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000`

3. Click "Enter the Philosophical Arena"

4. You'll be redirected to the AuthGate component showing "Sign in with Google"

5. Click the button to authenticate with Google

6. After successful authentication, you'll be redirected to `/chat`

## Features

### User Experience
- **Sign-in Page**: Clean UI with Google sign-in button
- **User Info Bar**: Displays user name, email, and profile picture in chat
- **Sign-out**: Available in the chat interface
- **Session Persistence**: Sessions maintained across page refreshes

### Security
- **JWT Strategy**: Secure token-based sessions
- **Route Protection**: Middleware protects sensitive routes
- **Edge Runtime Compatible**: Works with Vercel Edge Runtime

## Production Deployment

### Vercel Deployment

1. Set environment variables in Vercel dashboard:
   - `NEXTAUTH_SECRET` - Generate a new secret for production
   - `NEXTAUTH_URL` - Your production URL (e.g., `https://diogenes.vercel.app`)
   - `GOOGLE_CLIENT_ID` - Same as development
   - `GOOGLE_CLIENT_SECRET` - Same as development
   - `OPENROUTER_API_KEY` - Your OpenRouter API key

2. Update Google OAuth settings:
   - Add production redirect URI: `https://your-domain.com/api/auth/callback/google`

3. Deploy:
   ```bash
   git push origin main
   ```

## Troubleshooting

### Common Issues

1. **"Invalid redirect_uri" error**
   - Ensure the redirect URI in Google Console matches exactly
   - Check that `NEXTAUTH_URL` is set correctly

2. **"Missing secret" error**
   - Verify `NEXTAUTH_SECRET` is set in environment variables
   - Ensure the secret is at least 32 characters

3. **Session not persisting**
   - Check that SessionProvider wraps the app in layout.tsx
   - Verify cookies are enabled in the browser

4. **Middleware not protecting routes**
   - Confirm middleware.ts is in the src directory
   - Check the matcher configuration includes your protected routes

## Architecture Notes

### Multi-Layer Protection
1. **Middleware Level**: Edge-compatible route protection
2. **Component Level**: AuthGate component for UI-based protection
3. **API Level**: Protected API routes check session

### Session Management
- Uses JWT tokens for stateless authentication
- Sessions stored in encrypted cookies
- No database required for basic authentication

### Performance
- Edge runtime compatible for global performance
- Minimal overhead with JWT strategy
- Efficient session checks via middleware

## Future Enhancements

- [ ] Add more OAuth providers (GitHub, Twitter, etc.)
- [ ] Implement role-based access control
- [ ] Add user profile management
- [ ] Enable email/password authentication option
- [ ] Add session activity tracking

## Migration from Password Authentication

The previous password-based authentication has been completely replaced. Key changes:

1. Removed `NEXT_PUBLIC_APP_PASSWORD` environment variable
2. Removed sessionStorage-based auth checks
3. Replaced with OAuth-based authentication flow
4. Added proper session management with NextAuth.js

## Support

For issues or questions about the authentication system:
1. Check the [NextAuth.js documentation](https://next-auth.js.org/)
2. Review the [Google OAuth setup guide](https://next-auth.js.org/providers/google)
3. Check the implementation in `/src/lib/auth.ts` and `/src/lib/auth.config.ts`