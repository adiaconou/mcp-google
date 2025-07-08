/**
 * Calendar Client Unit Tests
 * 
 * Tests for the Calendar API client functionality including
 * event listing, creation, and error handling.
 */

import { CalendarClient, calendarClient } from '../../src/services/calendar/calendarClient';
import { CalendarError, MCPErrorCode } from '../../src/types/mcp';
import { oauthManager } from '../../src/auth/oauthManager';

// Mock the OAuth manager
jest.mock('../../src/auth/oauthManager', () => ({
  oauthManager: {
    instance: {
      getOAuth2Client: jest.fn()
    }
  }
}));

// Mock googleapis
jest.mock('googleapis', () => ({
  google: {
    calendar: jest.fn()
  }
}));

describe('CalendarClient', () => {
  let client: CalendarClient;
  let mockCalendarAPI: any;
  let mockOAuth2Client: any;

  beforeEach(() => {
    // Reset the singleton
    calendarClient.reset();
    client = calendarClient.instance;

    // Create mock OAuth2 client
    mockOAuth2Client = {
      setCredentials: jest.fn()
    };

    // Create mock Calendar API
    mockCalendarAPI = {
      events: {
        list: jest.fn(),
        insert: jest.fn()
      },
      calendarList: {
        list: jest.fn()
      }
    };

    // Setup mocks
    (oauthManager.instance.getOAuth2Client as jest.Mock).mockResolvedValue(mockOAuth2Client);
    const { google } = require('googleapis');
    google.calendar.mockReturnValue(mockCalendarAPI);

    // Clear console logs
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('listEvents', () => {
    it('should list events successfully with default parameters', async () => {
      // Mock API response
      const mockEvents = {
        data: {
          items: [
            {
              id: 'event1',
              summary: 'Test Event',
              start: { dateTime: '2024-01-01T10:00:00Z' },
              end: { dateTime: '2024-01-01T11:00:00Z' }
            }
          ]
        }
      };
      mockCalendarAPI.events.list.mockResolvedValue(mockEvents);

      // Call method
      const result = await client.listEvents();

      // Verify results
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'event1',
        summary: 'Test Event',
        start: { dateTime: '2024-01-01T10:00:00Z' },
        end: { dateTime: '2024-01-01T11:00:00Z' }
      });

      // Verify API was called with correct parameters
      expect(mockCalendarAPI.events.list).toHaveBeenCalledWith(
        expect.objectContaining({
          calendarId: 'primary',
          maxResults: 10,
          singleEvents: true,
          orderBy: 'startTime',
          timeMin: expect.any(String)
        })
      );
    });

    it('should handle custom parameters correctly', async () => {
      // Mock API response
      mockCalendarAPI.events.list.mockResolvedValue({ data: { items: [] } });

      // Call with custom parameters
      await client.listEvents({
        calendarId: 'custom@example.com',
        maxResults: 5,
        timeMin: '2024-01-01T00:00:00Z',
        timeMax: '2024-01-31T23:59:59Z',
        q: 'meeting'
      });

      // Verify API was called with custom parameters
      expect(mockCalendarAPI.events.list).toHaveBeenCalledWith(
        expect.objectContaining({
          calendarId: 'custom@example.com',
          maxResults: 5,
          timeMin: '2024-01-01T00:00:00Z',
          timeMax: '2024-01-31T23:59:59Z',
          q: 'meeting',
          singleEvents: true,
          orderBy: 'startTime'
        })
      );
    });

    it('should return empty array when no events found', async () => {
      // Mock empty response
      mockCalendarAPI.events.list.mockResolvedValue({ data: { items: [] } });

      const result = await client.listEvents();

      expect(result).toEqual([]);
    });

    it('should handle API errors correctly', async () => {
      // Mock API error
      const apiError = { code: 403, message: 'Insufficient permissions' };
      mockCalendarAPI.events.list.mockRejectedValue(apiError);

      // Expect CalendarError to be thrown
      await expect(client.listEvents()).rejects.toThrow(CalendarError);
      await expect(client.listEvents()).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('createEvent', () => {
    const validEventParams = {
      summary: 'Test Event',
      start: { dateTime: '2024-01-01T10:00:00Z' },
      end: { dateTime: '2024-01-01T11:00:00Z' }
    };

    it('should create event successfully', async () => {
      // Mock API response
      const mockResponse = {
        data: {
          id: 'created-event-id',
          summary: 'Test Event',
          start: { dateTime: '2024-01-01T10:00:00Z' },
          end: { dateTime: '2024-01-01T11:00:00Z' }
        }
      };
      mockCalendarAPI.events.insert.mockResolvedValue(mockResponse);

      // Call method
      const result = await client.createEvent(validEventParams);

      // Verify result
      expect(result).toMatchObject({
        id: 'created-event-id',
        summary: 'Test Event',
        start: { dateTime: '2024-01-01T10:00:00Z' },
        end: { dateTime: '2024-01-01T11:00:00Z' }
      });

      // Verify API was called correctly (parameters may be processed for timezone)
      expect(mockCalendarAPI.events.insert).toHaveBeenCalledWith({
        calendarId: 'primary',
        requestBody: expect.objectContaining({
          summary: 'Test Event',
          start: expect.objectContaining({ dateTime: '2024-01-01T10:00:00Z' }),
          end: expect.objectContaining({ dateTime: '2024-01-01T11:00:00Z' })
        }),
        sendUpdates: 'all'
      });
    });

    it('should validate required parameters', async () => {
      // Test missing summary
      await expect(client.createEvent({
        summary: '',
        start: { dateTime: '2024-01-01T10:00:00Z' },
        end: { dateTime: '2024-01-01T11:00:00Z' }
      })).rejects.toThrow('Event summary is required');

      // Test missing start time
      await expect(client.createEvent({
        summary: 'Test',
        start: { dateTime: '' },
        end: { dateTime: '2024-01-01T11:00:00Z' }
      })).rejects.toThrow('Event start and end times are required');

      // Test missing end time
      await expect(client.createEvent({
        summary: 'Test',
        start: { dateTime: '2024-01-01T10:00:00Z' },
        end: { dateTime: '' }
      })).rejects.toThrow('Event start and end times are required');
    });

    it('should validate date order', async () => {
      // Test end time before start time
      await expect(client.createEvent({
        summary: 'Test Event',
        start: { dateTime: '2024-01-01T11:00:00Z' },
        end: { dateTime: '2024-01-01T10:00:00Z' }
      })).rejects.toThrow('Event start time must be before end time');
    });

    it('should validate email addresses in attendees', async () => {
      await expect(client.createEvent({
        ...validEventParams,
        attendees: [{ email: 'invalid-email' }]
      })).rejects.toThrow('Invalid email address');
    });
  });


  describe('error handling', () => {
    it('should handle authentication errors', async () => {
      const authError = { code: 401, message: 'Unauthorized' };
      mockCalendarAPI.events.list.mockRejectedValue(authError);

      await expect(client.listEvents()).rejects.toThrow(CalendarError);
      await expect(client.listEvents()).rejects.toThrow('Authentication failed. Please re-authenticate.');
    });

    it('should handle rate limiting errors', async () => {
      const rateLimitError = { code: 429, message: 'Rate limit exceeded' };
      mockCalendarAPI.events.list.mockRejectedValue(rateLimitError);

      await expect(client.listEvents()).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle network errors', async () => {
      const networkError = { code: 'ENOTFOUND', message: 'Network error' };
      mockCalendarAPI.events.list.mockRejectedValue(networkError);

      await expect(client.listEvents()).rejects.toThrow('Failed to list events: Network error');
    });

    it('should re-throw CalendarError instances', async () => {
      const calendarError = new CalendarError('Custom error', MCPErrorCode.ValidationError);
      mockCalendarAPI.events.list.mockRejectedValue(calendarError);

      await expect(client.listEvents()).rejects.toThrow(calendarError);
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = calendarClient.instance;
      const instance2 = calendarClient.instance;

      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', () => {
      const instance1 = calendarClient.instance;
      calendarClient.reset();
      const instance2 = calendarClient.instance;

      expect(instance1).not.toBe(instance2);
    });
  });
});
