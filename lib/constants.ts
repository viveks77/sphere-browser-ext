export const MessageTypes = {
  FROM_BROWSER: "FROM_BROWSER",
  FROM_CONTENT: "FROM_CONTENT",
  INITIALIZE_CHAT: "INITIALIZE_CHAT"
} as const;

export type MessageType = typeof MessageTypes[keyof typeof MessageTypes]