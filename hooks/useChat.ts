import { useState, useCallback, useEffect, useRef } from 'react';
import { ChatMessage as ChatMessageType, ChatResponse, ChatSession } from '@/lib/models';
import { MessageTypes } from '@/lib/constants';
import { Response, PageInfo } from '@/lib/types';
import { isConfigured } from '@/lib/configLoader';

export const useChat = () => {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [enableRag, setEnableRag] = useState<boolean>(true);
  const currentTabIdRef = useRef<number | null>(null);

  // Initialize tab on mount and listen for tab changes
  useEffect(() => {
    // Initial load
    initializeTab();

    // Listen for active tab changes
    const tabChangeListener = (activeInfo: { tabId: number; windowId: number }) => {
      if (currentTabIdRef.current !== activeInfo.tabId) {
        currentTabIdRef.current = activeInfo.tabId;
        // Reload the session when tab changes
        initializeTab();
      }
    };

    browser.tabs.onActivated.addListener(tabChangeListener);

    return () => {
      browser.tabs.onActivated.removeListener(tabChangeListener);
    };
  }, []);
  
  async function initializeTab(){
    try{
      const configured = await isConfigured();
      if (!configured) {
        setError('Extension not configured. Please visit the options page to add your API credentials.');
        setIsInitialized(true);
        return;
      }

      const [currentTab] = await browser.tabs.query({active: true, currentWindow: true});
      if (!currentTab.id) {
          console.error("No active tab found");
          return;
      }
      
      const response = await browser.tabs.sendMessage<unknown, Response<ChatSession>>(currentTab.id, {
        type: MessageTypes.GET_SESSION,
        payload: {
          tabId: currentTab.id,
        }
      });

      if (response?.success) {
        setMessages(response.data.messages ?? []);
        setIsInitialized(true);
      } else if (response?.error) {
        console.error("Error from content script:", response.error.message);
        setError(response.error.message);
      }
        
    }catch(e){
      console.error(e);
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
        
        // Get page content from the tab
        const pageContentResponse = await browser.tabs.sendMessage<unknown, Response<PageInfo>>(currentTab.id, {
          type: MessageTypes.GET_PAGE_CONTENT,
          payload: {
            tabId: currentTab.id,
          }
        });
        if (pageContentResponse?.error) {
          throw new Error(pageContentResponse.error.message);
        }

        const pageInfo = pageContentResponse?.data;
        if (!pageInfo) {
          throw new Error('Failed to get page content');
        }

        // Send chat request directly to background script
        // This avoids the connection being broken if the page navigates
        const response = await browser.runtime.sendMessage<unknown, Response<ChatResponse>>({
          type: MessageTypes.INITIALIZE_CHAT,
          payload: {
            ...pageInfo,
            tabId: currentTab.id,
            query: content,
            messageId: messageId,
            enableRag: enableRag,
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
      } catch (err: unknown) {
        console.error("Error sending message:", err);
        const errorMessage = err instanceof Error ? err.message : 'Error sending message';
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

    setMessages(prev => prev.filter(m => m.id !== id));
    await sendMessage(messageToRetry.content);
  }, [messages, sendMessage]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(undefined);
  }, []);

  return {
    messages,
    isLoading,
    isInitialized,
    error,
    enableRag,
    sendMessage,
    retryMessage,
    clearMessages,
    setEnableRag,
  };
};
