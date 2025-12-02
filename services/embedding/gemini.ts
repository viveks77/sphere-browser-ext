/**
 * Google Gemini Embedding Service
 * Wrapper around LangChain's GoogleGenerativeAIEmbeddings
 */

import { BaseEmbeddingService } from './base';
import { EmbeddingServiceConfig } from '@/lib/models';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { Embeddings } from '@langchain/core/embeddings';

export class GeminiEmbeddingService extends BaseEmbeddingService {
  private readonly EMBEDDING_DIMENSIONS = 768;

  constructor(config: EmbeddingServiceConfig) {
    super(config);
    this.embeddings = this.createEmbeddings();
  }

  /**
   * Create LangChain Embeddings instance
   */
  private createEmbeddings(): GoogleGenerativeAIEmbeddings {
    if (!this.isConfigured()) {
      this.logError('Gemini API key not provided');
      throw new Error('Gemini API key is required');
    }

    try {
      const embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey: this.config.apiKey,
        model: this.config.model || 'embedding-001',
      });

      this.log('Gemini Embedding service initialized');
      return embeddings;
    } catch (error) {
      this.logError('Failed to initialize Gemini Embeddings', error);
      throw error;
    }
  }

  /**
   * Get LangChain Embeddings instance
   */
  getEmbeddings(): Embeddings {
    if (!this.embeddings) {
      this.embeddings = this.createEmbeddings();
    }
    return this.embeddings;
  }

  /**
   * Get embedding dimensions
   */
  getDimensions(): number {
    return this.EMBEDDING_DIMENSIONS;
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return !!this.config.apiKey;
  }
}
