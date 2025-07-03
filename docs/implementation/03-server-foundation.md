# Milestone 1.3: Server Foundation and Tool Registration

## Objective
Create the foundational server architecture with configuration management, logging, and a robust tool registration system.

## Prerequisites
- Completed: 01-project-setup.md, 02-mcp-protocol.md
- Working MCP server with basic tool registration
- Understanding of configuration patterns

## 🤖 CLINE EXECUTABLE STEPS

All steps in this milestone can be executed by Cline as they involve creating code files and configuration.

## Implementation Steps

### 1. Configuration System
Create `src/config/settings.ts`:
```typescript
import { z } from 'zod';
import dotenv from 'dotenv';
import { ConfigurationError } from '../utils/errors.js';

// Load environment variables
dotenv.config();

// Configuration schema
const ConfigSchema = z.object({
  // Google OAuth Configuration
  google: z.object({
    clientId: z.string().min(1, 'Google Client ID is required'),
    clientSecret: z.string().min(1, 'Google Client Secret is required'),
    redirectUri: z.string().url('Invalid redirect URI').default('http://localhost:8080/auth/callback'),
    scopes: z.array(z.string()).default([
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/documents',
      'https://www.googleapis.com/auth/spreadsheets',
    ]),
  }),

  // Server Configuration
  server: z.object({
    name: z.string().default('google-mcp-server'),
    version: z.string().default('1.0.0'),
    logLevel: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR']).default('INFO'),
    environment: z.enum(['development', 'production']).default('development'),
  }),

  // Feature Flags
  features: z.object({
    calendar: z.boolean().default(true),
    gmail: z.boolean().default(true),
    drive: z.boolean().default(true),
    docs: z.boolean().default(true),
    sheets: z.boolean().default(true),
    caching: z.boolean().default(true),
  }),

  // Cache Configuration
  cache: z.object({
    enabled: z.boolean().default(true),
    ttl: z.number().default(300), // 5 minutes
    maxSize: z.number().default(100), // Max items
  }),

  // Rate Limiting
  rateLimit: z.object({
    enabled: z.boolean().default(true),
    maxRequests: z.number().default(100),
    windowMs: z.number().default(60000), // 1 minute
  }),

  // Security
  security: z.object({
    tokenEncryption: z.boolean().default(true),
    encryptionKey: z.string().optional(),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Load and validate configuration from environment variables
 */
function loadConfig(): Config {
  const rawConfig = {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
      scopes: process.env.GOOGLE_SCOPES?.split(','),
    },
    server: {
      name: process.env.SERVER_NAME,
      version: process.env.SERVER_VERSION,
      logLevel: process.env.MCP_LOG_LEVEL,
      environment: process.env.NODE_ENV,
    },
    features: {
      calendar: process.env.FEATURE_CALENDAR !== 'false',
      gmail: process.env.FEATURE_GMAIL !== 'false',
      drive: process.env.FEATURE_DRIVE !== 'false',
      docs: process.env.FEATURE_DOCS !== 'false',
      sheets: process.env.FEATURE_SHEETS !== 'false',
      caching: process.env.FEATURE_CACHING !== 'false',
    },
    cache: {
      enabled: process.env.MCP_CACHE_ENABLED !== 'false',
      ttl: process.env.MCP_CACHE_TTL ? parseInt(process.env.MCP_CACHE_TTL) : undefined,
      maxSize: process.env.MCP_CACHE_MAX_SIZE ? parseInt(process.env.MCP_CACHE_MAX_SIZE) : undefined,
    },
    rateLimit: {
      enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
      maxRequests: process.env.RATE_LIMIT_MAX_REQUESTS ? parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) : undefined,
      windowMs: process.env.RATE_LIMIT_WINDOW_MS ? parseInt(process.env.RATE_LIMIT_WINDOW_MS) : undefined,
    },
    security: {
      tokenEncryption: process.env.TOKEN_ENCRYPTION !== 'false',
      encryptionKey: process.env.MCP_ENCRYPTION_KEY,
    },
  };

  try {
    return ConfigSchema.parse(rawConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ');
      throw new ConfigurationError(`Configuration validation failed: ${issues}`);
    }
    throw new ConfigurationError('Failed to load configuration');
  }
}

// Global configuration instance
export const config = loadConfig();

/**
 * Validate that required configuration is present
 */
export function validateConfig(): void {
  if (!config.google.clientId || !config.google.clientSecret) {
    throw new ConfigurationError(
      'Google OAuth credentials are required. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.'
    );
  }
}

/**
 * Get configuration for a specific service
 */
export function getServiceConfig(service: keyof Config['features']): boolean {
  return config.features[service];
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof Config['features']): boolean {
  return config.features[feature];
}
```

