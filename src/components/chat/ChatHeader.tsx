'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  RefreshCw
} from 'lucide-react';
import TokenMetrics from '@/components/TokenMetrics';
import ContextStatus from './ContextStatus';
import { UserProfile } from '@/components/UserProfile';
import type { PersonalityType } from '@/components/PersonalitySelector';
import type { ChatSession } from '@/types/chat';

interface ChatHeaderProps {
  session: ChatSession;
  selectedPersonality: PersonalityType;
  onNewConversation: () => void;
  onDownloadTranscript: () => void;
  userName?: string;
  messagesCount: number;
  contextUsage?: {
    tokens: number;
    maxTokens: number;
    percent: number;
    wasCompacted: boolean;
    summaryCount: number;
  };
}

export default function ChatHeader({
  session,
  selectedPersonality,
  onNewConversation,
  onDownloadTranscript,
  userName = 'wanderer',
  messagesCount,
  contextUsage,
}: ChatHeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 sm:h-16 items-center justify-between px-2 sm:px-4">
        {/* Left side - Brand */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <div className="flex flex-col min-w-0">
            <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-amber-600 to-amber-700 bg-clip-text text-transparent truncate">
              {selectedPersonality === 'executive' ? 'Executive' : selectedPersonality === 'bob' ? 'Bob' : 'Diogenes'}
            </h1>
            <p className="text-xs text-muted-foreground hidden xs:block">
              {selectedPersonality === 'executive' ? 'Professional Support' : selectedPersonality === 'bob' ? 'Tech Leader' : 'The Digital Cynic'}
            </p>
          </div>
        </div>

        {/* Right side - Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Context Status - Show when available */}
          {contextUsage && (
            <div className="hidden sm:block">
              <ContextStatus {...contextUsage} />
            </div>
          )}

          {/* Token Metrics - Hidden on mobile */}
          <div className="hidden md:block">
            <TokenMetrics session={session} />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onDownloadTranscript}
              disabled={messagesCount === 0}
              className="hidden sm:flex h-8 px-2 sm:px-3"
            >
              <Download className="h-4 w-4" />
              <span className="ml-1 hidden lg:inline text-xs">Export</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onNewConversation}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2 sm:px-3"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline text-xs">New</span>
            </Button>
          </div>

          {/* User Profile Dropdown */}
          <UserProfile />
        </div>
      </div>
    </header>
  );
}