# CLAUDE.md - Diogenes Project Guide

**Quick Start**: Development server auto-starts with claude-mpm → http://localhost:3000 (OAuth authentication via Clerk)

**Version**: 0.4.0 - Modern tooling with pnpm, Biome, Vitest, and Vercel Analytics

## Project Overview

**Diogenes** is a contrarian AI chatbot embodying the ancient Greek philosopher Diogenes of Sinope. Built with Next.js 15.5.2, it provides philosophical dialogue through Claude 3.5 Sonnet with intelligent web search delegation to Perplexity.

- **Live Site**: [Production URL] (OAuth authentication)
- **Philosophy**: Challenges conventional thinking through Socratic dialogue
- **Architecture**: Next.js + TypeScript + OpenRouter + Vercel AI SDK
- **Tooling**: pnpm (package manager) + Biome (linting/formatting) + Vitest (testing)

## 🔴 CRITICAL: Auto-Start Development Server

The development server **MUST** be running for claude-mpm to function effectively. This section ensures immediate productivity and continuous availability during development sessions.

### Initialization Process
When claude-mpm starts up, automatically execute:
```bash
# Start development server in background
make dev &

# Or directly with pnpm (alternative)
pnpm run dev &

# Wait for server startup
sleep 3

# Verify server is running
curl -f http://localhost:3000/api/health 2>/dev/null || echo "Server starting..."
```

**Expected Output**:
```
▲ Next.js 15.5.2
- Local:        http://localhost:3000
- ready in 2.1s
```

### Background Process Management

**Check if Dev Server is Running**:
```bash
# Check for Next.js dev server process
ps aux | grep "next.*dev" | grep -v grep

# Check port availability
lsof -ti:3000 | head -1

# Quick health check
curl -s http://localhost:3000 >/dev/null && echo "✅ Server running" || echo "❌ Server down"
```

**View Development Server Logs**:
```bash
# Real-time logs (if running in background)
tail -f .next/trace 2>/dev/null || echo "No trace file available"

# Check for errors in terminal output
# (Logs appear in terminal where `make dev` was started)

# Alternative: Check via make command
make logs-dev                      # Show recent development logs
```

**Restart Development Server**:
```bash
# Kill existing server
pkill -f "next.*dev" || echo "No server running"

# Wait for cleanup
sleep 2

# Start fresh server
make dev &

# Verify restart
sleep 3 && curl -s http://localhost:3000 >/dev/null && echo "✅ Restart successful"
```

**Monitor Server Health**:
```bash
# Continuous monitoring (run in separate terminal)
while true; do
  if curl -s http://localhost:3000 >/dev/null; then
    echo "$(date): ✅ Server healthy"
  else
    echo "$(date): ❌ Server down - restarting..."
    make dev &
  fi
  sleep 30
done
```

### Auto-Recovery Commands

**Server Health Check Script**:
```bash
#!/bin/bash
# Add to ~/.claude_mpm_startup or similar
check_dev_server() {
  if ! curl -s http://localhost:3000 >/dev/null; then
    echo "🔄 Starting development server..."
    cd /Users/masa/Projects/managed/diogenes
    make dev &
    sleep 5
    echo "✅ Development server started: http://localhost:3000"
  else
    echo "✅ Development server already running: http://localhost:3000"
  fi
}

# Run check
check_dev_server
```

**Critical Recovery Commands**:
```bash
# If server is completely stuck
pkill -9 -f "next.*dev"           # Force kill
rm -rf .next                      # Clear build cache
make clean                        # Clean all artifacts
make dev                          # Fresh start

# If port is occupied by another process
lsof -ti:3000 | xargs kill        # Kill process using port 3000
make dev                          # Restart server
```

### Integration with claude-mpm Startup

**Recommended Startup Sequence**:
1. **Environment Check**: Verify `.env.local` exists with required keys
2. **Dependency Check**: Ensure `node_modules` is installed
3. **Background Server Start**: Launch `make dev` in background
4. **Health Verification**: Wait for server to be responsive
5. **Ready Signal**: Confirm http://localhost:3000 is accessible

