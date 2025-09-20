/**
 * Minimal system prompts for Edge Runtime
 * Generated from layered personality architecture
 */

import { composePersonalityPrompt, getConversationStarter } from '@/lib/personality/composer';

// Generate minimal prompts from the new architecture
export const DIOGENES_MINIMAL = composePersonalityPrompt({
  personality: 'diogenes',
  mode: 'minimal',
  antiSycophancyLevel: 8
});

export const BOB_MINIMAL = composePersonalityPrompt({
  personality: 'bob',
  mode: 'minimal',
  antiSycophancyLevel: 3
});

export const EXECUTIVE_ASSISTANT_MINIMAL = composePersonalityPrompt({
  personality: 'executive',
  mode: 'minimal',
  antiSycophancyLevel: 10
});

// Export conversation starters using the new system
export const getRandomDiogenesStarter = () => getConversationStarter('diogenes');
export const getRandomBobStarter = () => getConversationStarter('bob');
export const getRandomAssistantStarter = () => getConversationStarter('executive');