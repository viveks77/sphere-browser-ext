import { MessageTypes } from "@/lib/constants";
import { BackgroundRouter } from "@/lib/router/index";

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

  router.registerHandler("FROM_BROWSER2", (payload: unknown) => {
    return {
      success: true,
      message: "Message handled by router in background script  handler 2",
      timestamp: Date.now()
    }
  })

  // Start listening for messages
  router.startListener().catch((error) => {
    console.error("Failed to start router listener:", error);
  });
});
