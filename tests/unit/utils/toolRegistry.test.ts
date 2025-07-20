/**
 * Tool Registry Unit Tests
 * 
 * Tests for the basic tool registry functionality including
 * registration, validation, and execution.
 */

import { ToolRegistry } from '../../../src/utils/toolRegistry';
import { ToolDefinition, MCPToolResult, MCPErrorCode, CalendarError } from '../../../src/types/mcp';

describe('ToolRegistry', () => {
  let registry: ToolRegistry;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    registry = new ToolRegistry();
    // Mock console methods to reduce test noise
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console methods
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  describe('Tool Registration', () => {
    it('should register a valid tool successfully', () => {
      const mockTool: ToolDefinition = {
        name: 'test_tool',
        description: 'A test tool',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          },
          required: ['message']
        },
        handler: async (params: any): Promise<MCPToolResult> => {
          return {
            content: [{
              type: 'text',
              text: `Hello, ${params.message}!`
            }]
          };
        }
      };

      expect(() => registry.register(mockTool)).not.toThrow();
      expect(registry.hasTool('test_tool')).toBe(true);
      expect(registry.getStats().totalTools).toBe(1);
    });

    it('should reject duplicate tool names', () => {
      const mockTool: ToolDefinition = {
        name: 'duplicate_tool',
        description: 'A test tool',
        inputSchema: { type: 'object' },
        handler: async () => ({ content: [{ type: 'text', text: 'test' }] })
      };

      registry.register(mockTool);
      
      expect(() => registry.register(mockTool)).toThrow(CalendarError);
      expect(() => registry.register(mockTool)).toThrow('already registered');
    });

    it('should validate tool name format', () => {
      const invalidTool: ToolDefinition = {
        name: 'invalid tool name!',
        description: 'A test tool',
        inputSchema: { type: 'object' },
        handler: async () => ({ content: [{ type: 'text', text: 'test' }] })
      };

      expect(() => registry.register(invalidTool)).toThrow(CalendarError);
      expect(() => registry.register(invalidTool)).toThrow('alphanumeric characters');
    });

    it('should validate required tool properties', () => {
      const invalidTools = [
        { name: '', description: 'test', inputSchema: {}, handler: async () => ({}) },
        { name: 'test', description: '', inputSchema: {}, handler: async () => ({}) },
        { name: 'test', description: 'test', inputSchema: null, handler: async () => ({}) },
        { name: 'test', description: 'test', inputSchema: {}, handler: null }
      ];

      invalidTools.forEach((tool, index) => {
        expect(() => registry.register(tool as any)).toThrow(CalendarError);
      });
    });
  });

  describe('Tool Retrieval', () => {
    beforeEach(() => {
      const mockTool: ToolDefinition = {
        name: 'test_tool',
        description: 'A test tool',
        inputSchema: { type: 'object' },
        handler: async () => ({ content: [{ type: 'text', text: 'test' }] })
      };
      registry.register(mockTool);
    });

    it('should retrieve existing tools', () => {
      const tool = registry.getTool('test_tool');
      expect(tool).toBeDefined();
      expect(tool?.name).toBe('test_tool');
    });

    it('should return undefined for non-existent tools', () => {
      const tool = registry.getTool('non_existent');
      expect(tool).toBeUndefined();
    });

    it('should list all registered tools', () => {
      const tools = registry.listTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('test_tool');
    });

    it('should get tool names', () => {
      const names = registry.getToolNames();
      expect(names).toEqual(['test_tool']);
    });
  });

  describe('Tool Execution', () => {
    beforeEach(() => {
      const mockTool: ToolDefinition = {
        name: 'echo_tool',
        description: 'Echoes the input message',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          },
          required: ['message']
        },
        handler: async (params: any): Promise<MCPToolResult> => {
          return {
            content: [{
              type: 'text',
              text: `Echo: ${params.message}`
            }]
          };
        }
      };
      registry.register(mockTool);
    });

    it('should execute tools successfully', async () => {
      const result = await registry.executeTool('echo_tool', { message: 'Hello World' });
      
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe('Echo: Hello World');
      expect(result.isError).toBeFalsy();
    });

    it('should handle non-existent tools', async () => {
      const result = await registry.executeTool('non_existent', {});
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('not found');
    });

    it('should validate required parameters', async () => {
      const result = await registry.executeTool('echo_tool', {});
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('missing required parameter');
    });

    it('should validate parameter types', async () => {
      const result = await registry.executeTool('echo_tool', 'invalid');
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('expects an object parameter');
    });

    it('should handle tool execution errors', async () => {
      const errorTool: ToolDefinition = {
        name: 'error_tool',
        description: 'A tool that throws errors',
        inputSchema: { type: 'object' },
        handler: async (): Promise<MCPToolResult> => {
          throw new Error('Tool execution failed');
        }
      };
      registry.register(errorTool);

      const result = await registry.executeTool('error_tool', {});
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unexpected error');
    });
  });

  describe('Registry Management', () => {
    it('should provide accurate statistics', () => {
      expect(registry.getStats().totalTools).toBe(0);
      
      const mockTool: ToolDefinition = {
        name: 'stats_tool',
        description: 'A test tool',
        inputSchema: { type: 'object' },
        handler: async () => ({ content: [{ type: 'text', text: 'test' }] })
      };
      registry.register(mockTool);
      
      const stats = registry.getStats();
      expect(stats.totalTools).toBe(1);
      expect(stats.toolNames).toEqual(['stats_tool']);
    });

    it('should clear all tools', () => {
      const mockTool: ToolDefinition = {
        name: 'clear_tool',
        description: 'A test tool',
        inputSchema: { type: 'object' },
        handler: async () => ({ content: [{ type: 'text', text: 'test' }] })
      };
      registry.register(mockTool);
      
      expect(registry.getStats().totalTools).toBe(1);
      
      registry.clear();
      
      expect(registry.getStats().totalTools).toBe(0);
      expect(registry.hasTool('clear_tool')).toBe(false);
    });
  });
});
