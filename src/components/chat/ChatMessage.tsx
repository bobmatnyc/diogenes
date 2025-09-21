'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { User, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

interface ChatMessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
  };
  userName?: string;
}

export default function ChatMessage({ message, userName = 'You' }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex gap-3 mb-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {!isUser && (
        <Avatar className="h-6 w-6 sm:h-8 sm:w-8 shrink-0 mt-1">
          <AvatarFallback className="bg-gradient-to-br from-amber-600 to-amber-700">
            <Bot className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
          </AvatarFallback>
        </Avatar>
      )}

      <Card
        className={cn(
          'max-w-[90%] sm:max-w-[80%] p-3 sm:p-4 shadow-sm transition-all',
          isUser
            ? 'bg-primary text-primary-foreground border-primary/20'
            : 'bg-card hover:shadow-md'
        )}
      >
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Custom code block rendering
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={oneDark as any}
                      language={match[1]}
                      PreTag="div"
                      className="rounded-md !bg-gray-900 !my-2"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code
                      className="px-1.5 py-0.5 rounded-md bg-muted text-sm font-mono"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                // Custom link rendering
                a({ node, children, href, ...props }) {
                  return (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
                      {...props}
                    >
                      {children}
                    </a>
                  );
                },
                // Custom paragraph rendering for better spacing
                p({ children }) {
                  return <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>;
                },
                // Custom list rendering
                ul({ children }) {
                  return <ul className="mb-3 ml-4 list-disc space-y-1">{children}</ul>;
                },
                ol({ children }) {
                  return <ol className="mb-3 ml-4 list-decimal space-y-1">{children}</ol>;
                },
                // Custom blockquote
                blockquote({ children }) {
                  return (
                    <blockquote className="border-l-4 border-primary/30 pl-4 italic my-3">
                      {children}
                    </blockquote>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </Card>

      {isUser && (
        <Avatar className="h-6 w-6 sm:h-8 sm:w-8 shrink-0 mt-1">
          <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-700">
            <User className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}