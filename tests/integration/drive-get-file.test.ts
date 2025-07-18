/**
 * Integration tests for Drive Get File Tool
 * 
 * Tests the drive_get_file MCP tool with mocked Drive API interactions.
 */

// Set up environment variables before any imports
process.env.GOOGLE_CLIENT_ID = 'mock-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'mock-client-secret';

// Mock the OAuth manager
jest.mock('../../src/auth/oauthManager', () => ({
  oauthManager: {
    instance: {
      getOAuth2Client: jest.fn(),
      isAuthenticated: jest.fn().mockResolvedValue(true),
      getAccessToken: jest.fn().mockResolvedValue('mock-access-token'),
      ensureScopes: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

// Mock the DriveClient directly
jest.mock('../../src/services/drive/driveClient', () => ({
  driveClient: {
    instance: {
      getFile: jest.fn(),
      uploadFile: jest.fn(),
    },
    reset: jest.fn(),
  },
}));

import { driveGetFileTool } from '../../src/services/drive/tools/getFile';
import { oauthManager } from '../../src/auth/oauthManager';
import { driveClient } from '../../src/services/drive/driveClient';
import { CalendarError } from '../../src/types/mcp';

describe('Drive Get File Integration Tests', () => {
  let testFileId: string;

  beforeEach(() => {
    jest.clearAllMocks();
    testFileId = 'mock-file-id-123';
    
    // Mock OAuth client
    (oauthManager.instance.getOAuth2Client as jest.Mock).mockResolvedValue({
      credentials: { access_token: 'mock-token' }
    });

    // Mock the DriveClient getFile method
    (driveClient.instance.getFile as jest.Mock).mockResolvedValue({
      id: testFileId,
      name: 'drive-get-file-test.txt',
      mimeType: 'text/plain',
      size: '65',
      createdTime: '2024-01-01T12:00:00.000Z',
      modifiedTime: '2024-01-01T12:00:00.000Z',
      content: 'This is a test file for Drive Get File integration testing.\nCreated at: 2024-01-01T12:00:00.000Z'
    });

    // Mock the DriveClient uploadFile method for setup
    (driveClient.instance.uploadFile as jest.Mock).mockResolvedValue({
      id: testFileId,
      name: 'drive-get-file-test.txt'
    });
  });

  describe('Real Drive API Integration', () => {
    it('should retrieve file metadata successfully', async () => {
      const result = await driveGetFileTool.handler({
        fileId: testFileId
      });

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      
      const text = result.content[0].text;
      expect(text).toContain('drive-get-file-test.txt');
      expect(text).toContain(testFileId);
      expect(text).toContain('text/plain');
      expect(text).toContain('File Details:');
      expect(text).toContain('ID:');
      expect(text).toContain('Type:');
      expect(text).toContain('Size:');
      expect(text).toContain('Created:');
      expect(text).toContain('Modified:');
      
      // Verify DriveClient was called with correct parameters
      expect(driveClient.instance.getFile).toHaveBeenCalledWith(
        testFileId,
        false,
        1048576
      );
    });

    it('should retrieve file with content when requested', async () => {
      const result = await driveGetFileTool.handler({
        fileId: testFileId,
        includeContent: true
      });

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      
      const text = result.content[0].text;
      expect(text).toContain('drive-get-file-test.txt');
      expect(text).toContain('File Content:');
      expect(text).toContain('This is a test file for Drive Get File integration testing');
      
      // Verify DriveClient was called with correct parameters
      expect(driveClient.instance.getFile).toHaveBeenCalledWith(
        testFileId,
        true,
        1048576
      );
    });

    it('should handle custom maxContentSize parameter', async () => {
      const result = await driveGetFileTool.handler({
        fileId: testFileId,
        includeContent: true,
        maxContentSize: 2048
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('File Content:');
      
      // Verify DriveClient was called with correct parameters
      expect(driveClient.instance.getFile).toHaveBeenCalledWith(
        testFileId,
        true,
        2048
      );
    });

    it('should handle file without content download', async () => {
      const result = await driveGetFileTool.handler({
        fileId: testFileId,
        includeContent: false
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('drive-get-file-test.txt');
      expect(result.content[0].text).not.toContain('File Content:');
      
      // Verify DriveClient was called with correct parameters
      expect(driveClient.instance.getFile).toHaveBeenCalledWith(
        testFileId,
        false,
        1048576
      );
    });

    it('should handle non-existent file ID', async () => {
      // Mock DriveClient to throw an error for this specific test
      (driveClient.instance.getFile as jest.Mock).mockRejectedValueOnce(
        new CalendarError('Drive resource not found', -32003)
      );

      const result = await driveGetFileTool.handler({
        fileId: 'non-existent-file-id-12345'
      });

      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('Drive Get File Error');
      expect(result.content[0].text).toContain('Drive resource not found');
    });

    it('should handle invalid file ID format', async () => {
      // Mock DriveClient to throw an error for this specific test
      (driveClient.instance.getFile as jest.Mock).mockRejectedValueOnce(
        new CalendarError('Invalid file ID format', -32602)
      );

      const result = await driveGetFileTool.handler({
        fileId: 'invalid-format'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Drive Get File Error');
      expect(result.content[0].text).toContain('Invalid file ID format');
    });

    it('should validate required fileId parameter', async () => {
      const result = await driveGetFileTool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('File ID is required');
    });

    it('should validate fileId parameter type', async () => {
      const result = await driveGetFileTool.handler({
        fileId: 123
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('File ID is required and must be a string');
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors gracefully', async () => {
      // Mock DriveClient to throw an authentication error
      (driveClient.instance.getFile as jest.Mock).mockRejectedValueOnce(
        new CalendarError('Authentication failed', -32000)
      );

      const result = await driveGetFileTool.handler({
        fileId: 'any-file-id'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Drive Get File Error');
      expect(result.content[0].text).toContain('Authentication failed');
    });

    it('should handle network errors gracefully', async () => {
      // Mock DriveClient to throw a network error
      (driveClient.instance.getFile as jest.Mock).mockRejectedValueOnce(
        new Error('Network error: ECONNREFUSED')
      );

      const result = await driveGetFileTool.handler({
        fileId: 'definitely-invalid-file-id-format-that-will-fail'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Drive Get File Error');
      expect(result.content[0].text).toContain('Network error: ECONNREFUSED');
    });
  });

  describe('Tool Registration', () => {
    it('should have correct tool definition', () => {
      expect(driveGetFileTool.name).toBe('drive_get_file');
      expect(driveGetFileTool.description).toContain('Get Google Drive file metadata');
      expect(driveGetFileTool.inputSchema).toBeDefined();
      expect(driveGetFileTool.inputSchema.required).toContain('fileId');
      expect(driveGetFileTool.handler).toBeDefined();
    });

    it('should have proper input schema', () => {
      const schema = driveGetFileTool.inputSchema;
      expect(schema.type).toBe('object');
      expect(schema.properties).toHaveProperty('fileId');
      expect(schema.properties).toHaveProperty('includeContent');
      expect(schema.properties).toHaveProperty('maxContentSize');
      
      const fileIdProp = schema.properties?.fileId;
      expect(fileIdProp?.type).toBe('string');
      
      const includeContentProp = schema.properties?.includeContent;
      expect(includeContentProp?.type).toBe('boolean');
      expect(includeContentProp?.default).toBe(false);
      
      const maxContentSizeProp = schema.properties?.maxContentSize;
      expect(maxContentSizeProp?.type).toBe('number');
      expect(maxContentSizeProp?.minimum).toBe(1024);
      expect(maxContentSizeProp?.maximum).toBe(10485760);
      expect(maxContentSizeProp?.default).toBe(1048576);
    });
  });

  describe('Content Handling', () => {
    it('should handle text files with content download', async () => {
      const result = await driveGetFileTool.handler({
        fileId: testFileId,
        includeContent: true
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('File Content:');
      expect(result.content[0].text).toContain('This is a test file for Drive Get File integration testing');
    });

    it('should handle files without content when not requested', async () => {
      const result = await driveGetFileTool.handler({
        fileId: testFileId,
        includeContent: false
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).not.toContain('File Content:');
    });
  });

  describe('Parameter Validation', () => {
    it('should enforce maxContentSize boundaries', async () => {
      // Test with very small size (should be clamped to minimum)
      const resultSmall = await driveGetFileTool.handler({
        fileId: testFileId,
        includeContent: true,
        maxContentSize: 100 // Below minimum of 1024
      });

      expect(resultSmall.isError).toBe(false);
      
      // Verify the size was clamped to minimum
      expect(driveClient.instance.getFile).toHaveBeenCalledWith(
        testFileId,
        true,
        1024 // Should be clamped to minimum
      );

      // Test with very large size (should be clamped to maximum)
      const resultLarge = await driveGetFileTool.handler({
        fileId: testFileId,
        includeContent: true,
        maxContentSize: 50000000 // Above maximum of 10485760
      });

      expect(resultLarge.isError).toBe(false);
      
      // Verify the size was clamped to maximum
      expect(driveClient.instance.getFile).toHaveBeenCalledWith(
        testFileId,
        true,
        10485760 // Should be clamped to maximum
      );
    });
  });
});
