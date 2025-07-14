/**
 * Google MCP Server Implementation
 * 
 * This file implements a Model Context Protocol (MCP) server that provides secure access
 * to Google APIs (Calendar, Gmail, Drive, Docs, Sheets) through standardized MCP tools.
 * 
 * The MCP protocol enables AI agents like Claude Desktop to interact with external services
 * through a standardized JSON-RPC interface over stdio transport. This server acts as a
 * bridge between MCP clients and Google APIs, handling authentication, tool execution,
 * and response formatting according to MCP specifications.
 * 
 * Key MCP Protocol Features Implemented:
 * - Tool discovery and execution (tools/list, tools/call)
 * - Resource management (resources/list) 
 * - Prompt management (prompts/list)
 * - Stdio transport for client communication
 * - JSON-RPC 2.0 message handling
 * - Standardized error responses
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
import { toolRegistry } from './utils/toolRegistry';
import { ToolHandler } from './types/mcp';
import { calendarListEventsTool, calendarCreateEventTool } from './services/calendar/tools/index';
import { gmailListMessagesTool, gmailGetMessageTool, gmailSearchMessagesTool, gmailDownloadAttachmentTool, exportEmailScreenshotTool } from './services/gmail/tools/index';
import { driveListFilesTool, driveGetFileTool, driveUploadFileTool, driveCreateFolderTool, driveMoveFileTool } from './services/drive/tools/index';
import { createSpreadsheetSchema, createSpreadsheet, getDataSchema, getData, updateCellsSchema, updateCells } from './services/sheets/tools/index';
import { oauthManager } from './auth/oauthManager';

/**
 * Google MCP Server - Provides Google API access via MCP protocol
 * 
 * This class implements the MCP server specification, providing a standardized interface
 * for AI agents to interact with Google services. It handles the complete MCP lifecycle:
 * 
 * 1. Server initialization with declared capabilities
 * 2. Stdio transport setup for client communication  
 * 3. MCP protocol message handling (JSON-RPC 2.0)
 * 4. Tool registration and execution
 * 5. Authentication management with Google OAuth 2.0
 * 6. Error handling and response formatting
 */
export class GoogleMCPServer {
  private server: Server;
  private transport: StdioServerTransport;

  constructor() {
    // Initialize MCP server with metadata and capabilities declaration
    // This tells MCP clients what features this server supports
    this.server = new Server(
      {
        name: 'google-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},      // Supports tool discovery and execution
          resources: {},  // Supports resource management (future use)
          prompts: {},    // Supports prompt management (future use)
        },
      }
    );

    // Initialize stdio transport for MCP client communication
    // MCP uses stdin/stdout for message exchange with clients like Claude Desktop
    this.transport = new StdioServerTransport();

    // Set up MCP protocol message handlers for all supported operations
    this.setupHandlers();

