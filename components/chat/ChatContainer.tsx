import React, { useState, useCallback } from 'react';
import { ChatMessage as ChatMessageType } from '@/lib/models';
import { ChatWindow } from './ChatWindow';

interface ChatContainerProps {
  tabId: string;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({ tabId }) => {
  const [messages, setMessages] = useState<ChatMessageType[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant. Ask me anything about this page.',
      timestamp: Date.now() - 5000,
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = useCallback(
    async (messageText: string) => {
      if (!messageText.trim()) return;

      // Add user message immediately
      const userMessage: ChatMessageType = {
        id: Date.now().toString(),
        role: 'user',
        content: messageText,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      // Simulate API delay
      setTimeout(() => {
        const assistantMessage: ChatMessageType = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `This is a placeholder response. In the actual implementation, this would be a response from the AI service with RAG context     t the page. Your question was: "${messageText}"`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setIsLoading(false);
      }, 1000);
    },
    []
  );

  return (
    <ChatWindow
      messages={messages}
      onSendMessage={handleSendMessage}
      isLoading={isLoading}
      isInitializing={false}
    />
  );
};