### 2. Logging System
Create `src/utils/logger.ts`:
```typescript
import { config } from '../config/settings.js';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: unknown;
  error?: Error;
}

export class Logger {
  private level: LogLevel;

  constructor(level: string = config.server.logLevel) {
    this.level = this.parseLogLevel(level);
  }

  private parseLogLevel(level: string): LogLevel {
    switch (level.toUpperCase()) {
      case 'DEBUG': return LogLevel.DEBUG;
      case 'INFO': return LogLevel.INFO;
      case 'WARN': return LogLevel.WARN;
      case 'ERROR': return LogLevel.ERROR;
      default: return LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }

  private formatMessage(level: string, message: string, data?: unknown, error?: Error): string {
    const timestamp = new Date().toISOString();
    const logEntry: LogEntry = {
      timestamp,
      level,
      message,
      data,
      error,
    };

    if (config.server.environment === 'development') {
      // Human-readable format for development
      let formatted = `[${timestamp}] ${level}: ${message}`;
      if (data) {
        formatted += `\nData: ${JSON.stringify(data, null, 2)}`;
      }
      if (error) {
        formatted += `\nError: ${error.message}\nStack: ${error.stack}`;
      }
      return formatted;
    } else {
      // JSON format for production
      return JSON.stringify(logEntry);
    }
  }

  debug(message: string, data?: unknown): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.error(this.formatMessage('DEBUG', message, data));
    }
  }

  info(message: string, data?: unknown): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.error(this.formatMessage('INFO', message, data));
    }
  }

  warn(message: string, data?: unknown, error?: Error): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.error(this.formatMessage('WARN', message, data, error));
    }
  }

  error(message: string, error?: Error, data?: unknown): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage('ERROR', message, data, error));
    }
  }

  /**
   * Log tool execution
   */
  toolExecution(toolName: string, args: Record<string, unknown>, duration?: number): void {
    this.info(`Tool executed: ${toolName}`, {
      tool: toolName,
      args,
      duration,
    });
  }

  /**
   * Log authentication events
   */
  auth(event: string, details?: Record<string, unknown>): void {
    this.info(`Auth event: ${event}`, details);
  }

  /**
   * Log API calls
   */
  apiCall(service: string, method: string, duration?: number, error?: Error): void {
    if (error) {
      this.error(`API call failed: ${service}.${method}`, error, { service, method, duration });
    } else {
      this.debug(`API call: ${service}.${method}`, { service, method, duration });
    }
  }
}

// Global logger instance
export const logger = new Logger();
```

