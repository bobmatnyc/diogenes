#!/bin/bash

# Start development server with the correct API key from .env.local
# This overrides any environment variable that might be set in your shell

# Load the API key from .env.local
if [ -f .env.local ]; then
    export $(grep OPENROUTER_API_KEY .env.local | xargs)
    echo "✅ Loaded OPENROUTER_API_KEY from .env.local"
else
    echo "❌ Error: .env.local file not found"
    exit 1
fi

# Start the development server
echo "🚀 Starting Diogenes dev server..."
pnpm run dev