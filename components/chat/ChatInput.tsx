import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, SlidersHorizontal } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void | Promise<void>;
  isLoading?: boolean;
  placeholder?: string;
  enableRag?: boolean;
  setEnableRag?: (enable: boolean) => void;
}

const DEFAULT_PLACEHOLDER = 'Ask a question...';

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading = false,
  placeholder = DEFAULT_PLACEHOLDER,
  enableRag = true,
  setEnableRag,
}) => {
  const [message, setMessage] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(async () => {
    if (!message.trim() || isLoading) return;

    const messageText = message;
    setMessage('');

    try {
      await onSendMessage(messageText);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessage(messageText);
    }
  }, [message, isLoading, onSendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const toggleOptions = useCallback(() => {
    setShowOptions((prev) => !prev);
  }, []);

  const handleRagToggle = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEnableRag?.(e.target.checked);
    },
    [setEnableRag]
  );

  return (
    <div className="relative border-t border-border/40 bg-background p-4">
      {/* Options Slide-up Panel */}
      <div
        className={`absolute bottom-full left-0 w-full border-t border-border/40 bg-background px-4 pt-4 transition-all duration-300 ease-in-out ${
          showOptions ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2">
          <label className="flex cursor-pointer select-none items-center gap-2 pl-1 text-sm">
            <input
              type="checkbox"
              checked={enableRag}
              onChange={handleRagToggle}
              className="h-4 w-4 rounded border-primary text-primary focus:ring-primary"
              aria-label="Enable RAG (Retrieval-Augmented Generation)"
            />
            <span>Enable RAG (Context from page)</span>
          </label>
        </div>
      </div>

      {/* Input Area */}
      <div className="flex items-end gap-2 text-sm">
        <div className="relative flex-1">
          <Textarea
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            className="min-h-11 border-transparent bg-muted/50 pl-10 pr-12 py-2 text-sm shadow-sm transition-all focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-primary/20"
            aria-label="Message input"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleOptions}
            className={`absolute bottom-1.5 left-1.5 h-8 w-8 rounded-md transition-colors ${
              showOptions ? 'bg-muted text-primary' : 'text-muted-foreground'
            }`}
            title="Chat options"
            aria-label="Toggle chat options"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>

        <Button
          onClick={handleSend}
          disabled={!message.trim() || isLoading}
          size="icon"
          className="h-11 w-11 shrink-0 rounded-md transition-all"
          aria-label={isLoading ? 'Sending message' : 'Send message'}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Disclaimer */}
      <p className="mt-2 text-center text-[10px] text-muted-foreground/50">
        AI can make mistakes. Check important information.
      </p>
    </div>
  );
};
