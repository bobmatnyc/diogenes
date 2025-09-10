'use client';

import AuthGate from '@/components/AuthGate';
// Using working version with manual state management
import ChatInterfaceWorking from '@/components/ChatInterfaceWorking';

export default function ChatPage() {
  return (
    <AuthGate>
      <ChatInterfaceWorking />
    </AuthGate>
  );
}