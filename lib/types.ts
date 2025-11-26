import { MessageType } from "./constants";

/**
 * Handler function type for processing messages
 */
export type MessageHandler<T, R> = (
  payload: T
) => R | Promise<R>;

/**
 * Message structure with proper typing
 */
export interface Message<T = unknown> {
  type: MessageType;
  payload: T;
  id?: string; // Optional for request tracking
}

/**
 * Success response wrapper
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  error?: never;
}

/**
 * Error response wrapper
 */
export interface ErrorResponse {
  success: false;
  data?: never;
  error: {
    code: string;
    message: string;
  };
}

/**
 * Combined response type
 */
export type Response<T = unknown> = SuccessResponse<T> | ErrorResponse;

/**
 * Router configuration options
 */
export interface RouterOptions {
  timeout?: number; // Message timeout in ms
  debug?: boolean; // Enable debug logging
  maxHandlers?: number; // Maximum handlers per type
}