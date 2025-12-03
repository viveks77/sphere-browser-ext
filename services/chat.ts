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
   * Send a message with optional RAG context
   * 
   * Flow:
   * 1. Validates active tab session
   * 2. Adds user message to conversation history
   * 3. Optionally prepares RAG context (semantic search + relevance filtering)
   * 4. Sends request to LLM (which applies context to system prompt)
   * 5. Stores assistant response in session
   * 
   * @param userMessage - User's input text
   * @param systemPrompt - Optional system instructions
   * @param enableRag - Whether to use RAG context (default: true)
   * @param ragContextLimit - Max chunks to retrieve (default: 5)
   * @param ragThreshold - Relevance threshold for chunks (unused, handled by VectorStore)
   * @returns LLM response with metadata
   */
  async sendMessage(
    userMessage: string,
    systemPrompt?: string,
    ragContextLimit?: number,
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

    // Prepare context
    chatRequest = await this.factory.prepareRagRequest(
      this.currentTabId,
      chatRequest,
      ragContextLimit || 5
    );
    

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
   * Stream a message response with optional RAG context
   * 
   * Same flow as sendMessage but yields chunks in real-time
   * 
   * @param userMessage - User's input text
   * @param systemPrompt - Optional system instructions
   * @param enableRag - Whether to use RAG context (default: true)
   * @param ragContextLimit - Max chunks to retrieve (default: 5)
   * @param ragThreshold - Relevance threshold for chunks (unused)
   * @yields Streamed response chunks
   */
  async *streamMessage(
    userMessage: string,
    systemPrompt?: string,
    ragContextLimit?: number,
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

    // Prepare context
    chatRequest = await this.factory.prepareRagRequest(
      this.currentTabId,
      chatRequest,
      ragContextLimit || 5
    );

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
   * 
   * Chunks the content and indexes for semantic search
   * 
   * @param pageContent - Full HTML/text content of the webpage
   * @param metadata - Optional metadata (URL, title, etc.)
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
