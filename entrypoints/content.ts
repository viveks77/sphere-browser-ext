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

    // Register handler with proper typing
    contentRouter.registerHandler<unknown, PageInfo>(MessageTypes.INITIALIZE_CHAT, (payload) => {
      const browserContent = document.body.innerText;
      const url = window.location.href;
      const title = document.title;

      const id = generateUniqueId(url);
      return {
        id: id,
        content: browserContent,
        url: url,
        title: title
      }
    });

    // Start listening for messages
    contentRouter.startListener().catch((error) => {
      console.error("Failed to start content router listener:", error);
    });
  },
});
