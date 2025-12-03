import { useState, useCallback } from 'react';
import { ChatMessage as ChatMessageType } from '@/lib/models';

interface UseChatOptions {
  tabId: string;
  enableRag?: boolean;
}

export const useChat = ({ tabId, enableRag = true }: UseChatOptions) => {
  const [messages, setMessages] = useState<ChatMessageType[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant. Ask me anything about this page.',
      timestamp: Date.now() - 5000,
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      const userMessage: ChatMessageType = {
        id: Date.now().toString(),
        role: 'user',
        content,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);

      // Simulate API delay
      setTimeout(() => {
        const assistantMessage: ChatMessageType = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Placeholder response to: "${content}"`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setIsLoading(false);
      }, 1000);
    },
    []
  );

  const clearMessages = useCallback(() => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: 'Hello! I\'m your AI assistant. Ask me anything about this page.',
        timestamp: Date.now(),
      },
    ]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    isInitialized,
    error,
    sendMessage,
    clearMessages,
  };
};
