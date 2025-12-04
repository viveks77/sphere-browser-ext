import { useState, useCallback } from 'react';
import { ChatMessage as ChatMessageType, ChatResponse, ChatSession } from '@/lib/models';
import { MessageTypes } from '@/lib/constants';
import {Response } from '@/lib/types';

export const useChat = () => {

  const [messages, setMessages] = useState<ChatMessageType[]>([] );
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    initializeTab();
  }, [])
  
  async function initializeTab(){
    try{
      const [currentTab] = await browser.tabs.query({active: true, currentWindow: true});
      if (!currentTab.id) {
          console.error("No active tab found");
          return;
        }

      const response = await browser.tabs.sendMessage<unknown, Response<ChatSession>>(currentTab.id, {
        type: MessageTypes.GET_SESSION,
      });

      if (response?.success) {
        setMessages(response.data.messages ?? []);
        setIsInitialized(true);
      } else if (response?.error) {
        console.error("Error from content script:", response.error.message);
        setError(response.error.message);
      }
        
    }catch(e){
      console.log(e);
      setError('There is an error during initialization');
    }
  }

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
      setError(undefined);

      const [ currentTab ] = await browser.tabs.query({currentWindow: true, active: true});
      if(!currentTab.id){
        console.error('No active tab found');
        setError('Error sending message');
        return;
      }

      const response = await browser.tabs.sendMessage<unknown, Response<ChatResponse>>(currentTab.id, {
        type: MessageTypes.INITIALIZE_CHAT,
        payload: {
          query: content
        }
      });

      if(response?.success){
        const data = response.data;
        const chatResponse: ChatMessageType = {
          role: 'assistant',
          content: data.content,
          timestamp: data.timestamp,
          id: data.id
        }
        setMessages((prev) => [...prev, chatResponse]);
        setIsLoading(false);
      }else if(response?.error){
        console.error("Error from content script:", response.error.message);
        setError(response.error.message);
        setIsLoading(false);
      }

      // // Simulate API delay
      // setTimeout(() => {
      //   const assistantMessage: ChatMessageType = {
      //     id: (Date.now() + 1).toString(),
      //     role: 'assistant',
      //     content: `Placeholder response to: "${content}"`,
      //     timestamp: Date.now(),
      //   };
      //   setMessages((prev) => [...prev, assistantMessage]);
      //   setIsLoading(false);
      // }, 1000);
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
    setError(undefined);
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