**Status Indicators**:
- 🟢 **Ready**: Server responsive at http://localhost:3000
- 🟡 **Starting**: Server initializing (wait 3-5 seconds)
- 🔴 **Failed**: Server not accessible (check logs and restart)

### Development URL Access

**Primary Development URL**: http://localhost:3000
- **Authentication**: OAuth via Clerk (Google/Email login required)
- **Chat Interface**: Available immediately after login
- **API Endpoint**: http://localhost:3000/api/chat (streaming endpoint)
- **Health Check**: http://localhost:3000/api/health (if available)

**Verification Steps**:
1. Navigate to http://localhost:3000
2. Complete OAuth authentication
3. Verify chat interface loads
4. Send test message to confirm streaming works
5. Check token counter updates in real-time

## 🔴 CRITICAL Components

### API Configuration
```bash
# Required environment variables
OPENROUTER_API_KEY=sk-or-v1-xxx                         # PRIMARY - Claude 3.5 Sonnet access
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx          # Clerk OAuth authentication
CLERK_SECRET_KEY=sk_test_xxx                           # Clerk backend authentication
```

### Core System Prompt
Location: `/src/lib/prompts/core-principles.ts`
- **DIOGENES_SYSTEM_PROMPT**: 600+ word character definition
- Embodies radical honesty, intellectual courage, provocative questioning
- Modern adaptations: tech critique, social media commentary, AI irony

### Streaming Implementation
- **Edge Runtime**: Required for Vercel deployment
- **File**: `/src/app/api/chat/route.ts`
- **Key Pattern**: OpenAIStream + StreamingTextResponse
- **Critical**: Uses `export const runtime = 'edge'`

## 🟡 IMPORTANT Features

### Web Search Delegation System
**Architecture**: Multi-agent pattern with intelligent routing
- **Analysis Agent**: Claude 3.5 Sonnet determines search need
- **Search Agent**: Perplexity Sonar Pro for current information
- **Integration**: Seamless context injection

**Files**:
- `/src/lib/agents/delegation-handler.ts` - Core orchestration
- `/src/lib/tools/web-search.ts` - Fallback search implementation

**Flow**:
1. `analyzeForDelegation()` - Determines if web search needed
2. `delegateToPerplexity()` - Executes search via OpenRouter
3. `orchestrateHybridResponse()` - Injects context into conversation

### Token Tracking System
- **Real-time**: tiktoken-based counting
- **Components**: TokenMetrics, MessageTokenBadge
- **Persistence**: localStorage session management

### Enhanced Loading Indicators
- **Contextual Messages**: Dynamic loading states based on operation type
- **Search Awareness**: Different messages when web search is performed
- **Personality-Specific**: Tailored messages for Diogenes vs Bob Matsuoka
- **Visual Feedback**: Animated icons and phase transitions
- **Implementation**: `LoadingIndicator` component with phase cycling
- **Headers**: `X-Search-Delegated` header indicates search operations

## 🟢 STANDARD Architecture

### Project Structure
```
src/
├── app/                     # Next.js App Router
│   ├── api/chat/route.ts   # Main chat endpoint
│   ├── page.tsx            # Landing page
│   └── chat/page.tsx       # Chat interface
├── components/             # React components
│   ├── ChatInterface.tsx   # Main chat UI
│   ├── AuthGate.tsx       # Password protection
│   └── MessageBubble.tsx  # Message display
├── lib/
│   ├── agents/            # Multi-agent delegation
│   ├── prompts/           # System prompts
│   ├── tools/             # Search tools
│   └── openrouter.ts      # API client
└── types/                 # TypeScript definitions
```

### Component Hierarchy
```
AuthGate
└── ChatInterface
    ├── MessageBubble (multiple)
    │   └── MessageTokenBadge
    ├── InputForm
    └── TokenMetrics
```

## Modern Development Stack (v0.4.0)

