/* eslint-disable no-unused-vars */
/**
 * MCP Protocol Types - Enhanced for Google Calendar Integration
 * 
 * This file contains type definitions for the Model Context Protocol (MCP)
 * with specific enhancements for Google Calendar API integration.
 */

 

// JSON Schema Type (simplified for our use case)
export interface JSONSchema7 {
  type?: string;
  properties?: Record<string, JSONSchema7>;
  required?: string[];
  items?: JSONSchema7;
  format?: string;
  default?: unknown;
  description?: string;
  minimum?: number;
  maximum?: number;
  enum?: unknown[];
}

// Core MCP Protocol Types
export interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: MCPMethod;
  params?: Record<string, unknown>;
}

export interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: MCPError;
}

export interface MCPError {
  code: number;
  message: string;
  data?: unknown;
}

// MCP Method Types
export type MCPMethod = 
  | 'initialize'
  | 'tools/list' 
  | 'tools/call'
  | 'notifications/initialized'
  | 'ping';

// MCP Initialization Types
export interface MCPInitializeParams {
  protocolVersion: string;
  capabilities: MCPClientCapabilities;
  clientInfo: {
    name: string;
    version: string;
  };
}

export interface MCPClientCapabilities {
  roots?: {
    listChanged?: boolean;
  };
  sampling?: Record<string, unknown>;
}

// Tool Definition Types
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: JSONSchema7;
}

export interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

// Tool Handler Types
export type ToolHandler<T = unknown, R = MCPToolResult> = (params: T) => Promise<R>;

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: JSONSchema7;
  handler: ToolHandler;
}

// Server Info Types
export interface MCPServerCapabilities {
  tools?: {
    listChanged?: boolean;
  };
  logging?: Record<string, unknown>;
  prompts?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
}

export interface MCPServerInfo {
  name: string;
  version: string;
  capabilities: MCPServerCapabilities;
}

// Calendar-Specific Types
export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  }>;
  status?: 'confirmed' | 'tentative' | 'cancelled';
  visibility?: 'default' | 'public' | 'private' | 'confidential';
  created?: string;
  updated?: string;
  htmlLink?: string;
}

// Calendar Tool Parameter Types
export interface CalendarListEventsParams {
  calendarId?: string;
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
  singleEvents?: boolean;
  orderBy?: 'startTime' | 'updated';
  q?: string;
}

export interface CalendarCreateEventParams {
  calendarId?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  visibility?: 'default' | 'public' | 'private' | 'confidential';
}

// Tool Result Types
export interface CalendarToolResult extends MCPToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
}

// Error Types
export enum MCPErrorCode {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
  // Custom error codes
  AuthenticationError = -32000,
  AuthorizationError = -32001,
  RateLimitError = -32002,
  APIError = -32003,
  ValidationError = -32004
}

export class CalendarError extends Error {
  constructor(
    message: string,
    public code: MCPErrorCode = MCPErrorCode.APIError,
    public data?: unknown
  ) {
    super(message);
    this.name = 'CalendarError';
  }

  toMCPError(): MCPError {
    return {
      code: this.code,
      message: this.message,
      data: this.data
    };
  }
}

// Utility Types
export interface ToolExecutionContext {
  toolName: string;
  params: unknown;
  startTime: number;
}

export interface ToolExecutionResult {
  success: boolean;
  result?: MCPToolResult;
  error?: MCPError;
  duration: number;
}
