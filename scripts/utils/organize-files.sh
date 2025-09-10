#!/bin/bash

# Diogenes Project File Organization Script
# This script organizes scattered files into proper directories
# according to the structure defined in CLAUDE.md

set -e  # Exit on error

echo "🗂️  Organizing Diogenes project files..."

# Create directory structure
echo "📁 Creating directory structure..."
mkdir -p docs/{design,api,guides,deployment,assets,prd}
mkdir -p tests/{unit,integration/api,e2e,scripts}
mkdir -p scripts/{build,dev,deploy}

# Move test files
echo "🧪 Moving test files..."
if ls test-*.js 2>/dev/null; then
    mv test-*.js tests/integration/ 2>/dev/null || true
    echo "  ✓ Moved JavaScript test files to tests/integration/"
fi

if ls test-*.html 2>/dev/null; then
    mv test-*.html tests/e2e/ 2>/dev/null || true
    echo "  ✓ Moved HTML test files to tests/e2e/"
fi

if [ -f quick-test.js ]; then
    mv quick-test.js tests/scripts/ 2>/dev/null || true
    echo "  ✓ Moved quick-test.js to tests/scripts/"
fi

# Move documentation files
echo "📚 Moving documentation files..."
if [ -f STRUCTURE.md ]; then
    mv STRUCTURE.md docs/design/ 2>/dev/null || true
    echo "  ✓ Moved STRUCTURE.md to docs/design/"
fi

if [ -f TEST_REPORT.md ]; then
    mv TEST_REPORT.md docs/guides/ 2>/dev/null || true
    echo "  ✓ Moved TEST_REPORT.md to docs/guides/"
fi

if [ -f STREAMING_FIX_SUMMARY.md ]; then
    mv STREAMING_FIX_SUMMARY.md docs/design/ 2>/dev/null || true
    echo "  ✓ Moved STREAMING_FIX_SUMMARY.md to docs/design/"
fi

if [ -f WEB_SEARCH_SETUP.md ]; then
    mv WEB_SEARCH_SETUP.md docs/guides/ 2>/dev/null || true
    echo "  ✓ Moved WEB_SEARCH_SETUP.md to docs/guides/"
fi

if [ -f VERCEL_STREAMING_FIX.md ]; then
    mv VERCEL_STREAMING_FIX.md docs/deployment/ 2>/dev/null || true
    echo "  ✓ Moved VERCEL_STREAMING_FIX.md to docs/deployment/"
fi

if [ -f AUTH_DEVELOPMENT.md ]; then
    mv AUTH_DEVELOPMENT.md docs/guides/ 2>/dev/null || true
    echo "  ✓ Moved AUTH_DEVELOPMENT.md to docs/guides/"
fi

if [ -f TEST_SUMMARY.md ]; then
    mv TEST_SUMMARY.md docs/guides/ 2>/dev/null || true
    echo "  ✓ Moved TEST_SUMMARY.md to docs/guides/"
fi

if [ -f TESTING_REPORT.md ]; then
    mv TESTING_REPORT.md docs/guides/ 2>/dev/null || true
    echo "  ✓ Moved TESTING_REPORT.md to docs/guides/"
fi

if [ -f CONVERSATION_PERSISTENCE_TEST_REPORT.md ]; then
    mv CONVERSATION_PERSISTENCE_TEST_REPORT.md docs/guides/ 2>/dev/null || true
    echo "  ✓ Moved CONVERSATION_PERSISTENCE_TEST_REPORT.md to docs/guides/"
fi

if [ -f test-session-persistence.md ]; then
    mv test-session-persistence.md docs/guides/ 2>/dev/null || true
    echo "  ✓ Moved test-session-persistence.md to docs/guides/"
fi

# Move image assets
echo "🖼️  Moving image assets..."
if ls *.png 2>/dev/null; then
    mv *.png docs/assets/ 2>/dev/null || true
    echo "  ✓ Moved PNG files to docs/assets/"
fi

# Check for any PRD files in docs/
if [ -d "docs/prd" ] && [ "$(ls -A docs/prd)" ]; then
    echo "  ✓ PRD files already in docs/prd/"
fi

# Summary
echo ""
echo "✅ File organization complete!"
echo ""
echo "📊 New structure:"
echo "  docs/"
echo "    ├── design/      - Architecture and design documents"
echo "    ├── api/         - API documentation"
echo "    ├── guides/      - User and developer guides"
echo "    ├── deployment/  - Deployment documentation"
echo "    ├── assets/      - Images and media"
echo "    └── prd/         - Product requirement documents"
echo ""
echo "  tests/"
echo "    ├── unit/        - Unit tests"
echo "    ├── integration/ - Integration tests"
echo "    ├── e2e/         - End-to-end tests"
echo "    └── scripts/     - Test utilities"
echo ""
echo "  scripts/"
echo "    ├── build/       - Build scripts"
echo "    ├── dev/         - Development tools"
echo "    ├── deploy/      - Deployment scripts"
echo "    └── utils/       - Utility scripts (including this one)"
echo ""

# Check for remaining files that might need attention
echo "🔍 Checking for remaining files in root..."
remaining=$(ls -la | grep -E '\.(js|ts|tsx|html|md)$' | grep -v "README\|CLAUDE\|package\|next\.config\|tsconfig\|tailwind\|postcss\|next-env" | wc -l)
if [ "$remaining" -gt 0 ]; then
    echo "⚠️  Found $remaining files that may still need organizing:"
    ls -la | grep -E '\.(js|ts|tsx|html|md)$' | grep -v "README\|CLAUDE\|package\|next\.config\|tsconfig\|tailwind\|postcss\|next-env"
else
    echo "✨ Root directory is clean!"
fi

echo ""
echo "💡 Tip: Run 'make status' to check overall project health"