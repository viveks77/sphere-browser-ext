import { Document } from '@langchain/core/documents';
import { Embeddings } from '@langchain/core/embeddings';
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import StorageService from '@/services/storage';
import {
  SearchResult,
  VectorStoreConfig,
} from '@/lib/models';

interface StoredVector {
  id: string;
  vector: number[];
  document: {
    pageContent: string;
    metadata?: Record<string, unknown>;
  };
}

/**
 * In-memory vector store using LangChain embeddings
 * Stores vectors in memory and persists documents to browser storage
 */
export class VectorStoreService {
  private vectors: Map<string, { embedding: number[]; document: Document }> = new Map();
  private storageService: StorageService;
  private storageKey: string;
  private debug: boolean;
  private embeddings: Embeddings;
  private idCounter: number = 0;
  private vectorStore: MemoryVectorStore | null = null;
  

  constructor(
    embeddings: Embeddings,
    storageService: StorageService,
    config: VectorStoreConfig = {}
  ) {
    this.embeddings = embeddings;
    this.storageService = storageService;
    this.storageKey = config.storageKey || 'vector_store';
    this.debug = config.debug ?? false;
  }

  /**
   * Initialize vector store and load from storage
   */
  async initialize(): Promise<void> {
    try {
      this.log('Initializing vector store');
      await this.load();
      this.log('Vector store initialized');
    } catch (error) {
      this.logError('Failed to initialize vector store', error);
      throw error;
    }
  }

  /**
   * Add documents to the vector store
   */
  async addDocuments(
    texts: string[],
    metadata?: Record<string, unknown>[]
  ): Promise<void> {
    try {
      this.log('Adding documents to vector store', { count: texts.length });

      // Embed texts using LangChain embeddings
      const embeddings = await this.embeddings.embedDocuments(texts);

      // Store vectors with documents
      texts.forEach((text, index) => {
        const id = `doc_${this.idCounter++}`;
        const document = new Document({
          pageContent: text,
          metadata: {
            ...metadata?.[index],
            id,
          },
        });

        this.vectors.set(id, {
          embedding: embeddings[index],
          document,
        });
      });

      await this.persist();
      this.log('Successfully added documents', { count: texts.length });
    } catch (error) {
      this.logError('Failed to add documents', error);
      throw error;
    }
  }

  /**
   * Search for similar documents
   */
  async search(
    query: string,
    limit: number = 10,
    threshold?: number
  ): Promise<SearchResult[]> {
    try {
      this.log('Searching vector store', {
        query: query.substring(0, 50),
        limit,
      });

      // Get query embedding
      const [queryEmbedding] = await this.embeddings.embedDocuments([query]);

      // Calculate similarity scores for all stored documents
      const scores: Array<{
        id: string;
        score: number;
        document: Document;
      }> = [];

      for (const [id, { embedding, document }] of this.vectors) {
        const similarity = this.cosineSimilarity(queryEmbedding, embedding);
        scores.push({ id, score: similarity, document });
      }

      // Sort by similarity and filter by threshold
      const results = scores
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .filter((item) => !threshold || item.score >= threshold)
        .map((item) => ({
          id: item.id,
          text: item.document.pageContent,
          score: item.score,
          metadata: item.document.metadata,
        }));

      this.log('Search completed', { resultCount: results.length });
      return results;
    } catch (error) {
      this.logError('Search failed', error);
      throw error;
    }
  }

  /**
   * Get vector store size (number of documents)
   */
  async getSize(): Promise<number> {
    return this.vectors.size;
  }

  /**
   * Clear all documents
   */
  async clear(): Promise<void> {
    try {
      this.log('Clearing vector store');
      this.vectors.clear();
      this.idCounter = 0;
      await this.storageService.setItem(this.storageKey, [], 'local');
      this.log('Vector store cleared');
    } catch (error) {
      this.logError('Failed to clear vector store', error);
      throw error;
    }
  }

  /**
   * Cosine similarity between two vectors
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;

    return dotProduct / denominator;
  }

  /**
   * Load documents from storage
   */
  private async load(): Promise<void> {
    try {
      this.log('Loading documents from storage');
      this.vectorStore = new MemoryVectorStore(this.embeddings);
      
      if(!this.vectorStore){
        throw new Error("Failed to initalize Vector Store");
      }
      const stored = await this.storageService.getItem<StoredVector[]>(this.storageKey, 'session');
      if (stored && Array.isArray(stored)) {
        stored.forEach((item) => {
          const document = new Document({
            pageContent: item.document.pageContent,
            metadata: item.document.metadata,
          });

          this.vectors.set(item.id, {
            embedding: item.vector,
            document,
          });
          // Update counter
          const match = item.id.match(/doc_(\d+)/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num >= this.idCounter) {
              this.idCounter = num + 1;
            }
          }
        });

        this.log('Loaded documents from storage', { count: stored.length });
      }
    } catch (error) {
      this.logError('Failed to load from storage', error);
    }
  }

  /**
   * Persist documents to storage
   */
  private async persist(): Promise<void> {
    try {
      const data: StoredVector[] = Array.from(this.vectors).map(
        ([id, { embedding, document }]) => ({
          id,
          vector: embedding,
          document: {
            pageContent: document.pageContent,
            metadata: document.metadata,
          },
        })
      );

      await this.storageService.setItem(this.storageKey, data, 'local');
    } catch (error) {
      this.logError('Failed to persist to storage', error);
    }
  }

  /**
   * Log debug messages
   */
  private log(message: string, data?: unknown): void {
    if (this.debug) {
      console.log(`[VectorStore] ${message}`, data ?? '');
    }
  }

  /**
   * Log errors
   */
  private logError(message: string, error?: unknown): void {
    console.error(`[VectorStore Error] ${message}`, error ?? '');
  }
}
