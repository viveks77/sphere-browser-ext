import { MessageTypes } from "@/lib/constants";
import { BackgroundRouter } from "@/lib/router/index";
import { PageInfo } from "@/lib/types";

export default defineBackground(() => {
  // Initialize router with debug enabled for development
  const router = new BackgroundRouter({ 
    debug: true,
    timeout: 30000,
  });


  // Register handler with proper typing
  router.registerHandler(MessageTypes.FROM_CONTENT, (payload: unknown) => {
    console.log("Background handler processing payload:", payload);
    return {
      success: true,
      message: "Message handled by router in background script",
      timestamp: Date.now(),
    };
  });

  router.registerHandler(MessageTypes.INITIALIZE_CHAT, (payload: PageInfo) => {
    console.log("background received pageInfo", payload);
  })
  // Start listening for messages
  router.startListener().catch((error) => {
    console.error("Failed to start router listener:", error);
  });
});
