export const MessageTypes = {
  FROM_BROWSER: "FROM_BROWSER",
  FROM_CONTENT: "FROM_CONTENT"
} as const;

export type MessageType = typeof MessageTypes[keyof typeof MessageTypes]