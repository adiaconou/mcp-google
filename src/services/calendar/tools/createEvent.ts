/**
 * Calendar Create Event Tool - Simplified MCP tool for creating calendar events
 * 
 * This file implements the calendar_create_event MCP tool with a user-friendly
 * interface that abstracts away Google Calendar API complexity.
 */

import { ToolDefinition, MCPToolResult, CalendarEvent, CalendarCreateEventParams } from '../../../types/mcp';
import { calendarClient } from '../calendarClient';

/**
 * User-friendly input interface for creating events
 */
interface CreateEventInput {
  summary: string;
  startTime: string;
  endTime: string;
  description?: string;
  location?: string;
  attendees?: string[];
}

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
 * Transform user-friendly input to Google Calendar API format
 * @param input - User-friendly input parameters
 * @returns Parameters formatted for Google Calendar API
 */
function transformToApiParams(input: CreateEventInput): CalendarCreateEventParams {
  const apiParams: CalendarCreateEventParams = {
    calendarId: 'primary',
    summary: input.summary,
    start: {
      dateTime: input.startTime
    },
    end: {
      dateTime: input.endTime
    }
  };
  
  // Add optional fields only if they have values
  if (input.description) {
    apiParams.description = input.description;
  }
  
  if (input.location) {
    apiParams.location = input.location;
  }
  
  // Transform attendees from simple email array to Google API format
  if (input.attendees && input.attendees.length > 0) {
    apiParams.attendees = input.attendees.map(email => ({
      email: email.trim()
    }));
  }
  
  return apiParams;
}

/**
 * Calendar Create Event Tool Handler
 * @param params - Parameters for creating the event
 * @returns Promise resolving to formatted event creation result
 */
async function handleCreateEvent(params: unknown): Promise<MCPToolResult> {
  try {
    const createInput = params as CreateEventInput;
    
    // Transform user-friendly input to Google API format
    const apiParams = transformToApiParams(createInput);
    
    // Call the calendar client
    const createdEvent = await calendarClient.instance.createEvent(apiParams);
    
    // Return formatted success result
    return {
      content: [{
        type: 'text',
        text: formatCreatedEvent(createdEvent)
      }]
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
  description: 'Create a new calendar event with simplified input',
  inputSchema: {
    type: 'object',
    required: ['summary', 'startTime', 'endTime'],
    properties: {
      summary: {
        type: 'string',
        description: 'Event title (required)'
      },
      startTime: {
        type: 'string',
        format: 'date-time',
        description: 'Start time (ISO format: 2024-01-01T10:00:00Z or 2024-01-01T10:00:00-08:00)'
      },
      endTime: {
        type: 'string',
        format: 'date-time',
        description: 'End time (ISO format: 2024-01-01T11:00:00Z or 2024-01-01T11:00:00-08:00)'
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
          type: 'string',
          format: 'email'
        },
        description: 'List of attendee email addresses (optional)'
      }
    }
  },
  handler: handleCreateEvent
};
