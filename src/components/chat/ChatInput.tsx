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
        'flex items-center gap-2 p-2 sm:p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
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
          className="h-10 sm:h-12 text-sm sm:text-base shadow-sm border-muted-foreground/20 focus:border-primary transition-colors"
          autoFocus
        />
      </div>

      <Button
        type="submit"
        disabled={!inputValue.trim() || isLoading}
        size="lg"
        className="h-10 sm:h-12 px-3 sm:px-6 shadow-sm hover:shadow-md transition-all text-sm sm:text-base"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
            <span className="hidden sm:inline">Thinking...</span>
          </>
        ) : (
          <>
            <Send className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Send</span>
          </>
        )}
      </Button>
    </form>
  );
}