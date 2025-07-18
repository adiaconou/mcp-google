/**
 * Calendar Service Integration Tests
 * 
 * Tests the complete calendar service workflow including API integration,
 * error handling, and data transformation across the calendar system.
 */

// Set up environment variables before any imports
process.env.GOOGLE_CLIENT_ID = 'mock-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'mock-client-secret';

// Mock the OAuth manager
jest.mock('../../src/auth/oauthManager', () => ({
  oauthManager: {
    instance: {
      getOAuth2Client: jest.fn(),
      isAuthenticated: jest.fn().mockResolvedValue(true),
      getAccessToken: jest.fn().mockResolvedValue('mock-access-token'),
    },
  },
}));

import { CalendarClient } from '../../src/services/calendar/calendarClient';
import { calendarListEventsTool, calendarCreateEventTool } from '../../src/services/calendar/tools/index';
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
    auth: {
      OAuth2: jest.fn(),
    },
  },
}));

describe('Calendar Service Integration', () => {
  let calendarClient: CalendarClient;

  beforeEach(() => {
    jest.clearAllMocks();
    calendarClient = new CalendarClient();
    
    // Mock OAuth client
    (oauthManager.instance.getOAuth2Client as jest.Mock).mockResolvedValue({
      credentials: { access_token: 'mock-token' }
    });
  });

  describe('calendar event listing integration', () => {
    test('should list events successfully with proper data transformation', async () => {
      // Mock Google Calendar API response
      const mockApiResponse = {
        data: {
          items: [
            {
              id: 'event-1',
              summary: 'Team Meeting',
              description: 'Weekly team sync',
              location: 'Conference Room A',
              start: { 
                dateTime: '2024-01-15T10:00:00Z',
                timeZone: 'America/Los_Angeles'
              },
              end: { 
                dateTime: '2024-01-15T11:00:00Z',
                timeZone: 'America/Los_Angeles'
              },
              htmlLink: 'https://calendar.google.com/event?eid=event-1',
              attendees: [
                {
                  email: 'user1@example.com',
                  displayName: 'User One',
                  responseStatus: 'accepted'
                },
                {
                  email: 'user2@example.com',
                  responseStatus: 'tentative'
                }
              ]
            },
            {
              id: 'event-2',
              summary: 'Project Review',
              start: { dateTime: '2024-01-16T14:00:00Z' },
              end: { dateTime: '2024-01-16T15:00:00Z' }
            }
          ]
        }
      };

      mockCalendarApi.events.list.mockResolvedValue(mockApiResponse);

      // Test calendar client
      const events = await calendarClient.listEvents({
        maxResults: 10,
        timeMin: '2024-01-01T00:00:00Z'
      });

      // Verify API call
      expect(mockCalendarApi.events.list).toHaveBeenCalledWith({
        calendarId: 'primary',
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime',
        timeMin: '2024-01-01T00:00:00Z',
        timeZone: expect.any(String) // The client always adds a timezone
      });

      // Verify data transformation
      expect(events).toHaveLength(2);
      
      // First event with full details
      expect(events[0]).toEqual({
        id: 'event-1',
        summary: 'Team Meeting',
        description: 'Weekly team sync',
        location: 'Conference Room A',
        start: {
          dateTime: '2024-01-15T10:00:00Z',
          timeZone: 'America/Los_Angeles'
        },
        end: {
          dateTime: '2024-01-15T11:00:00Z',
          timeZone: 'America/Los_Angeles'
        },
        htmlLink: 'https://calendar.google.com/event?eid=event-1',
        attendees: [
          {
            email: 'user1@example.com',
            displayName: 'User One',
            responseStatus: 'accepted'
          },
          {
            email: 'user2@example.com',
            responseStatus: 'tentative'
          }
        ]
      });

      // Second event with minimal details
      expect(events[1]).toEqual({
        id: 'event-2',
        summary: 'Project Review',
        start: { dateTime: '2024-01-16T14:00:00Z' },
        end: { dateTime: '2024-01-16T15:00:00Z' }
      });
    });

    test('should handle empty event list', async () => {
      mockCalendarApi.events.list.mockResolvedValue({
        data: { items: [] }
      });

      const events = await calendarClient.listEvents();

      expect(events).toEqual([]);
      expect(mockCalendarApi.events.list).toHaveBeenCalled();
    });

    test('should filter out events without start/end times', async () => {
      const mockApiResponse = {
        data: {
          items: [
            {
              id: 'valid-event',
              summary: 'Valid Event',
              start: { dateTime: '2024-01-15T10:00:00Z' },
              end: { dateTime: '2024-01-15T11:00:00Z' }
            },
            {
              id: 'invalid-event-1',
              summary: 'Invalid Event 1'
              // Missing start/end
            },
            {
              id: 'invalid-event-2',
              summary: 'Invalid Event 2',
              start: { dateTime: '2024-01-15T12:00:00Z' }
              // Missing end
            }
          ]
        }
      };

      mockCalendarApi.events.list.mockResolvedValue(mockApiResponse);

      const events = await calendarClient.listEvents();

      expect(events).toHaveLength(1);
      expect(events[0].id).toBe('valid-event');
    });

    test('should handle API errors gracefully', async () => {
      mockCalendarApi.events.list.mockRejectedValue({
        code: 403,
        message: 'Insufficient permissions'
      });

      await expect(calendarClient.listEvents()).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('calendar event creation integration', () => {
    test('should create event successfully with proper data processing', async () => {
      const mockApiResponse = {
        data: {
          id: 'new-event-id',
          summary: 'New Meeting',
          description: 'Important meeting',
          start: { 
            dateTime: '2024-01-16T14:00:00Z',
            timeZone: 'America/Los_Angeles'
          },
          end: { 
            dateTime: '2024-01-16T15:00:00Z',
            timeZone: 'America/Los_Angeles'
          },
          htmlLink: 'https://calendar.google.com/event?eid=new-event-id'
        }
      };

      mockCalendarApi.events.insert.mockResolvedValue(mockApiResponse);

      const eventParams = {
        summary: 'New Meeting',
        description: 'Important meeting',
        start: { dateTime: '2024-01-16T14:00:00Z' },
        end: { dateTime: '2024-01-16T15:00:00Z' },
        attendees: [
          { email: 'attendee@example.com' }
        ]
      };

      const createdEvent = await calendarClient.createEvent(eventParams);

      // Verify API call with processed parameters
      expect(mockCalendarApi.events.insert).toHaveBeenCalledWith({
        calendarId: 'primary',
        sendUpdates: 'all',
        requestBody: expect.objectContaining({
          summary: 'New Meeting',
          description: 'Important meeting',
          start: {
            dateTime: '2024-01-16T14:00:00Z'
          },
          end: {
            dateTime: '2024-01-16T15:00:00Z'
          },
          attendees: [{ email: 'attendee@example.com' }],
          reminders: { useDefault: true }
        })
      });

      // Verify returned event
      expect(createdEvent).toEqual({
        id: 'new-event-id',
        summary: 'New Meeting',
        description: 'Important meeting',
        start: {
          dateTime: '2024-01-16T14:00:00Z',
          timeZone: 'America/Los_Angeles'
        },
        end: {
          dateTime: '2024-01-16T15:00:00Z',
          timeZone: 'America/Los_Angeles'
        },
        htmlLink: 'https://calendar.google.com/event?eid=new-event-id'
      });
    });

    test('should handle timezone processing correctly', async () => {
      const mockApiResponse = {
        data: {
          id: 'tz-event-id',
          summary: 'Timezone Test',
          start: { 
            dateTime: '2024-01-16T14:00:00',
            timeZone: 'America/New_York'
          },
          end: { 
            dateTime: '2024-01-16T15:00:00',
            timeZone: 'America/New_York'
          }
        }
      };

      mockCalendarApi.events.insert.mockResolvedValue(mockApiResponse);

      // Event without timezone info
      const eventParams = {
        summary: 'Timezone Test',
        start: { dateTime: '2024-01-16T14:00:00' },
        end: { dateTime: '2024-01-16T15:00:00' }
      };

      await calendarClient.createEvent(eventParams);

      // Should add system timezone
      const insertCall = mockCalendarApi.events.insert.mock.calls[0][0];
      expect(insertCall.requestBody.start).toHaveProperty('timeZone');
      expect(insertCall.requestBody.end).toHaveProperty('timeZone');
    });

    test('should handle reminder processing correctly', async () => {
      const mockApiResponse = {
        data: {
          id: 'reminder-event-id',
          summary: 'Reminder Test',
          start: { dateTime: '2024-01-16T14:00:00Z' },
          end: { dateTime: '2024-01-16T15:00:00Z' }
        }
      };

      mockCalendarApi.events.insert.mockResolvedValue(mockApiResponse);

      // Test custom reminders
      const eventParams = {
        summary: 'Reminder Test',
        start: { dateTime: '2024-01-16T14:00:00Z' },
        end: { dateTime: '2024-01-16T15:00:00Z' },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup' as const, minutes: 10 },
            { method: 'email' as const, minutes: 60 }
          ]
        }
      };

      await calendarClient.createEvent(eventParams);

      const insertCall = mockCalendarApi.events.insert.mock.calls[0][0];
      expect(insertCall.requestBody.reminders).toEqual({
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 10 },
          { method: 'email', minutes: 60 }
        ]
      });
    });

    test('should validate event parameters', async () => {
      // Test missing summary
      await expect(calendarClient.createEvent({
        start: { dateTime: '2024-01-16T14:00:00Z' },
        end: { dateTime: '2024-01-16T15:00:00Z' }
      } as any)).rejects.toThrow('Event summary is required');

      // Test missing start time
      await expect(calendarClient.createEvent({
        summary: 'Test Event',
        end: { dateTime: '2024-01-16T15:00:00Z' }
      } as any)).rejects.toThrow('Event start and end times are required');

      // Test invalid date format
      await expect(calendarClient.createEvent({
        summary: 'Test Event',
        start: { dateTime: 'invalid-date' },
        end: { dateTime: '2024-01-16T15:00:00Z' }
      })).rejects.toThrow('Invalid date format');

      // Test start time after end time
      await expect(calendarClient.createEvent({
        summary: 'Test Event',
        start: { dateTime: '2024-01-16T15:00:00Z' },
        end: { dateTime: '2024-01-16T14:00:00Z' }
      })).rejects.toThrow('Event start time must be before end time');
    });

    test('should handle API errors during creation', async () => {
      mockCalendarApi.events.insert.mockRejectedValue({
        code: 400,
        message: 'Invalid request'
      });

      await expect(calendarClient.createEvent({
        summary: 'Test Event',
        start: { dateTime: '2024-01-16T14:00:00Z' },
        end: { dateTime: '2024-01-16T15:00:00Z' }
      })).rejects.toThrow('Invalid request for create event');
    });
  });

  describe('tool integration with calendar service', () => {
    test('should integrate list events tool with calendar client', async () => {
      const mockApiResponse = {
        data: {
          items: [
            {
              id: 'tool-event-1',
              summary: 'Tool Test Event',
              start: { dateTime: '2024-01-15T10:00:00Z' },
              end: { dateTime: '2024-01-15T11:00:00Z' }
            }
          ]
        }
      };

      mockCalendarApi.events.list.mockResolvedValue(mockApiResponse);

      const result = await calendarListEventsTool.handler({
        maxResults: 5,
        timeMin: '2024-01-01T00:00:00Z'
      });

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Tool Test Event');
      expect(result.content[0].text).toContain('1/15/2024, 2:00:00 AM - 1/15/2024, 3:00:00 AM');
    });

    test('should integrate create event tool with calendar client', async () => {
      const mockApiResponse = {
        data: {
          id: 'tool-created-event',
          summary: 'Tool Created Event',
          start: { dateTime: '2024-01-16T14:00:00Z' },
          end: { dateTime: '2024-01-16T15:00:00Z' },
          htmlLink: 'https://calendar.google.com/event?eid=tool-created-event'
        }
      };

      mockCalendarApi.events.insert.mockResolvedValue(mockApiResponse);

      const result = await calendarCreateEventTool.handler({
        summary: 'Tool Created Event',
        start: { dateTime: '2024-01-16T14:00:00Z' },
        end: { dateTime: '2024-01-16T15:00:00Z' },
        description: 'Created via tool'
      });

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('✅ Event created successfully!');
      expect(result.content[0].text).toContain('Tool Created Event');
      expect(result.content[0].text).toContain('tool-created-event');
    });

    test('should handle tool errors gracefully', async () => {
      mockCalendarApi.events.list.mockRejectedValue({
        code: 401,
        message: 'Authentication failed'
      });

      const result = await calendarListEventsTool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Authentication failed');
    });
  });

  describe('error handling across service layers', () => {
    test('should propagate authentication errors correctly', async () => {
      (oauthManager.instance.getOAuth2Client as jest.Mock).mockRejectedValue(
        new Error('Authentication failed')
      );

      await expect(calendarClient.listEvents()).rejects.toThrow('Failed to initialize Calendar API client');
    });

    test('should handle rate limiting errors', async () => {
      mockCalendarApi.events.list.mockRejectedValue({
        code: 429,
        message: 'Rate limit exceeded'
      });

      await expect(calendarClient.listEvents()).rejects.toThrow('Rate limit exceeded');
    });

    test('should handle network errors', async () => {
      mockCalendarApi.events.list.mockRejectedValue(
        new Error('Network error')
      );

      await expect(calendarClient.listEvents()).rejects.toThrow('Failed to list events: Network error');
    });
  });

  describe('concurrent operations', () => {
    test('should handle concurrent calendar operations', async () => {
      // Mock different responses for different operations
      mockCalendarApi.events.list.mockResolvedValue({
        data: { items: [] }
      });

      mockCalendarApi.events.insert.mockResolvedValue({
        data: {
          id: 'concurrent-event',
          summary: 'Concurrent Event',
          start: { dateTime: '2024-01-16T14:00:00Z' },
          end: { dateTime: '2024-01-16T15:00:00Z' }
        }
      });

      // Execute multiple operations concurrently
      const promises = [
        calendarClient.listEvents({ maxResults: 5 }),
        calendarClient.listEvents({ maxResults: 10 }),
        calendarClient.createEvent({
          summary: 'Concurrent Event 1',
          start: { dateTime: '2024-01-16T14:00:00Z' },
          end: { dateTime: '2024-01-16T15:00:00Z' }
        }),
        calendarClient.createEvent({
          summary: 'Concurrent Event 2',
          start: { dateTime: '2024-01-16T16:00:00Z' },
          end: { dateTime: '2024-01-16T17:00:00Z' }
        })
      ];

      const results = await Promise.all(promises);

      // All operations should succeed
      expect(results).toHaveLength(4);
      expect(Array.isArray(results[0])).toBe(true); // listEvents result
      expect(Array.isArray(results[1])).toBe(true); // listEvents result
      expect(results[2]).toHaveProperty('id', 'concurrent-event'); // createEvent result
      expect(results[3]).toHaveProperty('id', 'concurrent-event'); // createEvent result
    });
  });
});
