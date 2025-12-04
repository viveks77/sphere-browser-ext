import React from 'react';
import { ChatMessage as ChatMessageType } from '@/lib/models';
import { cn } from '@/lib/utils';
import { User, Bot, RefreshCw, AlertCircle } from 'lucide-react';
import Markdown from 'react-markdown'
import { Button } from '@/components/ui/button';

interface ChatMessageProps {
  message: ChatMessageType;
  onRetry?: (id: string) => void | Promise<void>;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onRetry }) => {
  const isUser = message.role === 'user';
  const isError = message.status === 'error';
  const isSending = message.status === 'sending';

  return (
    <div
      className={cn(
        'flex w-full gap-3',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0 border',
          isUser
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-muted text-muted-foreground border-border',
          isError && 'bg-destructive/10 border-destructive text-destructive'
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      <div
        className={cn(
          'flex flex-col max-w-[80%] space-y-1',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        <div
          className={cn(
            'px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm relative group max-w-full overflow-hidden',
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-none'
              : 'bg-muted text-foreground rounded-tl-none',
            isError && 'bg-destructive/10 text-destructive border border-destructive/20',
            isSending && 'opacity-70'
          )}
        >
          <Markdown
            components={{
              p: ({ children }) => <p className="mb-1 last:mb-0 break-all">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="break-all">{children}</li>,
              a: ({ href, children }) => (
                <a 
                  href={href} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="underline underline-offset-2 hover:text-primary/80 break-all"
                >
                  {children}
                </a>
              ),
              code: ({ children }) => (
                <code className="bg-background/20 px-1 py-0.5 rounded font-mono text-xs break-all">
                  {children}
                </code>
              ),
              pre: ({ children }) => (
                <pre className="bg-background/50 p-2 rounded-lg my-2 overflow-x-auto text-xs font-mono">
                  {children}
                </pre>
              ),
            }}
          >
            {message.content}
          </Markdown>
          
          {isError && onRetry && message.id && (
            <div className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full hover:bg-destructive/10 text-destructive"
                onClick={() => onRetry(message.id!)}
                title="Retry"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1 px-1">
          {isError && (
            <span className="flex items-center gap-1 text-[10px] text-destructive">
              <AlertCircle className="w-3 h-3" />
              Failed to send
            </span>
          )}
          {message.timestamp && !isError && (
            <span className="text-[10px] text-muted-foreground/60">
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
          {isError && onRetry && message.id && (
             <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-[10px] text-destructive underline decoration-destructive/30"
                onClick={() => onRetry(message.id!)}
              >
                Retry
              </Button>
          )}
        </div>
      </div>
    </div>
  );
};
