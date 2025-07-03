# Milestone 1.2: MCP Protocol Implementation

## Objective
Implement the Model Context Protocol (MCP) communication layer with basic tool registration and execution capabilities.

## Prerequisites
- Completed: 01-project-setup.md
- Understanding of MCP protocol specification
- Basic knowledge of JSON-RPC communication

## 🤖 CLINE EXECUTABLE STEPS

All steps in this milestone can be executed by Cline as they involve creating code files and configuration.

## Implementation Steps

### 1. Core MCP Types
Create `src/types/mcp.ts`:
```typescript
import { z } from 'zod';

// MCP Protocol Types
export interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
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

export interface MCPNotification {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
}

// Tool Definition Types
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface MCPToolCall {
  name: string;
  arguments: Record<string, unknown>;
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

// Server Capabilities
export interface MCPServerCapabilities {
  tools?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  prompts?: {
    listChanged?: boolean;
  };
  logging?: Record<string, unknown>;
}

// Client Info
export interface MCPClientInfo {
  name: string;
  version: string;
}

// Server Info
export interface MCPServerInfo {
  name: string;
  version: string;
  capabilities: MCPServerCapabilities;
}

// Validation Schemas
export const MCPToolCallSchema = z.object({
  name: z.string(),
  arguments: z.record(z.unknown()),
});

export const MCPRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]),
  method: z.string(),
  params: z.record(z.unknown()).optional(),
});
```

### 2. MCP Server Implementation
Create `src/server.ts`:
```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  MCPTool,
  MCPToolCall,
  MCPToolResult,
  MCPServerInfo,
  MCPServerCapabilities,
} from './types/mcp.js';

export class GoogleMCPServer {
  private server: Server;
  private tools: Map<string, MCPTool> = new Map();
  private toolHandlers: Map<string, (args: Record<string, unknown>) => Promise<MCPToolResult>> = new Map();

  constructor() {
    this.server = new Server(
      {
        name: 'google-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: this.getServerCapabilities(),
      }
    );

    this.setupHandlers();
  }

  private getServerCapabilities(): MCPServerCapabilities {
    return {
      tools: {
        listChanged: true,
      },
      logging: {},
    };
  }

  private setupHandlers(): void {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: Array.from(this.tools.values()),
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      const handler = this.toolHandlers.get(name);
      if (!handler) {
        throw new Error(`Unknown tool: ${name}`);
      }

      try {
        const result = await handler(args || {});
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [
            {
              type: 'text',
              text: `Error executing tool ${name}: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Register a new tool with the server
   */
  public registerTool(
    tool: MCPTool,
    handler: (args: Record<string, unknown>) => Promise<MCPToolResult>
  ): void {
    this.tools.set(tool.name, tool);
    this.toolHandlers.set(tool.name, handler);
  }

  /**
   * Unregister a tool from the server
   */
  public unregisterTool(name: string): void {
    this.tools.delete(name);
    this.toolHandlers.delete(name);
  }

  /**
   * Get all registered tools
   */
  public getTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Start the server with stdio transport
   */
  public async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    // Log server start
    console.error('Google MCP Server started successfully');
    console.error(`Registered tools: ${Array.from(this.tools.keys()).join(', ')}`);
  }

  /**
   * Stop the server
   */
  public async stop(): Promise<void> {
    await this.server.close();
  }

  /**
   * Get server information
   */
  public getServerInfo(): MCPServerInfo {
    return {
      name: 'google-mcp-server',
      version: '1.0.0',
      capabilities: this.getServerCapabilities(),
    };
  }
}

// Utility function to create tool results
export function createToolResult(
  content: string,
  isError: boolean = false
): MCPToolResult {
  return {
    content: [
      {
        type: 'text',
        text: content,
      },
    ],
    isError,
  };
}

// Utility function to create tool results with structured data
export function createStructuredToolResult(
  data: unknown,
  description?: string
): MCPToolResult {
  const content = description 
    ? `${description}\n\n${JSON.stringify(data, null, 2)}`
    : JSON.stringify(data, null, 2);

  return {
    content: [
      {
        type: 'text',
        text: content,
      },
    ],
    isError: false,
  };
}
```

### 3. Basic Tool Registration System
Create `src/utils/validation.ts`:
```typescript
import { z } from 'zod';
import { MCPToolCall, MCPToolCallSchema } from '../types/mcp.js';

/**
 * Validate MCP tool call parameters
 */
export function validateToolCall(data: unknown): MCPToolCall {
  return MCPToolCallSchema.parse(data);
}

/**
 * Validate tool arguments against a schema
 */
export function validateToolArguments<T>(
  args: Record<string, unknown>,
  schema: z.ZodSchema<T>
): T {
  return schema.parse(args);
}

/**
 * Create a validation schema for tool arguments
 */
export function createToolArgsSchema<T extends Record<string, unknown>>(
  properties: Record<keyof T, z.ZodSchema>
): z.ZodSchema<T> {
  return z.object(properties) as z.ZodSchema<T>;
}

/**
 * Sanitize and validate string input
 */
export function validateString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }
  return value.trim();
}

/**
 * Validate and parse date input
 */
export function validateDate(value: unknown, fieldName: string): Date {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }
  
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid date`);
  }
  
  return date;
}

/**
 * Validate optional string input
 */
export function validateOptionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  return validateString(value, fieldName);
}

/**
 * Validate array input
 */
export function validateArray<T>(
  value: unknown,
  fieldName: string,
  itemValidator: (item: unknown) => T
): T[] {
  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array`);
  }
  
  return value.map((item, index) => {
    try {
      return itemValidator(item);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Validation error';
      throw new Error(`${fieldName}[${index}]: ${message}`);
    }
  });
}
```

### 4. Error Handling System
Create `src/utils/errors.ts`:
```typescript
/**
 * Base class for all Google MCP Server errors
 */
