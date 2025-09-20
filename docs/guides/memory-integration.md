# Memory System Integration Guide

## Overview

The Diogenes chatbot now includes a comprehensive memory system that stores and retrieves user interactions, providing context-aware responses based on conversation history.

## Architecture

### Components

1. **Memory Service Client** (`/src/lib/memory/client.ts`)
   - Handles all memory API operations
   - Manages entity creation for users
   - Searches relevant memories
   - Stores interactions after responses

2. **Memory Types** (`/src/lib/memory/types.ts`)
   - TypeScript interfaces for memory system
   - Defines entities, memories, interactions
   - Includes debug information structures

3. **Chat API Integration** (`/src/app/api/chat/route.ts`)
   - Searches memories before generating responses
   - Injects memory context into system prompt
   - Stores interactions after successful responses

4. **UI Integration** (`/src/components/chat/ChatInterface.tsx`)
   - Debug mode toggle for memory inspection
   - Visual indicators for memory usage
   - Memory debug information panel

## Configuration

### Environment Variables

```env
# Memory API Configuration
MEMORY_API_INTERNAL_KEY=internal-api-key-for-server-side-calls
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-auth-token
```

### Internal API Authentication

The memory system uses an internal API key (`MEMORY_API_INTERNAL_KEY`) for server-to-server communication. This allows the Diogenes application to manage memories for all users without requiring individual API keys.

## User Flow

### 1. User Sends Message
- User types message in chat interface
- Message sent to `/api/chat` endpoint with user context

### 2. Memory Retrieval
- System searches for relevant memories based on message content
- Retrieves up to 10 most relevant memories
- Memories are ranked by relevance and recency

### 3. Context Injection
- Retrieved memories are summarized
- Summary injected into system prompt (invisible to user)
- AI generates response with historical context

### 4. Response Generation
- AI processes message with memory context
- Generates contextually aware response
- Streams response back to user

### 5. Memory Storage
- After successful response, interaction is stored
- Importance calculated based on content and context
- Stored as memory type "interaction"

## Memory Structure

### Entity
Each user has a primary entity of type "person":
```json
{
  "entity_type": "person",
  "name": "User Name",
  "metadata": {
    "clerk_user_id": "user_xxx",
    "email": "user@example.com",
    "is_primary_user_entity": true
  }
}
```

### Memory (Interaction)
Each chat interaction is stored as:
```json
{
  "memory_type": "interaction",
  "title": "Chat: [first 50 chars of user message]",
  "content": {
    "user_input": "User's message",
    "assistant_response": "AI's response",
    "timestamp": "2024-03-20T10:30:00Z"
  },
  "metadata": {
    "persona": "executive|diogenes|bob",
    "model": "model-name",
    "search_performed": true/false
  },
  "importance": 1-10
}
```

## Debug Mode

### Enabling Debug Mode
1. Click the "Debug" button in the chat interface
2. Debug mode preference saved to localStorage

### Debug Information Displayed
- **Retrieval Info**: Query used, memories found, retrieval time
- **Storage Info**: Entity ID, memory ID, importance score, storage time
- **Errors**: Any errors encountered during memory operations

### Debug Headers
When debug mode is enabled, the following headers are included:
- `X-Memory-Debug`: JSON with detailed debug information
- `X-Memory-Context-Used`: Whether memory context was used
- `X-Memory-Context-Tokens`: Token count of memory context

## Visual Indicators

### Memory Badge
When memories are used in a response, a "Memory" badge appears in the context bar, indicating that historical context was included.

### Debug Panel
When debug mode is active, a panel shows:
- Number of memories retrieved
- Search query used
- Processing times
- Any errors encountered

## Importance Calculation

Memory importance (1-10 scale) is calculated based on:
- Response length (longer = more important)
- Web search performed (+2 importance)
- Important keywords (goals, preferences, plans)
- Base importance: 5

## Error Handling

The memory system is designed to fail gracefully:
- If memory retrieval fails, chat continues without context
- If memory storage fails, user experience is unaffected
- All errors are logged but don't interrupt chat flow

## Performance Considerations

### Caching
- Entity lists cached for 5 minutes
- Reduces database queries for frequent operations

### Async Operations
- Memory storage happens after response streaming
- Non-blocking to maintain chat responsiveness

### Token Limits
- Memory context limited to prevent exceeding model limits
- Maximum 5 memories included in context summary

## Testing

### Manual Testing
1. Enable debug mode
2. Send messages that reference previous topics
3. Verify memory retrieval in debug panel
4. Check that responses show contextual awareness

### Debug Verification
1. Check browser console for memory operations
2. Verify debug headers in network tab
3. Confirm memory storage after interactions

## Troubleshooting

### No Memories Retrieved
- Check if user entity exists in database
- Verify MEMORY_API_INTERNAL_KEY is set
- Ensure database connection is working

### Memory Not Storing
- Check console for storage errors
- Verify entity ID is being passed
- Ensure internal API key is valid

### Debug Mode Not Working
- Clear browser cache/localStorage
- Check console for JavaScript errors
- Verify debug mode toggle state

## Future Enhancements

### Planned Features
- Memory search UI for users
- Memory management (edit/delete)
- Memory export/import
- Shared memories between personas
- Memory analytics dashboard

### Optimization Opportunities
- Implement semantic search
- Add memory compression
- Enhance importance scoring
- Implement memory pruning

## Security Considerations

- Internal API key should be kept secure
- Memory data is tenant-isolated
- User IDs from Clerk are used for authentication
- No sensitive data stored in plain text