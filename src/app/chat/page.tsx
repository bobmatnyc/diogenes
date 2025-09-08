'use client';

import AuthGate from '@/components/AuthGate';
import ChatInterface from '@/components/ChatInterface';

export default function ChatPage() {
  return (
    <AuthGate>
      <ChatInterface />
    </AuthGate>
  );
}