### Package Management - pnpm
- **Fast & Efficient**: Disk space optimization through content-addressable storage
- **Strict**: No phantom dependencies, better security
- **Commands**: All `npm` commands replaced with `pnpm` (e.g., `pnpm install`, `pnpm run dev`)
- **Lockfile**: `pnpm-lock.yaml` (gitignored for this project)

### Code Quality - Biome
- **All-in-One**: Replaces ESLint + Prettier with single fast tool
- **Configuration**: `biome.json` with comprehensive rules
- **Commands**:
  - `pnpm run lint:biome` - Check for issues
  - `pnpm run format:biome` - Format and fix code
  - `make lint` / `make format` - Makefile shortcuts

### Testing - Vitest
- **Fast**: Powered by Vite, instant HMR for tests
- **Compatible**: Works with existing Jest tests
- **Configuration**: `vitest.config.ts` with React Testing Library
- **Commands**:
  - `pnpm run test` - Run tests in watch mode
  - `pnpm run test:ui` - Interactive UI
  - `pnpm run test:coverage` - Coverage report
  - `make test` / `make test-ui` / `make test-coverage` - Makefile shortcuts

### Analytics
#### Vercel Analytics
- **Integrated**: Analytics component in layout
- **Automatic**: Tracks Core Web Vitals and custom events
- **Privacy-First**: GDPR compliant, no cookies required

#### Google Analytics
- **Production Only**: Only loads in production environment
- **Measurement ID**: Configured via `NEXT_PUBLIC_GA_ID`
- **Implementation**: Uses gtag.js with Next.js Script component
- **Strategy**: Loads with `afterInteractive` for optimal performance

## File Organization Guidelines

### Directory Structure & Purpose

```
diogenes/
├── src/                        # Application source code
│   ├── app/                   # Next.js App Router pages
│   ├── components/            # React components
│   │   └── *.test.tsx        # Component tests (colocated)
│   ├── lib/                   # Core business logic
│   └── types/                 # TypeScript definitions
├── docs/                       # Documentation
│   ├── design/                # Architecture, PRDs, planning
│   ├── api/                   # API documentation
│   ├── guides/                # User and developer guides
│   └── deployment/            # Deployment documentation
├── tests/                      # Test suites
│   ├── unit/                  # Unit tests
│   ├── integration/           # Integration tests
│   │   └── api/              # API endpoint tests
│   ├── e2e/                   # End-to-end tests
│   └── scripts/               # Test helper scripts
├── scripts/                    # Build and utility scripts
├── public/                     # Static assets
└── [root files]               # Config files only
```

### Where to Save Files

#### Documentation Files
- **Architecture/Design**: `/docs/design/` (e.g., system-architecture.md, prd-*.md)
- **API Specs**: `/docs/api/` (e.g., openapi.yaml, endpoints.md)
- **Guides**: `/docs/guides/` (e.g., developer-setup.md, user-manual.md)
- **Deployment**: `/docs/deployment/` (e.g., vercel-config.md, ci-cd.md)
- **Root Exceptions**: Only README.md, CLAUDE.md, CONTRIBUTING.md in root

#### Test Files
- **Component Tests**: Next to components as `*.test.tsx` or `*.spec.tsx`
  ```
  src/components/ChatInterface.tsx
  src/components/ChatInterface.test.tsx
  ```
- **Unit Tests**: `/tests/unit/` for isolated logic tests
- **Integration Tests**: `/tests/integration/` for feature tests
- **API Tests**: `/tests/integration/api/` for endpoint tests
- **E2E Tests**: `/tests/e2e/` for browser automation tests
- **Test Scripts**: `/tests/scripts/` for test utilities and helpers

#### Scripts & Utilities
- **Build Scripts**: `/scripts/build/` (e.g., optimize.js, analyze.js)
- **Development Tools**: `/scripts/dev/` (e.g., setup-db.js, seed-data.js)
- **Deployment**: `/scripts/deploy/` (e.g., pre-deploy.js, health-check.js)
- **Utilities**: `/scripts/utils/` (e.g., clean-logs.js, backup.js)

