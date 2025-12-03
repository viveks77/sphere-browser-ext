/**
 * Factory Service
 * Central service for initializing and managing all AI services
 * Provides a unified interface for accessing LLM and Vector Store services
 */

import { BaseLLMService, GeminiLLMService } from '@/services/llm';
import {
  BaseEmbeddingService,
  GeminiEmbeddingService,
} from '@/services/embedding';
import { VectorStoreService } from '@/services/vectorstore';
import StorageService from '@/services/storage';
import {
  ChatSession,
  ChatRequest,
  ChatResponse,
  ChatMessage,
  SearchResult,
  EmbeddingServiceConfig,
  LLMServiceConfig,
  VectorStoreConfig,
} from '@/lib/models';

export type LLMProvider = 'gemini';
export type EmbeddingProvider = 'gemini';

/**
 * Factory service configuration
 */
export interface AIServiceFactoryConfig {
  llm: {
    provider: LLMProvider;
    config: LLMServiceConfig;
  };
  embedding: {
    provider: EmbeddingProvider;
    config: EmbeddingServiceConfig;
  };
  vectorStore?: VectorStoreConfig;
}

/**
 * Unified AI Service Factory
 * Manages lifecycle and provides access to all AI services
 */
export class AIServiceFactory {
  private llmService: BaseLLMService | null = null;
  private embeddingService: BaseEmbeddingService | null = null;
  private vectorStoreService: VectorStoreService | null = null;
  private storageService: StorageService;
  private config: AIServiceFactoryConfig;
  private debug: boolean;

  // Tab-based chat session storage (in-memory cache)
  private tabSessions: Map<string, ChatSession> = new Map();

  constructor(config: AIServiceFactoryConfig) {
    this.config = config;
    this.debug = config.llm.config.debug ?? false;
    this.storageService = new StorageService();
  }

  /**
   * Initialize all services
   */
  initialize() {
    try {
      this.log('Initializing AI Service Factory');

      // Initialize LLM Service
      this.llmService = this.createLLMService(
        this.config.llm.provider,
        this.config.llm.config
      );

      // Initialize Embedding Service
      this.embeddingService = this.createEmbeddingService(
        this.config.embedding.provider,
        this.config.embedding.config
      );

      // Initialize Vector Store Service with embeddings
      const embeddings = this.embeddingService.getEmbeddings();
      this.vectorStoreService = new VectorStoreService(
        embeddings,
        this.storageService,
        this.config.vectorStore
      );

      this.log('AI Service Factory initialized successfully');
    } catch (error) {
      this.logError('Failed to initialize AI Service Factory', error);
      throw error;
    }
  }

  /**
   * Get LLM service
   */
  getLLMService(): BaseLLMService {
    if (!this.llmService) {
      throw new Error('LLM Service not initialized. Call initialize() first.');
    }
    return this.llmService;
  }

  /**
   * Get Embedding service
   */
  getEmbeddingService(): BaseEmbeddingService {
    if (!this.embeddingService) {
      throw new Error(
        'Embedding Service not initialized. Call initialize() first.'
      );
    }
    return this.embeddingService;
  }

  /**
   * Get Vector Store service
   */
  getVectorStoreService(): VectorStoreService {
    if (!this.vectorStoreService) {
      throw new Error(
        'Vector Store Service not initialized. Call initialize() first.'
      );
    }
    return this.vectorStoreService;
  }

  /**
   * Send a chat request
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    return this.getLLMService().chat(request);
  }

  /**
   * Stream chat response
   */
  async *streamChat(
    request: ChatRequest
  ): AsyncGenerator<ChatResponse, void, unknown> {
    yield* this.getLLMService().streamChat(request);
  }

