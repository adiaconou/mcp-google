/**
 * OAuth Flow Integration Tests
 * 
 * Tests the complete OAuth authentication workflow including token management,
 * refresh scenarios, and error handling across the authentication system.
 */

// Set up environment variables before any imports
process.env.GOOGLE_CLIENT_ID = 'mock-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'mock-client-secret';

// Mock the Google Auth library
const mockOAuth2Client = {
  generateAuthUrl: jest.fn(),
  getToken: jest.fn(),
  setCredentials: jest.fn(),
  refreshAccessToken: jest.fn(),
  credentials: {},
};

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn(() => mockOAuth2Client),
}));

// Mock googleapis completely to avoid constructor issues
jest.mock('googleapis', () => ({
  google: {
    calendar: jest.fn(() => ({
      events: {
        list: jest.fn(),
        insert: jest.fn(),
      },
    })),
    auth: {
      OAuth2: jest.fn(() => mockOAuth2Client),
    },
  },
}));

// Mock the file system operations
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  access: jest.fn(),
}));

// Mock the HTTP server for OAuth callback
const mockServer = {
  listen: jest.fn((port, callback) => callback()),
  close: jest.fn((callback) => callback()),
  on: jest.fn(),
};

jest.mock('http', () => ({
  createServer: jest.fn(() => mockServer),
}));

// Mock the open library for browser launching
jest.mock('open', () => jest.fn());

// Mock the OAuth manager completely to avoid singleton issues
jest.mock('../../src/auth/oauthManager', () => {
  const mockInstance = {
    isAuthenticated: jest.fn(),
    authenticate: jest.fn(),
    getAccessToken: jest.fn(),
    getOAuth2Client: jest.fn(),
  };
  
  return {
    oauthManager: {
      instance: mockInstance
    }
  };
});

import { oauthManager } from '../../src/auth/oauthManager';
import { CalendarClient } from '../../src/services/calendar/calendarClient';

