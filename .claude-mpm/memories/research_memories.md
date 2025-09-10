# Agent Memory: research
<!-- Last Updated: 2025-09-09T02:43:00.000000Z -->

## Project: Diogenes - Contrarian AI Chatbot

### Architecture Patterns
- **Multi-Agent System**: Uses Claude 3.5 Sonnet for analysis + Perplexity Sonar for search
- **Edge Runtime**: Critical for Vercel deployment and streaming performance
- **Hybrid Delegation**: Intelligent routing between philosophical response and web search
- **Token Tracking**: Real-time tiktoken-based usage monitoring

### Key Technical Decisions  
- **OpenRouter Integration**: Single API for multiple LLM models (Claude + Perplexity)
- **Vercel AI SDK**: OpenAIStream + StreamingTextResponse for real-time streaming
- **localStorage Sessions**: Client-side persistence without backend complexity
- **TypeScript + Zod**: Full type safety with runtime validation

### Critical Components
- `/src/app/api/chat/route.ts` - Main streaming API with delegation
- `/src/lib/agents/delegation-handler.ts` - Multi-agent orchestration  
- `/src/lib/prompts/core-principles.ts` - 600+ word Diogenes character prompt
- `CLAUDE.md` - Comprehensive AI agent documentation with priority system

### Optimization Patterns
- **Single-Path Workflows**: Makefile with `make dev`, `make build`, `make deploy`
- **Documentation Hierarchy**: README → CLAUDE.md → STRUCTURE.md
- **Priority System**: 🔴 Critical, 🟡 Important, 🟢 Standard, ⚪ Optional
- **Edge Runtime**: Explicit configuration for global performance
