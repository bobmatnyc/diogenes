# Changelog

All notable changes to the Diogenes project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive semantic versioning and build tracking system
- Version display in UI header and footer with environment indicators
- Version API endpoint at `/api/version` for system information
- Version headers in all API responses (X-Version, X-Build-Id, X-Environment, X-Commit)
- Version management commands in Makefile
- Release automation scripts in package.json

## [0.1.0] - 2024-12-08

### Added
- Initial implementation of Diogenes - The contrarian AI chatbot
- Core philosophical character based on Diogenes of Sinope
- Anti-sycophancy features with configurable aggressiveness levels
- Multi-agent delegation system for intelligent web search
- Integration with Perplexity Sonar Pro for current information retrieval
- Real-time token tracking and cost estimation
- Session persistence with localStorage
- Password-protected authentication (development bypass available)
- Comprehensive logging system for development and debugging
- Agent memories and prompt tracking
- Edge runtime support for Vercel deployment
- Streaming responses with proper error handling
- Development and production environment configurations

### Features
- **Philosophical AI Character**: Embodies radical honesty, intellectual courage, and provocative questioning
- **Web Search Delegation**: Automatically detects when current information is needed and delegates to Perplexity
- **Token Metrics**: Real-time tracking of token usage and cost estimation
- **Streaming Interface**: Smooth, responsive chat experience with typing indicators
- **Session Management**: Persistent conversations across page refreshes
- **Development Tools**: Comprehensive logging, mock modes, and debugging utilities

### Technical Stack
- **Framework**: Next.js 15.5.2 with App Router
- **Runtime**: Edge runtime for optimal performance
- **AI Models**: 
  - Claude 3.5 Sonnet (primary conversation)
  - Perplexity Sonar Pro (web search)
- **Styling**: Tailwind CSS with custom Diogenes theme
- **State Management**: React hooks with localStorage persistence
- **API Integration**: OpenRouter for model access
- **Deployment**: Vercel with automatic GitHub integration

### Infrastructure
- Vercel deployment with edge runtime
- Environment-based configuration
- Comprehensive error handling and fallback mechanisms
- Development authentication bypass
- Production password protection

### Recent Updates

#### 2024-12-08
- `fix`: Remove runtime specification from vercel.json functions config (356514d)
- `fix`: Resolve Vercel streaming issues with edge runtime (ce1ed35)
- `feat`: Upgrade to Next.js 15.5.2 and React 19.1.1 (15a5048)

#### 2024-12-07
- `fix`: Resolve TypeScript compilation error in OpenAIStream (6be024b)
- `feat`: Prepare for Vercel production deployment (17b6f1e)
- `fix`: Resolve OpenAIStream compatibility issue with useChat hook (8cdb4cb)
- `fix`: Simplify chat interface and streaming implementation (a4abd64)

#### 2024-12-06
- `fix`: Resolve streaming response display issues in chat interface (da37289)
- `feat`: Add favicon assets and enhance chat interface with streaming fixes (16d2fc9)
- `fix`: Resolve chat interface display issues with streaming responses (b3a7f17)
- `fix`: Switch from edge to nodejs runtime to resolve size limit (84961bc)

#### 2024-12-05
- `refactor`: Implement dynamic OpenRouter client initialization (8eaf4e0)
- `feat`: Implement comprehensive token tracking and fix conversation persistence (0b10f5e)
- `feat`: Add development authentication bypass for local testing (cea2169)
- Add agent memories and prompt logs (6d5c80c)
- Initial implementation of Diogenes POC 1 (3856521)

## Philosophy

Diogenes challenges conventional thinking through:
- Socratic questioning that exposes assumptions
- Radical honesty that prioritizes truth over comfort
- Intellectual courage to tackle uncomfortable topics
- Modern cynicism applied to technology and social media
- Anti-sycophantic responses that avoid agreement for its own sake

## Development Guidelines

### Version Bumping
- **Patch** (0.0.x): Bug fixes, minor updates, documentation
- **Minor** (0.x.0): New features, non-breaking changes
- **Major** (x.0.0): Breaking changes, major architecture updates

### Release Process
1. Run tests (when available): `make test`
2. Check production readiness: `make production-ready`
3. Bump version: `make version-patch|minor|major`
4. Review changelog: `make changelog-full`
5. Deploy: `make deploy`

### Commit Message Format
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test additions or changes
- `chore`: Build process or auxiliary tool changes

## Future Roadmap

### Short Term (v0.2.0)
- [ ] Comprehensive test suite with Jest/Vitest
- [ ] Rate limiting implementation
- [ ] Enhanced error boundaries
- [ ] User feedback mechanism
- [ ] Search result caching

### Medium Term (v0.3.0)
- [ ] Conversation export/import functionality
- [ ] Advanced token analytics dashboard
- [ ] Multiple personality modes
- [ ] Enhanced authentication system
- [ ] Performance optimizations

### Long Term (v1.0.0)
- [ ] Voice synthesis integration
- [ ] Multi-language support
- [ ] Plugin architecture for extensibility
- [ ] Advanced conversation branching
- [ ] API documentation with OpenAPI spec

## Contributing

Please ensure all contributions:
1. Follow the established code style
2. Include appropriate tests
3. Update documentation as needed
4. Use conventional commit messages
5. Pass all quality checks

## License

This project is proprietary software. All rights reserved.

---

For more information, visit the [Diogenes Project Documentation](./docs/) or check the system status at `/api/version`.