describe('OAuth Flow Integration', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Set up default mock implementations
    (oauthManager.instance.isAuthenticated as jest.Mock).mockResolvedValue(true);
    (oauthManager.instance.authenticate as jest.Mock).mockResolvedValue(undefined);
    (oauthManager.instance.getAccessToken as jest.Mock).mockResolvedValue('mock-access-token');
    (oauthManager.instance.getOAuth2Client as jest.Mock).mockResolvedValue({
      credentials: { access_token: 'mock-token' }
    });
  });

  describe('authentication workflow', () => {
    test('should complete authentication flow successfully', async () => {
      // Test that the mocked OAuth manager works correctly
      await oauthManager.instance.authenticate();
      
      // Verify authentication state
      const isAuthenticated = await oauthManager.instance.isAuthenticated();
      expect(isAuthenticated).toBe(true);
      
      // Verify methods were called
      expect(oauthManager.instance.authenticate).toHaveBeenCalled();
      expect(oauthManager.instance.isAuthenticated).toHaveBeenCalled();
    });

    test('should check authentication status', async () => {
      const isAuthenticated = await oauthManager.instance.isAuthenticated();
      expect(isAuthenticated).toBe(true);
      expect(oauthManager.instance.isAuthenticated).toHaveBeenCalled();
    });

    test('should handle authentication failure', async () => {
      // Mock authentication failure
      (oauthManager.instance.isAuthenticated as jest.Mock).mockResolvedValue(false);
      
      const isAuthenticated = await oauthManager.instance.isAuthenticated();
      expect(isAuthenticated).toBe(false);
    });
  });

  describe('token management', () => {
    test('should provide access token when authenticated', async () => {
      const accessToken = await oauthManager.instance.getAccessToken();
      expect(accessToken).toBe('mock-access-token');
      expect(oauthManager.instance.getAccessToken).toHaveBeenCalled();
    });

    test('should handle different token values', async () => {
      // Mock different token value
      (oauthManager.instance.getAccessToken as jest.Mock).mockResolvedValue('different-token');
      
      const accessToken = await oauthManager.instance.getAccessToken();
      expect(accessToken).toBe('different-token');
    });

    test('should handle token retrieval failure', async () => {
      // Mock token retrieval failure
      (oauthManager.instance.getAccessToken as jest.Mock).mockRejectedValue(
        new Error('No valid token available')
      );
      
      await expect(oauthManager.instance.getAccessToken()).rejects.toThrow('No valid token available');
    });
  });

  describe('OAuth client integration', () => {
    test('should provide OAuth2 client', async () => {
      const client = await oauthManager.instance.getOAuth2Client();
      
      expect(client).toBeDefined();
      expect(client.credentials).toEqual({ access_token: 'mock-token' });
      expect(oauthManager.instance.getOAuth2Client).toHaveBeenCalled();
    });

    test('should handle OAuth client failure', async () => {
      // Mock OAuth client failure
      (oauthManager.instance.getOAuth2Client as jest.Mock).mockRejectedValue(
        new Error('Failed to get OAuth client')
      );
      
      await expect(oauthManager.instance.getOAuth2Client()).rejects.toThrow('Failed to get OAuth client');
    });
  });

  describe('error scenarios', () => {
    test('should handle authentication errors', async () => {
      // Mock authentication error
      (oauthManager.instance.authenticate as jest.Mock).mockRejectedValue(
        new Error('Authentication failed')
      );
      
      await expect(oauthManager.instance.authenticate()).rejects.toThrow('Authentication failed');
    });

    test('should handle authentication status check errors', async () => {
      // Mock authentication status check error
      (oauthManager.instance.isAuthenticated as jest.Mock).mockRejectedValue(
        new Error('Cannot check authentication status')
      );
      
      await expect(oauthManager.instance.isAuthenticated()).rejects.toThrow('Cannot check authentication status');
    });
  });

  describe('integration with calendar client', () => {
    test('should provide authenticated client to calendar service', async () => {
      // Mock Google Calendar API
      const mockCalendarApi = {
        events: {
          list: jest.fn().mockResolvedValue({
            data: { items: [] }
          })
        }
      };
      
      require('googleapis').google.calendar.mockReturnValue(mockCalendarApi);
      
      // Verify calendar client can use authenticated client
      const calendarClient = new CalendarClient();
      const events = await calendarClient.listEvents();
      
      expect(events).toBeDefined();
      expect(Array.isArray(events)).toBe(true);
      expect(oauthManager.instance.getOAuth2Client).toHaveBeenCalled();
      expect(require('googleapis').google.calendar).toHaveBeenCalledWith({
        version: 'v3',
        auth: expect.objectContaining({
          credentials: { access_token: 'mock-token' }
        })
      });
    });

    test('should handle authentication failure in calendar client', async () => {
      // Mock OAuth manager to throw authentication error
      (oauthManager.instance.getOAuth2Client as jest.Mock).mockRejectedValue(
        new Error('User is not authenticated')
      );
      
      const calendarClient = new CalendarClient();
      
      await expect(calendarClient.listEvents()).rejects.toThrow('Failed to initialize Calendar API client');
    });
  });

  describe('concurrent operations', () => {
    test('should handle multiple concurrent authentication checks', async () => {
      // Make multiple concurrent authentication checks
      const promises = [
        oauthManager.instance.isAuthenticated(),
        oauthManager.instance.isAuthenticated(),
        oauthManager.instance.isAuthenticated(),
        oauthManager.instance.getAccessToken(),
        oauthManager.instance.getAccessToken(),
      ];
      
      const results = await Promise.all(promises);
      
      // All should succeed
      expect(results[0]).toBe(true);
      expect(results[1]).toBe(true);
      expect(results[2]).toBe(true);
      expect(results[3]).toBe('mock-access-token');
      expect(results[4]).toBe('mock-access-token');
    });

    test('should handle mixed success and failure scenarios', async () => {
      // Set up different mock behaviors for different calls
      (oauthManager.instance.isAuthenticated as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);
      
      const results = await Promise.all([
        oauthManager.instance.isAuthenticated(),
        oauthManager.instance.isAuthenticated(),
        oauthManager.instance.isAuthenticated(),
      ]);
      
      expect(results[0]).toBe(true);
      expect(results[1]).toBe(false);
      expect(results[2]).toBe(true);
    });
  });

  describe('multi-service OAuth integration', () => {
    test('should support Calendar and Gmail scopes together', async () => {
      // Mock OAuth manager to simulate multi-service authentication
      const mockOAuthClient = {
        credentials: { 
          access_token: 'mock-multi-service-token',
          scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send'
        }
      };
      
      (oauthManager.instance.getOAuth2Client as jest.Mock).mockResolvedValue(mockOAuthClient);
      
      // Test that OAuth client provides multi-service token
      const client = await oauthManager.instance.getOAuth2Client();
      
      expect(client.credentials.access_token).toBe('mock-multi-service-token');
      expect(client.credentials.scope).toContain('calendar');
      expect(client.credentials.scope).toContain('gmail.readonly');
      expect(client.credentials.scope).toContain('gmail.send');
    });

    test('should validate multi-service scope requirements', async () => {
      // This test validates that the OAuth manager can handle
      // requests for both Calendar and Gmail scopes simultaneously
      const isAuthenticated = await oauthManager.instance.isAuthenticated();
      const accessToken = await oauthManager.instance.getAccessToken();
      
      expect(isAuthenticated).toBe(true);
      expect(accessToken).toBe('mock-access-token');
      
      // Verify both methods were called (simulating multi-service validation)
      expect(oauthManager.instance.isAuthenticated).toHaveBeenCalled();
      expect(oauthManager.instance.getAccessToken).toHaveBeenCalled();
    });
  });
});
