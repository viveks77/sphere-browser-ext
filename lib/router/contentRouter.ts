import { BaseRouter } from "./baseRouter";
import { Message, Response } from "../types";

// Content script router - handles messages and forwards to background script
export class ContentRouter extends BaseRouter {
  // Route message and send result back to background script
  async routeMessage(msg: Message): Promise<Response> {
    const { type, payload } = msg;

    // Check if handler exists
    if (!this.hasHandler(type)) {
      this.log(`No handler found for type: "${type}"`);
      return this.createErrorResponse(
        "HANDLER_NOT_FOUND",
        `No handler registered for message type: "${type}"`
      );
    }

    try {
      this.log(`Processing message type: "${type}"`);
      const handler = this.handlers.get(type);

      if (!handler) {
        throw new Error(`Handler disappeared for type: "${type}"`);
      }

      // Execute handler and await result
      const result = await Promise.resolve(handler(payload));

      // Send back to background script
      try {
        const backgroundResponse = await browser.runtime.sendMessage({
          type: type,
          payload: result,
        });

        this.log(
          `Message forwarded to background for type: "${type}"`,
          backgroundResponse
        );

        return this.createSuccessResponse(backgroundResponse);
      } catch (sendError) {
        this.logError(`Failed to send message to background: ${sendError}`);
        throw new Error(
          `Failed to communicate with background script: ${
            sendError instanceof Error ? sendError.message : "Unknown error"
          }`
        );
      }
    } catch (error) {
      this.logError(`Error in ContentRouter: ${error}`);
      return this.createErrorResponse(
        "HANDLER_EXECUTION_ERROR",
        error instanceof Error ? error.message : "Handler execution failed"
      );
    }
  }
}
