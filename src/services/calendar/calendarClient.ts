/**
 * Calendar API Client - Google Calendar API wrapper with OAuth integration
 * 
 * This file implements a type-safe wrapper around the Google Calendar API
 * with integrated OAuth authentication and error handling.
 */

import { google, calendar_v3 } from 'googleapis';
import { oauthManager } from '../../auth/oauthManager';
import { 
  CalendarEvent, 
  CalendarListEventsParams, 
  CalendarCreateEventParams,
  CalendarError, 
  MCPErrorCode 
} from '../../types/mcp';

/**
 * Calendar API Client
 * 
 * Provides type-safe access to Google Calendar API with integrated OAuth
 * authentication and comprehensive error handling.
 */
export class CalendarClient {
  private calendar: calendar_v3.Calendar | null = null;
  private readonly defaultTimeZone: string;

  constructor() {
    // Detect server timezone with fallback to UTC
    try {
      this.defaultTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      this.defaultTimeZone = 'UTC';
    }
  }

  /**
   * Initialize the Calendar API client with OAuth authentication
   * @throws {CalendarError} If authentication fails
   */
  private async initializeClient(): Promise<void> {
    try {
      // Get authenticated OAuth2 client
      const auth = await oauthManager.instance.getOAuth2Client();
      
      // Initialize Calendar API client
      this.calendar = google.calendar({ version: 'v3', auth });
      
    } catch (error) {
      throw new CalendarError(
        `Failed to initialize Calendar API client: ${error instanceof Error ? error.message : 'Unknown error'}`,
        MCPErrorCode.AuthenticationError
      );
    }
  }

  /**
   * Ensure the client is initialized
   * @throws {CalendarError} If initialization fails
   */
  private async ensureInitialized(): Promise<calendar_v3.Calendar> {
    if (!this.calendar) {
      await this.initializeClient();
    }
    
    if (!this.calendar) {
      throw new CalendarError(
        'Calendar API client failed to initialize',
        MCPErrorCode.InternalError
      );
    }
    
    return this.calendar;
  }

