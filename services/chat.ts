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
  SearchResult,
} from '@/lib/models';

export class ChatService {
  private factory: AIServiceFactory | null = null;
  private currentTabId: string | null = null;

  /**
   * Initialize the chat service
   */
  initialize(config: AIServiceFactoryConfig) {
    this.factory = getAIServiceFactory(config);
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
   * Send a message with RAG context
   * The LLM service handles RAG internally
   */
  async sendMessage(
    userMessage: string,
    systemPrompt?: string,
    enableRag: boolean = true,
    ragContextLimit?: number,
    ragThreshold?: number
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
    let chatRequest: ChatRequest = {
      messages: session.messages,
      systemPrompt,
    };

    // Prepare RAG context if enabled
    if (enableRag) {
      chatRequest = await this.factory.prepareRagRequest(
        this.currentTabId,
        chatRequest,
        ragContextLimit || 5
      );
    }

    // Get response from LLM (which handles RAG if context is present)
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
   * Stream a message response with RAG context
   * The LLM service handles RAG internally
   */
  async *streamMessage(
    userMessage: string,
    systemPrompt?: string,
    enableRag: boolean = true,
    ragContextLimit?: number,
    ragThreshold?: number
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
    let chatRequest: ChatRequest = {
      messages: session.messages,
      systemPrompt,
    };

    // Prepare RAG context if enabled
    if (enableRag) {
      chatRequest = await this.factory.prepareRagRequest(
        this.currentTabId,
        chatRequest,
        ragContextLimit || 5
      );
    }

    // Stream response from LLM (which handles RAG if context is present)
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

  /**
   * Store webpage content for current tab
   */
  async storeWebpageContent(
    pageContent: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    if (!this.factory || !this.currentTabId) {
      throw new Error('No active tab');
    }

    await this.factory.addWebpageToTab(this.currentTabId, pageContent, metadata);
  }

  /**
   * Get document count for current tab
   */
  async getTabDocumentCount(): Promise<number> {
    if (!this.factory || !this.currentTabId) {
      throw new Error('No active tab');
    }

    return await this.factory.getTabDocumentCount(this.currentTabId);
  }

  /**
   * Clear documents for current tab
   */
  async clearTabDocuments(): Promise<void> {
    if (!this.factory || !this.currentTabId) {
      throw new Error('No active tab');
    }

    await this.factory.clearTabDocuments(this.currentTabId);
  }
}

// Export singleton instance
export const chatService = new ChatService();
