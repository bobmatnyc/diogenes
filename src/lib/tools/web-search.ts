import { z } from 'zod';

// Schema for the web search tool parameters
export const webSearchSchema = z.object({
  query: z.string().describe('The search query to look up current information'),
  max_results: z.number().optional().default(5).describe('Maximum number of results to return')
});

export type WebSearchParams = z.infer<typeof webSearchSchema>;

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  date?: string;
}

/**
 * Mock web search implementation for testing
 * Replace this with actual API calls to Tavily, Serper, or another search service
 */
async function mockWebSearch(query: string, maxResults: number): Promise<SearchResult[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Return mock results based on common query patterns
  const mockResults: SearchResult[] = [];
  
  // Generate mock results
  for (let i = 0; i < Math.min(maxResults, 3); i++) {
    mockResults.push({
      title: `Mock Result ${i + 1}: ${query}`,
      url: `https://example.com/result${i + 1}`,
      snippet: `This is a mock search result for "${query}". In production, this would contain actual search snippets from the web.`,
      date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
  }
  
  return mockResults;
}

/**
 * Tavily API implementation for web search
 * Tavily is optimized for LLM use cases and provides high-quality search results
 */
async function tavilySearch(query: string, maxResults: number): Promise<SearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  
  if (!apiKey) {
    console.warn('TAVILY_API_KEY not found, falling back to mock search');
    return mockWebSearch(query, maxResults);
  }
  
  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: query,
        max_results: maxResults,
        search_depth: 'basic',
        include_answer: false,
        include_raw_content: false,
        include_images: false,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return data.results.map((result: any) => ({
      title: result.title,
      url: result.url,
      snippet: result.content,
      date: result.published_date,
    }));
  } catch (error) {
    console.error('Tavily search error:', error);
    // Fallback to mock search on error
    return mockWebSearch(query, maxResults);
  }
}

/**
 * Main web search function that can be called by the tool
 */
export async function webSearch({ query, max_results = 5 }: WebSearchParams): Promise<string> {
  try {
    // Use Tavily if available, otherwise fall back to mock
    const results = await tavilySearch(query, max_results);
    
    if (results.length === 0) {
      return `No results found for "${query}".`;
    }
    
    // Format results for inclusion in the response
    const formattedResults = results.map((result, index) => {
      const dateStr = result.date ? ` (${result.date})` : '';
      return `${index + 1}. [${result.title}](${result.url})${dateStr}\n   ${result.snippet}`;
    }).join('\n\n');
    
    return `Web search results for "${query}":\n\n${formattedResults}`;
  } catch (error) {
    console.error('Web search error:', error);
    return `Error performing web search: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

/**
 * Tool definition for use with Vercel AI SDK
 */
export const webSearchTool = {
  name: 'web_search',
  description: 'Search the web for current information when needed to answer questions about recent events, facts, or data not in the training data',
  parameters: webSearchSchema,
  execute: webSearch,
};