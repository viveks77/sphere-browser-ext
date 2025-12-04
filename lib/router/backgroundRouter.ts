import { BaseRouter } from "./baseRouter";
import { Message, Response } from "../types";

// Background script router - handles messages in background context
export class BackgroundRouter extends BaseRouter {
  // Route message and execute handler in background context
  async routeMessage(msg: Message): Promise<Response> {
    const { type, payload } = msg;

    // Check if handler exists
    if (!this.hasHandler(type)) {
      this.log(`No handler found for type: "${type}"`);
      return Promise.reject("NO_HANDLER: " + `No handler registered for message type "${type}"`);
    }

    try {
      this.log(`Processing message type: "${type}"`);
      const handler = this.handlers.get(type);

      if (!handler) {
        throw new Error(`Handler disappeared for type: "${type}"`);
      }

      // Execute handler and await result
      const result = await Promise.resolve(handler(payload));

      this.log(`Message handled successfully for type: "${type}"`, result);

      return this.createSuccessResponse(result);
    } catch (error) {
      this.logError(`Error in BackgroundRouter: ${error}`);
      return Promise.reject("HANDLER_EXECUTION_ERROR: " + (error instanceof Error ? error.message : "Handler execution failed"));
    }
  }
}