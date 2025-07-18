/**
 * Integration tests for Drive Upload File Tool
 * 
 * Tests the drive_upload_file MCP tool with mocked Drive API interactions.
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
      uploadFile: jest.fn(),
    },
    reset: jest.fn(),
  },
}));

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn(),
    unlink: jest.fn(),
    access: jest.fn(),
    stat: jest.fn(),
  },
}));

import { driveUploadFileTool } from '../../src/services/drive/tools/uploadFile';
import { oauthManager } from '../../src/auth/oauthManager';
import { driveClient } from '../../src/services/drive/driveClient';
import { CalendarError } from '../../src/types/mcp';
import { promises as fs } from 'fs';

describe('Drive Upload File Integration Tests', () => {
  let testFilePath: string;

  beforeEach(() => {
    jest.clearAllMocks();
    testFilePath = '/tmp/test-file.txt';
    
    // Mock OAuth client
    (oauthManager.instance.getOAuth2Client as jest.Mock).mockResolvedValue({
      credentials: { access_token: 'mock-token' }
    });

    // Mock file system operations
    (fs.access as jest.Mock).mockResolvedValue(undefined);
    (fs.stat as jest.Mock).mockResolvedValue({
      size: 1024,
      isFile: () => true
    });

    // Mock the DriveClient uploadFile method
    (driveClient.instance.uploadFile as jest.Mock).mockResolvedValue({
      id: 'mock-file-id-123',
      name: 'test-file.txt',
      mimeType: 'text/plain',
      size: '1024',
      createdTime: '2024-01-01T12:00:00.000Z',
      modifiedTime: '2024-01-01T12:00:00.000Z',
      webViewLink: 'https://drive.google.com/file/d/mock-file-id-123/view',
      parents: ['root']
    });
  });

  describe('File Upload Operations', () => {
    it('should upload a file successfully', async () => {
      const result = await driveUploadFileTool.handler({
        filePath: testFilePath
      });

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('📤 **File Uploaded Successfully**');
      expect(result.content[0].text).toContain('test-file.txt');
      expect(result.content[0].text).toContain('ID: mock-file-id-123');
      expect(result.content[0].text).toContain('Type: text/plain');
      
      // Verify DriveClient was called with correct parameters
      expect(driveClient.instance.uploadFile).toHaveBeenCalledWith({
        filePath: testFilePath
      });
    });

    it('should upload file with custom name', async () => {
      const customName = 'custom-upload.txt';
      
      const result = await driveUploadFileTool.handler({
        filePath: testFilePath,
        fileName: customName
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('test-file.txt');
      expect(result.content[0].text).toContain('📤 **File Uploaded Successfully**');
      
      // Verify DriveClient was called with custom name
      expect(driveClient.instance.uploadFile).toHaveBeenCalledWith({
        filePath: testFilePath,
        fileName: customName
      });
    });

    it('should upload file with description', async () => {
      const description = 'Integration test file upload';
      
      const result = await driveUploadFileTool.handler({
        filePath: testFilePath,
        description: description
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('📤 **File Uploaded Successfully**');
      
      // Verify DriveClient was called with description
      expect(driveClient.instance.uploadFile).toHaveBeenCalledWith({
        filePath: testFilePath,
        description: description
      });
    });

    it('should upload file to specific folder', async () => {
      const folderId = 'mock-folder-id-456';
      
      const result = await driveUploadFileTool.handler({
        filePath: testFilePath,
        folderId: folderId
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('📤 **File Uploaded Successfully**');
      
      // Verify DriveClient was called with folder ID
      expect(driveClient.instance.uploadFile).toHaveBeenCalledWith({
        filePath: testFilePath,
        folderId: folderId
      });
    });

    it('should handle file not found error', async () => {
      // Mock DriveClient to throw a file not found error
      (driveClient.instance.uploadFile as jest.Mock).mockRejectedValueOnce(
        new Error('File not found at the specified path')
      );
      
      const result = await driveUploadFileTool.handler({
        filePath: '/non-existent/file.txt'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('❌ **Drive Upload Error**');
      expect(result.content[0].text).toContain('File not found');
    });

    it('should handle invalid folder ID', async () => {
      // Mock DriveClient to throw an error for invalid folder ID
      (driveClient.instance.uploadFile as jest.Mock).mockRejectedValueOnce(
        new CalendarError('Drive resource not found', -32003)
      );

      const result = await driveUploadFileTool.handler({
        filePath: testFilePath,
        folderId: 'invalid-folder-id-12345'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('❌ **Drive Upload Error**');
      expect(result.content[0].text).toContain('Drive resource not found');
    });

    it('should handle authentication errors gracefully', async () => {
      // Mock DriveClient to throw an authentication error
      (driveClient.instance.uploadFile as jest.Mock).mockRejectedValueOnce(
        new CalendarError('Authentication failed', -32000)
      );

      const result = await driveUploadFileTool.handler({
        filePath: testFilePath
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('❌ **Drive Upload Error**');
      expect(result.content[0].text).toContain('Authentication failed');
    });

    it('should handle network errors gracefully', async () => {
      // Mock DriveClient to throw a network error
      (driveClient.instance.uploadFile as jest.Mock).mockRejectedValueOnce(
        new Error('Network error: ECONNREFUSED')
      );

      const result = await driveUploadFileTool.handler({
        filePath: testFilePath
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('❌ **Drive Upload Error**');
      expect(result.content[0].text).toContain('Network error: ECONNREFUSED');
    });
  });

  describe('File Size and Type Handling', () => {
    it('should handle small text files', async () => {
      // Mock small file size
      (fs.stat as jest.Mock).mockResolvedValueOnce({
        size: 100,
        isFile: () => true
      });

      const result = await driveUploadFileTool.handler({
        filePath: testFilePath
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Size: 1 KB');
    });

    it('should handle larger text files', async () => {
      // Mock larger file size
      (fs.stat as jest.Mock).mockResolvedValueOnce({
        size: 5000,
        isFile: () => true
      });

      // Update mock response for larger file
      (driveClient.instance.uploadFile as jest.Mock).mockResolvedValueOnce({
        id: 'mock-file-id-123',
        name: 'large-file.txt',
        mimeType: 'text/plain',
        size: '5000',
        createdTime: '2024-01-01T12:00:00.000Z',
        modifiedTime: '2024-01-01T12:00:00.000Z',
        webViewLink: 'https://drive.google.com/file/d/mock-file-id-123/view',
        parents: ['root']
      });

      const result = await driveUploadFileTool.handler({
        filePath: testFilePath
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Size: 5 KB');
    });
  });

  describe('Response Format Validation', () => {
    it('should include all expected metadata in response', async () => {
      const result = await driveUploadFileTool.handler({
        filePath: testFilePath
      });

      expect(result.isError).toBe(false);
      
      const responseText = result.content[0].text;
      expect(responseText).toContain('📤 **File Uploaded Successfully**');
      expect(responseText).toContain('ID: mock-file-id-123');
      expect(responseText).toContain('Type: text/plain');
      expect(responseText).toContain('Size: 1 KB');
      expect(responseText).toContain('Created:');
      expect(responseText).toContain('Link: https://drive.google.com/file/d/mock-file-id-123/view');
    });

    it('should format timestamps correctly', async () => {
      const result = await driveUploadFileTool.handler({
        filePath: testFilePath
      });

      expect(result.isError).toBe(false);
      
      const responseText = result.content[0].text;
      expect(responseText).toMatch(/Created:.*2024/); // Should contain year
    });

    it('should include Google Drive link', async () => {
      const result = await driveUploadFileTool.handler({
        filePath: testFilePath
      });

      expect(result.isError).toBe(false);
      
      const responseText = result.content[0].text;
      expect(responseText).toContain('Link: https://drive.google.com');
    });
  });

  describe('Input Validation', () => {
    it('should reject missing file path', async () => {
      const result = await driveUploadFileTool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('File path must be a non-empty string');
    });

    it('should reject empty file path', async () => {
      const result = await driveUploadFileTool.handler({
        filePath: ''
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('File path must be a non-empty string');
    });

    it('should reject non-string file path', async () => {
      const result = await driveUploadFileTool.handler({
        filePath: 123
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('File path must be a non-empty string');
    });
  });

  describe('Tool Registration', () => {
    it('should have correct tool definition', () => {
      expect(driveUploadFileTool.name).toBe('drive_upload_file');
      expect(driveUploadFileTool.description).toContain('Upload a file to Google Drive');
      expect(driveUploadFileTool.inputSchema).toBeDefined();
      expect(driveUploadFileTool.inputSchema.required).toContain('filePath');
      expect(driveUploadFileTool.handler).toBeDefined();
    });

    it('should have proper input schema', () => {
      const schema = driveUploadFileTool.inputSchema;
      expect(schema.type).toBe('object');
      expect(schema.properties).toHaveProperty('filePath');
      expect(schema.properties).toHaveProperty('fileName');
      expect(schema.properties).toHaveProperty('description');
      expect(schema.properties).toHaveProperty('folderId');
      
      const filePathProp = schema.properties?.filePath;
      expect(filePathProp?.type).toBe('string');
      
      const fileNameProp = schema.properties?.fileName;
      expect(fileNameProp?.type).toBe('string');
      
      const descriptionProp = schema.properties?.description;
      expect(descriptionProp?.type).toBe('string');
      
      const folderIdProp = schema.properties?.folderId;
      expect(folderIdProp?.type).toBe('string');
    });
  });
});
