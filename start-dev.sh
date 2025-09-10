#!/bin/bash

# Kill any existing Next.js dev servers
echo "Stopping any existing dev servers..."
pkill -f "next dev" || true
pkill -f "pnpm run dev" || true

# Wait for processes to terminate
sleep 2

# Clear Next.js cache
echo "Clearing Next.js cache..."
rm -rf .next

# Unset any existing environment variables that might conflict
unset OPENROUTER_API_KEY
unset ENABLE_MOCK_SEARCH

# Load environment from .env.local
export $(grep -v '^#' .env.local | xargs)

# Verify the correct key is loaded
echo "Using OpenRouter API key: ${OPENROUTER_API_KEY:0:30}..."

# Start the development server
echo "Starting development server..."
exec pnpm run dev
