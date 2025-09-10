# Clerk Authentication Setup Guide

## Overview
Diogenes now uses Clerk for authentication with Google OAuth integration. This guide will help you set up Clerk for your development and production environments.

## Prerequisites
- Google OAuth Client ID and Secret (already configured in Google Cloud Console)
- Clerk account (free tier available at https://clerk.com)

## Step 1: Create Clerk Application

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Click "Create application"
3. Name your application "Diogenes" (or your preferred name)
4. Select your preferred authentication methods (enable Google OAuth)

## Step 2: Configure Google OAuth in Clerk

1. In Clerk Dashboard, go to **Configure → Authentication → Social OAuth**
2. Click on **Google** provider
3. Toggle it **ON**
4. Add your Google OAuth credentials:
   - **Client ID**: Your Google OAuth Client ID
   - **Client Secret**: Your Google OAuth Client Secret
5. Click **Save**

## Step 3: Get Your Clerk Keys

1. In Clerk Dashboard, go to **API Keys**
2. Copy the following keys:
   - **Publishable Key**: Starts with `pk_test_` (for development) or `pk_live_` (for production)
   - **Secret Key**: Starts with `sk_test_` (for development) or `sk_live_` (for production)

## Step 4: Configure Environment Variables

Create or update your `.env.local` file:

```env
# Clerk Authentication (Required)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_key_here

# Clerk Redirect URLs (These are already configured in the code)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/chat
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/chat

# Your existing OpenRouter key
OPENROUTER_API_KEY=your_openrouter_key_here
```

## Step 5: Verify Setup

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to http://localhost:3000

3. Click "Enter the Philosophical Arena"

4. You should see the Clerk sign-in widget with Google OAuth option

5. Sign in with Google

6. You should be redirected to `/chat` after successful authentication

## Important Notes

### Domain Configuration
- **Development**: Works automatically with `localhost:3000`
- **Production**: Add your production domain in Clerk Dashboard under **Domains**

### Security Considerations
- Never commit `.env.local` to version control
- Use different Clerk applications for development and production
- Production keys should start with `pk_live_` and `sk_live_`

### Troubleshooting

#### "Invalid host" Error
If you see this error, ensure:
1. Your Clerk publishable key is correct and properly formatted
2. The key matches your Clerk application (test keys for development, live keys for production)
3. Your domain is added to the Clerk Dashboard for production

#### Google OAuth Not Working
1. Verify Google OAuth is enabled in Clerk Dashboard
2. Check that Client ID and Secret are correctly added in Clerk
3. Ensure redirect URIs in Google Cloud Console include Clerk's OAuth callback URL

#### User Not Redirecting After Sign-In
1. Check that `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` is set to `/chat`
2. Verify middleware.ts is protecting the `/chat` route
3. Check browser console for any JavaScript errors

## Migration from NextAuth

If you were previously using NextAuth:
1. All NextAuth packages have been removed
2. NextAuth configuration files have been deleted
3. SessionProvider has been replaced with ClerkProvider
4. useSession hooks have been replaced with useUser from Clerk

## Features

### Current Implementation
- Google OAuth sign-in/sign-up
- Protected `/chat` route
- User profile button (top-right when signed in)
- Automatic redirect after authentication
- Sign out functionality

### Clerk Benefits
- Built-in user management
- Multiple authentication methods
- Session management
- User profile UI components
- Webhook support for user events
- Multi-factor authentication (optional)

## Production Deployment

For Vercel deployment:
1. Add environment variables in Vercel Dashboard
2. Use production Clerk keys (`pk_live_` and `sk_live_`)
3. Add your production domain to Clerk Dashboard
4. Deploy as usual with `git push` or Vercel CLI

## Support

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk + Next.js Guide](https://clerk.com/docs/quickstarts/nextjs)
- [Clerk Discord](https://discord.com/invite/b5rXHjAg7A)