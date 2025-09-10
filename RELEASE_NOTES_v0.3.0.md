# Release Notes v0.3.0

## Overview
This release completes the transition from static password authentication to OAuth-based authentication via Clerk, adds personalized greetings using the user's first name, and introduces a transcript download feature for conversations.

## Major Changes

### 1. Removed Static Password Authentication ✅
- **Removed all references to `NEXT_PUBLIC_APP_PASSWORD`** from the codebase
- **Cleaned up `AuthGate.tsx`** to remove password-related logic
- **Updated landing page** to remove password references
- **Full OAuth authentication** via Clerk is now the only authentication method

### 2. Personalized User Experience ✅
- **Chat API now accepts user's first name** from Clerk OAuth data
- **System prompt dynamically incorporates user's name** for natural philosophical discourse
- **Personalized greetings** address users by name when philosophically appropriate
- **Fallback to "wanderer"** if no name is available

### 3. Transcript Download Feature ✅
- **New download button in chat header** allows users to export conversations
- **Markdown format** with timestamps and user names
- **File naming pattern**: `diogenes-chat-[date].md`
- **Includes full conversation history** with proper formatting

### 4. Documentation Updates ✅
- **README.md** updated to remove password references
- **CLAUDE.md** updated with OAuth authentication details
- **Makefile** updated to reflect new authentication method
- **.env.example** already properly configured for Clerk

## Technical Details

### Files Modified
- `/src/components/AuthGate.tsx` - Removed password logic, cleaned up imports
- `/src/app/page.tsx` - Already OAuth-ready, no changes needed
- `/src/components/ChatInterfaceWorking.tsx` - Added firstName passing, download button
- `/src/app/api/chat/route.ts` - Accepts firstName, personalizes prompt
- `/src/lib/prompts/core-principles.ts` - Added more conversation starters
- `/package.json` - Version bumped to 0.3.0
- `/README.md` - Updated environment variables section
- `/CLAUDE.md` - Removed all password references
- `/Makefile` - Updated dev command output

### New Features Implementation

#### Personalized System Prompt
```typescript
// Dynamic prompt creation based on user's name
function createPersonalizedPrompt(firstName: string): string {
  return `${DIOGENES_SYSTEM_PROMPT}
  ...
  PERSONAL ADDRESS:
  You are speaking with ${firstName}. Address them naturally in conversation...
  `;
}
```

#### Transcript Download
```typescript
const handleDownloadTranscript = () => {
  // Format conversation as markdown
  // Include timestamps and user names
  // Download as diogenes-chat-[date].md
};
```

## Breaking Changes
- **Password authentication removed** - All users must now authenticate via OAuth
- **Environment variables changed** - `NEXT_PUBLIC_APP_PASSWORD` no longer used

## Migration Guide
For users upgrading from v0.2.x:
1. Remove `NEXT_PUBLIC_APP_PASSWORD` from `.env.local`
2. Ensure Clerk keys are properly configured
3. Clear browser cache and localStorage
4. Sign in with OAuth provider

## Known Issues
- None identified in testing

## Testing Checklist
- [x] OAuth authentication flow works
- [x] User's first name displays correctly
- [x] Personalized prompts include user's name naturally
- [x] Transcript download generates valid markdown
- [x] All password references removed from UI
- [x] TypeScript compilation successful
- [x] Development server runs without errors

## Next Steps
- Consider adding more OAuth providers beyond Google
- Implement conversation persistence across sessions
- Add user preferences for personalization level
- Consider PDF export option for transcripts

---

**Version**: 0.3.0  
**Date**: 2025-01-10  
**Author**: Engineer Agent  
**Status**: Ready for merge to `master`