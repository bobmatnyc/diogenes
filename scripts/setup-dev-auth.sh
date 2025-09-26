#!/bin/bash

# Setup script for development authentication bypass
# This script configures the local environment for seamless development

echo "🔧 Setting up development authentication bypass..."

# Check if .env.local exists
if [ -f .env.local ]; then
    echo "📄 .env.local already exists. Creating backup..."
    cp .env.local .env.local.backup.$(date +%Y%m%d_%H%M%S)
fi

# Check if we should update .env.local
read -p "Would you like to configure .env.local for development mode? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Check if OpenRouter API key is provided
    read -p "Enter your OpenRouter API key (or press Enter to skip): " OPENROUTER_KEY

    # Create .env.local with development configuration
    cat > .env.local << EOF
# ============================================
# Development Configuration - Auth Bypass Enabled
# Generated on $(date)
# ============================================

# Clerk Authentication (Optional in Development)
# Leave empty for automatic auth bypass on localhost
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Force Authentication in Development (Optional)
# Uncomment and set to "true" to require auth in dev mode
# NEXT_PUBLIC_FORCE_AUTH_IN_DEV=false

# Development Mode Indicator
# This helps identify when running in dev mode
NEXT_PUBLIC_ENV_MODE=development

# Clerk Redirect URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/chat
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/chat

# OpenRouter API Configuration (Required)
OPENROUTER_API_KEY=${OPENROUTER_KEY:-your_openrouter_api_key_here}

# Memory API Configuration
NEXT_PUBLIC_MEMORY_API_KEY=internal_diogenes_key

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Search Configuration
# TAVILY_API_KEY=your_tavily_api_key_here
ENABLE_MOCK_SEARCH=false

# Optional: Analytics (disabled in dev)
# NEXT_PUBLIC_GA_ID=

# Kuzu Memory Configuration
MEMORY_MAX_PER_USER=1000
MEMORY_TTL_DAYS=30
MEMORY_AUTO_EXTRACT=true
EOF

    echo "✅ .env.local configured for development mode"
    echo ""
    echo "📝 Configuration Summary:"
    echo "  - Auth Bypass: Enabled for localhost"
    echo "  - Dev User: Bob Matsuoka (ID: dev_user_bob_matsuoka)"
    echo "  - Email: bob@localhost.dev"
    echo "  - Memory System: Configured with dev user"
    echo ""

    if [ -z "$OPENROUTER_KEY" ]; then
        echo "⚠️  Warning: OpenRouter API key not set"
        echo "   Please update OPENROUTER_API_KEY in .env.local"
    fi
else
    echo "⏭️  Skipping .env.local configuration"
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📦 Installing dependencies..."
    pnpm install
fi

echo ""
echo "🚀 Setup complete! To start the development server:"
echo ""
echo "  pnpm run dev"
echo ""
echo "Then navigate to http://localhost:3000"
echo ""
echo "💡 Tips:"
echo "  - Authentication is automatically bypassed on localhost"
echo "  - You'll be logged in as 'Bob Matsuoka' automatically"
echo "  - To test with real Clerk auth, set NEXT_PUBLIC_FORCE_AUTH_IN_DEV=true"
echo "  - Production deployments will use proper authentication"
echo ""