export abstract class GoogleMCPError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;

  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Authentication related errors
 */
export class AuthenticationError extends GoogleMCPError {
  readonly code = 'AUTHENTICATION_ERROR';
  readonly statusCode = 401;
}

/**
 * Authorization related errors
 */
export class AuthorizationError extends GoogleMCPError {
  readonly code = 'AUTHORIZATION_ERROR';
  readonly statusCode = 403;
}

/**
 * Tool validation errors
 */
export class ValidationError extends GoogleMCPError {
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 400;
}

/**
 * Google API errors
 */
export class GoogleAPIError extends GoogleMCPError {
  readonly code = 'GOOGLE_API_ERROR';
  readonly statusCode: number;

  constructor(
    message: string,
    statusCode: number = 500,
    public readonly service?: string,
    cause?: Error
  ) {
    super(message, cause);
    this.statusCode = statusCode;
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends GoogleMCPError {
  readonly code = 'RATE_LIMIT_ERROR';
  readonly statusCode = 429;

  constructor(
    message: string,
    public readonly retryAfter?: number,
    cause?: Error
  ) {
    super(message, cause);
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends GoogleMCPError {
  readonly code = 'CONFIGURATION_ERROR';
  readonly statusCode = 500;
}

/**
 * Tool execution errors
 */
export class ToolExecutionError extends GoogleMCPError {
  readonly code = 'TOOL_EXECUTION_ERROR';
  readonly statusCode = 500;

  constructor(
    message: string,
    public readonly toolName: string,
    cause?: Error
  ) {
    super(message, cause);
  }
}

/**
 * Convert any error to a user-friendly message
 */
export function formatErrorForUser(error: unknown): string {
  if (error instanceof GoogleMCPError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof RateLimitError) {
    return true;
  }
  
  if (error instanceof GoogleAPIError) {
    // Retry on server errors but not client errors
    return error.statusCode >= 500;
  }
  
  return false;
}

/**
 * Get retry delay for retryable errors
 */
export function getRetryDelay(error: unknown, attempt: number): number {
  if (error instanceof RateLimitError && error.retryAfter) {
    return error.retryAfter * 1000; // Convert to milliseconds
  }
  
  // Exponential backoff: 1s, 2s, 4s, 8s, etc.
  return Math.min(1000 * Math.pow(2, attempt), 30000);
}
```

### 5. Main Entry Point
Create `src/index.ts`:
```typescript
#!/usr/bin/env node

import { GoogleMCPServer } from './server.js';
import { ConfigurationError } from './utils/errors.js';

/**
 * Main entry point for the Google MCP Server
 */
async function main(): Promise<void> {
  try {
    // Create and configure the server
    const server = new GoogleMCPServer();
    
    // Register a simple test tool to verify the server works
    server.registerTool(
      {
        name: 'test_connection',
        description: 'Test the MCP server connection',
        inputSchema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Optional test message',
            },
          },
        },
      },
      async (args) => {
        const message = args.message as string || 'Hello from Google MCP Server!';
        return {
          content: [
            {
              type: 'text',
              text: `Test successful: ${message}`,
            },
          ],
        };
      }
    );

    // Start the server
    await server.start();
    
    // Keep the process running
    process.on('SIGINT', async () => {
      console.error('Received SIGINT, shutting down gracefully...');
      await server.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.error('Received SIGTERM, shutting down gracefully...');
      await server.stop();
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start Google MCP Server:', error);
    
    if (error instanceof ConfigurationError) {
      console.error('Please check your configuration and try again.');
    }
    
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
```

### 6. Package.json Updates
Update the `package.json` to include the binary entry:
```json
{
  "name": "google-mcp-server",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "google-mcp-server": "./dist/index.js"
  },
  "main": "./dist/index.js",
  "files": [
    "dist/**/*",
    "README.md"
  ]
}
```

## Testing Criteria
- [ ] Server starts without errors (`npm run dev`)
- [ ] MCP protocol communication works via stdio
- [ ] Test tool can be called successfully
- [ ] Error handling works correctly
- [ ] Server shuts down gracefully on SIGINT/SIGTERM

## Testing the Implementation

### 1. Basic Server Test
```bash
# Start the server
npm run dev

# The server should start and log:
# "Google MCP Server started successfully"
# "Registered tools: test_connection"
```

### 2. MCP Client Test
Create a simple test script `test-mcp.js`:
```javascript
import { spawn } from 'child_process';

const server = spawn('npm', ['run', 'dev'], {
  stdio: ['pipe', 'pipe', 'inherit']
});

// Test initialize request
const initRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: {
      name: 'test-client',
      version: '1.0.0'
    }
  }
};

server.stdin.write(JSON.stringify(initRequest) + '\n');

server.stdout.on('data', (data) => {
  console.log('Server response:', data.toString());
});

setTimeout(() => {
  server.kill();
}, 5000);
```

## Deliverables
- Working MCP server with stdio transport
- Tool registration system
- Error handling framework
- Basic validation utilities
- Test tool for verification

## Next Steps
This implementation enables:
- **File 03**: Server foundation and tool registration
- **File 04**: OAuth authentication setup
- Registration of actual Google service tools

## Estimated Time
2-3 hours for complete MCP protocol implementation.
