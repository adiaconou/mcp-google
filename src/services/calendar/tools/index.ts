/**
 * Calendar Tools - Export all calendar-related MCP tools
 * 
 * This file provides a central export point for all calendar tools,
 * making it easy to import and register them in the MCP server.
 */

export { calendarListEventsTool } from './listEvents';
export { calendarCreateEventTool } from './createEvent';

// Future calendar tools will be exported here:
// export { calendarUpdateEventTool } from './updateEvent';
// export { calendarDeleteEventTool } from './deleteEvent';
