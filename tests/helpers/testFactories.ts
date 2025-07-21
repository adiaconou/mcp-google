/**
 * Test Factory Functions
 * 
 * Provides factory functions to create common test data and mock objects,
 * reducing duplication and complexity across test files.
 */

import { GmailMessage } from '../../src/services/gmail/gmailClient';
import { CalendarEvent } from '../../src/types/mcp';

// Mock Data Factories
export const mockFactories = {
  /**
   * Creates a mock Gmail message with sensible defaults
   */
  gmailMessage(overrides: Partial<GmailMessage> = {}): GmailMessage {
    return {
      id: 'msg-123',
      threadId: 'thread-123',
      snippet: 'Test message snippet',
      subject: 'Test Subject',
      from: 'test@example.com',
      date: '2024-01-01T10:00:00Z',
      isRead: true,
      labels: ['INBOX'],
      ...overrides
    };
  },

  /**
   * Creates a mock Calendar event with sensible defaults
   */
  calendarEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
    return {
      id: 'event-123',
      summary: 'Test Event',
      description: 'Test event description',
      start: { dateTime: '2024-01-01T10:00:00Z' },
      end: { dateTime: '2024-01-01T11:00:00Z' },
      attendees: [],
      ...overrides
    };
  },

  /**
   * Creates mock Google API response data
   */
  googleApiResponse(data: any) {
    return { data };
  },

  /**
   * Creates mock error objects
   */
  apiError(code: number = 400, message: string = 'API Error') {
    return { code, message };
  }
};

// Mock Setup Utilities
export const mockSetup = {
  /**
   * Sets up OAuth manager mock with common patterns
   */
  oauthManager() {
    const mockOAuth2Client = {
      setCredentials: jest.fn()
    };

    return {
      mockOAuth2Client,
      mockOAuthManager: {
        instance: {
          getOAuth2Client: jest.fn().mockResolvedValue(mockOAuth2Client),
          ensureScopes: jest.fn().mockResolvedValue(undefined)
        }
      }
    };
  },

  /**
   * Sets up Google API mocks with common structure
   */
  googleApis() {
    return {
      calendar: {
        events: {
          list: jest.fn(),
          insert: jest.fn(),
          get: jest.fn(),
          update: jest.fn(),
          delete: jest.fn()
        }
      },
      gmail: {
        users: {
          messages: {
            list: jest.fn(),
            get: jest.fn(),
            send: jest.fn(),
            attachments: {
              get: jest.fn()
            }
          }
        }
      },
      drive: {
        files: {
          list: jest.fn(),
          get: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn()
        }
      },
      sheets: {
        spreadsheets: {
          create: jest.fn(),
          get: jest.fn(),
          values: {
            get: jest.fn(),
            update: jest.fn(),
            batchUpdate: jest.fn()
          },
          batchUpdate: jest.fn()
        }
      }
    };
  },

  /**
   * Sets up console mocks to suppress logs during tests
   */
  consoleMocks() {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    return {
      logSpy,
      errorSpy,
      warnSpy,
      restore: () => {
        console.log = originalLog;
        console.error = originalError;
        console.warn = originalWarn;
      }
    };
  }
};

// Test Assertion Helpers
export const testHelpers = {
  /**
   * Asserts that a tool result is successful
   */
  expectSuccessResult(result: any) {
    expect(result.isError).toBe(false);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    return result.content[0].text;
  },

  /**
   * Asserts that a tool result is an error
   */
  expectErrorResult(result: any, errorMessage?: string) {
    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    if (errorMessage) {
      expect(result.content[0].text).toContain(errorMessage);
    }
    return result.content[0].text;
  },

  /**
   * Creates a mock function that resolves with given data
   */
  mockResolve(data: any) {
    return jest.fn().mockResolvedValue(data);
  },

  /**
   * Creates a mock function that rejects with given error
   */
  mockReject(error: any) {
    return jest.fn().mockRejectedValue(error);
  }
};

// Common Test Patterns
export const testPatterns = {
  /**
   * Standard beforeEach setup for client tests
   */
  clientTestSetup(clientInstance: any, resetMethod?: string) {
    return () => {
      if (resetMethod && typeof clientInstance[resetMethod] === 'function') {
        clientInstance[resetMethod]();
      }
      jest.clearAllMocks();
    };
  },

  /**
   * Standard afterEach cleanup
   */
  testCleanup() {
    return () => {
      jest.clearAllMocks();
      jest.restoreAllMocks();
    };
  }
};
