# Diogenes - Single-Path Workflow Commands
# The contrarian AI chatbot that challenges conventional thinking

.DEFAULT_GOAL := help
.PHONY: help dev build start test lint format clean deploy

# Colors for output
RED := \033[31m
GREEN := \033[32m  
YELLOW := \033[33m
BLUE := \033[34m
RESET := \033[0m

help: ## Show this help message
	@echo "$(BLUE)Diogenes - The Digital Cynic$(RESET)"
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)  %-12s$(RESET) %s\n", $$1, $$2}'

dev: ## Start development server (primary dev command)
	@echo "$(YELLOW)Starting Diogenes development server...$(RESET)"
	@echo "$(BLUE)Access: http://localhost:3000 (password: diogenes2024)$(RESET)"
	npm run dev

build: ## Build for production
	@echo "$(YELLOW)Building Diogenes for production...$(RESET)"
	npm run build

start: ## Start production server (requires build first)
	@echo "$(YELLOW)Starting Diogenes in production mode...$(RESET)"
	npm start

test: ## Run all tests
	@echo "$(YELLOW)Running tests...$(RESET)"
	@echo "$(RED)No test suite configured yet. Run 'make setup-tests' to initialize.$(RESET)"

lint: ## Lint code and show issues
	@echo "$(YELLOW)Linting TypeScript and React code...$(RESET)"
	npm run lint

lint-fix: ## Lint and auto-fix issues where possible
	@echo "$(YELLOW)Linting and auto-fixing code issues...$(RESET)"
	npm run lint -- --fix

format: ## Format code with prettier (via next lint)
	@echo "$(YELLOW)Formatting code...$(RESET)"
	npm run lint -- --fix

quality: ## Run all quality checks (lint)
	@echo "$(YELLOW)Running quality checks...$(RESET)"
	@$(MAKE) lint

install: ## Install dependencies
	@echo "$(YELLOW)Installing dependencies...$(RESET)"
	npm install

clean: ## Clean build artifacts and node_modules
	@echo "$(YELLOW)Cleaning build artifacts...$(RESET)"
	rm -rf .next
	rm -rf node_modules
	rm -rf .vercel

deps-update: ## Update dependencies (be careful in production)
	@echo "$(YELLOW)Checking for dependency updates...$(RESET)"
	npm outdated
	@echo "$(BLUE)Run 'npm update' to update dependencies$(RESET)"

setup-env: ## Set up environment variables
	@echo "$(YELLOW)Setting up environment...$(RESET)"
	@if [ ! -f .env.local ]; then \
		cp .env.example .env.local; \
		echo "$(GREEN).env.local created from .env.example$(RESET)"; \
		echo "$(RED)Please edit .env.local with your actual API keys$(RESET)"; \
	else \
		echo "$(BLUE).env.local already exists$(RESET)"; \
	fi

setup-tests: ## Initialize test framework (Jest + Testing Library)
	@echo "$(YELLOW)Setting up test framework...$(RESET)"
	npm install --save-dev jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom
	@echo "$(GREEN)Test framework installed. Add test scripts to package.json$(RESET)"

deploy: ## Deploy to Vercel (requires git push or vercel CLI)
	@echo "$(YELLOW)Deploying Diogenes...$(RESET)"
	@if command -v vercel >/dev/null 2>&1; then \
		vercel --prod; \
	else \
		echo "$(BLUE)Vercel CLI not found. Deploying via git push...$(RESET)"; \
		git add -A && git commit -m "Deploy: $(shell date)" && git push origin main; \
		echo "$(GREEN)Pushed to main branch. Vercel will auto-deploy.$(RESET)"; \
	fi

typecheck: ## Run TypeScript type checking
	@echo "$(YELLOW)Running TypeScript type checking...$(RESET)"
	npx tsc --noEmit

analyze: ## Analyze bundle size
	@echo "$(YELLOW)Analyzing bundle size...$(RESET)"
	npm run build
	@echo "$(BLUE)Check .next/analyze/ for bundle analysis$(RESET)"

logs-dev: ## Show recent development logs
	@echo "$(YELLOW)Recent development logs:$(RESET)"
	@if [ -d logs ]; then \
		find logs -name "*.log" -mtime -1 | head -5 | xargs ls -la; \
	else \
		echo "$(BLUE)No logs directory found$(RESET)"; \
	fi

status: ## Show project status and health
	@echo "$(BLUE)Diogenes Project Status$(RESET)"
	@echo "Node version: $(shell node --version)"
	@echo "NPM version: $(shell npm --version)"
	@echo "Next.js version: $(shell npm list next --depth=0 2>/dev/null | grep next || echo 'Next.js not found')"
	@echo "Environment file: $(shell [ -f .env.local ] && echo '✓ Present' || echo '✗ Missing')"
	@echo "Dependencies: $(shell [ -d node_modules ] && echo '✓ Installed' || echo '✗ Missing')"
	@echo "Built: $(shell [ -d .next ] && echo '✓ Present' || echo '✗ Not built')"

quick-start: ## Quick start for new developers
	@echo "$(BLUE)Diogenes Quick Start$(RESET)"
	@$(MAKE) setup-env
	@$(MAKE) install
	@echo "$(GREEN)Setup complete! Run 'make dev' to start development$(RESET)"
	@echo "$(YELLOW)Don't forget to add your OPENROUTER_API_KEY to .env.local$(RESET)"

# Aliases for common typos and alternative commands
run: dev ## Alias for dev
serve: start ## Alias for start
fmt: format ## Alias for format
check: quality ## Alias for quality

# Advanced workflows
full-build: ## Clean build with dependency check
	@$(MAKE) clean
	@$(MAKE) install
	@$(MAKE) typecheck
	@$(MAKE) lint
	@$(MAKE) build

production-ready: ## Ensure production readiness
	@echo "$(YELLOW)Checking production readiness...$(RESET)"
	@$(MAKE) typecheck
	@$(MAKE) lint
	@$(MAKE) build
	@echo "$(GREEN)Production ready! ✓$(RESET)"

# Version management commands
version: ## Show current version
	@echo "$(BLUE)Diogenes Version Information$(RESET)"
	@npm run version:current
	@echo "Git commit: $(shell git rev-parse --short HEAD)"
	@echo "Git branch: $(shell git rev-parse --abbrev-ref HEAD)"
	@echo "Uncommitted changes: $(shell git status --porcelain | wc -l | xargs)"

version-patch: ## Bump patch version (0.0.x)
	@echo "$(YELLOW)Bumping patch version...$(RESET)"
	npm run version:patch

version-minor: ## Bump minor version (0.x.0)
	@echo "$(YELLOW)Bumping minor version...$(RESET)"
	npm run version:minor

version-major: ## Bump major version (x.0.0)
	@echo "$(YELLOW)Bumping major version...$(RESET)"
	npm run version:major

version-rc: ## Create release candidate version
	@echo "$(YELLOW)Creating release candidate...$(RESET)"
	npm run version:prerelease

changelog: ## Generate and display changelog
	@echo "$(BLUE)Recent Changes$(RESET)"
	@git log --pretty=format:"$(GREEN)%h$(RESET) - %s $(YELLOW)(%cr)$(RESET) <%an>" --abbrev-commit -10

changelog-full: ## Generate full changelog since last tag
	@echo "$(BLUE)Changes since last release$(RESET)"
	@if [ "$$(git describe --tags --abbrev=0 2>/dev/null)" ]; then \
		git log $$(git describe --tags --abbrev=0)..HEAD --pretty=format:"* %s (%h)" --reverse; \
	else \
		echo "$(YELLOW)No tags found. Showing all commits:$(RESET)"; \
		git log --pretty=format:"* %s (%h)" --reverse | head -20; \
	fi

release-notes: ## Generate release notes for current version
	@echo "$(BLUE)Release Notes for v$(shell node -p "require('./package.json').version")$(RESET)"
	@echo ""
	@echo "$(GREEN)Features:$(RESET)"
	@git log --grep="feat" --pretty=format:"  - %s" -10 2>/dev/null || echo "  No features in recent commits"
	@echo ""
	@echo "$(YELLOW)Fixes:$(RESET)"
	@git log --grep="fix" --pretty=format:"  - %s" -10 2>/dev/null || echo "  No fixes in recent commits"
	@echo ""
	@echo "$(BLUE)Other Changes:$(RESET)"
	@git log --pretty=format:"  - %s" -5

tag-list: ## List all version tags
	@echo "$(BLUE)Version Tags$(RESET)"
	@git tag -l "v*" | sort -V | tail -10

release-dry: ## Dry run of release process
	@echo "$(YELLOW)Release Dry Run$(RESET)"
	@echo "Current version: $(shell node -p "require('./package.json').version")"
	@echo "Next patch: $(shell npx semver $(shell node -p "require('./package.json').version") -i patch)"
	@echo "Next minor: $(shell npx semver $(shell node -p "require('./package.json').version") -i minor)"
	@echo "Next major: $(shell npx semver $(shell node -p "require('./package.json').version") -i major)"
	@echo ""
	@echo "Would perform:"
	@echo "  1. Run tests (when available)"
	@echo "  2. Build production bundle"
	@echo "  3. Update version in package.json"
	@echo "  4. Create git tag"
	@echo "  5. Push to repository"
	@echo "  6. Deploy to production"

release-patch: ## Release a patch version
	@echo "$(YELLOW)Releasing patch version...$(RESET)"
	@$(MAKE) production-ready
	@npm run release
	@echo "$(GREEN)Patch released! Don't forget to deploy.$(RESET)"

release-minor: ## Release a minor version
	@echo "$(YELLOW)Releasing minor version...$(RESET)"
	@$(MAKE) production-ready
	@npm run release:minor
	@echo "$(GREEN)Minor version released! Don't forget to deploy.$(RESET)"

release-major: ## Release a major version
	@echo "$(YELLOW)Releasing major version...$(RESET)"
	@echo "$(RED)Warning: Major version bump - ensure breaking changes are documented!$(RESET)"
	@read -p "Continue? (y/N) " confirm && [ "$$confirm" = "y" ] || exit 1
	@$(MAKE) production-ready
	@npm run release:major
	@echo "$(GREEN)Major version released! Don't forget to deploy and update documentation.$(RESET)"

# File organization commands
organize: ## Organize project files into proper directories
	@echo "$(YELLOW)Organizing project files...$(RESET)"
	@chmod +x scripts/utils/organize-files.sh 2>/dev/null || true
	@./scripts/utils/organize-files.sh
	@echo "$(GREEN)Files organized successfully!$(RESET)"

check-structure: ## Check for misplaced files in project root
	@echo "$(YELLOW)Checking project structure...$(RESET)"
	@echo "Files that may be misplaced in root:"
	@ls -la | grep -E '\.(js|ts|tsx|html|md)$$' | grep -v "README\|CLAUDE\|package\|next\.config\|tsconfig\|tailwind\|postcss\|next-env" || echo "$(GREEN)✓ Root directory is clean$(RESET)"
	@echo ""
	@echo "Test files outside of tests/ directory:"
	@find . -name "*.test.*" -o -name "*.spec.*" | grep -v node_modules | grep -v ".next" | grep -v "tests/" || echo "$(GREEN)✓ All test files properly located$(RESET)"

list-docs: ## List all documentation files
	@echo "$(BLUE)Documentation files:$(RESET)"
	@find docs -name "*.md" -type f 2>/dev/null | sort | sed 's/^/  /'

list-tests: ## List all test files
	@echo "$(BLUE)Test files:$(RESET)"
	@find tests -name "*.js" -o -name "*.ts" -o -name "*.html" 2>/dev/null | sort | sed 's/^/  /'