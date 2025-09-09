# Session Persistence Bug Fix Test Plan

## The Bug
The conversation history was disappearing after receiving a single response from the assistant. This was caused by the `useChat` hook's `initialMessages` only being set once during component initialization, and not properly syncing with the session state.

## Root Cause Analysis
1. The `useChat` hook was initialized with `initialMessages` from the session
2. When new messages were added to the session, the `useChat` hook didn't update its internal state
3. The component was using `session.messages` to find token usage but not properly maintaining a synchronized state

## The Fix
The fix implements a proper state synchronization pattern:

1. **Added `localMessages` state**: Maintains a local copy of messages with full metadata (timestamps, token usage)
2. **Updated `onFinish` callback**: Now adds messages to both `localMessages` and session state using functional updates
3. **Fixed `handleSendMessage`**: 
   - Now properly handles form submission events
   - Adds user messages to both `localMessages` and session
   - Uses the proper `handleSubmit` event handler
4. **Updated message rendering**: Uses `localMessages` to find token usage data instead of session
5. **Improved initialization**: Properly loads existing messages from session on mount

## Key Changes Made

### 1. State Management
```typescript
// Added local messages state
const [localMessages, setLocalMessages] = useState<Message[]>([]);
```

### 2. Message Addition Pattern
```typescript
// Use functional updates to avoid stale closures
setSession(currentSession => {
  const updatedSession = addMessageToSession(currentSession, newMessage);
  return updatedSession;
});
```

### 3. Form Submission
```typescript
// Changed from synthetic event to proper form submission
const handleSendMessage = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  // ... handle message
  handleSubmit(e); // Pass the actual form event
};
```

## Testing Instructions

### Manual Testing
1. Start the development server
2. Open the chat interface
3. Send a message to the assistant
4. Wait for the response
5. **Verify**: The conversation should remain visible
6. Send another message
7. **Verify**: All previous messages should still be visible
8. Refresh the page
9. **Verify**: The entire conversation history should be restored from localStorage

### Expected Behavior
- Messages persist after each response
- Token usage is properly tracked for each message
- Session state is saved to localStorage after each message
- Conversation history survives page refreshes
- Multiple back-and-forth exchanges work correctly

## Implementation Details

The fix ensures:
1. **Proper state synchronization** between `useChat` hook, local state, and session storage
2. **Functional updates** prevent race conditions and stale closures
3. **Token usage tracking** continues to work correctly
4. **Session persistence** in localStorage remains intact
5. **Message timestamps** are preserved correctly

## Verification Checklist
- [x] Code review completed
- [x] Bug root cause identified
- [x] Fix implemented
- [ ] Manual testing completed
- [ ] Multiple message exchanges tested
- [ ] Page refresh persistence tested
- [ ] Token tracking verified