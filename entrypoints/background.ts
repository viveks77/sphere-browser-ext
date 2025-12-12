import { MessageTypes } from '@/lib/constants';
import { BackgroundRouter } from '@/lib/router/index';
import { PageInfo } from '@/lib/types';
import { ChatService } from '@/services';
import { isConfigured } from '@/lib/configLoader';
import { convertToFactoryConfig, loadStoredConfig } from '@/lib/configLoader';

const ROUTER_CONFIG = {
  debug: true,
  timeout: 30000,
} as const;

let chatService: ChatService | null = null;

/**
 * Initialize chat service with stored configuration
 */
async function initializeChatService(): Promise<boolean> {
  try {
    const configured = await isConfigured();
    if (!configured) {
      console.warn('[Background] Extension not configured');
      return false;
    }

    const storedConfig = await loadStoredConfig();
    if (!storedConfig) {
      console.warn('[Background] Failed to load stored configuration');
      return false;
    }

    chatService = new ChatService();
    const config = convertToFactoryConfig(storedConfig);
    chatService.initialize(config);
    return true;
  } catch (error) {
    console.error('[Background] Failed to initialize chat service:', error);
    return false;
  }
}

export default defineBackground(async () => {
  try {
    const router = new BackgroundRouter(ROUTER_CONFIG);

    // Handler for retrieving session
    router.registerHandler(MessageTypes.GET_SESSION, async (payload: PageInfo) => {
      if (!chatService) {
        const initialized = await initializeChatService();
        if (!initialized) {
          throw new Error('Chat service not initialized. Please configure the extension.');
        }
      }

      const { id } = payload;
      const session = await chatService!.setCurrentTab(id);
      return session;
    });

    // Handler for sending messages
    router.registerHandler(
      MessageTypes.INITIALIZE_CHAT,
      async (payload: PageInfo & { query: string; messageId: string; enableRag: boolean }) => {
        if (!chatService) {
          const initialized = await initializeChatService();
          if (!initialized) {
            throw new Error('Chat service not initialized. Please configure the extension.');
          }
        }

        const { id, query, messageId, enableRag, content, title, url } = payload;

        // Load or create session for this tab
        const session = await chatService!.setCurrentTab(id);
        // Store webpage content if not already stored
        const tabDocumentCount = await chatService!.getTabDocumentCount();
        if (tabDocumentCount === 0 && content) {
          await chatService!.storeWebpageContent(content, { title, url });
        }else{
          const tabDocuments = await chatService!.getTabDocument();
          if(url !== tabDocuments?.document?.metadata?.url){
            await chatService!.clearTabDocuments();
            await chatService!.storeWebpageContent(content, { title, url });
          }
        }

        // Send message and get response
        const response = await chatService!.sendMessage(query, messageId, enableRag);
        return response;
      }
    );

    router.registerHandler(MessageTypes.CLEAR_SESSION, async (payload: PageInfo) => {
      if(!chatService){
        const initialized = await initializeChatService();
        if(!initialized){
          throw new Error("Chat service not initialized. Please configure the extension");
        }
      }
      await chatService?.clearTabSession();
    })

    // Start listening for messages
    await router.startListener();
  } catch (error) {
    console.error('[Background] Router initialization error:', error);
  }
});
