export const MessageTypes = {
  FROM_BROWSER: "FROM_BROWSER",
  FROM_CONTENT: "FROM_CONTENT",
  INITIALIZE_CHAT: "INITIALIZE_CHAT",
  INITIALIZE: "INITIALIZE",
  GET_SESSION: "GET_SESSION",
  GET_PAGE_CONTENT: "GET_PAGE_CONTENT",
  CLEAR_SESSION: "CLEAR_SESSION"
} as const;

export type MessageType = typeof MessageTypes[keyof typeof MessageTypes]