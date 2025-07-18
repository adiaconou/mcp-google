/**
 * Drive Upload File Tool Tests
 * 
 * Unit tests for the drive_upload_file MCP tool, testing file upload functionality
 * with mocked Google Drive API calls and various error scenarios.
 */

import { driveUploadFileTool } from '../../src/services/drive/tools/uploadFile';
import { driveClient } from '../../src/services/drive/driveClient';

// Mock the drive client
jest.mock('../../src/services/drive/driveClient', () => ({
  driveClient: {
    instance: {
      uploadFile: jest.fn()
    }
  }
}));

describe('Drive Upload File Tool', () => {
  const mockDriveClient = driveClient.instance as jest.Mocked<typeof driveClient.instance>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Tool Definition', () => {
    it('should have correct tool metadata', () => {
      expect(driveUploadFileTool.name).toBe('drive_upload_file');
      expect(driveUploadFileTool.description).toBe('Upload a file to Google Drive');
      expect(driveUploadFileTool.inputSchema.type).toBe('object');
      expect(driveUploadFileTool.inputSchema.required).toEqual(['filePath']);
    });

    it('should have correct input schema properties', () => {
      const properties = driveUploadFileTool.inputSchema.properties;
      expect(properties).toHaveProperty('filePath');
      expect(properties).toHaveProperty('fileName');
      expect(properties).toHaveProperty('folderId');
      expect(properties).toHaveProperty('description');
      
      expect(properties!.filePath).toEqual({
        type: 'string',
        description: 'Local file path to upload'
      });
    });
  });

  describe('File Upload', () => {
    it('should upload file successfully with minimal parameters', async () => {
      const mockFile = {
        id: 'file123',
        name: 'test.txt',
        mimeType: 'text/plain',
        size: 1024,
        createdTime: '2024-01-01T12:00:00Z',
        webViewLink: 'https://drive.google.com/file/d/file123/view'
      };

      mockDriveClient.uploadFile.mockResolvedValue(mockFile);

      const result = await driveUploadFileTool.handler({
        filePath: '/path/to/test.txt'
      });

      expect(mockDriveClient.uploadFile).toHaveBeenCalledWith({
        filePath: '/path/to/test.txt'
      });

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('📤 **File Uploaded Successfully**');
      expect(result.content[0].text).toContain('test.txt');
      expect(result.content[0].text).toContain('file123');
    });

    it('should upload file with all optional parameters', async () => {
      const mockFile = {
        id: 'file456',
        name: 'custom-name.pdf',
        mimeType: 'application/pdf',
        size: 2048,
        createdTime: '2024-01-01T12:00:00Z',
        webViewLink: 'https://drive.google.com/file/d/file456/view',
        parents: ['folder123']
      };

      mockDriveClient.uploadFile.mockResolvedValue(mockFile);

      const result = await driveUploadFileTool.handler({
        filePath: '/path/to/document.pdf',
        fileName: 'custom-name.pdf',
        folderId: 'folder123',
        description: 'Test document'
      });

      expect(mockDriveClient.uploadFile).toHaveBeenCalledWith({
        filePath: '/path/to/document.pdf',
        fileName: 'custom-name.pdf',
        folderId: 'folder123',
        description: 'Test document'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('custom-name.pdf');
      expect(result.content[0].text).toContain('Parent Folder: folder123');
    });

    it('should handle file without size information', async () => {
      const mockFile = {
        id: 'file789',
        name: 'no-size.txt',
        mimeType: 'text/plain',
        createdTime: '2024-01-01T12:00:00Z',
        webViewLink: 'https://drive.google.com/file/d/file789/view'
      };

      mockDriveClient.uploadFile.mockResolvedValue(mockFile);

      const result = await driveUploadFileTool.handler({
        filePath: '/path/to/no-size.txt'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('no-size.txt');
      expect(result.content[0].text).not.toContain('Size:');
    });

    it('should trim whitespace from parameters', async () => {
      const mockFile = {
        id: 'file999',
        name: 'trimmed.txt',
        mimeType: 'text/plain',
        size: 512,
        createdTime: '2024-01-01T12:00:00Z'
      };

      mockDriveClient.uploadFile.mockResolvedValue(mockFile);

      await driveUploadFileTool.handler({
        filePath: '  /path/to/file.txt  ',
        fileName: '  trimmed.txt  ',
        folderId: '  folder456  ',
        description: '  Test description  '
      });

      expect(mockDriveClient.uploadFile).toHaveBeenCalledWith({
        filePath: '/path/to/file.txt',
        fileName: 'trimmed.txt',
        folderId: 'folder456',
        description: 'Test description'
      });
    });

    it('should exclude empty optional parameters', async () => {
      const mockFile = {
        id: 'file111',
        name: 'test.txt',
        mimeType: 'text/plain',
        size: 256,
        createdTime: '2024-01-01T12:00:00Z'
      };

      mockDriveClient.uploadFile.mockResolvedValue(mockFile);

      await driveUploadFileTool.handler({
        filePath: '/path/to/test.txt',
        fileName: '',
        folderId: '   ',
        description: undefined
      });

      expect(mockDriveClient.uploadFile).toHaveBeenCalledWith({
        filePath: '/path/to/test.txt'
      });
    });
  });

  describe('Input Validation', () => {
    it('should return error for missing file path', async () => {
      const result = await driveUploadFileTool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('❌ **Upload Error**');
      expect(result.content[0].text).toContain('File path must be a non-empty string');
      expect(mockDriveClient.uploadFile).not.toHaveBeenCalled();
    });

    it('should return error for empty file path', async () => {
      const result = await driveUploadFileTool.handler({
        filePath: ''
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('File path must be a non-empty string');
      expect(mockDriveClient.uploadFile).not.toHaveBeenCalled();
    });

    it('should return error for whitespace-only file path', async () => {
      const result = await driveUploadFileTool.handler({
        filePath: '   '
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('File path must be a non-empty string');
      expect(mockDriveClient.uploadFile).not.toHaveBeenCalled();
    });

    it('should return error for non-string file path', async () => {
      const result = await driveUploadFileTool.handler({
        filePath: 123
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('File path must be a non-empty string');
      expect(mockDriveClient.uploadFile).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle file not found error', async () => {
      mockDriveClient.uploadFile.mockRejectedValue(new Error('File not found at path'));

      const result = await driveUploadFileTool.handler({
        filePath: '/nonexistent/file.txt'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('❌ **Drive Upload Error**');
      expect(result.content[0].text).toContain('File not found at the specified path');
    });

    it('should handle insufficient permissions error', async () => {
      mockDriveClient.uploadFile.mockRejectedValue(new Error('Insufficient permissions to upload'));

      const result = await driveUploadFileTool.handler({
        filePath: '/path/to/file.txt'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Insufficient permissions to upload to Google Drive');
    });

    it('should handle folder not found error', async () => {
      mockDriveClient.uploadFile.mockRejectedValue(new Error('Folder not found'));

      const result = await driveUploadFileTool.handler({
        filePath: '/path/to/file.txt',
        folderId: 'invalid-folder'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Parent folder not found');
    });

    it('should handle storage quota exceeded error', async () => {
      mockDriveClient.uploadFile.mockRejectedValue(new Error('Storage quota exceeded'));

      const result = await driveUploadFileTool.handler({
        filePath: '/path/to/large-file.txt'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Google Drive storage quota exceeded');
    });

    it('should handle generic errors', async () => {
      mockDriveClient.uploadFile.mockRejectedValue(new Error('Network timeout'));

      const result = await driveUploadFileTool.handler({
        filePath: '/path/to/file.txt'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('❌ **Drive Upload Error**');
      expect(result.content[0].text).toContain('Network timeout');
    });

    it('should handle unknown errors', async () => {
      mockDriveClient.uploadFile.mockRejectedValue('Unknown error');

      const result = await driveUploadFileTool.handler({
        filePath: '/path/to/file.txt'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown error occurred');
    });
  });

  describe('Response Formatting', () => {
    it('should format file size correctly', async () => {
      const testCases = [
        { size: 512, expected: '1 KB' },
        { size: 1024, expected: '1 KB' },
        { size: 1536, expected: '2 KB' },
        { size: 2048, expected: '2 KB' },
        { size: 100, expected: '< 1 KB' }
      ];

      for (const testCase of testCases) {
        const mockFile = {
          id: 'file123',
          name: 'test.txt',
          mimeType: 'text/plain',
          size: testCase.size,
          createdTime: '2024-01-01T12:00:00Z'
        };

        mockDriveClient.uploadFile.mockResolvedValue(mockFile);

        const result = await driveUploadFileTool.handler({
          filePath: '/path/to/test.txt'
        });

        expect(result.content[0].text).toContain(`Size: ${testCase.expected}`);
      }
    });

    it('should format creation time correctly', async () => {
      const mockFile = {
        id: 'file123',
        name: 'test.txt',
        mimeType: 'text/plain',
        size: 1024,
        createdTime: '2024-01-01T12:00:00Z'
      };

      mockDriveClient.uploadFile.mockResolvedValue(mockFile);

      const result = await driveUploadFileTool.handler({
        filePath: '/path/to/test.txt'
      });

      expect(result.content[0].text).toContain('Created:');
      expect(result.content[0].text).toContain('2024');
    });

    it('should include web view link when available', async () => {
      const mockFile = {
        id: 'file123',
        name: 'test.txt',
        mimeType: 'text/plain',
        size: 1024,
        createdTime: '2024-01-01T12:00:00Z',
        webViewLink: 'https://drive.google.com/file/d/file123/view'
      };

      mockDriveClient.uploadFile.mockResolvedValue(mockFile);

      const result = await driveUploadFileTool.handler({
        filePath: '/path/to/test.txt'
      });

      expect(result.content[0].text).toContain('Link: https://drive.google.com/file/d/file123/view');
    });
  });
});
