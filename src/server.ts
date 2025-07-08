/**
 * Google MCP Server Implementation
 * 
 * This file contains the functional MCP server implementation that provides
 * Google Calendar tools through the Model Context Protocol (MCP) using stdio transport.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListPromptsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { toolRegistry } from './utils/toolRegistry.js';
import { calendarListEventsTool, calendarCreateEventTool } from './services/calendar/tools/index.js';
import { oauthManager } from './auth/oauthManager.js';

/**
 * Google MCP Server - Provides Google Calendar tools via MCP protocol
 */
export class GoogleMCPServer {
  private server: Server;
  private transport: StdioServerTransport;

  constructor() {
    // Initialize MCP server with capabilities
    this.server = new Server(
      {
        name: 'google-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    // Initialize stdio transport
    this.transport = new StdioServerTransport();

    // Set up MCP protocol handlers
    this.setupHandlers();

    // Register calendar tools
    this.registerTools();
  }

  /**
   * Set up MCP protocol message handlers
   */
  private setupHandlers(): void {
    // Handle tools/list requests
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      try {
        const tools = toolRegistry.listTools();
        
        // Convert our tool definitions to MCP format
        const mcpTools = tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        }));

        console.error(`[MCP Server] Listed ${mcpTools.length} tools`);
        
        return {
          tools: mcpTools,
        };
      } catch (error) {
        console.error('[MCP Server] Error listing tools:', error);
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to list tools: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });

    // Handle tools/call requests
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        
        console.error(`[MCP Server] Executing tool: ${name}`);
        
        // Execute the tool using our registry
        const result = await toolRegistry.executeTool(name, args || {});
        
        // Convert our result format to MCP format
        return {
          content: result.content,
          isError: result.isError || false,
        };
      } catch (error) {
        console.error(`[MCP Server] Error executing tool ${request.params.name}:`, error);
        
        // Return error in MCP format
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error executing tool: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    });

    // Handle resources/list requests
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      console.error('[MCP Server] Resources/list requested - no resources available');
      return {
        resources: [],
      };
    });

    // Handle prompts/list requests
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      console.error('[MCP Server] Prompts/list requested - no prompts available');
      return {
        prompts: [],
      };
    });
  }

  /**
   * Register all available tools with the tool registry
   */
  private registerTools(): void {
    try {
      // Register calendar tools
      toolRegistry.register(calendarListEventsTool);
      toolRegistry.register(calendarCreateEventTool);
      
      const stats = toolRegistry.getStats();
      console.error(`[MCP Server] Registered ${stats.totalTools} tools: ${stats.toolNames.join(', ')}`);
    } catch (error) {
      console.error('[MCP Server] Error registering tools:', error);
      throw error;
    }
  }

  /**
   * Ensure authentication is available before starting the server
   */
  private async ensureAuthentication(): Promise<void> {
    try {
      console.error('[MCP Server] Checking authentication status...');
      const isAuth = await oauthManager.instance.isAuthenticated();
      
      if (!isAuth) {
        console.error('[MCP Server] No valid authentication found, starting OAuth flow...');
        console.error('[MCP Server] A browser window will open for Google authentication.');
        await oauthManager.instance.authenticate();
        console.error('[MCP Server] Authentication completed successfully!');
      } else {
        console.error('[MCP Server] Authentication verified successfully');
      }
    } catch (error) {
      console.error('[MCP Server] Authentication failed:', error);
      throw error;
    }
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    try {
      console.error('[MCP Server] Starting Google MCP Server...');
      
      // Ensure authentication before starting MCP server
      await this.ensureAuthentication();
      
      // Connect the server to stdio transport
      await this.server.connect(this.transport);
      
      console.error('[MCP Server] Google MCP Server started successfully');
      console.error('[MCP Server] Ready to accept MCP requests via stdio');
      
      // Set up graceful shutdown
      this.setupGracefulShutdown();
      
    } catch (error) {
      console.error('[MCP Server] Failed to start server:', error);
      throw error;
    }
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    try {
      console.error('[MCP Server] Stopping Google MCP Server...');
      
      // Close the server connection
      await this.server.close();
      
      console.error('[MCP Server] Google MCP Server stopped');
    } catch (error) {
      console.error('[MCP Server] Error stopping server:', error);
      throw error;
    }
  }

  /**
   * Set up graceful shutdown handlers
   */
  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string): Promise<void> => {
      console.error(`[MCP Server] Received ${signal}, shutting down gracefully...`);
      try {
        await this.stop();
        process.exit(0);
      } catch (error) {
        console.error('[MCP Server] Error during shutdown:', error);
        process.exit(1);
      }
    };

    // Handle various shutdown signals
    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGQUIT', () => void shutdown('SIGQUIT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('[MCP Server] Uncaught exception:', error);
      void shutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('[MCP Server] Unhandled rejection at:', promise, 'reason:', reason);
      void shutdown('unhandledRejection');
    });
  }

  /**
   * Get server status information
   */
  getStatus(): { running: boolean; toolCount: number; tools: string[] } {
    const stats = toolRegistry.getStats();
    return {
      running: true, // If this method is called, server is running
      toolCount: stats.totalTools,
      tools: stats.toolNames,
    };
  }
}

/**
 * Create and export a server instance
 */
export const server = new GoogleMCPServer();
