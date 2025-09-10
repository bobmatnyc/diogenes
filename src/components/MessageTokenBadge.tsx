'use client';

import { formatTokens } from '@/lib/tokens';
import type { TokenUsage } from '@/types/chat';

interface MessageTokenBadgeProps {
  tokenUsage?: TokenUsage;
  role: 'user' | 'assistant' | 'system';
}

export default function MessageTokenBadge({ tokenUsage, role }: MessageTokenBadgeProps) {
  if (!tokenUsage || tokenUsage.totalTokens === 0) {
    return null;
  }

  const displayTokens = role === 'user' ? tokenUsage.promptTokens : tokenUsage.completionTokens;

  if (displayTokens === 0) {
    return null;
  }

  return (
    <div className="mt-2 inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
      <svg
        className="w-3 h-3 opacity-60"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
      </svg>
      <span>{formatTokens(displayTokens)}</span>
    </div>
  );
}
