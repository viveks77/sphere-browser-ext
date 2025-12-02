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
  async initialize(): Promise<void> {
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
      await this.vectorStoreService.initialize();

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
      'local'
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
    await this.storageService.setItem<ChatSession>(storageKey, newSession, 'local');
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
      'local'
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
    await this.storageService.setItem<ChatSession>(storageKey, session, 'local');

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
    await this.storageService.setItem(storageKey, null, 'local');
    this.log('Cleared tab session', { tabId });
  }

  /**
   * Embed and store text in vector store
   */
  async embedAndStore(
    text: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.getVectorStoreService().addDocuments([text], [metadata || {}]);
    this.log('Embedded and stored text');
  }

  /**
   * Search vector store with query text
   */
  async semanticSearch(
    queryText: string,
    limit?: number,
    threshold?: number
  ): Promise<SearchResult[]> {
    return this.getVectorStoreService().search(queryText, limit, threshold);
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
export async function getAIServiceFactory(
  config?: AIServiceFactoryConfig
): Promise<AIServiceFactory> {
  if (factoryInstance) {
    return factoryInstance;
  }

  if (!config) {
    throw new Error(
      'Factory configuration required for initial initialization'
    );
  }

  factoryInstance = new AIServiceFactory(config);
  await factoryInstance.initialize();

  return factoryInstance;
}

/**
 * Reset factory instance (useful for testing)
 */
export function resetAIServiceFactory(): void {
  factoryInstance = null;
}
