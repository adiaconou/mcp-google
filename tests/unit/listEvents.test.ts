/**
 * Unit tests for Calendar List Events Tool
 */

import { calendarListEventsTool } from '../../src/services/calendar/tools/listEvents';
import { CalendarListEventsParams, CalendarEvent } from '../../src/types/mcp';
import { calendarClient } from '../../src/services/calendar/calendarClient';

// Mock the calendar client
jest.mock('../../src/services/calendar/calendarClient', () => ({
  calendarClient: {
    instance: {
      listEvents: jest.fn()
    }
  }
}));

const mockCalendarClient = calendarClient.instance as jest.Mocked<typeof calendarClient.instance>;

describe('Calendar List Events Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Tool Definition', () => {
    it('should have correct tool name', () => {
      expect(calendarListEventsTool.name).toBe('calendar_list_events');
    });

    it('should have proper description', () => {
      expect(calendarListEventsTool.description).toContain('List calendar events');
    });

    it('should have valid input schema', () => {
      expect(calendarListEventsTool.inputSchema).toBeDefined();
      expect(calendarListEventsTool.inputSchema.type).toBe('object');
      expect(calendarListEventsTool.inputSchema.properties).toBeDefined();
    });

    it('should have handler function', () => {
      expect(typeof calendarListEventsTool.handler).toBe('function');
    });
  });

  describe('Tool Handler', () => {
    const mockEvent: CalendarEvent = {
      id: 'test-event-1',
      summary: 'Test Meeting',
      start: {
        dateTime: '2024-01-15T10:00:00Z'
      },
      end: {
        dateTime: '2024-01-15T11:00:00Z'
      },
      description: 'A test meeting',
      location: 'Conference Room A'
    };

    it('should handle successful event listing', async () => {
      mockCalendarClient.listEvents.mockResolvedValue([mockEvent]);

      const result = await calendarListEventsTool.handler({});

      expect(mockCalendarClient.listEvents).toHaveBeenCalledWith({});

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Test Meeting');
    });

    it('should handle empty event list', async () => {
      mockCalendarClient.listEvents.mockResolvedValue([]);

      const result = await calendarListEventsTool.handler({});

      expect(result.content[0].text).toBe('No events found.');
    });

    it('should handle custom parameters', async () => {
      const params: CalendarListEventsParams = {
        calendarId: 'custom@example.com',
        maxResults: 5,
        timeMin: '2024-01-01T00:00:00Z',
        timeMax: '2024-01-31T23:59:59Z'
      };

      mockCalendarClient.listEvents.mockResolvedValue([mockEvent]);

      await calendarListEventsTool.handler(params);

      expect(mockCalendarClient.listEvents).toHaveBeenCalledWith(params);
    });

    it('should handle calendar client errors', async () => {
      const error = new Error('Calendar API error');
      mockCalendarClient.listEvents.mockRejectedValue(error);

      const result = await calendarListEventsTool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error:');
    });

    it('should format events with basic details', async () => {
      const detailedEvent: CalendarEvent = {
        id: 'detailed-event',
        summary: 'Detailed Meeting',
        start: {
          dateTime: '2024-01-15T10:00:00Z'
        },
        end: {
          dateTime: '2024-01-15T11:00:00Z'
        },
        location: 'Conference Room A'
      };

      mockCalendarClient.listEvents.mockResolvedValue([detailedEvent]);

      const result = await calendarListEventsTool.handler({});

      const text = result.content[0].text;
      expect(text).toContain('Detailed Meeting');
      expect(text).toContain('Conference Room A');
    });
  });
});
