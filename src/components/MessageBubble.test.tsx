import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Message } from '@/types/chat';
import MessageBubble from './MessageBubble';

// Mock the ai/react module
vi.mock('@ai-sdk/react', () => ({
  useChat: vi.fn(() => ({
    messages: [],
    isLoading: false,
  })),
}));

describe('MessageBubble', () => {
  const mockMessage: Message = {
    id: '1',
    role: 'user',
    content: 'Test message',
    timestamp: new Date(),
  };

  it('renders user message correctly', () => {
    render(<MessageBubble message={mockMessage} />);
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('renders assistant message correctly', () => {
    const assistantMessage: Message = {
      ...mockMessage,
      role: 'assistant',
    };
    render(<MessageBubble message={assistantMessage} />);
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('applies correct styling for user messages', () => {
    const { container } = render(<MessageBubble message={mockMessage} />);
    const messageElement = container.querySelector('.bg-blue-600');
    expect(messageElement).toBeInTheDocument();
  });

  it('applies correct styling for assistant messages', () => {
    const assistantMessage: Message = {
      ...mockMessage,
      role: 'assistant',
    };
    const { container } = render(<MessageBubble message={assistantMessage} />);
    const messageElement = container.querySelector('.bg-gray-200');
    expect(messageElement).toBeInTheDocument();
  });
});
