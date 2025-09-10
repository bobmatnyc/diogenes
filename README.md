# Diogenes - The Digital Cynic

A contrarian AI chatbot that challenges conventional thinking through Socratic dialogue and philosophical provocation.

## Features

- **OAuth Authentication**: Secure authentication via Clerk (Google, GitHub, Email)
- Chat interface with streaming responses
- Session management using localStorage
- Core Diogenean system prompt
- Integration with OpenRouter API
- Web search delegation to Perplexity
- Real-time token tracking and cost estimation

## Quick Start

```bash
# Setup environment (first time)
cp .env.example .env.local
# Add your Clerk and OpenRouter API keys to .env.local

# Single-command development
make dev

# Or traditional Node.js way
npm run dev
```

**URL**: http://localhost:3000  
**Auth**: Sign in with email or OAuth providers

## Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Complete guide for Claude Code and AI agents  
- **[CLERK_SETUP.md](./CLERK_SETUP.md)** - Clerk authentication setup guide
- **[STRUCTURE.md](./STRUCTURE.md)** - Detailed project structure and architecture
- **[README.md](./README.md)** - This overview document

## Development

```bash
# Recommended: Use Makefile commands
make help          # Show all available commands
make dev           # Start development server
make build         # Build for production
make quality       # Run all quality checks

# Traditional npm scripts still work
npm install        # Install dependencies
npm run dev        # Run development server
npm run build      # Build for production
npm start          # Start production server
```

## Environment Variables

Create a `.env.local` file with:

```
# Required - Get from https://openrouter.ai
OPENROUTER_API_KEY=your_openrouter_api_key

# Required - Get from https://clerk.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Optional - For enhanced web search
TAVILY_API_KEY=your_tavily_api_key
```

## Tech Stack

- Next.js 15 with App Router
- TypeScript
- Tailwind CSS
- Vercel AI SDK for streaming
- OpenRouter for LLM access

## Deployment

Deploy to Vercel:

```bash
vercel
```

Or push to GitHub and connect to Vercel for automatic deployments.