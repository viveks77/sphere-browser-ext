import { browser } from 'wxt/browser';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema, JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { InMemoryTransport } from "@/lib/inMemoryTransport";
import { browserTools } from "./tools/browserToolDefinitions";
import { navigate, getContent, click, type, executeScript } from './tools/browserToolExecutables';

export class BrowserMCPServer {
  private server: Server;
  public clientTransport: InMemoryTransport;
  private serverTransport: InMemoryTransport;

  constructor() {
    this.server = new Server(
      {
        name: "browser-extension-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.clientTransport = new InMemoryTransport();
    this.serverTransport = new InMemoryTransport();
    this.clientTransport.connect(this.serverTransport);

    this.setupHandlers();
    this.start();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: browserTools.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "navigate": {
            const { url } = args as { url: string };
            await navigate(url);
            return {
              content: [{ type: "text", text: `Navigated to ${url}` }],
            };
          }
          case "get_content": {
            const content = await getContent();
            return {
              content: [{ type: "text", text: content }],
            };
          }
          case "click": {
            const { selector } = args as { selector: string };
            await click(selector);
            return {
              content: [{ type: "text", text: `Clicked element ${selector}` }],
            };
          }
          case "type": {
            const { selector, text } = args as { selector: string; text: string };
            await type(selector, text);
            return {
              content: [{ type: "text", text: `Typed "${text}" into ${selector}` }],
            };
          }
          case "execute_script": {
            const { script } = args as { script: string };
            const result = await executeScript(script);
            return {
              content: [{ type: "text", text: JSON.stringify(result) }],
            };
          }
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    });
  }

  private async start() {
    await this.server.connect(this.serverTransport);
  }
}
