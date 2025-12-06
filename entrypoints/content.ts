import { MessageTypes } from "@/lib/constants";
import { ContentRouter } from "@/lib/router/index";
import { ContentRouterHandlerOptions, PageInfo } from "@/lib/types";
import { generateUniqueId } from "@/lib/utils";

export default defineContentScript({
  matches: ["<all_urls>"],
  main(ctx) {
    // Initialize router with debug enabled for development
    const contentRouter = new ContentRouter({
      debug: true,
      timeout: 30000,
    });
    
    contentRouter.registerHandler(MessageTypes.GET_SESSION, (payload: {tabId: string}) => {
      const url = window.location.href;
      const tabId = payload?.tabId;
      
      if(url == null || tabId == null) {
        throw new Error('No Url Found');
      }
      const id = generateUniqueId(tabId);
      return {
        id: id,
        url: url
      }
    });

    // Handler for getting page content
    contentRouter.registerHandler<{tabId: string}, PageInfo, ContentRouterHandlerOptions>(MessageTypes.GET_PAGE_CONTENT, (payload) => {
      const browserContent = document.body.innerText;
      const url = window.location.href;
      const title = document.title;
      
      if(url == null) {
        throw new Error('No Url Found');
      }

      const id = generateUniqueId(payload.tabId);
      return {
        id: id,
        content: browserContent,
        url: url,
        title: title,
      }
    }, { stopPropogationToBackground: true }); 

    // Start listening for messages
    contentRouter.startListener().catch((error) => {
      console.error("Failed to start content router listener:", error);
    });
  },
});
