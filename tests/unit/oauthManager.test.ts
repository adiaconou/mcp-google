/**
 * OAuth Manager Tests
 * 
 * Unit tests for the OAuth manager functionality
 */

import { OAuthManager } from '../../src/auth/oauthManager';
import { CalendarError, MCPErrorCode } from '../../src/types/mcp';

// Mock environment variables
const mockEnv = {
  GOOGLE_CLIENT_ID: 'test-client-id',
  GOOGLE_CLIENT_SECRET: 'test-client-secret',
  GOOGLE_REDIRECT_URI: 'http://localhost:8080/auth/callback'
};

describe('OAuthManager', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let oauthManager: OAuthManager | undefined;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Set mock environment variables
    Object.assign(process.env, mockEnv);
    
    // Reset oauth manager
    oauthManager = undefined;
    
    // Mock console.log to reduce test noise
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    // Cleanup OAuth manager if it exists
    if (oauthManager) {
      oauthManager.cleanup();
    }
    
    // Restore console.log
    consoleLogSpy.mockRestore();
    
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Constructor', () => {
    it('should create OAuth manager with valid environment variables', () => {
      expect(() => new OAuthManager()).not.toThrow();
    });

    it('should throw CalendarError when GOOGLE_CLIENT_ID is missing', () => {
      delete process.env.GOOGLE_CLIENT_ID;
      
      expect(() => new OAuthManager()).toThrow(CalendarError);
      expect(() => new OAuthManager()).toThrow('Missing required OAuth credentials');
    });

    it('should throw CalendarError when GOOGLE_CLIENT_SECRET is missing', () => {
      delete process.env.GOOGLE_CLIENT_SECRET;
      
      expect(() => new OAuthManager()).toThrow(CalendarError);
      expect(() => new OAuthManager()).toThrow('Missing required OAuth credentials');
    });

    it('should use default redirect URI when not provided', () => {
      delete process.env.GOOGLE_REDIRECT_URI;
      
      expect(() => new OAuthManager()).not.toThrow();
    });
  });

  describe('getAuthorizationUrl', () => {
    it('should generate authorization URL with expanded scopes', async () => {
      const oauthManager = new OAuthManager();
      const authUrl = await oauthManager.getAuthorizationUrl();
      
      expect(authUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(authUrl).toContain('client_id=test-client-id');
      expect(authUrl).toContain('scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar'); // URL encoded
      expect(authUrl).toContain('calendar.events'); // Should include events scope
      expect(authUrl).toContain('access_type=offline');
      expect(authUrl).toContain('prompt=consent');
      expect(authUrl).toContain('state=');
      expect(authUrl).toContain('code_challenge=');
    });

    it('should generate different state and challenge each time', async () => {
      const oauthManager = new OAuthManager();
      
      const authUrl1 = await oauthManager.getAuthorizationUrl();
      const authUrl2 = await oauthManager.getAuthorizationUrl();
      
      expect(authUrl1).not.toEqual(authUrl2);
      
      // Extract state parameters
      const state1 = new URL(authUrl1).searchParams.get('state');
      const state2 = new URL(authUrl2).searchParams.get('state');
      
      expect(state1).not.toEqual(state2);
    });
  });

  describe('isAuthenticated', () => {
    it('should return false when no tokens exist', async () => {
      const oauthManager = new OAuthManager();
      const isAuth = await oauthManager.isAuthenticated();
      
      expect(isAuth).toBe(false);
    });
  });

  describe('getAuthStatus', () => {
    it('should return correct status when not authenticated', async () => {
      const oauthManager = new OAuthManager();
      const status = await oauthManager.getAuthStatus();
      
      expect(status).toEqual({
        isAuthenticated: false,
        hasTokens: false
      });
    });
  });

  describe('getAccessToken', () => {
    it('should throw CalendarError when not authenticated', async () => {
      const oauthManager = new OAuthManager();
      
      await expect(oauthManager.getAccessToken()).rejects.toThrow(CalendarError);
      await expect(oauthManager.getAccessToken()).rejects.toThrow('No authentication tokens found');
    });
  });

  describe('getOAuth2Client', () => {
    it('should throw CalendarError when not authenticated', async () => {
      const oauthManager = new OAuthManager();
      
      await expect(oauthManager.getOAuth2Client()).rejects.toThrow(CalendarError);
      await expect(oauthManager.getOAuth2Client()).rejects.toThrow('Not authenticated');
    });
  });

  describe('clearTokens', () => {
    it('should not throw when no tokens exist', async () => {
      const oauthManager = new OAuthManager();
      
      await expect(oauthManager.clearTokens()).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should create CalendarError with correct properties', () => {
      const error = new CalendarError('Test error', MCPErrorCode.AuthenticationError, { test: 'data' });
      
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(MCPErrorCode.AuthenticationError);
      expect(error.data).toEqual({ test: 'data' });
      expect(error.name).toBe('CalendarError');
    });

    it('should convert CalendarError to MCP error format', () => {
      const error = new CalendarError('Test error', MCPErrorCode.AuthenticationError, { test: 'data' });
      const mcpError = error.toMCPError();
      
      expect(mcpError).toEqual({
        code: MCPErrorCode.AuthenticationError,
        message: 'Test error',
        data: { test: 'data' }
      });
    });
  });
});