#### Configuration Files
- **Root Level Only**: package.json, tsconfig.json, next.config.js, .env.example
- **Never in src/**: Keep config files at project root

### Current Files Needing Organization

#### Files to Move (Currently in Root)
```bash
# Test files → /tests/
test-*.js           → /tests/integration/
test-*.html         → /tests/e2e/
quick-test.js       → /tests/scripts/

# Documentation → /docs/
STRUCTURE.md        → /docs/design/
TEST_REPORT.md      → /docs/guides/
STREAMING_FIX_*.md  → /docs/design/
WEB_SEARCH_*.md     → /docs/guides/

# Keep in root (project-critical)
✓ README.md         # Project overview
✓ CLAUDE.md         # This file - project guide
✓ Makefile          # Build automation
✓ package.json      # Dependencies
✓ next.config.js    # Next.js config
```

### Migration Commands

```bash
# Create proper directory structure
mkdir -p docs/{design,api,guides,deployment}
mkdir -p tests/{unit,integration/api,e2e,scripts}
mkdir -p scripts/{build,dev,deploy,utils}

# Move test files
mv test-*.js tests/integration/
mv test-*.html tests/e2e/
mv quick-test.js tests/scripts/

# Move documentation
mv STRUCTURE.md docs/design/
mv TEST_REPORT.md docs/guides/
mv STREAMING_FIX_SUMMARY.md docs/design/
mv WEB_SEARCH_SETUP.md docs/guides/

# Clean up old test screenshots
mkdir -p docs/assets
mv *.png docs/assets/
```

### File Placement Examples

#### Creating New Files
```bash
# ✅ CORRECT: Component test next to component
src/components/TokenMetrics.tsx
src/components/TokenMetrics.test.tsx

# ✅ CORRECT: API integration test
tests/integration/api/chat-endpoint.test.ts

# ✅ CORRECT: Design document
docs/design/multi-agent-architecture.md

# ❌ WRONG: Test file in root
test-new-feature.js  # Should be in tests/

# ❌ WRONG: Documentation in src/
src/components/README.md  # Should be in docs/guides/
```

#### Import Path Examples
```typescript
// From test files
import { ChatInterface } from '@/components/ChatInterface';
import { mockMessages } from '@/tests/scripts/mock-data';

// From source files
import { DIOGENES_SYSTEM_PROMPT } from '@/lib/prompts/core-principles';
import type { Message } from '@/types';
```

### Naming Conventions

#### Files
- **Components**: PascalCase (e.g., `ChatInterface.tsx`)
- **Utilities**: kebab-case (e.g., `token-counter.ts`)
- **Tests**: Match source + `.test` or `.spec` (e.g., `ChatInterface.test.tsx`)
- **Documentation**: kebab-case (e.g., `api-reference.md`)

#### Directories
- **Always**: lowercase, kebab-case (e.g., `web-search`, not `WebSearch`)
- **Exception**: Next.js app directory conventions

### Guidelines for New Files

1. **Before Creating**: Check if file can be added to existing module
2. **Location**: Follow directory structure above strictly
3. **Naming**: Use consistent conventions
4. **Tests**: Always create test file alongside new features
5. **Documentation**: Update relevant docs when adding features

### Clean Project Commands

```bash
# File organization commands (via Makefile)
make organize                  # Auto-organize files into proper directories
make check-structure           # Check for misplaced files
make list-docs                 # List all documentation files
make list-tests               # List all test files

# Manual checks
make status                    # Check overall project health

# Quick file operations
ls -la | grep -E '\.(js|ts|tsx|html)$' | grep -v config  # Check root
find . -name "*.test.*" | grep -v node_modules | grep -v tests/  # Find misplaced tests
find docs -name "*.md" | sort  # List all documentation
```

### File Organization Script

The project includes an automatic file organization script:
```bash
# Run directly
./scripts/utils/organize-files.sh

# Or via Makefile
make organize
```

This script will:
- Create proper directory structure
- Move test files to `/tests/`
- Move documentation to `/docs/`
- Move assets to `/docs/assets/`
- Report any remaining files needing attention

## ⚪ OPTIONAL Features

- Test endpoints (`/api/test-stream`)
- Mock search mode (`ENABLE_MOCK_SEARCH=true`)
- Development utilities (verbose logging)

## Single-Path Workflows

**Core Principle**: ONE command for each operation. Use `make help` to see all available commands.

### Development Workflow
```bash
# Initial setup (first time only)
make quick-start                    # Sets up environment and dependencies
make setup-env                     # Creates .env.local from example

# Daily development (auto-started with claude-mpm)
# Development server runs automatically in background
make status                        # Check project health and server status
curl -s http://localhost:3000 >/dev/null && echo "✅ Server ready" || make dev

# Manual server management (if needed)
make dev                           # Start development server manually
pkill -f "next.*dev"               # Stop development server

# View at: http://localhost:3000 (sign in with OAuth)
# Server auto-starts when claude-mpm initializes - no manual intervention needed
```

### Quality & Testing

**Current Status**: TypeScript ✅ Ready | Linting ✅ Biome Configured | Testing ✅ Vitest Ready

```bash
# Single-path quality checks
make typecheck                     # TypeScript validation
make lint                          # Code linting with Biome
make lint-fix                      # Auto-fix with Biome  
make format                        # Code formatting with Biome
make quality                       # All quality checks at once

# Testing commands
make test                          # Run tests in watch mode
make test-ui                       # Interactive test UI
make test-coverage                 # Coverage report
```

**Development Standards**:
- **TypeScript**: Strict mode enabled, full type coverage
- **Linting**: Biome with comprehensive rule set for React/TypeScript  
- **Formatting**: Biome auto-formatting (100 char line width, 2-space indent)
- **Testing**: Vitest + React Testing Library (80% coverage threshold)

### Build & Deploy
```bash
# Production build
make build                         # Build for production
make full-build                    # Clean + build with all checks
make production-ready              # Verify deployment readiness

# Deployment options
make deploy                        # Auto-deploy (git push or Vercel CLI)
git push origin main               # Alternative: trigger Vercel auto-deploy

# Production server (local)
make start                         # Start production build locally
```

### Maintenance & Utilities
```bash
# Project maintenance
make clean                         # Remove build artifacts
make install                       # Install/reinstall dependencies
make deps-update                   # Check for dependency updates

# Development utilities
make analyze                       # Bundle size analysis
make logs-dev                      # Show recent development logs
```

### Makefile Command Reference

The project uses a comprehensive Makefile with colored output and help system:

| Command | Purpose | Notes |
|---------|---------|-------|
| `make help` | Show all available commands | Default goal |
| `make dev` | Start development server | Primary development command |
| `make build` | Build for production | Required before `make start` |
| `make deploy` | Deploy to production | Uses Vercel CLI or git push |
| `make quality` | Run all quality checks | Combines lint + typecheck |
| `make quick-start` | New developer setup | Environment + dependencies |

**Aliases**: Common alternatives work too:
- `make run` → `make dev`
- `make serve` → `make start`  
- `make fmt` → `make format`
- `make check` → `make quality`

## Environment Configuration

### Required Environment Variables

**CRITICAL**: These must be set for the application to function:

```env
# REQUIRED: OpenRouter API access
OPENROUTER_API_KEY=sk-or-v1-xxx           # Get from https://openrouter.ai/keys

# REQUIRED: Clerk authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx   # Clerk OAuth config
CLERK_SECRET_KEY=sk_test_xxx                     # Clerk backend key

# OPTIONAL: Analytics
NEXT_PUBLIC_GA_ID=G-RJ5SZ5DT1X           # Google Analytics measurement ID

# OPTIONAL: Web search configuration
TAVILY_API_KEY=tvly-xxx                   # Enhanced search via Tavily
ENABLE_MOCK_SEARCH=false                  # Set true for testing without API calls
NODE_ENV=development                      # Enables verbose logging
```

### Environment Setup Process

```bash
# Option 1: Automated setup
make setup-env                            # Creates .env.local from .env.example
# Edit .env.local with your actual API keys

# Option 2: Manual setup
cp .env.example .env.local
# Edit .env.local with your values

# Verify environment setup
make status                               # Shows environment file status
```

### Development (.env.local)
Copy from `.env.example` and configure:

| Variable | Purpose | Required | Default |
|----------|---------|----------|---------|
| `OPENROUTER_API_KEY` | Claude 3.5 + Perplexity access | ✅ Yes | none |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | OAuth authentication | ✅ Yes | none |
| `CLERK_SECRET_KEY` | Backend authentication | ✅ Yes | none |
| `TAVILY_API_KEY` | Enhanced search API | ⚪ Optional | none |
| `ENABLE_MOCK_SEARCH` | Testing without API calls | ⚪ Optional | false |
| `NODE_ENV` | Environment mode | ⚪ Optional | development |

### Production (Vercel)

**Deployment Environment**:
- Configure same variables in Vercel dashboard
- Auto-deploys from GitHub main branch  
- Edge runtime for global performance
- 30-second timeout for chat API

**Vercel Configuration**:
```json
{
  "functions": {
    "src/app/api/chat/route.ts": { "maxDuration": 30 }
  }
}
```

**Environment Variable Setup in Vercel**:
1. Go to Project Settings → Environment Variables
2. Add production values for all required variables
3. Deploy via `make deploy` or `git push origin main`

## API Documentation

### POST /api/chat
**Purpose**: Stream philosophical responses with optional web search

**Request**:
```json
{
  "messages": [
    {"role": "user", "content": "What's happening with AI today?"}
  ]
}
```

**Response**: Server-Sent Events stream
```
data: {"content": "Ah, you seek current wisdom..."}
data: {"content": " from the digital oracle?"}
data: [DONE]
```

**Headers**:
- `X-Search-Delegated: true` - If web search was performed
- `Content-Type: text/event-stream`

## Diogenes Philosophy Implementation

### Character Traits
- **Radical Honesty**: Challenges assumptions directly
- **Intellectual Courage**: Tackles uncomfortable truths
- **Provocative Questions**: Uses Socratic method
- **Modern Cynicism**: Critiques tech/social media

### Conversation Patterns
- Starts with random cynical greeting
- Questions user motivations
- Uses vivid analogies and metaphors
- Integrates current information philosophically
- Never offers easy answers

### Citation Style
- Inline links: `[this truth](https://example.com)`
- Embedded in natural conversation
- Direct integration, not footnotes

## Memory Management

### Session Persistence
- **Client-side**: localStorage
- **Key**: 'diogenes-session'
- **Data**: messages[], sessionId, timestamp

### Token Tracking
- **Library**: js-tiktoken
- **Model**: gpt-4 tokenizer (close enough for Claude)
- **Real-time**: Updates per message

## Development Patterns

### Error Handling
- Comprehensive logging in development
- Graceful degradation for API failures
- Fallback search mechanisms

### Type Safety
- Full TypeScript coverage
- Zod schemas for API validation
- Proper interface definitions

### Performance
- Edge runtime deployment
- Streaming responses
- Efficient token counting

## Common Operations

### Add New Conversation Starter
Edit `/src/lib/prompts/core-principles.ts`:
```typescript
export const CONVERSATION_STARTERS = [
  "Existing starters...",
  "Your new cynical greeting here"
];
```

### Configure Search Behavior
Edit `/src/lib/agents/delegation-handler.ts`:
- Modify `checkForSearchTriggers()` for new keywords
- Adjust confidence thresholds
- Change model selections

### Update System Prompt
Edit `DIOGENES_SYSTEM_PROMPT` in `/src/lib/prompts/core-principles.ts`
- Maintain philosophical consistency
- Test with various conversation types

## Troubleshooting

### Common Issues

**Messages Disappearing During Streaming** 🔴 CRITICAL:
- **Root Cause**: Type mismatch between Uint8Array (from OpenAIStream) and string (expected by middleware)
- **Quick Fix**: Ensure middleware uses `TransformStream<Uint8Array, Uint8Array>` with TextDecoder/TextEncoder
- **Files to Check**: 
  - `/src/lib/ai/middleware.ts` - createTransformStream() method
  - `/src/app/api/chat/route.ts` - Stream handling
- **Full Guide**: See `STREAMING_FIX_GUIDE.md` for comprehensive solution
- **Test**: Messages should appear character-by-character and persist after streaming

**Streaming Fails**:
- Check OPENROUTER_API_KEY is valid
- Ensure edge runtime is enabled (`export const runtime = 'edge'`)
- Verify model availability
- Check for Uint8Array vs string type mismatches in middleware

**Search Not Working**:
- Mock mode enabled? Check ENABLE_MOCK_SEARCH
- Perplexity model accessible via OpenRouter?
- Check delegation confidence thresholds

**Authentication Issues**:
- Verify NEXT_PUBLIC_APP_PASSWORD matches
- Check localStorage isn't cleared
- Ensure middleware.ts is functioning

### Debug Mode
```bash
# Enable verbose logging
export NODE_ENV=development
export VERCEL_ENV=preview
pnpm run dev
```

## Integration Points

### OpenRouter Models
- **Primary**: `anthropic/claude-3.5-sonnet-20241022`
- **Search**: `perplexity/sonar-pro`
- **Fallback**: `perplexity/llama-3.1-sonar-large-128k-online`

### Vercel AI SDK
- **OpenAIStream**: Converts OpenRouter response
- **useChat**: Client-side streaming hook
- **StreamingTextResponse**: Server response wrapper

## Future Enhancements

### High Priority
- [ ] Comprehensive test suite
- [ ] Rate limiting implementation  
- [ ] Enhanced error boundaries
- [ ] User feedback mechanism

### Medium Priority
- [ ] Conversation export/import
- [ ] Advanced token analytics
- [ ] Multiple personality modes
- [ ] Search result caching

### Low Priority
- [ ] Voice synthesis
- [ ] Multi-language support
- [ ] Plugin architecture
- [ ] Advanced authentication

---

## Quick Reference

### Essential Commands
| Action | Command | Notes |
|--------|---------|-------|
| **New Developer** | `make quick-start` | One-time setup |
| **Daily Development** | *Auto-started* | Server runs with claude-mpm |
| **Check Server Status** | `make status` | Server health + project overview |
| **Check Quality** | `make quality` | All linting + typecheck |
| **Deploy** | `make deploy` | Auto-deploy to production |

### Key Files & Architecture
| Component | File Path | Purpose |
|-----------|-----------|---------|
| **Chat API** | `/src/app/api/chat/route.ts` | Main streaming endpoint |
| **System Prompt** | `/src/lib/prompts/core-principles.ts` | Diogenes character definition |
| **Main UI** | `/src/components/ChatInterface.tsx` | React chat interface |
| **Delegation** | `/src/lib/agents/delegation-handler.ts` | Web search orchestration |
| **Token Tracking** | `/src/lib/tokens.ts` | Cost calculation system |
| **Session Management** | `/src/lib/session.ts` | localStorage persistence |

### Critical Information
- **Auto-Start**: Development server launches automatically with claude-mpm
- **Authentication**: OAuth via Clerk (Google/Email)
- **Local URL**: http://localhost:3000  
- **Philosophy**: Challenge everything, especially the obvious
- **Edge Runtime**: Required for Vercel streaming
- **Primary Model**: `anthropic/claude-3.5-sonnet-20241022`
- **Search Model**: `perplexity/sonar-pro`

### Emergency Troubleshooting
```bash
# If development fails
make status                    # Check environment and dependencies
make clean && make install    # Nuclear option: clean + reinstall
make setup-env                 # Recreate environment file

# If deployment fails  
make production-ready          # Verify all checks pass
make full-build               # Clean build with validation
```