/**
 * Tool Registry - Basic tool registration and execution system
 * 
 * This file implements a simple but robust tool registry that manages
 * MCP tool definitions and provides type-safe tool execution.
 */

import { ToolDefinition, MCPToolResult, MCPErrorCode, CalendarError } from '../types/mcp';

/**
 * Registry for managing MCP tools with validation and execution capabilities
 */
export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  /**
   * Register a new tool in the registry
   * @param tool - The tool definition to register
   * @throws {CalendarError} If tool name already exists or validation fails
   */
  register(tool: ToolDefinition): void {
    // Validate tool definition
    this.validateTool(tool);

    // Check for duplicate names
    if (this.tools.has(tool.name)) {
      throw new CalendarError(
        `Tool with name '${tool.name}' is already registered`,
        MCPErrorCode.ValidationError
      );
    }

    // Register the tool
    this.tools.set(tool.name, tool);
    console.log(`Registered tool: ${tool.name}`);
  }

  /**
   * Get a specific tool by name
   * @param name - The name of the tool to retrieve
   * @returns The tool definition or undefined if not found
   */
  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool exists in the registry
   * @param name - The name of the tool to check
   * @returns True if the tool exists, false otherwise
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get all registered tools
   * @returns Array of all tool definitions
   */
  listTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tool names only (useful for MCP tools/list response)
   * @returns Array of tool names
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Execute a tool with the given parameters
   * @param name - The name of the tool to execute
   * @param params - The parameters to pass to the tool
   * @returns Promise resolving to the tool result
   * @throws {CalendarError} If tool not found or execution fails
   */
  async executeTool(name: string, params: unknown): Promise<MCPToolResult> {
    const startTime = Date.now();

    try {
      // Get the tool
      const tool = this.getTool(name);
      if (!tool) {
        throw new CalendarError(
          `Tool '${name}' not found`,
          MCPErrorCode.MethodNotFound
        );
      }

      // Validate parameters against schema (basic validation)
      this.validateParams(tool, params);

      // Execute the tool handler
      console.log(`Executing tool: ${name}`);
      const result = await tool.handler(params);

      const duration = Date.now() - startTime;
      console.log(`Tool '${name}' executed successfully in ${duration}ms`);

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`Tool '${name}' execution failed after ${duration}ms:`, error);

      // Convert error to MCP format
      if (error instanceof CalendarError) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}`
          }],
          isError: true
        };
      }

      // Handle unexpected errors
      return {
        content: [{
          type: 'text',
          text: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  /**
   * Get registry statistics
   * @returns Object with registry statistics
   */
  getStats(): { totalTools: number; toolNames: string[] } {
    return {
      totalTools: this.tools.size,
      toolNames: this.getToolNames()
    };
  }

  /**
   * Clear all registered tools (useful for testing)
   */
  clear(): void {
    this.tools.clear();
    console.log('Tool registry cleared');
  }

  /**
   * Validate a tool definition
   * @param tool - The tool to validate
   * @throws {CalendarError} If validation fails
   */
  private validateTool(tool: ToolDefinition): void {
    if (!tool.name || typeof tool.name !== 'string') {
      throw new CalendarError(
        'Tool name is required and must be a string',
        MCPErrorCode.ValidationError
      );
    }

    if (!tool.description || typeof tool.description !== 'string') {
      throw new CalendarError(
        'Tool description is required and must be a string',
        MCPErrorCode.ValidationError
      );
    }

    if (!tool.inputSchema || typeof tool.inputSchema !== 'object') {
      throw new CalendarError(
        'Tool inputSchema is required and must be an object',
        MCPErrorCode.ValidationError
      );
    }

    if (!tool.handler || typeof tool.handler !== 'function') {
      throw new CalendarError(
        'Tool handler is required and must be a function',
        MCPErrorCode.ValidationError
      );
    }

    // Validate tool name format (alphanumeric, underscores, hyphens)
    if (!/^[a-zA-Z0-9_-]+$/.test(tool.name)) {
      throw new CalendarError(
        'Tool name must contain only alphanumeric characters, underscores, and hyphens',
        MCPErrorCode.ValidationError
      );
    }
  }

  /**
   * Basic parameter validation against tool schema
   * @param tool - The tool definition
   * @param params - The parameters to validate
   * @throws {CalendarError} If validation fails
   */
  private validateParams(tool: ToolDefinition, params: unknown): void {
    // Basic validation - check if params is an object when schema expects object
    if (tool.inputSchema.type === 'object') {
      if (params === null || typeof params !== 'object') {
        throw new CalendarError(
          `Tool '${tool.name}' expects an object parameter`,
          MCPErrorCode.InvalidParams
        );
      }

      // Check required fields
      if (tool.inputSchema.required && Array.isArray(tool.inputSchema.required)) {
        const paramObj = params as Record<string, unknown>;
        for (const requiredField of tool.inputSchema.required) {
          if (!(requiredField in paramObj)) {
            throw new CalendarError(
              `Tool '${tool.name}' missing required parameter: ${requiredField}`,
              MCPErrorCode.InvalidParams
            );
          }
        }
      }
    }
  }
}

/**
 * Global tool registry instance
 * This singleton pattern ensures all parts of the application use the same registry
 */
export const toolRegistry = new ToolRegistry();
