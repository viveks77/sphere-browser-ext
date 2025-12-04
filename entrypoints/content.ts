import { MessageTypes } from "@/lib/constants";
import { ContentRouter } from "@/lib/router/index";
import { PageInfo } from "@/lib/types";
import { generateUniqueId } from "@/lib/utils";

export default defineContentScript({
  matches: ["<all_urls>"],
  main(ctx) {
    // Initialize router with debug enabled for development
    const contentRouter = new ContentRouter({
      debug: true,
      timeout: 30000,
    });
    
    contentRouter.registerHandler(MessageTypes.GET_SESSION, (payload) => {
      const url = window.location.href;
      if(url == null) {
        throw new Error('No Url Found');
      }
      const id = generateUniqueId(url);
      return {
        id: id,
        url: url
      }
    });

    // Register handler with proper typing
    contentRouter.registerHandler<{query: string, messageId: string}, PageInfo>(MessageTypes.INITIALIZE_CHAT, (payload) => {
      const browserContent = document.body.innerText;
      const url = window.location.href;
      const title = document.title;
      
      if(url == null) {
        throw new Error('No Url Found');
      }

      const id = generateUniqueId(url);
      return {
        id: id,
        content: browserContent,
        url: url,
        title: title,
        query: payload.query,
        messageId: payload.messageId,
      }
    });

    // Start listening for messages
    contentRouter.startListener().catch((error) => {
      console.error("Failed to start content router listener:", error);
    });
  },
});
