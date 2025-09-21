'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  RefreshCw
} from 'lucide-react';
import TokenMetrics from '@/components/TokenMetrics';
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
}

export default function ChatHeader({
  session,
  selectedPersonality,
  onNewConversation,
  onDownloadTranscript,
  userName = 'wanderer',
  messagesCount,
}: ChatHeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Left side - Brand */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold bg-gradient-to-r from-amber-600 to-amber-700 bg-clip-text text-transparent">
              {selectedPersonality === 'executive' ? 'Executive Assistant' : selectedPersonality === 'bob' ? 'Bob Matsuoka' : 'Diogenes'}
            </h1>
            <p className="text-xs text-muted-foreground">
              {selectedPersonality === 'executive' ? 'Professional Support' : selectedPersonality === 'bob' ? 'Tech Leader' : 'The Digital Cynic'}
            </p>
          </div>
        </div>

        {/* Right side - Controls */}
        <div className="flex items-center gap-2">
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
              className="hidden sm:flex"
            >
              <Download className="h-4 w-4" />
              <span className="ml-2 hidden lg:inline">Export</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onNewConversation}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">New Chat</span>
            </Button>
          </div>

          {/* User Profile Dropdown */}
          <UserProfile />
        </div>
      </div>
    </header>
  );
}