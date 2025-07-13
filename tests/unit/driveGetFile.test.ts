/**
 * Unit tests for Drive Get File Tool
 * 
 * Tests the drive_get_file MCP tool functionality with mocked dependencies.
 */

import { driveGetFileTool } from '../../src/services/drive/tools/getFile';
import { driveClient } from '../../src/services/drive/driveClient';
import { documentParser } from '../../src/utils/documentParser';

// Mock the drive client
jest.mock('../../src/services/drive/driveClient');

// Mock the document parser
jest.mock('../../src/utils/documentParser');

describe('Drive Get File Tool', () => {
  const mockDriveClient = {
    getFile: jest.fn(),
    downloadFileBuffer: jest.fn()
  };

  const mockDocumentParser = {
    isSupported: jest.fn(),
    extractFromFile: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (driveClient as any).instance = mockDriveClient;
    (documentParser as any).instance = mockDocumentParser;
  });

  describe('Tool Definition', () => {
    it('should have correct tool name', () => {
      expect(driveGetFileTool.name).toBe('drive_get_file');
    });

    it('should have proper description', () => {
      expect(driveGetFileTool.description).toContain('Get Google Drive file metadata');
    });

    it('should require fileId parameter', () => {
      expect(driveGetFileTool.inputSchema.required).toContain('fileId');
    });

    it('should have optional includeContent and maxContentSize parameters', () => {
      const properties = driveGetFileTool.inputSchema.properties;
      expect(properties?.fileId).toBeDefined();
      expect(properties?.includeContent).toBeDefined();
      expect(properties?.maxContentSize).toBeDefined();
    });
  });

  describe('Handler Function', () => {
    const mockFile = {
      id: 'test-file-id',
      name: 'test-document.txt',
      mimeType: 'text/plain',
      size: 1024,
      modifiedTime: '2024-01-15T10:30:00.000Z',
      createdTime: '2024-01-10T09:00:00.000Z',
      parents: ['parent-folder-id'],
      webViewLink: 'https://drive.google.com/file/d/test-file-id/view'
    };

    it('should retrieve file metadata successfully', async () => {
      mockDriveClient.getFile.mockResolvedValue(mockFile);

      const result = await driveGetFileTool.handler({
        fileId: 'test-file-id'
      });

      expect(mockDriveClient.getFile).toHaveBeenCalledWith('test-file-id', false, 1048576);
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('test-document.txt');
      expect(result.content[0].text).toContain('test-file-id');
      expect(result.content[0].text).toContain('text/plain');
      expect(result.content[0].text).toContain('1 KB');
    });

    it('should retrieve file with content when requested', async () => {
      const mockFileWithContent = {
        ...mockFile,
        content: 'This is the file content'
      };
      mockDriveClient.getFile.mockResolvedValue(mockFileWithContent);

      const result = await driveGetFileTool.handler({
        fileId: 'test-file-id',
        includeContent: true,
        maxContentSize: 2048
      });

      expect(mockDriveClient.getFile).toHaveBeenCalledWith('test-file-id', true, 2048);
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('File Content:');
      expect(result.content[0].text).toContain('This is the file content');
    });

    it('should handle large file sizes correctly', async () => {
      const largeFile = {
        ...mockFile,
        size: 5242880 // 5MB
      };
      mockDriveClient.getFile.mockResolvedValue(largeFile);

      const result = await driveGetFileTool.handler({
        fileId: 'test-file-id'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('5 MB');
      expect(result.content[0].text).toContain('5,242,880 bytes');
    });

    it('should handle files without size information', async () => {
      const fileWithoutSize = {
        ...mockFile,
        size: undefined
      };
      mockDriveClient.getFile.mockResolvedValue(fileWithoutSize);

      const result = await driveGetFileTool.handler({
        fileId: 'test-file-id'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).not.toContain('Size:');
    });

    it('should validate maxContentSize parameter', async () => {
      mockDriveClient.getFile.mockResolvedValue(mockFile);

      // Test minimum boundary
      await driveGetFileTool.handler({
        fileId: 'test-file-id',
        includeContent: true,
        maxContentSize: 500 // Below minimum
      });

      expect(mockDriveClient.getFile).toHaveBeenCalledWith('test-file-id', true, 1024);

      // Test maximum boundary
      await driveGetFileTool.handler({
        fileId: 'test-file-id',
        includeContent: true,
        maxContentSize: 20971520 // Above maximum
      });

      expect(mockDriveClient.getFile).toHaveBeenCalledWith('test-file-id', true, 10485760);
    });

    it('should return error for missing fileId', async () => {
      const result = await driveGetFileTool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('File ID is required');
      expect(mockDriveClient.getFile).not.toHaveBeenCalled();
    });

    it('should return error for invalid fileId type', async () => {
      const result = await driveGetFileTool.handler({
        fileId: 123
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('File ID is required and must be a string');
      expect(mockDriveClient.getFile).not.toHaveBeenCalled();
    });

    it('should handle file not found error', async () => {
      const error = new Error('File not found');
      mockDriveClient.getFile.mockRejectedValue(error);

      const result = await driveGetFileTool.handler({
        fileId: 'non-existent-file'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('File not found');
      expect(result.content[0].text).toContain('non-existent-file');
    });

    it('should handle 404 error', async () => {
      const error = new Error('Request failed with status code 404');
      mockDriveClient.getFile.mockRejectedValue(error);

      const result = await driveGetFileTool.handler({
        fileId: 'invalid-file-id'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('File not found');
      expect(result.content[0].text).toContain('invalid-file-id');
    });

    it('should handle permission error', async () => {
      const error = new Error('Insufficient permissions for Drive access');
      mockDriveClient.getFile.mockRejectedValue(error);

      const result = await driveGetFileTool.handler({
        fileId: 'restricted-file'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Insufficient permissions');
      expect(result.content[0].text).toContain('OAuth scopes');
    });

    it('should handle 403 error', async () => {
      const error = new Error('Request failed with status code 403');
      mockDriveClient.getFile.mockRejectedValue(error);

      const result = await driveGetFileTool.handler({
        fileId: 'forbidden-file'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Insufficient permissions');
    });

    it('should handle authentication error', async () => {
      const error = new Error('Authentication failed');
      mockDriveClient.getFile.mockRejectedValue(error);

      const result = await driveGetFileTool.handler({
        fileId: 'test-file'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Authentication failed');
      expect(result.content[0].text).toContain('re-authenticate');
    });

    it('should handle 401 error', async () => {
      const error = new Error('Request failed with status code 401');
      mockDriveClient.getFile.mockRejectedValue(error);

      const result = await driveGetFileTool.handler({
        fileId: 'test-file'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Authentication failed');
    });

    it('should handle rate limit error', async () => {
      const error = new Error('Rate limit exceeded');
      mockDriveClient.getFile.mockRejectedValue(error);

      const result = await driveGetFileTool.handler({
        fileId: 'test-file'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Rate limit exceeded');
      expect(result.content[0].text).toContain('try again');
    });

    it('should handle 429 error', async () => {
      const error = new Error('Request failed with status code 429');
      mockDriveClient.getFile.mockRejectedValue(error);

      const result = await driveGetFileTool.handler({
        fileId: 'test-file'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Rate limit exceeded');
    });

    it('should handle generic errors', async () => {
      const error = new Error('Network connection failed');
      mockDriveClient.getFile.mockRejectedValue(error);

      const result = await driveGetFileTool.handler({
        fileId: 'test-file'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Network connection failed');
    });

    it('should handle non-Error objects', async () => {
      mockDriveClient.getFile.mockRejectedValue('String error');

      const result = await driveGetFileTool.handler({
        fileId: 'test-file'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown error occurred');
    });

    it('should show note when content requested but not available', async () => {
      mockDriveClient.getFile.mockResolvedValue(mockFile); // No content property
      mockDocumentParser.isSupported.mockReturnValue(false); // Not a supported document type

      const result = await driveGetFileTool.handler({
        fileId: 'test-file-id',
        includeContent: true
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Content was requested but could not be retrieved');
    });

    it('should show note for non-text files when content requested', async () => {
      const binaryFile = {
        ...mockFile,
        mimeType: 'image/jpeg'
      };
      mockDriveClient.getFile.mockResolvedValue(binaryFile);
      mockDocumentParser.isSupported.mockReturnValue(false); // Not a supported document type

      const result = await driveGetFileTool.handler({
        fileId: 'test-file-id',
        includeContent: true
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Content extraction is only supported for text files, PDFs, and DOCX documents');
    });

    it('should format dates correctly', async () => {
      mockDriveClient.getFile.mockResolvedValue(mockFile);

      const result = await driveGetFileTool.handler({
        fileId: 'test-file-id'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Created:');
      expect(result.content[0].text).toContain('Modified:');
    });

    it('should handle files without dates', async () => {
      const fileWithoutDates = {
        ...mockFile,
        createdTime: undefined,
        modifiedTime: undefined
      };
      mockDriveClient.getFile.mockResolvedValue(fileWithoutDates);

      const result = await driveGetFileTool.handler({
        fileId: 'test-file-id'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).not.toContain('Created:');
      expect(result.content[0].text).not.toContain('Modified:');
    });

    it('should handle files without parent folders', async () => {
      const fileWithoutParents = {
        ...mockFile,
        parents: undefined
      };
      mockDriveClient.getFile.mockResolvedValue(fileWithoutParents);

      const result = await driveGetFileTool.handler({
        fileId: 'test-file-id'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).not.toContain('Parent Folder ID:');
    });

    it('should handle files without web view link', async () => {
      const fileWithoutLink = {
        ...mockFile,
        webViewLink: undefined
      };
      mockDriveClient.getFile.mockResolvedValue(fileWithoutLink);

      const result = await driveGetFileTool.handler({
        fileId: 'test-file-id'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).not.toContain('View Link:');
    });
  });
});
