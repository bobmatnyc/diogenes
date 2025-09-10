# Agentic Coder Optimizer - Project Memories

## Diogenes Project - Optimization Patterns

### Project Architecture
- **Framework**: Next.js 15.5.2 with App Router and Edge Runtime
- **Language**: TypeScript with strict mode enabled
- **Deployment**: Vercel with 30-second timeout configuration
- **Authentication**: Simple password-based demo authentication
- **AI Models**: Claude 3.5 Sonnet (primary) + Perplexity Sonar Pro (search)

### Single-Path Workflow Implementation
- **Makefile**: Comprehensive with colored output and help system
- **Commands**: One command per operation (`make dev`, `make deploy`, etc.)
- **Aliases**: Common alternatives supported (`make run` → `make dev`)
- **Automation**: `make quick-start` for new developer onboarding

### Critical Optimization Discoveries
- **Edge Runtime**: Required for Vercel streaming with `export const runtime = 'edge'`
- **Streaming Pattern**: OpenAIStream + StreamingTextResponse from Vercel AI SDK
- **Environment**: OPENROUTER_API_KEY is critical, NEXT_PUBLIC_APP_PASSWORD required
- **Build Issues**: Next.js lint deprecated, requires ESLint CLI migration

### Documentation Structure (Priority-Based)
- 🔴 CRITICAL: API keys, streaming config, edge runtime
- 🟡 IMPORTANT: Character prompts, delegation logic, deployment
- 🟢 STANDARD: Development workflow, architecture, testing
- ⚪ OPTIONAL: Future enhancements, additional features

### Quality Standards Status
- ✅ TypeScript: Fully configured with strict mode
- ⚠️ Linting: Needs Next.js 15 migration (`npx @next/codemod@canary next-lint-to-eslint-cli .`)
- ❌ Testing: Setup available but not configured

### Multi-Agent Architecture Pattern
- **Analysis Agent**: Claude 3.5 Sonnet for delegation decisions
- **Search Agent**: Perplexity Sonar Pro for current information
- **Integration Pattern**: Context injection with philosophical integration
- **Fallback System**: Multiple layers of error handling

### Development Patterns
- **Session Management**: localStorage with comprehensive token tracking
- **Error Handling**: Graceful degradation with fallback mechanisms  
- **Type Safety**: Full TypeScript coverage with Zod validation
- **Performance**: Edge runtime + streaming responses

### Deployment Configuration
- **Vercel Functions**: Specific timeout configuration for chat endpoint
- **Environment Variables**: Clear required vs optional documentation
- **Auto-deployment**: GitHub integration with manual override option

### Memory for Future Optimizations
- Consider implementing rate limiting for production
- Test suite needs Jest + React Testing Library setup
- Bundle analysis available through `make analyze`  
- Search result caching could improve performance
- Enhanced error boundaries for production robustness

### Project Health Indicators
- Environment file presence and API key configuration
- Node modules and build directory status
- TypeScript compilation success
- Development server startup reliability

This project demonstrates excellent single-path workflow optimization with comprehensive Makefile automation and clear priority-based documentation structure.