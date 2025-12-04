/**
 * Data models for the AI service layer
 */

/**
 * Chat message structure
 */
export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
  status?: 'sending' | 'sent' | 'error';
}

/**
 * Chat request payload
 */
export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  metadata?: Record<string, unknown>;
  ragContext?: {
    documents: SearchResult[];
    threshold?: number;
  };
  generalContext?: string;
}

/**
 * Chat response structure
 */
export interface ChatResponse {
  id?: string;
  content: string;
  model?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  timestamp?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Vector store search result
 */
export interface SearchResult {
  id: string;
  text: string;
  score: number;
  metadata?: Record<string, unknown>;
}

/**
 * Chat session
 */
export interface ChatSession {
  id: string;
  title?: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, unknown>;
}

/**
 * Service configuration
 */
export interface ServiceConfig {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  debug?: boolean;
}

/**
 * LLM Service configuration
 */
export interface LLMServiceConfig extends ServiceConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
}

/**
 * Embedding Service configuration
 */
export interface EmbeddingServiceConfig extends ServiceConfig {
  apiKey: string;
  model?: string;
}

/**
 * Vector Store configuration
 */
export interface VectorStoreConfig {
  storageKey?: string;
  debug?: boolean;
}