  /**
   * Normalize a date-time string to ensure it has timezone information
   * @param dateTime - The date-time string to normalize
   * @returns Normalized date-time string with timezone information
   */
  private normalizeDateTime(dateTime: string): string {
    // If already has timezone info (Z or ±HH:MM), return as-is
    if (dateTime.match(/[+-]\d{2}:\d{2}$|Z$/)) {
      return dateTime;
    }
    
    // Convert to UTC timestamp
    
    try {
      // Parse the date and convert to ISO string (UTC)
      const date = new Date(dateTime);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date format');
      }
      
      // Return as UTC ISO string
      return date.toISOString();
    } catch {
      throw new CalendarError(
        `Invalid date format: ${dateTime}. Use ISO 8601 format (e.g., 2024-01-01T10:00:00)`,
        MCPErrorCode.ValidationError
      );
    }
  }

  /**
   * List calendar events with optional filtering
   * @param params - Parameters for listing events
   * @returns Promise resolving to array of calendar events
   * @throws {CalendarError} If the request fails
   */
  async listEvents(params: CalendarListEventsParams = {}): Promise<CalendarEvent[]> {
    try {
      const calendar = await this.ensureInitialized();
      
      // Normalize date-time parameters if provided
      const normalizedParams = { ...params };
      if (params.timeMin) {
        normalizedParams.timeMin = this.normalizeDateTime(params.timeMin);
      }
      if (params.timeMax) {
        normalizedParams.timeMax = this.normalizeDateTime(params.timeMax);
      }
      
      // Set default parameters with normalized timestamps
      const requestParams: calendar_v3.Params$Resource$Events$List = {
        calendarId: normalizedParams.calendarId || 'primary',
        maxResults: Math.min(normalizedParams.maxResults || 10, 100), // Cap at 100
        singleEvents: true,
        orderBy: 'startTime',
        timeMin: normalizedParams.timeMin || new Date().toISOString(),
        timeZone: normalizedParams.timeZone || this.defaultTimeZone
      };

      // Add optional parameters only if they have values
      if (normalizedParams.timeMax) {
        requestParams.timeMax = normalizedParams.timeMax;
      }
      if (normalizedParams.q) {
        requestParams.q = normalizedParams.q;
      }

      console.error(`Listing events for calendar: ${requestParams.calendarId}`);
      
      // Make API request
      const response = await calendar.events.list(requestParams);
      
      if (!response.data.items) {
        return [];
      }

      // Convert Google Calendar events to our format
      const events = response.data.items
        .filter(item => item.start && item.end) // Filter out events without start/end times
        .map(item => this.convertToCalendarEvent(item));

      console.error(`Retrieved ${events.length} events`);
      return events;

    } catch (error) {
      throw this.handleApiError(error, 'list events');
    }
  }

  /**
   * Create a new calendar event
   * @param params - Parameters for creating the event
   * @returns Promise resolving to the created calendar event
   * @throws {CalendarError} If the request fails
   */
  async createEvent(params: CalendarCreateEventParams): Promise<CalendarEvent> {
    try {
      const calendar = await this.ensureInitialized();
      
      // Validate required parameters
      this.validateCreateEventParams(params);

      // Process timezone and reminder information
      const processedParams = this.processEventParams(params);

      const calendarId = processedParams.calendarId || 'primary';
      console.error(`Creating event "${processedParams.summary}" in calendar: ${calendarId}`);

      // Make API request
      const response = await calendar.events.insert({
        calendarId,
        requestBody: processedParams,
        sendUpdates: 'all' // Send notifications to attendees
      });

      if (!response.data) {
        throw new Error('No data returned from Calendar API');
      }

      const createdEvent = this.convertToCalendarEvent(response.data);
      console.error(`Event created successfully with ID: ${createdEvent.id}`);
      
      return createdEvent;

    } catch (error) {
      throw this.handleApiError(error, 'create event');
    }
  }

  /**
   * Convert Google Calendar event to our CalendarEvent format
   * @param googleEvent - Google Calendar API event object
   * @returns CalendarEvent in our format
   */
  private convertToCalendarEvent(googleEvent: calendar_v3.Schema$Event): CalendarEvent {
    // Handle missing start/end times
    if (!googleEvent.start || !googleEvent.end) {
      throw new CalendarError(
        'Event missing start or end time',
        MCPErrorCode.APIError
      );
    }

    // Use dateTime if available, otherwise use date (all-day events)
    const startDateTime = googleEvent.start.dateTime || googleEvent.start.date;
    const endDateTime = googleEvent.end.dateTime || googleEvent.end.date;

    if (!startDateTime || !endDateTime) {
      throw new CalendarError(
        'Event missing valid start or end date/time',
        MCPErrorCode.APIError
      );
    }

    const event: CalendarEvent = {
      summary: googleEvent.summary || 'Untitled Event',
      start: {
        dateTime: startDateTime,
        ...(googleEvent.start.timeZone && { timeZone: googleEvent.start.timeZone })
      },
      end: {
        dateTime: endDateTime,
        ...(googleEvent.end.timeZone && { timeZone: googleEvent.end.timeZone })
      },
      ...(googleEvent.id && { id: googleEvent.id }),
      ...(googleEvent.description && { description: googleEvent.description }),
      ...(googleEvent.location && { location: googleEvent.location }),
      ...(googleEvent.htmlLink && { htmlLink: googleEvent.htmlLink }),
    };

    // Add attendees if present
    if (googleEvent.attendees && googleEvent.attendees.length > 0) {
      event.attendees = googleEvent.attendees.map(attendee => ({
        email: attendee.email || '',
        ...(attendee.displayName && { displayName: attendee.displayName }),
        ...(attendee.responseStatus && { 
          responseStatus: attendee.responseStatus as 'needsAction' | 'declined' | 'tentative' | 'accepted'
        })
      }));
    }

    return event;
  }

  /**
   * Process event parameters to handle timezone and reminders
   * @param params - Raw event parameters
   * @returns Processed parameters ready for Google Calendar API
   */
  private processEventParams(params: CalendarCreateEventParams): any {
    const defaultTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Helper to process a time object
    const processTime = (timeObj: { dateTime: string; timeZone?: string }) => {
      // If dateTime already has timezone info (ends with Z or has offset), use as-is
      if (timeObj.dateTime.match(/[+-]\d{2}:\d{2}$|Z$/)) {
        return { dateTime: timeObj.dateTime };
      }
      
      // Otherwise, add timezone field
      return {
        dateTime: timeObj.dateTime,
        timeZone: timeObj.timeZone || defaultTimeZone
      };
    };

    // Process reminders
    const processReminders = (reminders?: any) => {
      if (!reminders) {
        return { useDefault: true };
      }
      
      if (reminders.useDefault !== undefined) {
        return reminders;
      }
      
      // Convert simple array format to Google API format if needed
      if (Array.isArray(reminders)) {
        return {
          useDefault: false,
          overrides: reminders.map((r: any) => {
            if (typeof r === 'string') {
              // Parse strings like "10m", "1h", "1d"
              return this.parseReminderString(r);
            }
            return r;
          })
        };
      }
      
      return reminders;
    };

    return {
      ...params,
      start: processTime(params.start),
      end: processTime(params.end),
      reminders: processReminders(params.reminders)
    };
  }

  /**
   * Parse reminder string format (e.g., "10m", "1h", "1d") to minutes
   * @param reminderStr - String like "10m", "1h", "1d"
   * @returns Reminder object with method and minutes
   */
  private parseReminderString(reminderStr: string): { method: 'popup'; minutes: number } {
    const match = reminderStr.match(/^(\d+)([mhd])$/);
    if (!match) {
      throw new CalendarError(`Invalid reminder format: ${reminderStr}. Use format like "10m", "1h", "1d"`, MCPErrorCode.ValidationError);
    }

    const [, value, unit] = match;
    const num = parseInt(value, 10);
    
    let minutes: number;
    switch (unit) {
      case 'm':
        minutes = num;
        break;
      case 'h':
        minutes = num * 60;
        break;
      case 'd':
        minutes = num * 24 * 60;
        break;
      default:
        throw new CalendarError(`Invalid reminder unit: ${unit}. Use m, h, or d`, MCPErrorCode.ValidationError);
    }

    if (minutes < 0 || minutes > 40320) { // 4 weeks max
      throw new CalendarError(`Reminder minutes must be between 0 and 40320 (4 weeks)`, MCPErrorCode.ValidationError);
    }

    return { method: 'popup', minutes };
  }

  /**
   * Validate parameters for creating an event
   * @param params - Parameters to validate
   * @throws {CalendarError} If validation fails
   */
  private validateCreateEventParams(params: CalendarCreateEventParams): void {
    if (!params.summary?.trim()) {
      throw new CalendarError('Event summary is required', MCPErrorCode.ValidationError);
    }

    if (!params.start?.dateTime || !params.end?.dateTime) {
      throw new CalendarError('Event start and end times are required', MCPErrorCode.ValidationError);
    }

    try {
      const startDate = new Date(params.start.dateTime);
      const endDate = new Date(params.end.dateTime);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date format');
      }

      if (startDate >= endDate) {
        throw new CalendarError('Event start time must be before end time', MCPErrorCode.ValidationError);
      }
    } catch (error) {
      if (error instanceof CalendarError) {
        throw error;
      }
      throw new CalendarError('Invalid date format. Use ISO 8601 format (e.g., 2024-01-01T10:00:00Z)', MCPErrorCode.ValidationError);
    }

    // Validate attendee emails if provided
    if (params.attendees) {
      for (const attendee of params.attendees) {
        if (!attendee.email || !this.isValidEmail(attendee.email)) {
          throw new CalendarError(
            `Invalid email address: ${attendee.email}`,
            MCPErrorCode.ValidationError
          );
        }
      }
    }
  }

  /**
   * Basic email validation
   * @param email - Email address to validate
   * @returns True if email format is valid
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Handle Google Calendar API errors and convert to CalendarError
   * @param error - The error from the API call
   * @param operation - Description of the operation that failed
   * @returns CalendarError with appropriate error code and message
   */
  private handleApiError(error: unknown, operation: string): CalendarError {
    console.error(`Calendar API error during ${operation}:`, error);

    if (error instanceof CalendarError) {
      return error;
    }

    const err = error as { code?: number | string; message?: string };

    switch (err.code) {
      case 401:
        return new CalendarError('Authentication failed. Please re-authenticate.', MCPErrorCode.AuthenticationError);
      case 403:
        return new CalendarError('Insufficient permissions.', MCPErrorCode.AuthorizationError);
      case 429:
        return new CalendarError('Rate limit exceeded. Please try again later.', MCPErrorCode.RateLimitError);
      case 404:
        return new CalendarError(`Resource not found during ${operation}.`, MCPErrorCode.APIError);
      case 400:
        return new CalendarError(`Invalid request for ${operation}: ${err.message}`, MCPErrorCode.ValidationError);
      default:
        return new CalendarError(`Failed to ${operation}: ${err.message || 'Unknown error'}`, MCPErrorCode.APIError, { originalError: error });
    }
  }
}

/**
 * Global calendar client instance
 * This singleton pattern ensures consistent API access across the application
 */
let _calendarClient: CalendarClient | null = null;

export const calendarClient = {
  get instance(): CalendarClient {
    if (!_calendarClient) {
      _calendarClient = new CalendarClient();
    }
    return _calendarClient;
  },
  
  reset(): void {
    _calendarClient = null;
  }
};