### 3. Enhanced Server Foundation
Create `src/server/foundation.ts`:
```typescript
import { GoogleMCPServer } from '../server.js';
import { MCPTool, MCPToolResult } from '../types/mcp.js';
import { logger } from '../utils/logger.js';
import { config, validateConfig } from '../config/settings.js';
import { ToolExecutionError, ValidationError } from '../utils/errors.js';

export interface ToolModule {
  name: string;
  description: string;
  tools: MCPTool[];
  handlers: Map<string, (args: Record<string, unknown>) => Promise<MCPToolResult>>;
  initialize?(): Promise<void>;
  cleanup?(): Promise<void>;
}

export class EnhancedGoogleMCPServer extends GoogleMCPServer {
  private toolModules: Map<string, ToolModule> = new Map();
  private initialized = false;

  constructor() {
    super();
    logger.info('Initializing Enhanced Google MCP Server', {
      version: config.server.version,
      environment: config.server.environment,
    });
  }

  /**
   * Initialize the server with configuration validation
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('Server already initialized');
      return;
    }

    try {
      // Validate configuration
      validateConfig();
      logger.info('Configuration validated successfully');

      // Register core tools
      await this.registerCoreTools();

      // Initialize tool modules
      await this.initializeToolModules();

      this.initialized = true;
      logger.info('Server initialization completed', {
        toolModules: Array.from(this.toolModules.keys()),
        totalTools: this.getTools().length,
      });
    } catch (error) {
      logger.error('Server initialization failed', error);
      throw error;
    }
  }

  /**
   * Register a tool module
   */
  public async registerToolModule(module: ToolModule): Promise<void> {
    logger.info(`Registering tool module: ${module.name}`, {
      toolCount: module.tools.length,
    });

    try {
      // Initialize the module if it has an initialize method
      if (module.initialize) {
        await module.initialize();
      }

      // Register all tools from the module
      for (const tool of module.tools) {
        const handler = module.handlers.get(tool.name);
        if (!handler) {
          throw new Error(`No handler found for tool: ${tool.name}`);
        }

        // Wrap handler with logging and error handling
        const wrappedHandler = this.wrapToolHandler(tool.name, handler);
        this.registerTool(tool, wrappedHandler);
      }

      this.toolModules.set(module.name, module);
      logger.info(`Tool module registered successfully: ${module.name}`);
    } catch (error) {
      logger.error(`Failed to register tool module: ${module.name}`, error);
      throw error;
    }
  }

  /**
   * Unregister a tool module
   */
  public async unregisterToolModule(moduleName: string): Promise<void> {
    const module = this.toolModules.get(moduleName);
    if (!module) {
      logger.warn(`Tool module not found: ${moduleName}`);
      return;
    }

    logger.info(`Unregistering tool module: ${moduleName}`);

    try {
      // Unregister all tools from the module
      for (const tool of module.tools) {
        this.unregisterTool(tool.name);
      }

      // Cleanup the module if it has a cleanup method
      if (module.cleanup) {
        await module.cleanup();
      }

      this.toolModules.delete(moduleName);
      logger.info(`Tool module unregistered successfully: ${moduleName}`);
    } catch (error) {
      logger.error(`Failed to unregister tool module: ${moduleName}`, error);
      throw error;
    }
  }

  /**
   * Get information about registered tool modules
   */
  public getToolModules(): Array<{ name: string; description: string; toolCount: number }> {
    return Array.from(this.toolModules.values()).map(module => ({
      name: module.name,
      description: module.description,
      toolCount: module.tools.length,
    }));
  }

  /**
   * Start the server with enhanced initialization
   */
  public async start(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    await super.start();
    
    logger.info('Enhanced Google MCP Server started', {
      toolModules: this.getToolModules(),
      totalTools: this.getTools().length,
    });
  }

  /**
   * Stop the server with cleanup
   */
  public async stop(): Promise<void> {
    logger.info('Stopping Enhanced Google MCP Server');

    try {
      // Cleanup all tool modules
      for (const [moduleName, module] of this.toolModules) {
        if (module.cleanup) {
          try {
            await module.cleanup();
            logger.debug(`Cleaned up tool module: ${moduleName}`);
          } catch (error) {
            logger.error(`Failed to cleanup tool module: ${moduleName}`, error);
          }
        }
      }

      await super.stop();
      logger.info('Enhanced Google MCP Server stopped successfully');
    } catch (error) {
      logger.error('Error stopping server', error);
      throw error;
    }
  }

  /**
   * Register core tools that are always available
   */
  private async registerCoreTools(): Promise<void> {
    const coreModule: ToolModule = {
      name: 'core',
      description: 'Core server tools',
      tools: [
        {
          name: 'server_info',
          description: 'Get information about the server and its capabilities',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'list_tool_modules',
          description: 'List all registered tool modules',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'server_health',
          description: 'Check server health and status',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
      handlers: new Map([
        ['server_info', this.handleServerInfo.bind(this)],
        ['list_tool_modules', this.handleListToolModules.bind(this)],
        ['server_health', this.handleServerHealth.bind(this)],
      ]),
    };

    await this.registerToolModule(coreModule);
  }

  /**
   * Initialize all tool modules based on configuration
   */
  private async initializeToolModules(): Promise<void> {
    // Tool modules will be registered in subsequent implementation files
    // This is where we'll add calendar, gmail, drive, etc. modules
    logger.info('Tool module initialization placeholder - modules will be added in subsequent files');
  }

  /**
   * Wrap tool handler with logging and error handling
   */
  private wrapToolHandler(
    toolName: string,
    handler: (args: Record<string, unknown>) => Promise<MCPToolResult>
  ): (args: Record<string, unknown>) => Promise<MCPToolResult> {
    return async (args: Record<string, unknown>): Promise<MCPToolResult> => {
      const startTime = Date.now();
      
      try {
        logger.debug(`Executing tool: ${toolName}`, { args });
        
        const result = await handler(args);
        const duration = Date.now() - startTime;
        
        logger.toolExecution(toolName, args, duration);
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`Tool execution failed: ${toolName}`, error, { args, duration });
        
        if (error instanceof ValidationError) {
          throw error;
        }
        
        throw new ToolExecutionError(
          `Failed to execute tool: ${toolName}`,
          toolName,
          error instanceof Error ? error : new Error(String(error))
        );
      }
    };
  }

  /**
   * Core tool handlers
   */
  private async handleServerInfo(): Promise<MCPToolResult> {
    const info = {
      ...this.getServerInfo(),
      configuration: {
        features: config.features,
        environment: config.server.environment,
      },
      toolModules: this.getToolModules(),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    };

    return {
      content: [
        {
          type: 'text',
          text: `Server Information:\n\n${JSON.stringify(info, null, 2)}`,
        },
      ],
    };
  }

  private async handleListToolModules(): Promise<MCPToolResult> {
    const modules = this.getToolModules();
    
    return {
      content: [
        {
          type: 'text',
          text: `Registered Tool Modules:\n\n${JSON.stringify(modules, null, 2)}`,
        },
      ],
    };
  }

  private async handleServerHealth(): Promise<MCPToolResult> {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      toolModules: this.toolModules.size,
      totalTools: this.getTools().length,
      configuration: {
        environment: config.server.environment,
        logLevel: config.server.logLevel,
        featuresEnabled: Object.entries(config.features)
          .filter(([, enabled]) => enabled)
          .map(([feature]) => feature),
      },
    };

    return {
      content: [
        {
          type: 'text',
          text: `Server Health Check:\n\n${JSON.stringify(health, null, 2)}`,
        },
      ],
    };
  }
}
```

