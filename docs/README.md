# Diogenes Documentation

This directory contains all project documentation organized by category.

## Directory Structure

### `/design`
Architecture decisions, system design documents, and technical specifications.
- `anti-sycophancy-architecture.md` - Anti-sycophancy system design
- `STREAMING_FIX_SUMMARY.md` - Streaming implementation details
- `STRUCTURE.md` - Project structure overview

### `/api`
API documentation, endpoint specifications, and integration guides.
- *Currently empty - will contain OpenAPI specs and endpoint documentation*

### `/guides`
User guides, developer documentation, and testing reports.
- `AUTH_DEVELOPMENT.md` - Authentication development guide
- `TEST_REPORT.md` - Comprehensive testing report
- `WEB_SEARCH_SETUP.md` - Web search integration guide
- Various test reports and persistence documentation

### `/deployment`
Deployment configurations, CI/CD documentation, and production guides.
- `VERCEL_STREAMING_FIX.md` - Vercel streaming configuration

### `/prd`
Product requirement documents and specifications.
- `diogenes_prd_spec.md` - Main product requirements document

### `/assets`
Images, screenshots, and other media files.
- Test screenshots and visual documentation

## Quick Links

- [Main Project Guide](../CLAUDE.md) - Comprehensive project documentation
- [Project README](../README.md) - Project overview and quick start
- [Makefile Commands](../Makefile) - Available build commands

## Documentation Standards

1. **File Naming**: Use kebab-case for all documentation files
2. **Markdown Format**: All docs should be in Markdown format
3. **Categories**: Place docs in the appropriate subdirectory
4. **Updates**: Keep documentation current with code changes

## Finding Documentation

Use these commands to explore documentation:

```bash
# List all documentation
make list-docs

# Search for specific topics
grep -r "search term" docs/

# View documentation structure
tree docs/
```