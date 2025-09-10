'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Send, Loader2 } from 'lucide-react';
import { FormEvent, KeyboardEvent, useState } from 'react';

interface ChatInputProps {
  onSubmit: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

export default function ChatInput({
  onSubmit,
  isLoading = false,
  placeholder = 'Challenge Diogenes with your question...',
  className,
}: ChatInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (trimmed && !isLoading) {
      onSubmit(trimmed);
      setInputValue('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Submit on Enter, but allow Shift+Enter for new lines (though not applicable for input)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'flex items-center gap-2 p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        className
      )}
    >
      <div className="flex-1 relative">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          className="pr-12 h-12 text-base shadow-sm border-muted-foreground/20 focus:border-primary transition-colors"
          autoFocus
        />
      </div>
      
      <Button
        type="submit"
        disabled={!inputValue.trim() || isLoading}
        size="lg"
        className="h-12 px-6 shadow-sm hover:shadow-md transition-all"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Thinking...
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            Send
          </>
        )}
      </Button>
    </form>
  );
}