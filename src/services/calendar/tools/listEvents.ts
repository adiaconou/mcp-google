/**
 * Calendar List Events Tool - Simplified MCP tool for listing calendar events
 * 
 * This file implements the calendar_list_events MCP tool with minimal complexity
 * while maintaining Google Calendar API compliance.
 */

import { ToolDefinition, CalendarListEventsParams, MCPToolResult, CalendarEvent } from '../../../types/mcp';
import { calendarClient } from '../calendarClient';
import { oauthManager } from '../../../auth/oauthManager';

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
    
    // Check if user is authenticated
    const isAuthenticated = await oauthManager.instance.isAuthenticated();
    if (!isAuthenticated) {
      return {
        content: [{
          type: 'text',
          text: 'Authentication required. Please run the following command to authenticate:\n\nnode dist/index.js --auth\n\nThen follow the instructions to complete the OAuth flow.'
        }],
        isError: true
      };
    }
    
    // Call the calendar client
    const events = await calendarClient.instance.listEvents(listParams);
    
    // Return results
    if (events.length === 0) {
      return {
        content: [{
          type: 'text',
          text: 'No events found.'
        }]
      };
    }
    
    return {
      content: [{
        type: 'text',
        text: events.map(formatEvent).join('\n\n')
      }]
    };
    
  } catch (error) {
    // Enhanced error handling with authentication guidance
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('Not authenticated') || errorMessage.includes('Authentication')) {
      return {
        content: [{
          type: 'text',
          text: 'Authentication required. Please run the following command to authenticate:\n\nnode dist/index.js --auth\n\nThen follow the instructions to complete the OAuth flow.'
        }],
        isError: true
      };
    }
    
    return {
      content: [{
        type: 'text',
        text: `Error: ${errorMessage}`
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
  description: 'List calendar events with optional filtering',
  inputSchema: {
    type: 'object',
    properties: {
      calendarId: {
        type: 'string',
        default: 'primary',
        description: 'Calendar ID (defaults to primary)'
      },
      timeMin: {
        type: 'string',
        format: 'date-time',
        description: 'Start time filter (ISO 8601 format)'
      },
      timeMax: {
        type: 'string',
        format: 'date-time',
        description: 'End time filter (ISO 8601 format)'
      },
      maxResults: {
        type: 'number',
        default: 10,
        minimum: 1,
        maximum: 100,
        description: 'Maximum events to return'
      }
    }
  },
  handler: handleListEvents
};