### 4. Updated Main Entry Point
Update `src/index.ts`:
```typescript
#!/usr/bin/env node

import { EnhancedGoogleMCPServer } from './server/foundation.js';
import { logger } from './utils/logger.js';
import { ConfigurationError } from './utils/errors.js';

/**
 * Main entry point for the Google MCP Server
 */
async function main(): Promise<void> {
  try {
    logger.info('Starting Google MCP Server');

    // Create and configure the enhanced server
    const server = new EnhancedGoogleMCPServer();
    
    // Start the server (this will call initialize automatically)
    await server.start();
    
    // Setup graceful shutdown handlers
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      try {
        await server.stop();
        logger.info('Server shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    logger.error('Failed to start Google MCP Server', error);
    
    if (error instanceof ConfigurationError) {
      logger.error('Configuration error - please check your environment variables and try again');
    }
    
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', new Error(String(reason)), { promise });
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  process.exit(1);
});

// Start the server
main().catch((error) => {
  logger.error('Fatal error in main', error);
  process.exit(1);
});
```

### 5. Tool Module Template
Create `src/tools/template.ts` (for reference):
```typescript
import { MCPTool, MCPToolResult } from '../types/mcp.js';
import { ToolModule } from '../server/foundation.js';
import { logger } from '../utils/logger.js';
import { validateString } from '../utils/validation.js';

/**
 * Template for creating tool modules
 * This serves as a reference for implementing actual service modules
 */
export class TemplateToolModule implements ToolModule {
  public readonly name = 'template';
  public readonly description = 'Template tool module for reference';

  public readonly tools: MCPTool[] = [
    {
      name: 'template_example',
      description: 'Example tool for template module',
      inputSchema: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'Message to process',
          },
        },
        required: ['message'],
      },
    },
  ];

  public readonly handlers = new Map<string, (args: Record<string, unknown>) => Promise<MCPToolResult>>([
    ['template_example', this.handleTemplateExample.bind(this)],
  ]);

  /**
   * Initialize the module (optional)
   */
  public async initialize(): Promise<void> {
    logger.info('Initializing template module');
    // Perform any setup required for this module
  }

  /**
   * Cleanup the module (optional)
   */
  public async cleanup(): Promise<void> {
    logger.info('Cleaning up template module');
    // Perform any cleanup required for this module
  }

  /**
   * Example tool handler
   */
  private async handleTemplateExample(args: Record<string, unknown>): Promise<MCPToolResult> {
    const message = validateString(args.message, 'message');
    
    return {
      content: [
        {
          type: 'text',
          text: `Template processed: ${message}`,
        },
      ],
    };
  }
}
```

