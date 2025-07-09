/**
 * Calendar List Events Tool - Simplified MCP tool for listing calendar events
 * 
 * This file implements the calendar_list_events MCP tool with minimal complexity
 * while maintaining Google Calendar API compliance.
 */

import { ToolDefinition, CalendarListEventsParams, MCPToolResult, CalendarEvent } from '../../../types/mcp';
import { calendarClient } from '../calendarClient';

/**
 * Format a calendar event for display (simplified)
 * @param event - The calendar event to format
 * @returns Formatted string representation of the event
 */
function formatEvent(event: CalendarEvent): string {
  const start = new Date(event.start.dateTime).toLocaleString();
  const end = new Date(event.end.dateTime).toLocaleString();
  
  let result = `${event.summary}\n${start} - ${end}`;
  
  if (event.location) {
    result += `\nLocation: ${event.location}`;
  }
  
  return result;
}

/**
 * Calendar List Events Tool Handler
 * @param params - Parameters for listing events
 * @returns Promise resolving to formatted event list
 */
async function handleListEvents(params: unknown): Promise<MCPToolResult> {
  try {
    const listParams = params as CalendarListEventsParams;
    
    // Call the calendar client (authentication handled at client level)
    const events = await calendarClient.instance.listEvents(listParams);
    
    // Return results
    if (events.length === 0) {
      return {
        content: [{
          type: 'text',
          text: 'No events found.'
        }],
        isError: false
      };
    }
    
    return {
      content: [{
        type: 'text',
        text: events.map(formatEvent).join('\n\n')
      }],
      isError: false
    };
    
  } catch (error) {
    // Consistent error handling pattern with createEvent
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
 * Calendar List Events Tool Definition
 */
export const calendarListEventsTool: ToolDefinition = {
  name: 'calendar_list_events',
  description: 'List calendar events with optional filtering and timezone support',
  inputSchema: {
    type: 'object',
    properties: {
      calendarId: {
        type: 'string',
        default: 'primary',
        description: 'Calendar ID (defaults to primary calendar)'
      },
      timeMin: {
        type: 'string',
        format: 'date-time',
        description: 'Start time filter (ISO format: 2024-01-01T10:00:00 or 2024-01-01T10:00:00Z)'
      },
      timeMax: {
        type: 'string',
        format: 'date-time',
        description: 'End time filter (ISO format: 2024-01-01T18:00:00 or 2024-01-01T18:00:00Z)'
      },
      timeZone: {
        type: 'string',
        description: 'Default timezone for time filters (IANA format, e.g., "America/Los_Angeles")'
      },
      maxResults: {
        type: 'number',
        default: 10,
        minimum: 1,
        maximum: 100,
        description: 'Maximum events to return (1-100)'
      },
      q: {
        type: 'string',
        description: 'Search query to filter events by title, description, or location'
      }
    }
  },
  handler: handleListEvents
};
