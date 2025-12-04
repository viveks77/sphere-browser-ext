/**
 * Google Gemini LLM Service implementation
 * Uses LangChain's Google Genai integration
 */

import { BaseLLMService } from './base';
import {
  ChatMessage,
  ChatRequest,
  ChatResponse,
  LLMServiceConfig,
} from '@/lib/models';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
  BaseMessage,
} from '@langchain/core/messages';

export class GeminiLLMService extends BaseLLMService {
  private client: ChatGoogleGenerativeAI | null = null;

  constructor(config: LLMServiceConfig) {
    super(config);
    this.initializeClient();
  }

  /**
   * Initialize the Gemini client
   */
  private initializeClient(): void {
    if (!this.isConfigured()) {
      this.logError('Gemini API key not provided');
      return;
    }

    try {
      this.client = new ChatGoogleGenerativeAI({
        apiKey: this.config.apiKey,
        model: this.config.model || 'gemini-2.0-flash',
        temperature: this.config.temperature ?? 0.7,
        maxOutputTokens: this.config.maxTokens ?? 2048,
        topP: this.config.topP ?? 1,
        topK: this.config.topK ?? 1,
      });

      this.log('Gemini LLM service initialized successfully');
    } catch (error) {
      this.logError('Failed to initialize Gemini client', error);
    }
  }

  /**
   * Send a chat request to Gemini
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    if (!this.client) {
      throw new Error(
        'Gemini client not initialized. Ensure API key is configured.'
      );
    }

    try {
      this.log('Sending chat request to Gemini', {
        messageCount: request.messages.length,
        hasRagContext: !!request.ragContext,
      });

      const messages: BaseMessage[] = this.convertMessages(request.messages);

      // Build system prompt with RAG context if provided
      let systemPrompt = request.systemPrompt || '';
      if (request.ragContext && request.ragContext.documents.length > 0) {
        const context = this.buildRagContext(request.ragContext.documents);
        systemPrompt = this.enhanceSystemPromptWithContext(systemPrompt, context);
      } else if (request.generalContext) {
        systemPrompt = this.enhanceSystemPromptWithContext(
          systemPrompt,
          request.generalContext
        );
      }

      if (systemPrompt) {
        messages.unshift(new SystemMessage(systemPrompt));
      }

      const response = await this.client.invoke(messages);

      const chatResponse: ChatResponse = {
        content: response.content as string,
        model: this.config.model || 'gemini-2.0-flash',
        timestamp: Date.now(),
        metadata: request.metadata,
        id: Date.now().toString()
      };

      this.log('Received response from Gemini', {
        contentLength: chatResponse.content.length,
      });

      return chatResponse;
    } catch (error) {
      this.logError('Error calling Gemini API', error);
      throw new Error(
        `Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Stream chat responses from Gemini
   */
  async *streamChat(
    request: ChatRequest
  ): AsyncGenerator<ChatResponse, void, unknown> {
    if (!this.client) {
      throw new Error(
        'Gemini client not initialized. Ensure API key is configured.'
      );
    }

    try {
      this.log('Starting stream chat with Gemini', {
        hasRagContext: !!request.ragContext,
      });

      const messages: BaseMessage[] = this.convertMessages(request.messages);

      // Build system prompt with RAG context if provided
      let systemPrompt = request.systemPrompt || '';
      if (request.ragContext && request.ragContext.documents.length > 0) {
        const context = this.buildRagContext(request.ragContext.documents);
        systemPrompt = this.enhanceSystemPromptWithContext(systemPrompt, context);
      } else if (request.generalContext) {
        systemPrompt = this.enhanceSystemPromptWithContext(
          systemPrompt,
          request.generalContext
        );
      }

      if (systemPrompt) {
        messages.unshift(new SystemMessage(systemPrompt));
      }

      const stream = await this.client.stream(messages);

      for await (const chunk of stream) {
        yield {
          content: chunk.content as string,
          model: this.config.model || 'gemini-2.0-flash',
          timestamp: Date.now(),
          metadata: request.metadata,
        };
      }
    } catch (error) {
      this.logError('Error streaming from Gemini', error);
      throw new Error(
        `Gemini streaming error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return !!this.config.apiKey;
  }

  /**
   * Build context string from RAG search results
   */
  private buildRagContext(documents: Array<{ text: string; score: number }>): string {
    return documents
      .map(
        (doc, index) =>
          `[Document ${index + 1}]\n${doc.text}\n(Relevance: ${(doc.score * 100).toFixed(1)}%)`
      )
      .join('\n\n');
  }

  /**
   * Enhance system prompt with RAG context
   */
  private enhanceSystemPromptWithContext(basePrompt: string, context: string): string {
    if (!context) {
      return basePrompt;
    }

    const contextSection = `You are a helpful assistant. Use the following context to answer questions:\n\n${context}\n\nIf the context doesn't contain the answer, use your general knowledge but mention that the information was not in the provided context.`;

    if (!basePrompt) {
      return contextSection;
    }

    return `${basePrompt}\n\n${contextSection}`;
  }

  /**
   * Convert ChatMessage format to LangChain message format
   */
  private convertMessages(messages: ChatMessage[]): BaseMessage[] {
    return messages.map((msg) => {
      if (msg.role === 'user') {
        return new HumanMessage(msg.content);
      } else if (msg.role === 'assistant') {
        return new AIMessage(msg.content);
      }
      return new HumanMessage(msg.content);
    });
  }
}
