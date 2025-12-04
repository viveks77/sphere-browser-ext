import React, { useEffect, useRef } from 'react';
import { ChatMessage as ChatMessageType } from '@/lib/models';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { Skeleton } from '@/components/ui/skeleton';
import { Bot, MessageSquare, Sparkles } from 'lucide-react';

interface ChatWindowProps {
  messages: ChatMessageType[];
  onSendMessage: (message: string) => void | Promise<void>;
  isLoading?: boolean;
  isInitializing?: boolean;
  error?: string;
  onRetry?: (id: string) => void | Promise<void>;
  enableRag?: boolean;
  setEnableRag?: (enable: boolean) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  onSendMessage,
  error,
  isLoading = false,
  isInitializing = false,
  onRetry,
  enableRag,
  setEnableRag,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);


  return (
    <div className="flex h-full flex-col min-w-[450px] bg-background font-sans">
      {/* Header */}
      <div className="px-4 py-4 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold leading-none tracking-tight">Page Assistant</h2>
            <p className="text-xs text-muted-foreground mt-1">Ask questions about this page</p>
          </div>
        </div>
      </div> 
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
        {isInitializing ? (
          <div className="space-y-4">
            <div className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
            <div className="flex gap-3 flex-row-reverse">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="space-y-2 flex-1 flex flex-col items-end">
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4">
            <div className="bg-primary/5 p-4 rounded-full">
              <Sparkles className="w-8 h-8 text-primary/60" />
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-foreground">No messages yet</h3>
              <p className="text-sm text-muted-foreground max-w-[200px] mx-auto">
                Start a conversation by asking a question about the content on this page.
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage 
                key={message.id || message.timestamp} 
                message={message} 
                onRetry={onRetry}
              />
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-muted rounded-2xl rounded-tl-none px-4 py-3 space-y-1">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce delay-100" />
                    <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {error && (
        <div className='p-2 m-2 border border-red-500 bg-red-50 rounded-lg shadow-sm'> 
          <span className='text-red-500'>{error}</span>
        </div>
      )}
      
      {/* Input Area */}
      <ChatInput enableRag={enableRag} setEnableRag={setEnableRag} onSendMessage={onSendMessage} isLoading={isLoading} />
    </div>
  );
};
