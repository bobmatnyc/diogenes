# Project Structure - Diogenes

This document provides a complete overview of the Diogenes project structure for easy navigation and understanding.

## Root Directory

```
diogenes/
├── README.md              # Project overview and quick start
├── CLAUDE.md              # Complete AI agent guide
├── STRUCTURE.md           # This file - project structure
├── Makefile               # Single-path workflow commands
├── package.json           # Node.js dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── tailwind.config.js     # Tailwind CSS configuration
├── next.config.js         # Next.js configuration
├── .env.example           # Environment variables template
├── .env.local             # Local environment variables (gitignored)
└── .gitignore             # Git ignore rules
```

## Source Code (src/)

```
src/
├── app/                   # Next.js 15 App Router
│   ├── layout.tsx         # Root layout with auth protection
│   ├── page.tsx           # Landing page
│   ├── chat/
│   │   └── page.tsx       # Main chat interface page
│   ├── login/
│   │   └── page.tsx       # Password authentication page
│   └── api/
│       ├── chat/
│       │   └── route.ts   # Main streaming chat endpoint
│       └── test-stream/
│           └── route.ts   # Test streaming endpoint
├── components/            # React components
│   ├── AuthGate.tsx       # Password authentication wrapper
│   ├── ChatInterface.tsx  # Main chat UI component
│   ├── MessageBubble.tsx  # Individual message display
│   ├── MessageTokenBadge.tsx # Token count display
│   ├── InputForm.tsx      # Message input form
│   └── TokenMetrics.tsx   # Session token metrics
├── lib/                   # Core business logic
│   ├── agents/           # Multi-agent system
│   │   └── delegation-handler.ts # Web search delegation
│   ├── prompts/          # AI prompts and character
│   │   └── core-principles.ts # Diogenes system prompt
│   ├── tools/            # Utility tools
│   │   └── web-search.ts # Web search implementation
│   ├── auth.ts           # Authentication utilities
│   ├── env.ts            # Environment variable handling
│   ├── openrouter.ts     # OpenRouter API client
│   ├── session.ts        # Session management
│   └── tokens.ts         # Token counting utilities
├── types/                # TypeScript type definitions
│   └── chat.ts           # Chat-related types
└── middleware.ts         # Next.js middleware (auth)
```

## Key Files Explained

### Critical Files (🔴)

**`/src/app/api/chat/route.ts`**
- Main chat API endpoint
- Edge runtime configuration for Vercel
- Streaming response implementation
- Web search delegation integration

**`/src/lib/prompts/core-principles.ts`**
- Diogenes character system prompt (600+ words)
- Conversation starters array
- Core philosophical personality definition

**`/src/lib/openrouter.ts`**
- OpenRouter API client configuration
- Claude 3.5 Sonnet model selection
- API key management

### Important Files (🟡)

**`/src/lib/agents/delegation-handler.ts`**
- Multi-agent web search delegation
- Perplexity Sonar Pro integration
- Smart search decision making

**`/src/components/ChatInterface.tsx`**
- Main chat UI component
- Vercel AI SDK integration
- Real-time streaming display

**`/src/lib/session.ts`**
- localStorage session persistence
- Message history management
- Session ID generation

### Standard Files (🟢)

**`/src/components/AuthGate.tsx`**
- Password-based authentication
- Session validation
- Route protection

**`/src/lib/tokens.ts`**
- tiktoken-based token counting
- Real-time usage tracking
- Cost estimation utilities

## Build Artifacts

```
.next/                     # Next.js build output (gitignored)
node_modules/              # Dependencies (gitignored)
.vercel/                   # Vercel deployment cache (gitignored)
```

## Development Files

```
logs/                      # Development and MPM logs
├── mpm/                   # Claude MPM logs
└── prompts/               # Agent prompt logs

.claude-mpm/               # Claude MPM memory system
└── memories/              # Agent memory files
```

## Configuration Files

**`package.json`**
- Next.js 15.5.2, React 19.1.1
- Vercel AI SDK, OpenAI client
- TypeScript, Tailwind CSS

**`tsconfig.json`**
- Next.js TypeScript configuration
- Path aliases (@/ for src/)
- Strict type checking enabled

**`tailwind.config.js`**
- Tailwind CSS configuration
- Dark mode support
- Custom color schemes

**`next.config.js`**
- Next.js configuration
- Build optimizations
- API routes configuration

## Data Flow

1. **Request**: User → ChatInterface → /api/chat
2. **Analysis**: delegation-handler analyzes for search need
3. **Search** (optional): Perplexity Sonar Pro via OpenRouter
4. **Response**: Claude 3.5 Sonnet generates philosophical response
5. **Stream**: Vercel AI SDK streams response back to UI
6. **Persistence**: Session saved to localStorage

## Key Patterns

### Edge Runtime
All API routes use edge runtime for Vercel optimization:
```typescript
export const runtime = 'edge';
```

### Streaming Responses
OpenAIStream + StreamingTextResponse pattern:
```typescript
const stream = OpenAIStream(response);
return new StreamingTextResponse(stream);
```

### Multi-Agent Delegation
Analysis → Search → Integration pattern:
```typescript
const { enhancedMessages } = await orchestrateHybridResponse(messages);
```

### Type Safety
Zod schemas for validation:
```typescript
const webSearchSchema = z.object({
  query: z.string(),
  max_results: z.number().optional()
});
```

## Navigation Guide

- **Start Here**: [README.md](./README.md)
- **AI Agent Guide**: [CLAUDE.md](./CLAUDE.md)
- **Quick Commands**: `make help`
- **Main Chat Logic**: `src/app/api/chat/route.ts`
- **Diogenes Character**: `src/lib/prompts/core-principles.ts`
- **Web Search System**: `src/lib/agents/delegation-handler.ts`