    // Register all available Google API tools with the MCP tool registry
    this.registerTools();
  }

  /**
   * Set up MCP protocol message handlers
   * 
   * This method registers handlers for all MCP protocol operations that this server supports.
   * Each handler corresponds to a specific MCP method and follows the JSON-RPC 2.0 specification.
   * The MCP SDK automatically handles message parsing, validation, and response formatting.
   */
  private setupHandlers(): void {
    /**
     * Handle tools/list requests (MCP Protocol)
     * 
     * This handler responds to MCP client requests for tool discovery. It returns metadata
     * about all available tools including their names, descriptions, and input schemas.
     * This allows MCP clients like Claude Desktop to understand what operations are available
     * and how to invoke them properly.
     * 
     * MCP Request: { "method": "tools/list", "params": {} }
     * MCP Response: { "tools": [{ "name": "...", "description": "...", "inputSchema": {...} }] }
     */
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      try {
        const tools = toolRegistry.listTools();
        
        // Convert our internal tool definitions to MCP-compliant format
        // Each tool must include name, description, and JSON Schema for input validation
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

    /**
     * Handle tools/call requests (MCP Protocol)
     * 
     * This is the core handler for tool execution. It receives tool invocation requests
     * from MCP clients, validates the request, handles authentication, executes the
     * requested tool, and returns the result in MCP-compliant format.
     * 
     * The handler implements automatic OAuth flow management, ensuring users are
     * authenticated before tool execution and providing helpful error messages
     * when authentication fails.
     * 
     * MCP Request: { "method": "tools/call", "params": { "name": "tool_name", "arguments": {...} } }
     * MCP Response: { "content": [{ "type": "text", "text": "..." }], "isError": false }
     */
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        
        console.error(`[MCP Server] Executing tool: ${name}`);
        
        // Check authentication before executing any tool
        const isAuth = await oauthManager.instance.isAuthenticated();
        if (!isAuth) {
          console.error(`[MCP Server] Authentication required for tool: ${name}`);
          console.error(`[MCP Server] Attempting to trigger OAuth flow automatically...`);
          
          try {
            // Automatically trigger OAuth flow
            await oauthManager.instance.authenticate();
            console.error(`[MCP Server] Authentication completed successfully, retrying tool execution...`);
            
            // Verify authentication worked
            const isAuthAfter = await oauthManager.instance.isAuthenticated();
            if (!isAuthAfter) {
              throw new Error('Authentication completed but verification failed');
            }
            
            // Authentication successful, continue with tool execution
            console.error(`[MCP Server] Authentication verified, executing tool: ${name}`);
            
          } catch (authError) {
            console.error(`[MCP Server] OAuth flow failed:`, authError);
            
            // Get detailed authentication guidance for manual steps
            const guidance = await oauthManager.instance.getAuthenticationGuidance();
            
            return {
              content: [
                {
                  type: 'text' as const,
                  text: `🔐 Automatic Authentication Failed\n\nThe OAuth flow could not be completed automatically.\n\n${guidance}\n\nRequested tool: ${name}\n\nError details: ${authError instanceof Error ? authError.message : 'Unknown error'}`,
                },
              ],
              isError: true,
            };
          }
        }
        
        // Execute the tool using our registry
        const result = await toolRegistry.executeTool(name, args || {});
        
        // Monitor response size for Claude Desktop stability
        const responseText = result.content.map(c => c.text || '').join('');
        const responseSizeKB = Math.round(responseText.length / 1024);
        
        // Warn about large responses that might cause client issues
        if (responseSizeKB > 100) { // 100KB threshold
          console.error(`[MCP Server] Large response warning: ${responseSizeKB}KB for tool ${name} - may cause client streaming issues`);
          
          // Add size warning to response for very large responses
          if (responseSizeKB > 200) { // 200KB critical threshold
            result.content = [{
              type: 'text' as const,
              text: `⚠️ **Large Response Warning**\n\nThis response (${responseSizeKB}KB) may cause streaming issues in Claude Desktop.\n\n` +
                    `Consider using smaller file sizes or requesting specific sections of documents.\n\n---\n\n` +
                    responseText.substring(0, 50000) + // Limit to 50KB
                    `\n\n[Response truncated at 50KB for stability - original was ${responseSizeKB}KB]`
            }];
          }
        }
        
        console.error(`[MCP Server] Tool ${name} completed successfully (${responseSizeKB}KB response)`);
        
        // Convert our result format to MCP format
        return {
          content: result.content,
          isError: result.isError || false,
        };
      } catch (error) {
        console.error(`[MCP Server] Error executing tool ${request.params.name}:`, error);
        
        // Check if this is an authentication-related error
        if (error instanceof Error && 
            (error.message.includes('authentication') || 
             error.message.includes('unauthorized') ||
             error.message.includes('invalid_grant') ||
             error.message.includes('scope'))) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `🔐 Authentication Error\n\nYour authentication has expired or is invalid.\n\n📋 Steps to fix:\n1. Run: node clear-tokens-enhanced.js\n2. Restart Claude Desktop completely\n3. Try this tool again\n4. Complete the OAuth flow when prompted\n\nError details: ${error.message}`,
              },
            ],
            isError: true,
          };
        }
        
        // Return generic error in MCP format
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

    /**
     * Handle resources/list requests (MCP Protocol)
     * 
     * Resources in MCP represent data sources that can be accessed by clients.
     * Currently, this server doesn't expose any resources, but this handler
     * is implemented for MCP protocol compliance. Future versions might expose
     * Google Drive files, Calendar events, or Gmail messages as resources.
     * 
     * MCP Request: { "method": "resources/list", "params": {} }
     * MCP Response: { "resources": [] }
     */
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      console.error('[MCP Server] Resources/list requested - no resources available');
      return {
        resources: [],
      };
    });

    /**
     * Handle prompts/list requests (MCP Protocol)
     * 
     * Prompts in MCP are reusable prompt templates that clients can use.
     * Currently, this server doesn't provide any prompts, but this handler
     * is implemented for MCP protocol compliance. Future versions might include
     * prompts for common Google API operations or email templates.
     * 
     * MCP Request: { "method": "prompts/list", "params": {} }
     * MCP Response: { "prompts": [] }
     */
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      console.error('[MCP Server] Prompts/list requested - no prompts available');
      return {
        prompts: [],
      };
    });
  }

  /**
   * Register all available Google API tools with the tool registry
   * 
   * This method registers all implemented Google API tools, making them available
   * for discovery and execution through the MCP protocol. Each tool is registered
   * with its metadata (name, description, input schema) and handler function.
   * 
   * The tool registry acts as a central repository that maps tool names to their
   * implementations, enabling the MCP server to route tool calls appropriately.
   */
  private registerTools(): void {
    // Register Google Calendar tools for event management
    toolRegistry.register(calendarListEventsTool);    // List calendar events
    toolRegistry.register(calendarCreateEventTool);   // Create new calendar events
    
    // Register Gmail tools for email management
    toolRegistry.register(gmailListMessagesTool);     // List Gmail messages
    toolRegistry.register(gmailGetMessageTool);       // Get specific Gmail message
    toolRegistry.register(gmailSearchMessagesTool);   // Search Gmail messages
    toolRegistry.register(gmailDownloadAttachmentTool); // Download email attachments
    toolRegistry.register(exportEmailScreenshotTool); // Export email content as PNG screenshot
    
    // Register Google Drive tools for file management
    toolRegistry.register(driveListFilesTool);        // List Drive files
    toolRegistry.register(driveGetFileTool);          // Get Drive file metadata and content
    toolRegistry.register(driveUploadFileTool);       // Upload files to Drive
    toolRegistry.register(driveCreateFolderTool);     // Create folders in Drive
    toolRegistry.register(driveMoveFileTool);         // Move files between folders
    
    // Register Google Sheets tools for spreadsheet management
    toolRegistry.register({
      name: createSpreadsheetSchema.name,
      description: createSpreadsheetSchema.description,
      inputSchema: createSpreadsheetSchema.inputSchema,
      handler: createSpreadsheet
    });
    toolRegistry.register({
      name: getDataSchema.name,
      description: getDataSchema.description,
      inputSchema: getDataSchema.inputSchema,
      handler: async (params: unknown) => {
        const result = await getData(params as any);
        return {
          content: [{
            type: 'text' as const,
            text: result.success 
              ? JSON.stringify(result.data, null, 2)
              : `Error: ${result.error}`
          }],
          isError: !result.success
        };
      }
    });
    toolRegistry.register({
      name: updateCellsSchema.name,
      description: updateCellsSchema.description,
      inputSchema: updateCellsSchema.inputSchema,
      handler: updateCells
    });
  }

  /**
   * Ensure authentication is available before starting the server
   * 
   * This method checks if valid Google OAuth tokens exist and initiates the
   * authentication flow if needed. However, it's currently not used during
   * server startup to avoid blocking the MCP connection. Instead, authentication
   * is handled on-demand when tools are called, providing better user experience
   * in MCP clients like Claude Desktop.
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
   * Start the MCP server and establish stdio communication
   * 
   * This method initializes the MCP server and connects it to the stdio transport,
   * enabling communication with MCP clients like Claude Desktop. The server becomes
   * ready to handle MCP protocol messages (tool calls, resource requests, etc.).
   * 
   * Authentication is handled on-demand during tool execution rather than at startup
   * to ensure the server starts quickly and doesn't block the MCP client connection.
   */
  async start(): Promise<void> {
    try {
      console.error('[MCP Server] Starting Google MCP Server...');
      
      // Note: Authentication is handled per-tool to ensure visibility in Claude Desktop
      // This prevents the server startup from blocking on user authentication
      console.error('[MCP Server] Authentication will be handled when tools are called');
      
      // Connect the MCP server to stdio transport for client communication
      // This establishes the JSON-RPC 2.0 communication channel with MCP clients
      await this.server.connect(this.transport);
      
      console.error('[MCP Server] Google MCP Server started successfully');
      console.error('[MCP Server] Ready to accept MCP requests via stdio');
      
      // Set up graceful shutdown handlers for clean server termination
      this.setupGracefulShutdown();
      
    } catch (error) {
      console.error('[MCP Server] Failed to start server:', error);
      throw error;
    }
  }

  /**
   * Stop the MCP server and close all connections
   * 
   * This method gracefully shuts down the MCP server, closing the stdio transport
   * and cleaning up any resources. It's called during graceful shutdown or when
   * the server needs to be stopped programmatically.
   */
  async stop(): Promise<void> {
    try {
      console.error('[MCP Server] Stopping Google MCP Server...');
      
      // Close the MCP server connection and cleanup resources
      await this.server.close();
      
      console.error('[MCP Server] Google MCP Server stopped');
    } catch (error) {
      console.error('[MCP Server] Error stopping server:', error);
      throw error;
    }
  }

  /**
   * Set up graceful shutdown handlers for clean server termination
   * 
   * This method registers event handlers for various shutdown signals and error
   * conditions, ensuring the server can be stopped cleanly when the process
   * receives termination signals or encounters unhandled errors.
   * 
   * Proper shutdown handling is important for MCP servers to avoid leaving
   * clients in an inconsistent state and to clean up any resources properly.
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
   * Get server status information for monitoring and debugging
   * 
   * This method returns current server status including the number of registered
   * tools and their names. It's useful for debugging, monitoring, and verifying
   * that the server is properly configured with all expected tools.
   * 
   * @returns Object containing server status information
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
 * 
 * This creates a singleton instance of the GoogleMCPServer that can be imported
 * and used throughout the application. The server is configured with all Google
 * API tools and ready to handle MCP protocol communication.
 */
export const server = new GoogleMCPServer();
