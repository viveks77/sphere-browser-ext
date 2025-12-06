import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";

// InMemoryTransport implementation for browser environment
export class InMemoryTransport implements Transport {
  private other: InMemoryTransport | null = null;
  onmessage?: (message: JSONRPCMessage) => void;
  onclose?: () => void;
  onerror?: (error: Error) => void;

  connect(other: InMemoryTransport) {
    this.other = other;
    other.other = this;
  }

  async start() {}

  async send(message: JSONRPCMessage) {
    // Simulate async network delay slightly to avoid stack overflow or race conditions
    setTimeout(() => {
      if (this.other && this.other.onmessage) {
        this.other.onmessage(message);
      }
    }, 0);
  }

  async close() {
    if (this.onclose) this.onclose();
  }
}