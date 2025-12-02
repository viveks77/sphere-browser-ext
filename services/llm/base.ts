/**
 * Abstract base class for LLM services
 * Defines the contract that all LLM implementations must follow
 */

import {
  ChatMessage,
  ChatRequest,
  ChatResponse,
  LLMServiceConfig,
} from '@/lib/models';

export abstract class BaseLLMService {
  protected config: LLMServiceConfig;
  protected debug: boolean;

  constructor(config: LLMServiceConfig) {
    this.config = config;
    this.debug = config.debug ?? false;
  }

  /**
   * Send a chat request and get a response
   */
  abstract chat(request: ChatRequest): Promise<ChatResponse>;

  /**
   * Stream chat responses (optional)
   */
  abstract streamChat(
    request: ChatRequest
  ): AsyncGenerator<ChatResponse, void, unknown>;

  /**
   * Check if the service is available/configured
   */
  abstract isConfigured(): boolean;

  /**
   * Log debug messages
   */
  protected log(message: string, data?: unknown): void {
    if (this.debug) {
      console.log(`[LLMService] ${message}`, data ?? '');
    }
  }

  /**
   * Log errors
   */
  protected logError(message: string, error?: unknown): void {
    console.error(`[LLMService Error] ${message}`, error ?? '');
  }
}
