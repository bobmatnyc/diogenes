# Diogenes - The Digital Cynic

A contrarian AI chatbot that challenges conventional thinking through Socratic dialogue and philosophical provocation.

## POC 1 Features

- Fixed password authentication (password: diogenes2024)
- Chat interface with streaming responses
- Session management using localStorage
- Core Diogenean system prompt
- Integration with OpenRouter API

## Quick Start

```bash
# Single-command development
make dev

# Or traditional Node.js way
npm run dev
```

**Password**: `diogenes2024`  
**URL**: http://localhost:3000

## Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Complete guide for Claude Code and AI agents  
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
OPENROUTER_API_KEY=your_openrouter_api_key
NEXT_PUBLIC_APP_PASSWORD=diogenes2024
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