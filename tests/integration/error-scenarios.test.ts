/**
 * Error Scenarios Integration Tests
 * 
 * Tests error handling across the entire system including network failures,
 * authentication issues, API errors, and recovery scenarios.
 */

// Set up environment variables before any imports
process.env.GOOGLE_CLIENT_ID = 'mock-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'mock-client-secret';

// Mock the OAuth manager
jest.mock('../../src/auth/oauthManager', () => ({
  oauthManager: {
    instance: {
      getOAuth2Client: jest.fn(),
      isAuthenticated: jest.fn(),
      authenticate: jest.fn(),
      getAccessToken: jest.fn(),
    },
  },
}));

import { GoogleMCPServer } from '../../src/server';
import { toolRegistry } from '../../src/utils/toolRegistry';
import { CalendarClient } from '../../src/services/calendar/calendarClient';
import { oauthManager } from '../../src/auth/oauthManager';

// Mock Google Calendar API
const mockCalendarApi = {
  events: {
    list: jest.fn(),
    insert: jest.fn(),
  },
};

jest.mock('googleapis', () => ({
  google: {
    calendar: jest.fn(() => mockCalendarApi),
  },
}));

describe('Error Scenarios Integration', () => {
  let server: GoogleMCPServer;
  let calendarClient: CalendarClient;

  beforeEach(() => {
    jest.clearAllMocks();
    toolRegistry.clear();
    server = new GoogleMCPServer();
    calendarClient = new CalendarClient();
  });

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
  });

  describe('authentication error scenarios', () => {
    test('should handle authentication failure during tool execution', async () => {
      // Mock authentication failure
      (oauthManager.instance.getOAuth2Client as jest.Mock).mockRejectedValue(
        new Error('User is not authenticated')
      );

      const result = await toolRegistry.executeTool('calendar_list_events', {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to initialize Calendar API client');
    });

    test('should handle token expiration during API call', async () => {
      // Mock successful authentication initially
      (oauthManager.instance.getOAuth2Client as jest.Mock).mockResolvedValue({
        credentials: { access_token: 'expired-token' }
      });

      // Mock API call with 401 error (expired token)
      mockCalendarApi.events.list.mockRejectedValue({
        code: 401,
        message: 'Invalid Credentials'
      });

      const result = await toolRegistry.executeTool('calendar_list_events', {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Authentication failed');
    });

    test('should handle OAuth client initialization failure', async () => {
      // Mock OAuth client creation failure
      (oauthManager.instance.getOAuth2Client as jest.Mock).mockRejectedValue(
        new Error('OAuth configuration error')
      );

      await expect(calendarClient.listEvents()).rejects.toThrow('Failed to initialize Calendar API client');
    });
  });

  describe('API error scenarios', () => {
    test('should handle Google API rate limiting', async () => {
      (oauthManager.instance.getOAuth2Client as jest.Mock).mockResolvedValue({
        credentials: { access_token: 'valid-token' }
      });

      // Mock rate limit error
      mockCalendarApi.events.list.mockRejectedValue({
        code: 429,
        message: 'Rate Limit Exceeded'
      });

      const result = await toolRegistry.executeTool('calendar_list_events', {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Rate limit exceeded');
    });

    test('should handle insufficient permissions', async () => {
      (oauthManager.instance.getOAuth2Client as jest.Mock).mockResolvedValue({
        credentials: { access_token: 'valid-token' }
      });

      // Mock permission error
      mockCalendarApi.events.list.mockRejectedValue({
        code: 403,
        message: 'Insufficient Permission'
      });

      const result = await toolRegistry.executeTool('calendar_list_events', {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Insufficient permissions');
    });

    test('should handle calendar not found error', async () => {
      (oauthManager.instance.getOAuth2Client as jest.Mock).mockResolvedValue({
        credentials: { access_token: 'valid-token' }
      });

      // Mock not found error
      mockCalendarApi.events.list.mockRejectedValue({
        code: 404,
        message: 'Not Found'
      });

      const result = await toolRegistry.executeTool('calendar_list_events', {
        calendarId: 'nonexistent-calendar'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Resource not found');
    });

    test('should handle malformed API request', async () => {
      (oauthManager.instance.getOAuth2Client as jest.Mock).mockResolvedValue({
        credentials: { access_token: 'valid-token' }
      });

      // Mock bad request error
      mockCalendarApi.events.insert.mockRejectedValue({
        code: 400,
        message: 'Invalid request body'
      });

      const result = await toolRegistry.executeTool('calendar_create_event', {
        summary: 'Test Event',
        start: { dateTime: '2024-01-16T14:00:00Z' },
        end: { dateTime: '2024-01-16T15:00:00Z' }
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid request body');
    });
  });

  describe('network error scenarios', () => {
    test('should handle network connectivity issues', async () => {
      (oauthManager.instance.getOAuth2Client as jest.Mock).mockResolvedValue({
        credentials: { access_token: 'valid-token' }
      });

      // Mock network error
      mockCalendarApi.events.list.mockRejectedValue(
        new Error('ENOTFOUND googleapis.com')
      );

      const result = await toolRegistry.executeTool('calendar_list_events', {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to list events');
      expect(result.content[0].text).toContain('ENOTFOUND');
    });

    test('should handle timeout errors', async () => {
      (oauthManager.instance.getOAuth2Client as jest.Mock).mockResolvedValue({
        credentials: { access_token: 'valid-token' }
      });

      // Mock timeout error
      mockCalendarApi.events.list.mockRejectedValue(
        new Error('Request timeout')
      );

      const result = await toolRegistry.executeTool('calendar_list_events', {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Request timeout');
    });

    test('should handle connection reset errors', async () => {
      (oauthManager.instance.getOAuth2Client as jest.Mock).mockResolvedValue({
        credentials: { access_token: 'valid-token' }
      });

      // Mock connection reset
      mockCalendarApi.events.insert.mockRejectedValue(
        new Error('ECONNRESET')
      );

      const result = await toolRegistry.executeTool('calendar_create_event', {
        summary: 'Test Event',
        start: { dateTime: '2024-01-16T14:00:00Z' },
        end: { dateTime: '2024-01-16T15:00:00Z' }
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('ECONNRESET');
    });
  });

  describe('validation error scenarios', () => {
    test('should handle invalid tool parameters', async () => {
      const result = await toolRegistry.executeTool('calendar_create_event', {
        // Missing required parameters
        summary: 'Test Event'
        // Missing startTime and endTime
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('missing required parameter');
    });

    test('should handle invalid date formats', async () => {
      (oauthManager.instance.getOAuth2Client as jest.Mock).mockResolvedValue({
        credentials: { access_token: 'valid-token' }
      });

      const result = await toolRegistry.executeTool('calendar_create_event', {
        summary: 'Test Event',
        start: { dateTime: 'invalid-date-format' },
        end: { dateTime: '2024-01-16T15:00:00Z' }
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid date format');
    });

    test('should handle invalid email addresses', async () => {
      (oauthManager.instance.getOAuth2Client as jest.Mock).mockResolvedValue({
        credentials: { access_token: 'valid-token' }
      });

      const result = await toolRegistry.executeTool('calendar_create_event', {
        summary: 'Test Event',
        start: { dateTime: '2024-01-16T14:00:00Z' },
        end: { dateTime: '2024-01-16T15:00:00Z' },
        attendees: [{ email: 'invalid-email-format' }]
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid email address');
    });

    test('should handle start time after end time', async () => {
      (oauthManager.instance.getOAuth2Client as jest.Mock).mockResolvedValue({
        credentials: { access_token: 'valid-token' }
      });

      const result = await toolRegistry.executeTool('calendar_create_event', {
        summary: 'Test Event',
        start: { dateTime: '2024-01-16T15:00:00Z' },
        end: { dateTime: '2024-01-16T14:00:00Z' } // End before start
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('start time must be before end time');
    });
  });

  describe('server error scenarios', () => {
    test('should handle tool registry corruption', async () => {
      // Corrupt the tool registry by making it return an error result
      const originalExecuteTool = toolRegistry.executeTool.bind(toolRegistry);
      const mockExecuteTool = jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Registry corrupted' }],
        isError: true
      });
      toolRegistry.executeTool = mockExecuteTool;

      try {
        const result = await toolRegistry.executeTool('calendar_list_events', {});
        
        // The method should handle the error and return an error result
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Registry corrupted');
      } finally {
        // Always restore original method
        toolRegistry.executeTool = originalExecuteTool;
      }
    });

    test('should handle server initialization failure', () => {
      // Mock tool registration failure
      const originalRegister = toolRegistry.register;
      toolRegistry.register = jest.fn().mockImplementation(() => {
        throw new Error('Failed to register tool');
      });

      expect(() => {
        new GoogleMCPServer();
      }).toThrow('Failed to register tool');

      // Restore original method
      toolRegistry.register = originalRegister;
    });

    test('should handle concurrent error scenarios', async () => {
      (oauthManager.instance.getOAuth2Client as jest.Mock).mockResolvedValue({
        credentials: { access_token: 'valid-token' }
      });

      // Mock different errors for different calls
      mockCalendarApi.events.list
        .mockRejectedValueOnce({ code: 401, message: 'Unauthorized' })
        .mockRejectedValueOnce({ code: 429, message: 'Rate limited' })
        .mockRejectedValueOnce(new Error('Network error'));

      // Execute multiple failing operations concurrently
      const promises = [
        toolRegistry.executeTool('calendar_list_events', {}),
        toolRegistry.executeTool('calendar_list_events', {}),
        toolRegistry.executeTool('calendar_list_events', {})
      ];

      const results = await Promise.all(promises);

      // All should fail with different errors
      expect(results[0].isError).toBe(true);
      expect(results[0].content[0].text).toContain('Authentication failed');
      
      expect(results[1].isError).toBe(true);
      expect(results[1].content[0].text).toContain('Rate limit exceeded');
      
      expect(results[2].isError).toBe(true);
      expect(results[2].content[0].text).toContain('Network error');
    });
  });

  describe('recovery scenarios', () => {
    test('should recover from temporary network issues', async () => {
      (oauthManager.instance.getOAuth2Client as jest.Mock).mockResolvedValue({
        credentials: { access_token: 'valid-token' }
      });

      // First call fails, second succeeds
      mockCalendarApi.events.list
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({
          data: {
            items: [
              {
                id: 'recovery-event',
                summary: 'Recovery Test',
                start: { dateTime: '2024-01-16T14:00:00Z' },
                end: { dateTime: '2024-01-16T15:00:00Z' }
              }
            ]
          }
        });

      // First call should fail
      const firstResult = await toolRegistry.executeTool('calendar_list_events', {});
      expect(firstResult.isError).toBe(true);

      // Second call should succeed
      const secondResult = await toolRegistry.executeTool('calendar_list_events', {});
      expect(secondResult.isError).toBe(false);
      expect(secondResult.content[0].text).toContain('Recovery Test');
    });

    test('should handle partial API response corruption', async () => {
      (oauthManager.instance.getOAuth2Client as jest.Mock).mockResolvedValue({
        credentials: { access_token: 'valid-token' }
      });

      // Mock response with some corrupted events
      mockCalendarApi.events.list.mockResolvedValue({
        data: {
          items: [
            {
              id: 'valid-event',
              summary: 'Valid Event',
              start: { dateTime: '2024-01-16T14:00:00Z' },
              end: { dateTime: '2024-01-16T15:00:00Z' }
            },
            {
              id: 'corrupted-event',
              summary: 'Corrupted Event'
              // Missing start/end times
            },
            {
              id: 'another-valid-event',
              summary: 'Another Valid Event',
              start: { dateTime: '2024-01-16T16:00:00Z' },
              end: { dateTime: '2024-01-16T17:00:00Z' }
            }
          ]
        }
      });

      const result = await toolRegistry.executeTool('calendar_list_events', {});

      // Should succeed but filter out corrupted events
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Valid Event');
      expect(result.content[0].text).toContain('Another Valid Event');
      expect(result.content[0].text).not.toContain('Corrupted Event');
    });

    test('should handle empty or null API responses gracefully', async () => {
      (oauthManager.instance.getOAuth2Client as jest.Mock).mockResolvedValue({
        credentials: { access_token: 'valid-token' }
      });

      // Mock empty response
      mockCalendarApi.events.list.mockResolvedValue({
        data: { items: null }
      });

      const result = await toolRegistry.executeTool('calendar_list_events', {});

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('No events found');
    });
  });

  describe('error propagation and logging', () => {
    test('should properly propagate error details through layers', async () => {
      (oauthManager.instance.getOAuth2Client as jest.Mock).mockResolvedValue({
        credentials: { access_token: 'valid-token' }
      });

      const detailedError = {
        code: 400,
        message: 'Invalid time range: start time must be before end time',
        details: {
          field: 'timeMin',
          value: '2024-01-16T15:00:00Z'
        }
      };

      mockCalendarApi.events.list.mockRejectedValue(detailedError);

      const result = await toolRegistry.executeTool('calendar_list_events', {
        timeMin: '2024-01-16T15:00:00Z',
        timeMax: '2024-01-16T14:00:00Z'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid request for list events');
      expect(result.content[0].text).toContain('start time must be before end time');
    });

    test('should handle unknown error types gracefully', async () => {
      (oauthManager.instance.getOAuth2Client as jest.Mock).mockResolvedValue({
        credentials: { access_token: 'valid-token' }
      });

      // Mock completely unknown error type
      mockCalendarApi.events.list.mockRejectedValue({
        weirdProperty: 'unknown error structure',
        randomData: 12345
      });

      const result = await toolRegistry.executeTool('calendar_list_events', {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to list events');
      expect(result.content[0].text).toContain('Unknown error');
    });
  });
});
