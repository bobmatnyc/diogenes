# Clerk Authentication Setup Guide

## Overview
Diogenes now uses Clerk for authentication instead of the previous password-based system. This provides a more secure and feature-rich authentication experience with support for OAuth providers.

## Setup Steps

### 1. Create a Clerk Application
1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Sign up or log in to your Clerk account
3. Create a new application for Diogenes
4. Choose your preferred authentication methods (email, Google, GitHub, etc.)

### 2. Get Your API Keys
From your Clerk dashboard:
1. Navigate to **API Keys** section
2. Copy your keys:
   - **Publishable Key**: Starts with `pk_test_` (development) or `pk_live_` (production)
   - **Secret Key**: Starts with `sk_test_` (development) or `sk_live_` (production)

### 3. Configure Environment Variables
Create or update your `.env.local` file:

```bash
# Required Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_secret_here

# Optional: Customize redirect URLs (defaults shown)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/chat
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/chat

# Your existing OpenRouter configuration
OPENROUTER_API_KEY=your_openrouter_key_here
```

### 4. Configure Clerk Dashboard Settings
In your Clerk dashboard:
1. Go to **User & Authentication** → **Email, Phone, Username**
2. Configure your preferred sign-up requirements
3. Go to **User & Authentication** → **Social Connections**
4. Enable OAuth providers (Google, GitHub, etc.) if desired

### 5. Run the Application
```bash
# Install dependencies (if not already done)
npm install

# Start development server
npm run dev
```

Visit http://localhost:3000 and you'll see the new authentication flow.

## What Changed

### Removed Components
- `/src/lib/auth.ts` - Old password authentication logic
- `/src/app/login/page.tsx` - Old login page
- Password-based AuthGate logic

### Added Components
- **Clerk Integration**: Full OAuth and email authentication
- **Sign-in/Sign-up Pages**: Professional authentication UI at `/sign-in` and `/sign-up`
- **User Management**: User button in chat interface for profile/logout
- **Middleware Protection**: Route protection using Clerk middleware

### Updated Components
- `AuthGate.tsx`: Now uses Clerk's `SignedIn`/`SignedOut` components
- `middleware.ts`: Uses `clerkMiddleware` for route protection
- `layout.tsx`: Wrapped with `ClerkProvider`
- `ChatInterfaceWorking.tsx`: Added `UserButton` for user management

## Features

### Authentication Methods
- Email/Password authentication
- Magic link authentication (if enabled)
- OAuth providers (Google, GitHub, etc.)
- Multi-factor authentication support

### User Experience
- Professional sign-in/sign-up UI
- User profile management
- Session management
- Secure password reset flow

### Security Benefits
- Industry-standard authentication
- Automatic session management
- CSRF protection
- Secure token handling

## Customization

### Styling the Auth Components
You can customize Clerk components appearance in the sign-in/sign-up pages:

```tsx
<SignIn 
  appearance={{
    elements: {
      rootBox: 'custom-class',
      card: 'bg-white shadow-xl',
      headerTitle: 'text-2xl font-bold',
      // Add more customizations
    },
    variables: {
      colorPrimary: '#your-color',
      // Add more theme variables
    }
  }}
/>
```

### Protected Routes
Routes are protected by default except those defined in `middleware.ts`:
- Public routes: `/`, `/sign-in/*`, `/sign-up/*`
- Protected routes: `/chat`, all other routes

## Troubleshooting

### "Missing publishableKey" Error
- Ensure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set in `.env.local`
- Restart the development server after adding environment variables

### Sign-in Redirect Issues
- Check `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` is set correctly
- Ensure the redirect URL exists in your application

### Development vs Production
- Use `pk_test_` and `sk_test_` keys for development
- Use `pk_live_` and `sk_live_` keys for production
- Update Vercel environment variables for production deployment

## Migration from Password Auth

Users will need to create new accounts with Clerk. Consider:
1. Communicating the change to existing users
2. Providing a grace period if needed
3. Offering OAuth sign-up for easier onboarding

## Support

For Clerk-specific issues:
- [Clerk Documentation](https://clerk.com/docs)
- [Clerk Discord](https://discord.com/invite/b5rXHjAg7A)
- [Clerk Support](https://clerk.com/support)

For Diogenes-specific issues:
- Check the main README.md
- Review CLAUDE.md for project architecture