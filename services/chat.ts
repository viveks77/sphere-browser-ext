/**
 * Chat Service
 * Tab-based chat management with auto-load/create sessions
 */

import {
  getAIServiceFactory,
  AIServiceFactory,
  type AIServiceFactoryConfig,
} from '@/services/factory';
import {
  ChatSession,
  ChatMessage,
  ChatRequest,
  ChatResponse,
} from '@/lib/models';

export class ChatService {
  private factory: AIServiceFactory | null = null;
  private currentTabId: string | null = null;

  /**
   * Initialize the chat service
   */
  async initialize(config: AIServiceFactoryConfig): Promise<void> {
    this.factory = await getAIServiceFactory(config);
  }

  /**
   * Set current tab and load or create session
   */
  async setCurrentTab(tabId: string): Promise<ChatSession> {
    if (!this.factory) {
      throw new Error('Chat service not initialized');
    }

    this.currentTabId = tabId;
    return await this.factory.loadOrCreateTabSession(tabId);
  }

  /**
   * Get current tab's session
   */
  async getCurrentSession(): Promise<ChatSession | null> {
    if (!this.factory || !this.currentTabId) {
      return null;
    }

    return await this.factory.getTabSession(this.currentTabId);
  }

  /**
   * Send a message in the current tab's session
   */
  async sendMessage(
    userMessage: string,
    systemPrompt?: string
  ): Promise<ChatResponse> {
    if (!this.factory || !this.currentTabId) {
      throw new Error('No active tab');
    }

    const session = await this.factory.getTabSession(this.currentTabId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Add user message to session
    const userMsg: ChatMessage = {
      role: 'user',
      content: userMessage,
    };
    await this.factory.addMessageToTabSession(this.currentTabId, userMsg);

    // Create chat request
    const chatRequest: ChatRequest = {
      messages: session.messages,
      systemPrompt,
    };

    // Get response from LLM
    const response = await this.factory.chat(chatRequest);

    // Add assistant message to session
    const assistantMsg: ChatMessage = {
      role: 'assistant',
      content: response.content,
      id: response.id,
    };
    await this.factory.addMessageToTabSession(this.currentTabId, assistantMsg);

    return response;
  }

  /**
   * Stream a message response in the current tab's session
   */
  async *streamMessage(
    userMessage: string,
    systemPrompt?: string
  ): AsyncGenerator<string, void, unknown> {
    if (!this.factory || !this.currentTabId) {
      throw new Error('No active tab');
    }

    const session = await this.factory.getTabSession(this.currentTabId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Add user message to session
    const userMsg: ChatMessage = {
      role: 'user',
      content: userMessage,
    };
    await this.factory.addMessageToTabSession(this.currentTabId, userMsg);

    // Create chat request
    const chatRequest: ChatRequest = {
      messages: session.messages,
      systemPrompt,
    };

    // Stream response from LLM
    let fullResponse = '';
    for await (const chunk of this.factory.streamChat(chatRequest)) {
      fullResponse += chunk.content;
      yield chunk.content;
    }

    // Add complete assistant message to session
    const assistantMsg: ChatMessage = {
      role: 'assistant',
      content: fullResponse,
    };
    await this.factory.addMessageToTabSession(this.currentTabId, assistantMsg);
  }

  /**
   * Clear current tab's session
   */
  async clearTabSession(): Promise<void> {
    if (!this.factory || !this.currentTabId) {
      throw new Error('No active tab');
    }

    await this.factory.clearTabSession(this.currentTabId);
  }

  /**
   * Get factory instance (for advanced usage)
   */
  getFactory(): AIServiceFactory {
    if (!this.factory) {
      throw new Error('Chat service not initialized');
    }

    return this.factory;
  }
}

// Export singleton instance
export const chatService = new ChatService();
