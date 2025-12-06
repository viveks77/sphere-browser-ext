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
  TabDocuments,
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
    return await this.factory.getSessionService().loadOrCreateTabSession(tabId);
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
   * @param enableRag - Whether to use RAG context (default: true)
   * @param ragContextLimit - Max chunks to retrieve (default: 5)
   * @param ragThreshold - Relevance threshold for chunks (unused, handled by VectorStore)
   * @returns LLM response with metadata
   */
  async sendMessage(
    userMessage: string,
    userMessageId: string,
    enableRag?: boolean,
    ragContextLimit?: number,
  ): Promise<ChatResponse> {
    if (!this.factory || !this.currentTabId) {
      throw new Error('No active tab');
    }

    const sessionService = this.factory.getSessionService();
    const session = await sessionService.getTabSession(this.currentTabId);
    
    if (!session) {
      throw new Error('Session not found');
    }

    // Add user message to session
    const userMsg: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: userMessage,
      status: 'sent',
      timestamp: Date.now(),
    };
    // Create chat request
    let chatRequest: ChatRequest = {
      messages: [...session.messages, userMsg],
    };

    // Prepare context (RAG Logic)
    chatRequest = await this.prepareRagRequest(
      this.currentTabId,
      chatRequest,
      enableRag,
      ragContextLimit
    );
    
    // Get response from LLM (which handles RAG if context is present)
    const response = await this.factory.chat(chatRequest);

    // // Add assistant message to session
    const assistantMsg: ChatMessage = {
      role: 'assistant',
      content: response.content,
      id: response.id,
      status: 'sent',
      timestamp: Date.now(),
    };
    
    await sessionService.addMessageToTabSession(this.currentTabId, userMsg);
    await sessionService.addMessageToTabSession(this.currentTabId, assistantMsg);

    return response;
  }

  /**
   * Prepare a chat request with RAG context
   */
  private async prepareRagRequest(
    tabId: string,
    request: ChatRequest,
    enableRag: boolean = true,
    contextLimit: number = 5
  ): Promise<ChatRequest> {
    if (!this.factory) return request;

    try {
      const lastUserMessage = request.messages
        .toReversed()
        .find((m) => m.role === 'user');

      if (!lastUserMessage) {
        return request;
      }

      const vectorStore = this.factory.getVectorStoreService();
      const tabDocument = await vectorStore.getTabDocument(tabId);

      if (!enableRag) {
        if (tabDocument && tabDocument.document) {
          const { pageContent } = tabDocument.document;
          return {
            ...request,
            generalContext: pageContent,
          };
        }
        return request;
      }

      // Search vector store
      const searchResults = await vectorStore.searchInTab(
        tabId,
        lastUserMessage.content,
        contextLimit
      );

      // If relevant chunks found
      if (searchResults.length > 0) {
        return {
          ...request,
          ragContext: {
            documents: searchResults,
          },
        };
      }

      // Fallback: full page
      if (tabDocument && tabDocument.document) {
        const { pageContent } = tabDocument.document;
        return {
          ...request,
          generalContext: pageContent,
        };
      }

      return request;
    } catch (error) {
      console.error('Failed to prepare RAG request', error);
      return request;
    }
  }

  /**
   * Clear current tab's session
   */
  async clearTabSession(): Promise<void> {
    if (!this.factory || !this.currentTabId) {
      throw new Error('No active tab');
    }

    await this.factory.getSessionService().clearTabSession(this.currentTabId);
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

    await this.factory.getVectorStoreService().addWebpageToTab(this.currentTabId, pageContent, metadata);
  }

  async getTabDocument(): Promise<TabDocuments | null> {
    if (!this.factory || !this.currentTabId) {
      throw new Error('No active tab');
    }

    return await this.factory.getVectorStoreService().getTabDocument(this.currentTabId);
  }

  /**
   * Get document count for current tab
   */
  async getTabDocumentCount(): Promise<number> {
    if (!this.factory || !this.currentTabId) {
      throw new Error('No active tab');
    }

    return await this.factory.getVectorStoreService().getTabDocumentCount(this.currentTabId);
  }

  /**
   * Clear documents for current tab
   */
  async clearTabDocuments(): Promise<void> {
    if (!this.factory || !this.currentTabId) {
      throw new Error('No active tab');
    }

    await this.factory.getVectorStoreService().clearTabDocuments(this.currentTabId);
  }
}

// Export singleton instance
export const chatService = new ChatService();
