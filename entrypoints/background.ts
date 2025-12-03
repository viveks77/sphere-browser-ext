import { MessageTypes } from "@/lib/constants";
import { BackgroundRouter } from "@/lib/router/index";
import { PageInfo } from "@/lib/types";
import { ChatService } from "@/services";
import { devConfig } from "@/services/config";
import StorageService from "@/services/storage";

export default defineBackground(() => {
  const chatService = new ChatService();
  chatService.initialize(devConfig);
  // Initialize router with debug enabled for development
  const router = new BackgroundRouter({ 
    debug: true,
    timeout: 30000,
  });


  router.registerHandler(MessageTypes.GET_SESSION, async (payload: PageInfo) => {
    const {id} = payload;

    const session = await chatService.setCurrentTab(id);
    console.log('Tab session created/loaded', session);
    return session;
  })
  
  router.registerHandler(MessageTypes.INITIALIZE_CHAT, async (payload: PageInfo) => {
    console.log(`[Paylod Info for message Type - ${MessageTypes.INITIALIZE_CHAT}]`, payload)

    const {id} = payload;
    
    // Load or create session for this tab
    const session = await chatService.setCurrentTab(id);
    console.log('Tab session loaded/created:', session);

    const tabDocument = await chatService.getTabDocumentCount();
    if(tabDocument  == 0){
      await chatService.storeWebpageContent(payload?.content, {title: payload?.title, url: payload?.url});
    }
    // const response = await chatService.sendMessage("what is at the bottom of the page ?", undefined, true);
    const response = await chatService.getFactory().searchTabDocuments(payload.id, "what is mcp ?");
    console.log('LLM Response for summary', response);

  });  
  // Start listening for messages
  router.startListener().catch((error) => {
    console.error("Failed to start router listener:", error);
  });
});
