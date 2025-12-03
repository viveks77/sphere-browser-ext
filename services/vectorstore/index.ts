import { Document } from '@langchain/core/documents';
import { Embeddings } from '@langchain/core/embeddings';
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory';
import StorageService from '@/services/storage';
import {
  SearchResult,
  VectorStoreConfig,
} from '@/lib/models';

interface TabDocuments {
  tabId: string;
  documents: Array<{
    pageContent: string;
    metadata?: Record<string, unknown>;
  }>;
  updatedAt: number;
}

/**
 * Tab-based vector store using LangChain MemoryVectorStore
 * Maintains separate document stores for each tab session
 */
export class VectorStoreService {
  // In-memory vector stores per tab
  private tabVectorStores: Map<string, MemoryVectorStore> = new Map();
  private storageService: StorageService;
  private debug: boolean;
  private embeddings: Embeddings;

  constructor(
    embeddings: Embeddings,
    storageService: StorageService,
    config: VectorStoreConfig = {}
  ) {
    this.embeddings = embeddings;
    this.storageService = storageService;
    this.debug = config.debug ?? false;
  }

  /**
   * Get or create vector store for a tab
   */
  private async getOrCreateTabVectorStore(tabId: string): Promise<MemoryVectorStore> {
    // Check if already in memory
    if (this.tabVectorStores.has(tabId)) {
      return this.tabVectorStores.get(tabId)!;
    }

    // Create new MemoryVectorStore
    const vectorStore = new MemoryVectorStore(this.embeddings);

    // Load documents for this tab from storage
    const storageKey = `tab_documents_${tabId}`;
    const tabDocs = await this.storageService.getItem<TabDocuments>(
      storageKey,
      'session'
    );

    if (tabDocs && tabDocs.documents && tabDocs.documents.length > 0) {
      try {
        const documents = tabDocs.documents.map(
          (doc) =>
            new Document({
              pageContent: doc.pageContent,
              metadata: doc.metadata || {},
            })
        );

        // Add documents to the vector store
        await vectorStore.addDocuments(documents);
        this.log('Loaded tab documents from storage', { tabId, count: documents.length });
      } catch (error) {
        this.logError('Failed to load tab documents', error);
      }
    }

    this.tabVectorStores.set(tabId, vectorStore);
    return vectorStore;
  }

  /**
   * Add webpage document to a tab's vector store
   */
  async addWebpageToTab(
    tabId: string,
    pageContent: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      const vectorStore = await this.getOrCreateTabVectorStore(tabId);

      // Create document with metadata
      const document = new Document({
        pageContent,
        metadata: {
          ...metadata,
          tabId,
          addedAt: Date.now(),
        },
      });

      // Add to LangChain MemoryVectorStore
      await vectorStore.addDocuments([document]);

      // Persist to storage
      await this.persistTabDocuments(tabId, document);

      this.log('Successfully added webpage to tab', { tabId });
    } catch (error) {
      this.logError('Failed to add webpage to tab', error);
      throw error;
    }
  }

  /**
   * Search documents in a tab's vector store
   */
  async searchInTab(
    tabId: string,
    query: string,
    limit: number = 5
  ): Promise<SearchResult[]> {
    try {
      this.log('Searching tab documents', {
        tabId,
        query: query.substring(0, 50),
        limit,
      });

      const vectorStore = await this.getOrCreateTabVectorStore(tabId);

      // Use LangChain's similaritySearchWithScore
      const results = await vectorStore.similaritySearchWithScore(query, limit);

      // Convert results to SearchResult format
      const searchResults: SearchResult[] = results
        .map(([doc, score]) => ({
          id: `${tabId}_${Date.now()}`,
          text: doc.pageContent,
          score: 1 - score, // Convert distance to similarity
          metadata: doc.metadata,
        }));

      this.log('Search completed', { tabId, resultCount: searchResults.length });
      return searchResults;
    } catch (error) {
      this.logError('Search failed', error);
      throw error;
    }
  }

  /**
   * Get document count for a tab
   */
  async getTabDocumentCount(tabId: string): Promise<number> {
    try {
      const vectorStore = await this.getOrCreateTabVectorStore(tabId);
      // Access internal memory vectors (MemoryVectorStore stores them internally)
      const internalStore = vectorStore as any;
      return internalStore?.memoryVectors?.length ?? 0;
    } catch {
      return 0;
    }
  }

  async getTabDocument(tabId: string): Promise<TabDocuments | null> {
    try{
      const storageKey = `tab_documents_${tabId}`;
      const tabDocument = await this.storageService.getItem<TabDocuments>(storageKey, 'session');
      if(!tabDocument || tabDocument.documents.length == 0 ){
        return null;
      }
      return tabDocument;
    }catch(error){
      return null;
    }
  }

  /**
   * Clear all documents for a tab
   */
  async clearTabDocuments(tabId: string): Promise<void> {
    try {
      this.log('Clearing tab documents', { tabId });

      // Remove from memory
      this.tabVectorStores.delete(tabId);

      // Remove from storage
      const storageKey = `tab_documents_${tabId}`;
      await this.storageService.setItem(storageKey, null, 'session');

      this.log('Tab documents cleared', { tabId });
    } catch (error) {
      this.logError('Failed to clear tab documents', error);
      throw error;
    }
  }

  /**
   * Persist tab's documents to storage
   */
  private async persistTabDocuments(
    tabId: string,
    document: Document
  ): Promise<void> {
    try {
      // Get documents from MemoryVectorStore
      const tabDocs: TabDocuments = {
        tabId,
        documents: [document],
        updatedAt: Date.now(),
      };
      const storageKey = `tab_documents_${tabId}`;
      await this.storageService.setItem(storageKey, tabDocs, 'session');
    } catch (error) {
      this.logError('Failed to persist tab documents', error);
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
