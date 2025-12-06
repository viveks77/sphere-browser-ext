/**
 * Browser MCP Tool Definitions
 * Contains JSON Schema definitions for all browser automation tools
 */

export interface BrowserToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
}

// Export all tools with JSON Schema format
export const browserTools: BrowserToolDefinition[] = [
  {
    name: 'navigate',
    description: 'Navigate the active tab to a specific URL',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to navigate to',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'get_content',
    description: 'Get the text content of the active tab',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'click',
    description: 'Click an element on the page using a CSS selector',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector of the element to click',
        },
      },
      required: ['selector'],
    },
  },
  {
    name: 'type',
    description: 'Type text into an input element',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector of the input element',
        },
        text: {
          type: 'string',
          description: 'The text to type',
        },
      },
      required: ['selector', 'text'],
    },
  },
  {
    name: 'execute_script',
    description: 'Execute custom JavaScript on the page',
    inputSchema: {
      type: 'object',
      properties: {
        script: {
          type: 'string',
          description: 'The JavaScript code to execute',
        },
      },
      required: ['script'],
    },
  },
  {
    name: 'go_back',
    description: 'Navigate back in the browser history',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'go_forward',
    description: 'Navigate forward in the browser history',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'validate',
    description: 'Validate the state of the page (URL, title, or element existence)',
    inputSchema: {
      type: 'object',
      properties: {
        check: {
          type: 'string',
          enum: ['url', 'title', 'element_exists', 'element_text'],
          description: 'The type of validation to perform',
        },
        expected: {
          type: 'string',
          description: 'The expected value (for url, title, or element_text)',
        },
        selector: {
          type: 'string',
          description: 'CSS selector (required for element_exists and element_text)',
        },
      },
      required: ['check'],
    },
  },
];
