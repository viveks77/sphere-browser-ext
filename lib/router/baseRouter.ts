import {
  Message,
  Response,
  SuccessResponse,
  ErrorResponse,
  MessageHandler,
  RouterOptions,
} from "../types";

// Base router class for handling browser runtime messages with type-safe routing
export class BaseRouter {
  protected handlers: Map<string, Function> = new Map();
  protected options: Required<RouterOptions>;
  private listenerActive = false;

  constructor(options: RouterOptions = {}) {
    this.options = {
      timeout: options.timeout ?? 30000,
      debug: options.debug ?? false,
      maxHandlers: options.maxHandlers ?? 100,
    };
    this.validateOptions();
  }

  // Validate router configuration options
  private validateOptions(): void {
    if (this.options.timeout < 1000 || this.options.timeout > 300000) {
      throw new Error(
        "Timeout must be between 1000ms and 300000ms"
      );
    }
    if (this.options.maxHandlers < 1) {
      throw new Error("maxHandlers must be at least 1");
    }
  }

  // Register a message handler for a specific message type
  registerHandler<T = unknown, R = unknown>(
    type: string,
    handler: MessageHandler<T, R>
  ): void {
    if (this.handlers.size >= this.options.maxHandlers) {
      throw new Error(
        `Maximum handlers limit (${this.options.maxHandlers}) reached`
      );
    }

    if (this.handlers.has(type)) {
      throw new Error(
        `Handler already registered for type: "${type}". Use unregisterHandler() first.`
      );
    }

    if (typeof handler !== "function") {
      throw new TypeError(`Handler must be a function, got ${typeof handler}`);
    }

    this.handlers.set(type, handler);
    this.log(`Handler registered for type: "${type}"`);
  }

  // Unregister a message handler
  unregisterHandler(type: string): boolean {
    const result = this.handlers.delete(type);
    if (result) {
      this.log(`Handler unregistered for type: "${type}"`);
    }
    return result;
  }

  // Check if a handler is registered for a type
  hasHandler(type: string): boolean {
    return this.handlers.has(type);
  }

  // Get count of registered handlers
  getHandlerCount(): number {
    return this.handlers.size;
  }

  // Route and handle a message - to be implemented by subclasses
  async routeMessage(msg: Message): Promise<Response> {
    throw new Error(
      "routeMessage() must be implemented by subclass"
    );
  }

  // Create a success response
  protected createSuccessResponse<T = unknown>(data: T): SuccessResponse<T> {
    return {
      success: true,
      data,
    };
  }

  // Create an error response
  protected createErrorResponse(
    code: string,
    message: string
  ): ErrorResponse {
    return {
      success: false,
      error: {
        code,
        message,
      },
    };
  }

  // Debug logging utility
  protected log(...args: unknown[]): void {
    if (this.options.debug) {
      console.log(`[Router]`, ...args);
    }
  }

  // Error logging utility
  protected logError(error: unknown): void {
    console.error("[Router Error]", error);
  }

  // Start listening for messages (throws if listener is already active)
  async startListener(): Promise<void> {
    if (this.listenerActive) {
      throw new Error("Message listener is already active");
    }

    this.listenerActive = true;
    this.log("Message listener started");

    browser.runtime.onMessage.addListener(
      (msg: unknown, sender, sendResponse) => {
        this.handleMessage(msg, sender, sendResponse);
        return true; // Indicate async response
      }
    );
  }

  // Stop listening for messages
  stopListener(): void {
    if (this.listenerActive) {
      this.listenerActive = false;
      this.log("Message listener stopped");
    }
  }

  // Internal message handler with timeout and error handling
  private handleMessage(
    msg: unknown,
    sender: globalThis.Browser.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ): void {
    // Validate message format
    if (!this.isValidMessage(msg)) {
      const errorResponse = this.createErrorResponse(
        "INVALID_MESSAGE",
        "Message must have 'type' property"
      );
      sendResponse(errorResponse);
      return;
    }

    this.routeMessage(msg).then((response) => {
        console.log('base router response', response);
        sendResponse(response);
      }).catch((error) => {
        this.logError(`Route error for type "${msg.type}":`);
        sendResponse(
          this.createErrorResponse("ROUTING_ERROR",error instanceof Error ? error.message : "Unknown error occurred")
        );
      });
  }

  // Validate message structure
  private isValidMessage(msg: unknown): msg is Message {
    return (
      msg !== null &&
      typeof msg === "object" &&
      "type" in msg &&
      typeof (msg as Record<string, unknown>).type === "string"
    );
  }

  // Clear all registered handlers
  clearHandlers(): void {
    const count = this.handlers.size;
    this.handlers.clear();
    this.log(`Cleared ${count} handler(s)`);
  }

  // Get all registered handler types
  getHandlerTypes(): string[] {
    return Array.from(this.handlers.keys());
  }
}