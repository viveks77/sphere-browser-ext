import { Document } from '@langchain/core/documents';
import { Embeddings } from '@langchain/core/embeddings';
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import StorageService from '@/services/storage';
import {
  SearchResult,
  VectorStoreConfig,
} from '@/lib/models';

interface TabDocuments {
  tabId: string;
  document: {
    pageContent: string;
    metadata?: Record<string, unknown>;
  };
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

  private async generateChunkedDocuments(
    tabId: string,
    pageContent: string,
    metadata?: Record<string, unknown>
  ): Promise<Document[]> {
    // Split page content into chunks for better semantic search
    // 500 chars per chunk with 100 chars overlap for context continuity
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 100,
      separators: ['\n\n', '\n', '. ', ' ', ''],
    });

    const chunks = await splitter.splitText(pageContent);
    this.log('Split page into chunks', { tabId, chunkCount: chunks.length });

    // Create documents from chunks
    const documents = chunks.map((chunk, index) => 
      new Document({
        pageContent: chunk,
        metadata: {
          ...metadata,
          tabId,
          chunkIndex: index,
          totalChunks: chunks.length,
          addedAt: Date.now(),
        },
      })
    );
    return documents;
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

    if (tabDocs && tabDocs.document) {
      try {
        const documents = await this.generateChunkedDocuments(tabId, tabDocs.document.pageContent, tabDocs.document.metadata);
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
      const documents = await this.generateChunkedDocuments(tabId, pageContent, metadata);

      // Add to LangChain MemoryVectorStore
      await vectorStore.addDocuments(documents);

      // Persist to storage (keep full content for fallback)
      const fullDocument = new Document({
        pageContent,
        metadata: {
          ...metadata,
          tabId,
          addedAt: Date.now(),
        },
      });
      await this.persistTabDocuments(tabId, fullDocument);

      this.log('Successfully added webpage to tab', { 
        tabId, 
        chunkCount: documents.length,
      });
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
    limit: number = 5,
    relevanceThreshold: number = 0.7
  ): Promise<SearchResult[]> {
    try {
      this.log('Searching tab documents', {
        tabId,
        query: query.substring(0, 50),
        limit,
        relevanceThreshold,
      });

      const vectorStore = await this.getOrCreateTabVectorStore(tabId);

      // Use LangChain's similaritySearchWithScore
      const results = await vectorStore.similaritySearchWithScore(query, limit * 2);

      // Convert results to SearchResult format and filter by relevance threshold
      const searchResults: SearchResult[] = results
        .map(([doc, score]) => {
          const similarity = 1 - score; // Convert distance to similarity
          return {
            id: `${tabId}_${Date.now()}`,
            text: doc.pageContent,
            score: similarity,
            metadata: doc.metadata,
          };
        })
        .filter((result) => result.score >= relevanceThreshold)
        .slice(0, limit);

      this.log('Search completed', { 
        tabId, 
        resultCount: searchResults.length,
        result: searchResults,
        avgScore: searchResults.length > 0 
          ? (searchResults.reduce((sum, r) => sum + r.score, 0) / searchResults.length).toFixed(2)
          : 'N/A',
      });
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

  /**
   * Retrieve full tab document from storage for fallback context
   * Returns null if document doesn't exist or has no content
   */
  async getTabDocument(tabId: string): Promise<TabDocuments | null> {
    try {
      const storageKey = `tab_documents_${tabId}`;
      const tabDocument = await this.storageService.getItem<TabDocuments>(
        storageKey,
        'session'
      );
      if (!tabDocument || !tabDocument.document) {
        return null;
      }
      return tabDocument;
    } catch (error) {
      this.logError('Failed to retrieve tab document', error);
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
        document: document,
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
