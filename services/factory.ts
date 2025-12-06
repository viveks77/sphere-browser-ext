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
import { SessionService } from '@/services/session';
import {
  ChatSession,
  ChatRequest,
  ChatResponse,
  ChatMessage,
  SearchResult,
  EmbeddingServiceConfig,
  LLMServiceConfig,
  VectorStoreConfig,
  TabDocuments,
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
  private sessionService: SessionService | null = null;
  private config: AIServiceFactoryConfig;
  private debug: boolean;

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

      // Initialize Session Service
      this.sessionService = new SessionService(
        this.storageService,
        this.config.llm.config.debug
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
   * Get Session Service
   */
  getSessionService(): SessionService {
    if (!this.sessionService) {
      throw new Error(
        'Session Service not initialized. Call initialize() first.'
      );
    }
    return this.sessionService;
  }

  /**
   * Send a chat request
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    return this.getLLMService().chat(request);
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
