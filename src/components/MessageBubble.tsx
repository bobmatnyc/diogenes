'use client';

import type { Message } from '@/types/chat';
import MessageTokenBadge from './MessageTokenBadge';

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[70%] px-4 py-3 rounded-lg ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
        }`}
      >
        <div className="text-sm font-semibold mb-1">{isUser ? 'You' : 'Diogenes'}</div>
        <div className="whitespace-pre-wrap break-words">{message.content}</div>
        <div className="flex items-center justify-between mt-2">
          <div className="text-xs opacity-70">
            {new Date(message.timestamp).toLocaleTimeString()}
          </div>
          <MessageTokenBadge tokenUsage={message.tokenUsage} role={message.role} />
        </div>
      </div>
    </div>
  );
}
