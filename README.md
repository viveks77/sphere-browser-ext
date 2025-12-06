# Sphere - Browser Chat Extension

A cross-browser extension that enables you to chat with any webpage. Ask questions, request summaries, and interact with browser/page content using AI-powered LLMs (Gemini, OpenAI).

## Features

- **Chat Interface**: Side-panel chat interface for seamless interaction
- **Page Context**: Automatically extracts and understands webpage content
- **Summarization**: Quickly summarize the current page
- **API Configuration**: Easy setup with your own API keys
- **Browser MCP Capabilities**: Automate browser tasks using LLMs, including navigation, content extraction, clicking, typing, script execution, browser history navigation, and page validation.


## Getting Started

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   yarn install
   ```

### Development

Run the extension in development mode:
```bash
yarn run dev
```

For Firefox:
```bash
yarn run dev:firefox
```

### Build

Build the extension for production:
```bash
yarn run build
```

Create a zip file:
```bash
yarn run zip
```

## Tech Stack

- **WXT**: Web Extension framework
- **React**: UI library
- **Tailwind CSS**: Styling
- **Shadcn UI**: Component library
- **LangChain.js**: AI orchestration
- **TypeScript**: Type safety
