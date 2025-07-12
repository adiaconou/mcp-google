/**
 * Drive Client Tests
 * 
 * Unit tests for the Drive client functionality
 */

import { DriveClient } from '../../src/services/drive/driveClient';
import { CalendarError, MCPErrorCode } from '../../src/types/mcp';
import { oauthManager } from '../../src/auth/oauthManager';

// Mock the OAuth manager
jest.mock('../../src/auth/oauthManager', () => ({
  oauthManager: {
    instance: {
      ensureScopes: jest.fn(),
      getOAuth2Client: jest.fn()
    }
  }
}));

// Mock googleapis
jest.mock('googleapis', () => ({
  google: {
    drive: jest.fn()
  }
}));

describe('DriveClient', () => {
  let driveClient: DriveClient;
  let mockOAuthManager: jest.Mocked<typeof oauthManager.instance>;

  beforeEach(() => {
    driveClient = new DriveClient();
    mockOAuthManager = oauthManager.instance as jest.Mocked<typeof oauthManager.instance>;
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create Drive client instance', () => {
      expect(driveClient).toBeInstanceOf(DriveClient);
    });
  });

  describe('listFiles', () => {
    it('should throw CalendarError when not authenticated', async () => {
      // Mock authentication failure
      mockOAuthManager.ensureScopes.mockRejectedValue(new Error('Not authenticated'));

      await expect(driveClient.listFiles()).rejects.toThrow(CalendarError);
      await expect(driveClient.listFiles()).rejects.toThrow('Failed to initialize Drive API client');
    });

    it('should call ensureScopes with Drive scope', async () => {
      // Mock authentication failure to test scope requirement
      mockOAuthManager.ensureScopes.mockRejectedValue(new Error('Not authenticated'));

      try {
        await driveClient.listFiles();
      } catch {
        // Expected to fail
      }

      expect(mockOAuthManager.ensureScopes).toHaveBeenCalledWith([
        'https://www.googleapis.com/auth/drive.file'
      ]);
    });
  });

  describe('getFile', () => {
    it('should throw CalendarError when not authenticated', async () => {
      // Mock authentication failure
      mockOAuthManager.ensureScopes.mockRejectedValue(new Error('Not authenticated'));

      await expect(driveClient.getFile('test-file-id')).rejects.toThrow(CalendarError);
      await expect(driveClient.getFile('test-file-id')).rejects.toThrow('Failed to initialize Drive API client');
    });
  });

  describe('uploadFile', () => {
    it('should throw CalendarError when not authenticated', async () => {
      // Mock authentication failure
      mockOAuthManager.ensureScopes.mockRejectedValue(new Error('Not authenticated'));

      await expect(driveClient.uploadFile({ filePath: '/test/path' })).rejects.toThrow(CalendarError);
      await expect(driveClient.uploadFile({ filePath: '/test/path' })).rejects.toThrow('Failed to initialize Drive API client');
    });
  });

  describe('createFolder', () => {
    it('should throw CalendarError when not authenticated', async () => {
      // Mock authentication failure
      mockOAuthManager.ensureScopes.mockRejectedValue(new Error('Not authenticated'));

      await expect(driveClient.createFolder('Test Folder')).rejects.toThrow(CalendarError);
      await expect(driveClient.createFolder('Test Folder')).rejects.toThrow('Failed to initialize Drive API client');
    });
  });

  describe('Error Handling', () => {
    it('should require Drive scope for initialization', async () => {
      // Mock authentication failure
      mockOAuthManager.ensureScopes.mockRejectedValue(new Error('Missing scope'));

      try {
        await driveClient.listFiles();
      } catch {
        // Expected to fail
      }

      // Verify the correct scope was requested
      expect(mockOAuthManager.ensureScopes).toHaveBeenCalledWith([
        'https://www.googleapis.com/auth/drive.file'
      ]);
    });

    it('should handle authentication errors gracefully', async () => {
      // Mock authentication failure
      mockOAuthManager.ensureScopes.mockRejectedValue(new CalendarError(
        'Authentication failed',
        MCPErrorCode.AuthenticationError
      ));

      await expect(driveClient.listFiles()).rejects.toThrow(CalendarError);
      await expect(driveClient.listFiles()).rejects.toThrow('Failed to initialize Drive API client');
    });
  });
});
