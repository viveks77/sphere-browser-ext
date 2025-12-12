
# Sphere – Chat With Any Webpage

> **Sphere** is a browser extension that lets you chat with any webpage using powerful AI models (Gemini, OpenAI, and more). Get instant answers, summaries, and automate browser actions—all from a friendly chat interface.

---


## What Can Sphere Do?

- **Chat with Webpages:** Ask questions about the current page, get summaries, or request explanations.
- **Automate Tasks:** Use AI to click buttons, fill forms, extract data, and even run scripts on the page.
- **Seamless Side Panel:** Chat appears in a convenient side panel, so you never lose context.
- **Works Everywhere:** Supports Chrome, Firefox, and other Chromium-based browsers.
- **Bring Your Own API Key:** Easily connect your own LLM API keys for privacy and flexibility.

---

## Actions Sphere Can Perform

Sphere can automate and interact with your browser using the following actions:

- **Navigate:** Go to any URL in the active tab.
- **Get Content:** Extract all text content from the current page.
- **Click:** Click any element on the page using a CSS selector.
- **Type:** Enter text into input fields or forms.
- **Execute Script:** Run custom JavaScript on the page.
- **Go Back:** Navigate back in browser history.
- **Go Forward:** Navigate forward in browser history.
- **Validate:** Check the page URL, title, or whether specific elements exist or contain certain text.

These actions can be combined and controlled through the chat interface, making it easy to automate browsing, extract information, or test web pages—all with natural language commands.

---


## Getting Started

1. **Clone the repository**
2. **Install dependencies:**
   ```bash
   yarn install
   ```
3. **Start development mode:**
   ```bash
   yarn run dev
   ```
   For Firefox:
   ```bash
   yarn run dev:firefox
   ```
4. **Build for production:**
   ```bash
   yarn run build
   ```
5. **Create a zip for publishing:**
   ```bash
   yarn run zip
   ```

---

## Tech Stack

- **WXT** – Modern web extension framework
- **React** – UI library
- **Tailwind CSS** – Utility-first styling
- **shadcn/ui** – Accessible UI components
- **LangChain.js** – AI orchestration
- **TypeScript** – Type safety

---

