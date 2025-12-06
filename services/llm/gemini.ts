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
  ToolMessage,
} from '@langchain/core/messages';
import { BrowserMCPServer } from '../mcp/browserMcpServer';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { browserTools } from '../mcp/tools/browserToolDefinitions';
import { jsonSchemaToZod } from '@/lib/utils';

export class GeminiLLMService extends BaseLLMService {
  private client: ChatGoogleGenerativeAI | null = null;
  private mcpServer: BrowserMCPServer | null = null;
  private mcpClient: Client | null = null;
  private tools: StructuredTool[] = [];

  constructor(config: LLMServiceConfig) {
    super(config);
    this.initializeClient();
  }

  /**
   * Initialize the Gemini client and MCP server
   */
  private async initializeClient(): Promise<void> {
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

      // Initialize MCP Server and Client
      this.mcpServer = new BrowserMCPServer();
      this.mcpClient = new Client(
        { name: 'gemini-client', version: '1.0.0' },
        { capabilities: {} }
      );
      
      await this.mcpClient.connect(this.mcpServer.clientTransport);
      
      // Load tools from MCP
      await this.loadMcpTools();

      this.log('Gemini LLM service and MCP tools initialized successfully');
    } catch (error) {
      this.logError('Failed to initialize Gemini client or MCP', error);
    }
  }

  /**
   * Load tools from MCP Client and convert to LangChain tools
   */
  private async loadMcpTools() {
    if (!this.mcpClient) return;

    try {
      const toolsList = await this.mcpClient.listTools();
      
      this.tools = toolsList.tools.map((tool) => {
        // Find the corresponding tool definition with JSON schema
        const toolDef = browserTools.find(t => t.name === tool.name);
        
        if (!toolDef) {
          this.logError(`Tool definition not found for: ${tool.name}`);
          return null;
        }

        // Convert JSON Schema to Zod for LangChain
        const zodSchema = jsonSchemaToZod(toolDef.inputSchema);

        return new DynamicStructuredTool({
          name: tool.name,
          description: tool.description || '',
          schema: zodSchema,
          func: async (args) => {
            if (!this.mcpClient) throw new Error('MCP Client not connected');
            const result = await this.mcpClient.callTool({
              name: tool.name,
              arguments: args,
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (result as any).content.map((c: any) => (c.type === 'text' ? c.text : '')).join('');
          },
        });
      }).filter((tool): tool is DynamicStructuredTool => tool !== null);

      this.log(`Loaded ${this.tools.length} MCP tools`);
    } catch (error) {
      this.logError('Failed to load MCP tools', error);
    }
  }

  /**
   * Send a chat request to Gemini
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    if (!this.client) {
      await this.initializeClient();
      if (!this.client) {
         throw new Error(
          'Gemini client not initialized. Ensure API key is configured.'
        );
      }
    }

    try {
      this.log('Sending chat request to Gemini', {
        messageCount: request.messages.length,
        hasRagContext: !!request.ragContext,
        toolCount: this.tools.length
      });
      
      let messages: BaseMessage[] = this.convertMessages(request.messages);
      const systemMessage = this.generateSystemMessage(request);
      
      if (systemMessage) {
        messages.unshift(systemMessage);
      }

      // Bind tools if available
      const model = this.tools.length > 0 ? this.client.bindTools(this.tools) : this.client;

      // Execution loop for tools
      let response = await model.invoke(messages);
      
      // Max turns to prevent infinite loops
      const MAX_TURNS = 5;
      let turns = 0;

      while (response.tool_calls && response.tool_calls.length > 0 && turns < MAX_TURNS) {
        this.log('Received tool calls', { toolCalls: response.tool_calls });
        messages.push(response);
        
        for (const toolCall of response.tool_calls) {
          const tool = this.tools.find(t => t.name === toolCall.name);
          if (tool) {
            try {
              const result = await tool.invoke(toolCall.args);
              messages.push(new ToolMessage({
                tool_call_id: toolCall.id!,
                content: result
              }));
            } catch (err) {
              messages.push(new ToolMessage({
                tool_call_id: toolCall.id!,
                content: `Error executing tool: ${err}`
              }));
            }
          }
        }
        
        response = await model.invoke(messages);
        turns++;
      }

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
       await this.initializeClient();
       if (!this.client) {
        throw new Error(
          'Gemini client not initialized. Ensure API key is configured.'
        );
       }
    }

    try {
      this.log('Starting stream chat with Gemini', {
        hasRagContext: !!request.ragContext,
      });

      let messages: BaseMessage[] = this.convertMessages(request.messages);
      const systemMessage = this.generateSystemMessage(request);

      if (systemMessage) {
        messages.unshift(systemMessage);
      }

      // Bind tools if available
      const model = this.tools.length > 0 ? this.client.bindTools(this.tools) : this.client;

      // REVIST IMPLEMENTATION
      let response = await model.invoke(messages);
      const MAX_TURNS = 5;
      let turns = 0;

      while (response.tool_calls && response.tool_calls.length > 0 && turns < MAX_TURNS) {
        messages.push(response);
        for (const toolCall of response.tool_calls) {
          const tool = this.tools.find(t => t.name === toolCall.name);
          if (tool) {
            const result = await tool.invoke(toolCall.args);
            messages.push(new ToolMessage({
              tool_call_id: toolCall.id!,
              content: result
            }));
          }
        }
        response = await model.invoke(messages);
        turns++;
      }
      
      yield {
        content: response.content as string,
        model: this.config.model || 'gemini-2.0-flash',
        timestamp: Date.now(),
        metadata: request.metadata,
      };

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
   * Generate system message from request context
   */
  private generateSystemMessage(request: ChatRequest): SystemMessage | null {
    let context = '';

    if (request.ragContext && request.ragContext.documents.length > 0) {
      context = this.buildRagContext(request.ragContext.documents);
    } else if (request.generalContext) {
      context = request.generalContext;
    }

    let systemPrompt = `You are a helpful assistant.`;

    if (context) {
      systemPrompt += `\n\nUse the following context to answer questions:\n\n${context}\n\nIf the context doesn't contain the answer, use your general knowledge but mention that the information was not in the provided context. Use tools only if the given context is not relevant.`;
    }

    // Add browser automation instructions
    const browserInstructions = `IMPORTANT: When you need to interact with the page (click, type, etc.), YOU MUST FIRST call the 'get_content' tool to inspect the HTML structure. Do not guess CSS selectors. Use the HTML provided by 'get_content' to find unique IDs, classes, or attributes to target elements accurately.`;
    systemPrompt += `\n\n${browserInstructions}`;
    
    return new SystemMessage(systemPrompt);
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

// Helper class for dynamic tools
class DynamicStructuredTool extends StructuredTool {
  name: string;
  description: string;
  schema: z.ZodType<any>;
  func: (args: any) => Promise<string>;

  constructor(fields: { name: string; description: string; schema: z.ZodType<any>; func: (args: any) => Promise<string> }) {
    super();
    this.name = fields.name;
    this.description = fields.description;
    this.schema = fields.schema;
    this.func = fields.func;
  }

  async _call(arg: any): Promise<string> {
    return this.func(arg);
  }
}
