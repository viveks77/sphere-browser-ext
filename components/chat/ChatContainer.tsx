import React, { useState, useCallback } from 'react';
import { ChatMessage as ChatMessageType } from '@/lib/models';
import { ChatWindow } from './ChatWindow';
import { useChat } from '@/hooks/useChat';


export const ChatContainer: React.FC = () => {
  const {messages, isLoading, sendMessage, error} = useChat();

  return (
    <ChatWindow
      messages={messages}
      onSendMessage={sendMessage}
      isLoading={isLoading}
      error={error}
      isInitializing={false}
    />
  );
};