  /**
   * Load or create a session for a specific tab
   */
  async loadOrCreateTabSession(tabId: string): Promise<ChatSession> {
    // Check if tab session is in memory cache
    if (this.tabSessions.has(tabId)) {
      return this.tabSessions.get(tabId)!;
    }

    // Try to load from storage
    const storageKey = `tab_session_${tabId}`;
    const storedSession = await this.storageService.getItem<ChatSession>(
      storageKey,
      'session'
    );

    if (storedSession) {
      this.tabSessions.set(tabId, storedSession);
      this.log('Loaded tab session from storage', { tabId });
      return storedSession;
    }

    // Create new session for tab
    const newSession: ChatSession = {
      id: tabId,
      title: `Tab ${tabId}`,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.tabSessions.set(tabId, newSession);
    await this.storageService.setItem<ChatSession>(storageKey, newSession, 'session');
    this.log('Created new tab session', { tabId });

    return newSession;
  }

  /**
   * Get a tab's session
   */
  async getTabSession(tabId: string): Promise<ChatSession | null> {
    // Check in-memory cache first
    if (this.tabSessions.has(tabId)) {
      return this.tabSessions.get(tabId)!;
    }

    // Load from storage
    const storageKey = `tab_session_${tabId}`;
    const session = await this.storageService.getItem<ChatSession>(
      storageKey,
      'session'
    );

    if (session) {
      this.tabSessions.set(tabId, session);
    }

    return session || null;
  }

  /**
   * Add message to a tab's session
   */
  async addMessageToTabSession(tabId: string, message: ChatMessage): Promise<void> {
    let session: ChatSession | null | undefined = this.tabSessions.get(tabId);

    if (!session) {
      // Try loading from storage
      const storedSession = await this.getTabSession(tabId);
      if (!storedSession) {
        session = await this.loadOrCreateTabSession(tabId);
      } else {
        session = storedSession;
      }
    }

    session.messages.push({
      ...message,
      id: message.id || `${Date.now()}-${Math.random()}`,
      timestamp: message.timestamp || Date.now(),
    });

    session.updatedAt = Date.now();
    this.tabSessions.set(tabId, session);

    // Persist to storage
    const storageKey = `tab_session_${tabId}`;
    await this.storageService.setItem<ChatSession>(storageKey, session, 'session');

    this.log('Added message to tab session', {
      tabId,
      messageCount: session.messages.length,
    });
  }

  /**
   * Clear a tab's session
   */
  async clearTabSession(tabId: string): Promise<void> {
    this.tabSessions.delete(tabId);
    // Clear from storage by setting to null
    const storageKey = `tab_session_${tabId}`;
    await this.storageService.setItem(storageKey, null, 'session');
    this.log('Cleared tab session', { tabId });
  }

  /**
   * Add webpage to a tab's vector store
   */
  async addWebpageToTab(
    tabId: string,
    pageContent: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.getVectorStoreService().addWebpageToTab(tabId, pageContent, metadata);
    this.log('Added webpage to tab vector store', { tabId });
  }

  /**
   * Search documents in a tab's vector store
   */
  async searchTabDocuments(
    tabId: string,
    queryText: string,
    limit?: number
  ): Promise<SearchResult[]> {
    return this.getVectorStoreService().searchInTab(
      tabId,
      queryText,
      limit || 5,
    );
  }

  /**
   * Get document count for a tab
   */
  async getTabDocumentCount(tabId: string): Promise<number> {
    return this.getVectorStoreService().getTabDocumentCount(tabId);
  }

  /**
   * Clear a tab's documents from vector store
   */
  async clearTabDocuments(tabId: string): Promise<void> {
    await this.getVectorStoreService().clearTabDocuments(tabId);
    this.log('Cleared tab documents from vector store', { tabId });
  }

  /**
   * Create LLM service based on provider
   */
  private createLLMService(
    provider: LLMProvider,
    config: LLMServiceConfig
  ): BaseLLMService {
    switch (provider) {
      case 'gemini':
        return new GeminiLLMService(config);
      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }

  /**
   * Create Embedding service based on provider
   */
  private createEmbeddingService(
    provider: EmbeddingProvider,
    config: EmbeddingServiceConfig
  ): BaseEmbeddingService {
    switch (provider) {
      case 'gemini':
        return new GeminiEmbeddingService(config);
      default:
        throw new Error(`Unsupported Embedding provider: ${provider}`);
    }
  }

  /**
   * Prepare a chat request with RAG context
   * 
   * Strategy:
   * 1. Search vector store for relevant chunks with relevance threshold (0.4 = 40% minimum)
   * 2. If relevant chunks found → Use as ragContext for targeted retrieval
   * 3. If no relevant chunks → Use full page as generalContext for comprehensive fallback
   * 
   * This approach optimizes context window usage:
   * - Relevant chunks when query matches page content
   * - Full page when semantic search returns nothing (edge cases/broad queries)
   * 
   * @param tabId - Tab identifier for session isolation
   * @param request - Chat request with conversation history
   * @param contextLimit - Maximum number of chunks to retrieve (default: 5)
   * @returns Enhanced chat request with RAG context attached
   */
  async prepareRagRequest(
    tabId: string,
    request: ChatRequest,
    contextLimit: number = 5
  ): Promise<ChatRequest> {
    try {
      // Get last user message for search query
      const lastUserMessage = request.messages
        .reverse()
        .find((m) => m.role === 'user');

      if (!lastUserMessage) {
        return request;
      }

      // Search vector store with relevance threshold (0.4 = 40% similarity minimum)
      const searchResults = await this.getVectorStoreService().searchInTab(
        tabId,
        lastUserMessage.content,
        contextLimit
      );

      // If relevant chunks found, use them as RAG context
      if (searchResults.length > 0) {
        this.log('Using RAG context from semantic search', {
          tabId,
          resultCount: searchResults.length,
        });
        return {
          ...request,
          ragContext: {
            documents: searchResults,
          },
        };
      }

      // Fallback: no relevant chunks found, offer full page as context
      this.log('No relevant chunks found, using full page as fallback', { tabId });
      const tabDocument = await this.getVectorStoreService().getTabDocument(tabId);
      if (tabDocument && tabDocument.document) {
        const { pageContent } = tabDocument.document;
        return {
          ...request,
          generalContext: pageContent,
        };
      }

      return request;
    } catch (error) {
      this.logError('Failed to prepare RAG request', error);
      // Return original request if RAG fails
      return request;
    }
  }

  /**
   * Log debug messages
   */
  private log(message: string, data?: unknown): void {
    if (this.debug) {
      console.log(`[AIServiceFactory] ${message}`, data ?? '');
    }
  }

  /**
   * Log errors
   */
  private logError(message: string, error?: unknown): void {
    console.error(`[AIServiceFactory Error] ${message}`, error ?? '');
  }
}

/**
 * Singleton instance factory
 */
let factoryInstance: AIServiceFactory | null = null;

/**
 * Get or create factory instance
 */
export function getAIServiceFactory(
  config?: AIServiceFactoryConfig
) {
  if (factoryInstance) {
    return factoryInstance;
  }

  if (!config) {
    throw new Error(
      'Factory configuration required for initial initialization'
    );
  }

  factoryInstance = new AIServiceFactory(config);
  factoryInstance.initialize();

  return factoryInstance;
}

/**
 * Reset factory instance (useful for testing)
 */
export function resetAIServiceFactory(): void {
  factoryInstance = null;
}
