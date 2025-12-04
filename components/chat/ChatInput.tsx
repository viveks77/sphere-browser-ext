import React, { useState, useRef } from 'react';
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

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading = false,
  placeholder = 'Ask a question...',
  enableRag,
  setEnableRag
}) => {
  const [message, setMessage] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

    const messageText = message;
    setMessage('');

    try {
      await onSendMessage(messageText);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessage(messageText);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 bg-background border-t border-border/40 relative">
      {/* Options Slide-up */}
      <div 
        className={`absolute bottom-full left-0 w-full bg-background border-t border-border/40 px-4 pt-4 transition-all duration-300 ease-in-out ${
          showOptions ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2">
          <label className="pl-1 flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={enableRag}
              onChange={(e) => setEnableRag?.(e.target.checked)}
              className="w-4 h-4 rounded border-primary text-primary focus:ring-primary"
            />
            <span>Enable RAG (Context from page)</span>
          </label>
        </div>
      </div>

      <div className="flex gap-2 relative text-sm">
        <div className="relative flex-1">
          <Textarea
            value={message}
            ref={inputRef}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={placeholder}
            disabled={isLoading}
            className="text-sm pr-12 pl-10 py-2 bg-muted/50 border-transparent focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-primary/20 transition-all shadow-sm min-h-[44px]"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowOptions(!showOptions)}
            className={`absolute left-1.5 bottom-1.5 h-8 w-8 rounded-md transition-colors ${showOptions ? 'bg-muted text-primary' : 'text-muted-foreground'}`}
            title="Chat Options"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>
        
        <Button
          onClick={handleSend}
          disabled={!message.trim() || isLoading}
          size="icon"
          className="shrink-0 h-[44px] w-[44px] rounded-md transition-all"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
      <div className="mt-2 text-center">
        <p className="text-[10px] text-muted-foreground/50">
          AI can make mistakes. Check important info.
        </p>
      </div>
    </div>
  );
};
