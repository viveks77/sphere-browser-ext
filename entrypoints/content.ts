import { MessageTypes } from "@/lib/constants";
import { ContentRouter } from "@/lib/router/index";

export default defineContentScript({
  matches: ["<all_urls>"],
  main(ctx) {
    // Initialize router with debug enabled for development
    const contentRouter = new ContentRouter({
      debug: true,
      timeout: 30000,
    });

    // Register handler with proper typing
    contentRouter.registerHandler(MessageTypes.FROM_BROWSER, (payload: unknown) => {
      console.log("Content script handler processing payload:", payload);
      return {
        success: true,
        message: "Content script processed the request",
        payload,
        timestamp: Date.now(),
      };
    });

    // Start listening for messages
    contentRouter.startListener().catch((error) => {
      console.error("Failed to start content router listener:", error);
    });
  },
});
