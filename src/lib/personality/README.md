# Layered Personality Architecture

## Overview

The Diogenes chatbot personality system has been refactored into a structured 4-layer architecture that cleanly separates base capabilities from personality traits, enabling better maintainability and consistency across multiple personas.

## Architecture Layers

### 1. CORE Layer (`CORE.md`)
**Purpose**: Base AI capabilities and constraints shared by all personas
- Fundamental analytical and reasoning abilities
- Language processing and generation
- Knowledge synthesis and problem-solving
- Core ethical constraints
- No personality traits - pure capabilities

### 2. STRUCTURE Layer (`STRUCTURE.md`)
**Purpose**: Anti-sycophantic behaviors and intellectual independence
- Patterns to avoid (excessive agreement, praise, validation-seeking)
- Objectivity requirements
- Critical thinking standards
- Challenge mechanisms
- Socratic questioning patterns

### 3. INTERACTION Layer (`INTERACTION.md`)
**Purpose**: General conversation management patterns
- Response formatting preferences
- Context handling (web search, memory)
- Information processing patterns
- Debug mode behaviors
- Quality assurance checks

### 4. PERSONAS Layer (`personas/`)
**Purpose**: Unique personality traits for each persona
- **ASSISTANT.md**: Executive Assistant - Maximum efficiency, zero personality
- **DIOGENES.md**: The Cynic - Provocative philosopher challenging everything
- **BOB_MATSUOKA.md**: Tech Leader - 50 years experience, pragmatic wisdom

## Implementation

### Composer System (`composer.ts`)

The composer combines layers based on configuration:

```typescript
import { composePersonalityPrompt } from '@/lib/personality/composer';

const prompt = composePersonalityPrompt({
  personality: 'diogenes',  // or 'bob' or 'executive'
  mode: 'minimal',          // or 'full' for complete prompts
  antiSycophancyLevel: 8,   // 1-10 scale
  memoryContext: '...',     // Optional memory integration
  debugMode: false,         // Debug annotations
  userName: 'Alice'         // User personalization
});
```

### Anti-Sycophancy Levels

Each persona has a default anti-sycophancy level:
- **Executive Assistant**: Level 10 (Maximum - zero validation)
- **Diogenes**: Level 8 (High - constant challenging)
- **Bob Matsuoka**: Level 3 (Low - thoughtful but warm)

### Prompt Modes

**Minimal Mode** (~800 characters):
- Optimized for Edge Runtime
- Condensed layer content
- Essential traits only
- Fast response generation

**Full Mode** (~3800 characters):
- Complete personality definition
- Detailed behavioral guidelines
- Comprehensive examples
- Maximum personality depth

## Usage

### In Chat Route

```typescript
// src/app/api/chat/route.ts
const personalizedPrompt = composePersonalityPrompt({
  personality: selectedPersonality,
  mode: 'minimal',
  antiSycophancyLevel: getAntiSycophancyLevel(selectedPersonality),
  memoryContext,
  debugMode,
  userName: firstName
});
```

### Getting Conversation Starters

```typescript
import { getConversationStarter } from '@/lib/personality/composer';

const starter = getConversationStarter('diogenes');
// Returns: "Another soul seeking wisdom from a digital phantom?"
```

## Benefits of This Architecture

1. **Separation of Concerns**: Each layer has a single, focused responsibility
2. **No Duplication**: Common patterns defined once in shared layers
3. **Easier Maintenance**: Modify behaviors without touching every persona
4. **Consistency**: All personas share core capabilities and structures
5. **Scalability**: Easy to add new personas by creating one small file
6. **Performance**: Minimal mode keeps Edge Runtime bundles small
7. **Flexibility**: Mix and match layers for different configurations

## File Structure

```
src/lib/personality/
├── README.md              # This file
├── CORE.md               # Base AI capabilities
├── STRUCTURE.md          # Anti-sycophantic behaviors
├── INTERACTION.md        # Conversation patterns
├── composer.ts           # Layer composition logic
└── personas/
    ├── ASSISTANT.md      # Executive Assistant traits
    ├── DIOGENES.md       # Diogenes philosopher traits
    └── BOB_MATSUOKA.md   # Bob Matsuoka leader traits
```

## Adding New Personas

1. Create a new file in `personas/` with unique traits only
2. Add the persona to `PersonalityType` in `composer.ts`
3. Add minimal and full content to `LAYERS_MINIMAL` and `LAYERS_FULL`
4. Define conversation starters
5. Set default anti-sycophancy level

## Testing

Test the composer directly:

```typescript
const testPrompt = composePersonalityPrompt({
  personality: 'diogenes',
  mode: 'full',
  antiSycophancyLevel: 10,
  memoryContext: 'Test memory',
  debugMode: true,
  userName: 'TestUser'
});

console.log('Prompt length:', testPrompt.length);
console.log('Contains layers:',
  testPrompt.includes('CORE CAPABILITIES'),
  testPrompt.includes('ANTI-SYCOPHANTIC'),
  testPrompt.includes('INTERACTION PATTERNS'),
  testPrompt.includes('DIOGENES')
);
```

## Migration from Old System

The old system had:
- Individual prompt files per persona (~600 words each)
- Anti-sycophancy mixed into each prompt
- Lots of duplication across personas

The new system:
- Shared layers reduce duplication by ~70%
- Anti-sycophancy is centralized and configurable
- Each persona file is now ~200 words of unique content
- Total system is more maintainable and consistent