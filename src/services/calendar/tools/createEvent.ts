/**
 * Calendar Create Event Tool - Simplified MCP tool for creating calendar events
 * 
 * This file implements the calendar_create_event MCP tool with a user-friendly
 * interface that abstracts away Google Calendar API complexity.
 */

import { ToolDefinition, MCPToolResult, CalendarEvent, CalendarCreateEventParams } from '../../../types/mcp';
import { calendarClient } from '../calendarClient';

/**
 * Format a created calendar event for display (simplified)
 * @param event - The calendar event to format
 * @returns Formatted string representation of the created event
 */
function formatCreatedEvent(event: CalendarEvent): string {
  const start = new Date(event.start.dateTime).toLocaleString();
  const end = new Date(event.end.dateTime).toLocaleString();
  
  let result = `✅ Event created successfully!\n\n`;
  result += `Title: ${event.summary}\n`;
  result += `Time: ${start} - ${end}`;
  
  if (event.location) {
    result += `\nLocation: ${event.location}`;
  }
  
  if (event.description) {
    result += `\nDescription: ${event.description}`;
  }
  
  if (event.attendees && event.attendees.length > 0) {
    result += `\nAttendees: ${event.attendees.map(a => a.email).join(', ')}`;
  }
  
  if (event.htmlLink) {
    result += `\nView in Google Calendar: ${event.htmlLink}`;
  }
  
  return result;
}

/**
 * Calendar Create Event Tool Handler
 * @param params - Parameters for creating the event
 * @returns Promise resolving to formatted event creation result
 */
async function handleCreateEvent(params: unknown): Promise<MCPToolResult> {
  try {
    const apiParams = params as CalendarCreateEventParams;
    
    // Call the calendar client
    const createdEvent = await calendarClient.instance.createEvent(apiParams);
    
    // Return formatted success result
    return {
      content: [{
        type: 'text',
        text: formatCreatedEvent(createdEvent)
      }],
      isError: false
    };
    
  } catch (error) {
    // Simple error handling following listEvents pattern
    return {
      content: [{
        type: 'text',
        text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }],
      isError: true
    };
  }
}

/**
 * Calendar Create Event Tool Definition
 */
export const calendarCreateEventTool: ToolDefinition = {
  name: 'calendar_create_event',
  description: 'Create a new calendar event with timezone and reminder support',
  inputSchema: {
    type: 'object',
    required: ['summary', 'start', 'end'],
    properties: {
      calendarId: {
        type: 'string',
        default: 'primary',
        description: 'Calendar ID (defaults to primary calendar)'
      },
      summary: {
        type: 'string',
        description: 'Event title (required)'
      },
      start: {
        type: 'object',
        required: ['dateTime'],
        properties: {
          dateTime: {
            type: 'string',
            format: 'date-time',
            description: 'Start time (ISO format: 2024-01-01T10:00:00 or 2024-01-01T10:00:00Z)'
          },
          timeZone: {
            type: 'string',
            description: 'IANA timezone (e.g., "America/Los_Angeles"). Auto-detected if not specified.'
          }
        }
      },
      end: {
        type: 'object',
        required: ['dateTime'],
        properties: {
          dateTime: {
            type: 'string',
            format: 'date-time',
            description: 'End time (ISO format: 2024-01-01T11:00:00 or 2024-01-01T11:00:00Z)'
          },
          timeZone: {
            type: 'string',
            description: 'IANA timezone (e.g., "America/Los_Angeles"). Auto-detected if not specified.'
          }
        }
      },
      description: {
        type: 'string',
        description: 'Event description (optional)'
      },
      location: {
        type: 'string',
        description: 'Event location (optional)'
      },
      attendees: {
        type: 'array',
        items: {
          type: 'object',
          required: ['email'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'Attendee email address'
            },
            displayName: {
              type: 'string',
              description: 'Attendee display name (optional)'
            }
          }
        },
        description: 'List of attendees (optional)'
      },
      reminders: {
        type: 'object',
        properties: {
          useDefault: {
            type: 'boolean',
            default: true,
            description: 'Use calendar default reminders'
          },
          overrides: {
            type: 'array',
            items: {
              type: 'object',
              required: ['method', 'minutes'],
              properties: {
                method: {
                  type: 'string',
                  enum: ['email', 'popup'],
                  description: 'Reminder method'
                },
                minutes: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 40320,
                  description: 'Minutes before event (0-40320, max 4 weeks)'
                }
              }
            },
            description: 'Custom reminder overrides'
          }
        },
        description: 'Event reminders (optional). Supports simple format like ["10m", "1h"] or detailed format.'
      }
    }
  },
  handler: handleCreateEvent
};
