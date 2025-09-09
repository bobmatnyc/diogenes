'use client';

import { formatTokens, formatCost } from '@/lib/tokens';
import { ChatSession } from '@/types/chat';

interface TokenMetricsProps {
  session: ChatSession | null;
}

export default function TokenMetrics({ session }: TokenMetricsProps) {
  if (!session) {
    return null;
  }

  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-2">
        <svg
          className="w-4 h-4 opacity-75"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <span className="font-medium">{formatTokens(session.totalTokens)}</span>
      </div>
      
      <div className="flex items-center gap-2">
        <svg
          className="w-4 h-4 opacity-75"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="font-medium">{formatCost(session.totalCost)}</span>
      </div>
    </div>
  );
}