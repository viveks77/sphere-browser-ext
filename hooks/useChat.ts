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

      const messageId = Date.now().toString();
      const userMessage: ChatMessageType = {
        id: messageId,
        role: 'user',
        content,
        timestamp: Date.now(),
        status: 'sending',
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(undefined);

      try {
        const [ currentTab ] = await browser.tabs.query({currentWindow: true, active: true});
        if(!currentTab.id){
          throw new Error('No active tab found');
        }

        const response = await browser.tabs.sendMessage<unknown, Response<ChatResponse>>(currentTab.id, {
          type: MessageTypes.INITIALIZE_CHAT,
          payload: {
            query: content,
            messageId: messageId,
          }
        });
        console.log(response);
        if(response?.success){
          const data = response.data;
          const chatResponse: ChatMessageType = {
            role: 'assistant',
            content: data.content,
            timestamp: data.timestamp,
            id: data.id
          }
          
          setMessages((prev) => 
            prev.map(msg => 
              msg.id === messageId 
                ? { ...msg, status: 'sent' as const } 
                : msg
            ).concat(chatResponse)
          );
          setIsLoading(false);
        } else if(response?.error){
          throw new Error(response.error.message);
        }
      } catch (err: any) {
        console.error("Error sending message:", err);
        const errorMessage = err.message || 'Error sending message';
        setError(errorMessage);
        setMessages((prev) => 
          prev.map(msg => 
            msg.id === messageId 
              ? { ...msg, status: 'error' as const } 
              : msg
          )
        );
        setIsLoading(false);
      }
    },
    []
  );

  const retryMessage = useCallback(async (id: string) => {
    const messageToRetry = messages.find(m => m.id === id);
    if (!messageToRetry || messageToRetry.role !== 'user') return;

    // Remove the failed message and any subsequent messages (though usually there won't be any if it failed)
    // Actually, better to just update the status of the existing message to 'sending' and try again
    // But sendMessage adds a new message. So we should probably reuse sendMessage logic but without adding a new message initially?
    // Or simpler: delete the old failed message and call sendMessage with the content.
    
    setMessages(prev => prev.filter(m => m.id !== id));
    await sendMessage(messageToRetry.content);
  }, [messages, sendMessage]);

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
    retryMessage,
    clearMessages,
  };
};
