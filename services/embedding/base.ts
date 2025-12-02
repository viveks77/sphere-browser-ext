/**
 * Abstract base class for Embedding services
 * Wrapper around LangChain embeddings
 */

import { Embeddings } from '@langchain/core/embeddings';
import { EmbeddingServiceConfig } from '@/lib/models';

export abstract class BaseEmbeddingService {
  protected config: EmbeddingServiceConfig;
  protected debug: boolean;
  protected embeddings: Embeddings | null = null;

  constructor(config: EmbeddingServiceConfig) {
    this.config = config;
    this.debug = config.debug ?? false;
  }

  /**
   * Get the underlying LangChain Embeddings instance
   */
  abstract getEmbeddings(): Embeddings;

  /**
   * Get the dimensions of embeddings produced by this service
   */
  abstract getDimensions(): number;

  /**
   * Check if the service is available/configured
   */
  abstract isConfigured(): boolean;

  /**
   * Log debug messages
   */
  protected log(message: string, data?: unknown): void {
    if (this.debug) {
      console.log(`[EmbeddingService] ${message}`, data ?? '');
    }
  }

  /**
   * Log errors
   */
  protected logError(message: string, error?: unknown): void {
    console.error(`[EmbeddingService Error] ${message}`, error ?? '');
  }
}
