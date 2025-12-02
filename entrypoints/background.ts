import { MessageTypes } from "@/lib/constants";
import { BackgroundRouter } from "@/lib/router/index";
import { PageInfo } from "@/lib/types";
import { ChatService } from "@/services";
import { devConfig } from "@/services/config";
import StorageService from "@/services/storage";

export default defineBackground(() => {
  const storageService = new StorageService();
  const chatService = new ChatService();
  chatService.initialize(devConfig);
  // Initialize router with debug enabled for development
  const router = new BackgroundRouter({ 
    debug: true,
    timeout: 30000,
  });

  router.registerHandler(MessageTypes.INITIALIZE_CHAT, async (payload: PageInfo) => {
    console.log(`[Paylod Info for message Type - ${MessageTypes.INITIALIZE_CHAT}]`, payload)

    const {id} = payload;
    const pageInfo = await storageService.getItem<PageInfo>(id, 'session');
    if(!pageInfo){
      console.log('no pageInfo found');
    };
    
    // Load or create session for this tab
    const session = await chatService.setCurrentTab(id);
    console.log('Tab session loaded/created:', session);
  });  
  // Start listening for messages
  router.startListener().catch((error) => {
    console.error("Failed to start router listener:", error);
  });
});