### 6. Updated Environment Variables
Update `.env.example`:
```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:8080/auth/callback
GOOGLE_SCOPES=https://www.googleapis.com/auth/calendar,https://www.googleapis.com/auth/gmail.readonly

# Server Configuration
SERVER_NAME=google-mcp-server
SERVER_VERSION=1.0.0
MCP_LOG_LEVEL=INFO
NODE_ENV=development

# Feature Flags
FEATURE_CALENDAR=true
FEATURE_GMAIL=true
FEATURE_DRIVE=true
FEATURE_DOCS=true
FEATURE_SHEETS=true
FEATURE_CACHING=true

# Cache Configuration
MCP_CACHE_ENABLED=true
MCP_CACHE_TTL=300
MCP_CACHE_MAX_SIZE=100

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000

# Security
TOKEN_ENCRYPTION=true
MCP_ENCRYPTION_KEY=your_encryption_key_here
```

## Testing Criteria
- [ ] Server starts with enhanced configuration system
- [ ] Core tools (server_info, list_tool_modules, server_health) work correctly
- [ ] Logging system outputs appropriate messages
- [ ] Configuration validation catches missing required values
- [ ] Tool module registration and unregistration works
- [ ] Graceful shutdown works properly

## Testing the Implementation

### 1. Configuration Test
```bash
# Test with missing configuration
unset GOOGLE_CLIENT_ID
npm run dev
# Should fail with configuration error

# Test with valid configuration
export GOOGLE_CLIENT_ID=test_client_id
export GOOGLE_CLIENT_SECRET=test_client_secret
npm run dev
# Should start successfully
```

### 2. Core Tools Test
Test the core tools using an MCP client or test script:
- `server_info` - Should return server information
- `list_tool_modules` - Should list registered modules
- `server_health` - Should return health status

### 3. Logging Test
Check that logs are output correctly:
- Different log levels based on configuration
- Structured logging in production mode
- Human-readable logging in development mode

## Deliverables
- Enhanced server foundation with configuration management
- Comprehensive logging system
- Tool module registration system
- Core administrative tools
- Robust error handling and validation
- Template for creating new tool modules

## Next Steps
This foundation enables:
- **File 04**: OAuth authentication setup
- **File 05**: Authentication flow implementation
- **File 06**: Token management system
- Registration of Google service tool modules

## Estimated Time
3-4 hours for complete server foundation implementation.
