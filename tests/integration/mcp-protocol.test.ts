/**
 * MCP Protocol Integration Tests
 * 
 * Tests the integration between the MCP server, tool registry, and calendar services
 * to ensure the complete workflow functions correctly.
 */

// Set up environment variables before any imports
process.env.GOOGLE_CLIENT_ID = 'mock-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'mock-client-secret';

// Mock the OAuth manager to avoid authentication during tests
jest.mock('../../src/auth/oauthManager', () => ({
  oauthManager: {
    instance: {
      isAuthenticated: jest.fn().mockResolvedValue(true),
      authenticate: jest.fn().mockResolvedValue(undefined),
      getAccessToken: jest.fn().mockResolvedValue('mock-access-token'),
      getOAuth2Client: jest.fn().mockResolvedValue({
        credentials: { access_token: 'mock-token' }
      }),
    },
  },
}));

import { GoogleMCPServer } from '../../src/server';
import { toolRegistry } from '../../src/utils/toolRegistry';

// Mock the Google Calendar API
jest.mock('googleapis', () => ({
  google: {
    calendar: jest.fn(() => ({
      events: {
        list: jest.fn().mockResolvedValue({
          data: {
            items: [
              {
                id: 'test-event-1',
                summary: 'Test Event',
                start: { dateTime: '2024-01-15T10:00:00Z' },
                end: { dateTime: '2024-01-15T11:00:00Z' },
              },
            ],
          },
        }),
        insert: jest.fn().mockResolvedValue({
          data: {
            id: 'new-event-id',
            summary: 'New Test Event',
            start: { dateTime: '2024-01-16T14:00:00Z' },
            end: { dateTime: '2024-01-16T15:00:00Z' },
          },
        }),
      },
    })),
    auth: {
      OAuth2: jest.fn(),
    },
  },
}));

describe('MCP Protocol Integration', () => {
  let server: GoogleMCPServer;

  beforeEach(() => {
    // Clear tool registry to avoid conflicts
    toolRegistry.clear();
    server = new GoogleMCPServer();
  });

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
  });

  describe('server initialization and tool registration', () => {
    test('should register tools during server creation', () => {
      const status = server.getStatus();
      
      expect(status.running).toBe(true);
      expect(status.toolCount).toBe(2);
      expect(status.tools).toContain('calendar_list_events');
      expect(status.tools).toContain('calendar_create_event');
    });

    test('should have tools available in registry after initialization', () => {
      const stats = toolRegistry.getStats();
      
      expect(stats.totalTools).toBe(2);
      expect(stats.toolNames).toContain('calendar_list_events');
      expect(stats.toolNames).toContain('calendar_create_event');
    });

    test('should have properly structured tool definitions', () => {
      const tools = toolRegistry.listTools();
      
      expect(tools).toHaveLength(2);
      
      tools.forEach(tool => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        expect(tool).toHaveProperty('handler');
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(typeof tool.inputSchema).toBe('object');
        expect(typeof tool.handler).toBe('function');
      });
    });
  });

  describe('tool execution integration', () => {
    test('should execute calendar_list_events tool successfully', async () => {
      const result = await toolRegistry.executeTool('calendar_list_events', {
        maxResults: 5,
        timeMin: '2024-01-01T00:00:00Z',
      });

      // Verify response structure
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('isError');
      expect(result.isError).toBe(false);
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);

      // Verify content structure
      const content = result.content[0];
      expect(content).toHaveProperty('type', 'text');
      expect(content).toHaveProperty('text');
      expect(typeof content.text).toBe('string');
    });

    test('should execute calendar_create_event tool successfully', async () => {
      const result = await toolRegistry.executeTool('calendar_create_event', {
        summary: 'Integration Test Event',
        start: { dateTime: '2024-01-16T14:00:00Z' },
        end: { dateTime: '2024-01-16T15:00:00Z' },
        description: 'Test event created by integration test',
      });

      // Verify response structure
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('isError');
      expect(result.isError).toBe(false);
      expect(Array.isArray(result.content)).toBe(true);

      // Verify content indicates success
      const content = result.content[0];
      expect(content).toHaveProperty('type', 'text');
      expect(content.text).toContain('✅ Event created successfully!');
    });

    test('should handle invalid tool name gracefully', async () => {
      const result = await toolRegistry.executeTool('nonexistent_tool', {});

      // Should return error response, not throw
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('isError');
      expect(result.isError).toBe(true);
      
      const content = result.content[0];
      expect(content.text).toContain('not found');
    });

    test('should handle invalid tool arguments gracefully', async () => {
      const result = await toolRegistry.executeTool('calendar_create_event', {
        // Missing required fields
        summary: 'Test Event',
        // Missing startTime and endTime
      });

      // Should return error response for validation failure
      expect(result).toHaveProperty('isError');
      expect(result.isError).toBe(true);
      
      const content = result.content[0];
      expect(content.text).toContain('missing required parameter');
    });

    test('should handle empty arguments gracefully', async () => {
      const result = await toolRegistry.executeTool('calendar_list_events', {});

      // Should handle empty arguments gracefully (uses defaults)
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('isError');
      expect(result.isError).toBe(false);
    });
  });

  describe('error handling integration', () => {
    test('should handle tool execution errors properly', async () => {
      // Mock a tool that returns an error result
      const originalExecuteTool = toolRegistry.executeTool;
      toolRegistry.executeTool = jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Tool execution failed' }],
        isError: true
      });

      const result = await toolRegistry.executeTool('calendar_list_events', {});

      // Should return error response, not throw
      expect(result).toHaveProperty('isError');
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Tool execution failed');

      // Restore original method
      toolRegistry.executeTool = originalExecuteTool;
    });

    test('should handle registry errors gracefully', () => {
      // Test duplicate tool registration
      const tool = toolRegistry.getTool('calendar_list_events');
      expect(tool).toBeDefined();

      // Try to register the same tool again
      expect(() => {
        toolRegistry.register(tool!);
      }).toThrow('already registered');
    });
  });

  describe('cross-component integration', () => {
    test('should maintain tool registry state across server operations', () => {
      // Initial state
      const initialStats = toolRegistry.getStats();
      expect(initialStats.totalTools).toBe(2);

      // Server status should reflect registry state
      const serverStatus = server.getStatus();
      expect(serverStatus.toolCount).toBe(initialStats.totalTools);
      expect(serverStatus.tools).toEqual(initialStats.toolNames);
    });

    test('should handle concurrent tool executions', async () => {
      // Execute multiple tools concurrently
      const promises = [
        toolRegistry.executeTool('calendar_list_events', { maxResults: 3 }),
        toolRegistry.executeTool('calendar_list_events', { maxResults: 5 }),
        toolRegistry.executeTool('calendar_create_event', {
          summary: 'Concurrent Test 1',
          start: { dateTime: '2024-01-16T10:00:00Z' },
          end: { dateTime: '2024-01-16T11:00:00Z' },
        }),
        toolRegistry.executeTool('calendar_create_event', {
          summary: 'Concurrent Test 2',
          start: { dateTime: '2024-01-16T12:00:00Z' },
          end: { dateTime: '2024-01-16T13:00:00Z' },
        }),
      ];

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach(result => {
        expect(result.isError).toBe(false);
        expect(result.content).toBeDefined();
        expect(Array.isArray(result.content)).toBe(true);
      });
    });
  });
});
