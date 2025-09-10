# Web Search Integration for Diogenes

## Overview

Diogenes now has web search capabilities that allow him to access current information while maintaining his philosophical, contrarian character. When users ask about recent events, current data, or information beyond his training cutoff, Diogenes will search the web and weave the results into his philosophical discourse.

## How It Works

1. **Automatic Detection**: The system automatically detects when a query might need current information based on keywords like "today", "current", "latest", "2024", "2025", etc.

2. **Search Execution**: When triggered, the system performs a web search and adds the results to the context before generating Diogenes' response.

3. **Philosophical Integration**: Diogenes maintains his character while incorporating search results, often questioning the sources and using facts as springboards for deeper philosophical inquiry.

## Setup Instructions

### Using Mock Search (Default)

The system works out of the box with mock search results for testing. No additional setup required.

### Using Real Web Search (Tavily)

1. **Get a Tavily API Key**
   - Visit [https://tavily.com](https://tavily.com)
   - Sign up for a free account
   - Copy your API key from the dashboard

2. **Add to Environment Variables**
   ```bash
   # Add to .env.local
   TAVILY_API_KEY=your-api-key-here
   ```

3. **Restart the Development Server**
   ```bash
   npm run dev
   ```

## Testing the Integration

### Basic Test
```bash
# Test that search is triggered for current events
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"What happened in the news today?"}]}'
```

### Run Test Suite
```bash
# Basic test
node test-web-search.js

# Detailed test with analysis
node test-search-detailed.js
```

## Example Queries That Trigger Search

- "What's the current price of Bitcoin?"
- "What happened in the news today?"
- "Tell me about the latest AI developments in 2024"
- "Who won the recent election?"
- "What's the weather like now?"

## Example Queries That Don't Trigger Search

- "What is virtue?"
- "Tell me about Socrates"
- "What is the meaning of life?"
- "Explain stoicism"

## Architecture

### Components

1. **`/src/app/api/chat/route.ts`**
   - Main API endpoint
   - Detects when search is needed
   - Integrates search results into context
   - Maintains streaming response

2. **`/src/lib/tools/web-search.ts`**
   - Web search implementation
   - Supports Tavily API (recommended)
   - Falls back to mock results for testing
   - Formats results for LLM consumption

3. **System Prompt Enhancement**
   - Added guidance for using search results
   - Maintains Diogenes' philosophical perspective
   - Encourages critical analysis of sources

## Implementation Details

### Search Detection Logic

The system uses keyword matching to determine if a query needs current information:

```javascript
const searchTriggers = [
  'today', 'current', 'latest', 'recent', 'news',
  'price of', 'what happened', 'who won', '2024', '2025',
  'update', 'now', 'happening', 'trend', 'stock',
  'bitcoin', 'crypto', 'election', 'weather'
];
```

### Search Result Integration

When search is triggered:
1. Query is sent to search API (Tavily or mock)
2. Results are formatted with title, URL, and snippet
3. Results are added as system context
4. Diogenes incorporates information naturally

### Character Consistency

Diogenes maintains his philosophical character by:
- Questioning the reliability of sources
- Using facts as starting points for deeper inquiry
- Maintaining skepticism about modern technology
- Weaving results into philosophical discourse
- Using inline links in markdown format

## Alternative Search Providers

While Tavily is recommended for LLM use cases, you can modify `/src/lib/tools/web-search.ts` to use:

- **Serper.dev**: Google search results API
- **Bing Search API**: Microsoft's search API
- **SerpAPI**: Multiple search engine support
- **Custom implementation**: Your own search solution

## Troubleshooting

### Search Not Triggering
- Check if query contains trigger keywords
- Verify server logs show search attempts
- Ensure API route is using latest code

### No Search Results in Response
- Verify TAVILY_API_KEY is set correctly
- Check server logs for API errors
- Ensure search results are being returned

### Response Format Issues
- Verify streaming is working correctly
- Check browser console for errors
- Ensure ChatInterface component is up to date

## Future Enhancements

Potential improvements to consider:

1. **Tool Calling with Claude**: Implement proper tool calling when OpenRouter adds support
2. **Multiple Search Providers**: Add fallback search providers
3. **Search Result Caching**: Cache recent searches to reduce API calls
4. **Smarter Detection**: Use LLM to determine if search is needed
5. **Source Verification**: Add fact-checking capabilities
6. **Search History**: Track and display search queries

## Notes

- The current implementation uses a pragmatic approach that works with existing infrastructure
- When OpenRouter adds full tool calling support for Claude, the implementation can be upgraded
- The system maintains backward compatibility - non-search queries work exactly as before
- Search results are integrated seamlessly into Diogenes' philosophical discourse