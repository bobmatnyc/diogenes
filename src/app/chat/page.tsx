'use client';

import AuthGate from '@/components/AuthGate';
// Using new shadcn/ui chat interface
import ChatInterface from '@/components/chat/ChatInterface';

export default function ChatPage() {
  return (
    <AuthGate requireAuth={true}>
      <ChatInterface />
    </AuthGate>
  );
}
