/**
 * Unit tests for Calendar Create Event Tool
 */

import { calendarCreateEventTool } from '../../src/services/calendar/tools/createEvent';
import { CalendarEvent } from '../../src/types/mcp';
import { calendarClient } from '../../src/services/calendar/calendarClient';

// Mock the calendar client
jest.mock('../../src/services/calendar/calendarClient', () => ({
  calendarClient: {
    instance: {
      createEvent: jest.fn()
    }
  }
}));

const mockCalendarClient = calendarClient.instance as jest.Mocked<typeof calendarClient.instance>;

describe('Calendar Create Event Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Tool Definition', () => {
    it('should have correct tool name', () => {
      expect(calendarCreateEventTool.name).toBe('calendar_create_event');
    });

    it('should have proper description', () => {
      expect(calendarCreateEventTool.description).toContain('Create a new calendar event');
    });

    it('should have valid input schema', () => {
      expect(calendarCreateEventTool.inputSchema).toBeDefined();
      expect(calendarCreateEventTool.inputSchema.type).toBe('object');
      expect(calendarCreateEventTool.inputSchema.properties).toBeDefined();
      expect(calendarCreateEventTool.inputSchema.required).toEqual(['summary', 'startTime', 'endTime']);
    });

    it('should have handler function', () => {
      expect(typeof calendarCreateEventTool.handler).toBe('function');
    });

    it('should have correct required fields in schema', () => {
      const properties = calendarCreateEventTool.inputSchema.properties!;
      expect(properties.summary).toBeDefined();
      expect(properties.startTime).toBeDefined();
      expect(properties.endTime).toBeDefined();
      expect(properties.description).toBeDefined();
      expect(properties.location).toBeDefined();
      expect(properties.attendees).toBeDefined();
    });
  });

  describe('Tool Handler', () => {
    const mockCreatedEvent: CalendarEvent = {
      id: 'created-event-123',
      summary: 'Test Meeting',
      start: {
        dateTime: '2024-01-15T10:00:00Z'
      },
      end: {
        dateTime: '2024-01-15T11:00:00Z'
      },
      description: 'A test meeting',
      location: 'Conference Room A',
      htmlLink: 'https://calendar.google.com/event?eid=test123'
    };

    it('should handle successful event creation with minimal input', async () => {
      const input = {
        summary: 'Test Meeting',
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T11:00:00Z'
      };

      mockCalendarClient.createEvent.mockResolvedValue(mockCreatedEvent);

      const result = await calendarCreateEventTool.handler(input);

      expect(mockCalendarClient.createEvent).toHaveBeenCalledWith({
        calendarId: 'primary',
        summary: 'Test Meeting',
        start: {
          dateTime: '2024-01-15T10:00:00Z'
        },
        end: {
          dateTime: '2024-01-15T11:00:00Z'
        }
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('✅ Event created successfully!');
      expect(result.content[0].text).toContain('Test Meeting');
    });

    it('should handle event creation with all optional fields', async () => {
      const input = {
        summary: 'Detailed Meeting',
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T11:00:00Z',
        description: 'A detailed meeting description',
        location: 'Conference Room B',
        attendees: ['john@example.com', 'jane@example.com']
      };

      mockCalendarClient.createEvent.mockResolvedValue({
        ...mockCreatedEvent,
        summary: 'Detailed Meeting',
        description: 'A detailed meeting description',
        location: 'Conference Room B',
        attendees: [
          { email: 'john@example.com' },
          { email: 'jane@example.com' }
        ]
      });

      const result = await calendarCreateEventTool.handler(input);

      expect(mockCalendarClient.createEvent).toHaveBeenCalledWith({
        calendarId: 'primary',
        summary: 'Detailed Meeting',
        start: {
          dateTime: '2024-01-15T10:00:00Z'
        },
        end: {
          dateTime: '2024-01-15T11:00:00Z'
        },
        description: 'A detailed meeting description',
        location: 'Conference Room B',
        attendees: [
          { email: 'john@example.com' },
          { email: 'jane@example.com' }
        ]
      });

      expect(result.content[0].text).toContain('Detailed Meeting');
      expect(result.content[0].text).toContain('Conference Room B');
      expect(result.content[0].text).toContain('A detailed meeting description');
      expect(result.content[0].text).toContain('john@example.com, jane@example.com');
    });

    it('should transform attendees from simple array to Google API format', async () => {
      const input = {
        summary: 'Team Sync',
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T11:00:00Z',
        attendees: ['  alice@example.com  ', 'bob@example.com']
      };

      mockCalendarClient.createEvent.mockResolvedValue(mockCreatedEvent);

      await calendarCreateEventTool.handler(input);

      expect(mockCalendarClient.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          attendees: [
            { email: 'alice@example.com' },
            { email: 'bob@example.com' }
          ]
        })
      );
    });

    it('should handle empty attendees array', async () => {
      const input = {
        summary: 'Solo Meeting',
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T11:00:00Z',
        attendees: []
      };

      mockCalendarClient.createEvent.mockResolvedValue(mockCreatedEvent);

      await calendarCreateEventTool.handler(input);

      expect(mockCalendarClient.createEvent).toHaveBeenCalledWith({
        calendarId: 'primary',
        summary: 'Solo Meeting',
        start: {
          dateTime: '2024-01-15T10:00:00Z'
        },
        end: {
          dateTime: '2024-01-15T11:00:00Z'
        }
      });
    });

    it('should handle calendar client errors', async () => {
      const input = {
        summary: 'Error Meeting',
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T11:00:00Z'
      };

      const error = new Error('Calendar API error');
      mockCalendarClient.createEvent.mockRejectedValue(error);

      const result = await calendarCreateEventTool.handler(input);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error:');
      expect(result.content[0].text).toContain('Calendar API error');
    });

    it('should format created event with all available details', async () => {
      const input = {
        summary: 'Complete Meeting',
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T11:00:00Z',
        description: 'Full description',
        location: 'Room 123',
        attendees: ['test@example.com']
      };

      const completeEvent: CalendarEvent = {
        id: 'complete-event',
        summary: 'Complete Meeting',
        start: {
          dateTime: '2024-01-15T10:00:00Z'
        },
        end: {
          dateTime: '2024-01-15T11:00:00Z'
        },
        description: 'Full description',
        location: 'Room 123',
        attendees: [{ email: 'test@example.com' }],
        htmlLink: 'https://calendar.google.com/event?eid=complete123'
      };

      mockCalendarClient.createEvent.mockResolvedValue(completeEvent);

      const result = await calendarCreateEventTool.handler(input);

      const text = result.content[0].text;
      expect(text).toContain('✅ Event created successfully!');
      expect(text).toContain('Title: Complete Meeting');
      expect(text).toContain('Location: Room 123');
      expect(text).toContain('Description: Full description');
      expect(text).toContain('Attendees: test@example.com');
      expect(text).toContain('View in Google Calendar: https://calendar.google.com/event?eid=complete123');
    });

    it('should format created event without optional fields', async () => {
      const input = {
        summary: 'Simple Meeting',
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T11:00:00Z'
      };

      const simpleEvent: CalendarEvent = {
        id: 'simple-event',
        summary: 'Simple Meeting',
        start: {
          dateTime: '2024-01-15T10:00:00Z'
        },
        end: {
          dateTime: '2024-01-15T11:00:00Z'
        }
      };

      mockCalendarClient.createEvent.mockResolvedValue(simpleEvent);

      const result = await calendarCreateEventTool.handler(input);

      const text = result.content[0].text;
      expect(text).toContain('✅ Event created successfully!');
      expect(text).toContain('Title: Simple Meeting');
      expect(text).not.toContain('Location:');
      expect(text).not.toContain('Description:');
      expect(text).not.toContain('Attendees:');
      expect(text).not.toContain('View in Google Calendar:');
    });

    it('should handle unknown errors gracefully', async () => {
      const input = {
        summary: 'Unknown Error Meeting',
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T11:00:00Z'
      };

      mockCalendarClient.createEvent.mockRejectedValue('Unknown error');

      const result = await calendarCreateEventTool.handler(input);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error:');
      expect(result.content[0].text).toContain('Unknown error');
    });

    it('should preserve input transformation logic', async () => {
      const input = {
        summary: 'Transform Test',
        startTime: '2024-01-15T10:00:00-08:00',
        endTime: '2024-01-15T11:00:00-08:00',
        description: 'Test description',
        location: 'Test location'
      };

      mockCalendarClient.createEvent.mockResolvedValue(mockCreatedEvent);

      await calendarCreateEventTool.handler(input);

      expect(mockCalendarClient.createEvent).toHaveBeenCalledWith({
        calendarId: 'primary',
        summary: 'Transform Test',
        start: {
          dateTime: '2024-01-15T10:00:00-08:00'
        },
        end: {
          dateTime: '2024-01-15T11:00:00-08:00'
        },
        description: 'Test description',
        location: 'Test location'
      });
    });
  });
});
