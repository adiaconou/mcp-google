/**
 * Unit tests for Drive Move File Tool
 * 
 * Tests the drive_move_file tool functionality including parameter validation,
 * successful file moves, error handling, and edge cases.
 */

import { driveMoveFileTool } from '../../src/services/drive/tools/moveFile';
import { driveClient } from '../../src/services/drive/driveClient';

// Mock the drive client
jest.mock('../../src/services/drive/driveClient', () => ({
  driveClient: {
    instance: {
      moveFile: jest.fn()
    }
  }
}));

describe('Drive Move File Tool', () => {
  const mockDriveClient = driveClient.instance as jest.Mocked<typeof driveClient.instance>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Parameter Validation', () => {
    it('should reject empty file ID', async () => {
      const result = await driveMoveFileTool.handler({
        fileId: '',
        targetFolderId: 'folder123'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('File ID must be a non-empty string');
    });

    it('should reject missing file ID', async () => {
      const result = await driveMoveFileTool.handler({
        targetFolderId: 'folder123'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('File ID must be a non-empty string');
    });

    it('should reject empty target folder ID', async () => {
      const result = await driveMoveFileTool.handler({
        fileId: 'file123',
        targetFolderId: ''
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Target folder ID must be a non-empty string');
    });

    it('should reject missing target folder ID', async () => {
      const result = await driveMoveFileTool.handler({
        fileId: 'file123'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Target folder ID must be a non-empty string');
    });

    it('should accept valid parameters without new name', async () => {
      const mockFile = {
        id: 'file123',
        name: 'test-file.txt',
        mimeType: 'text/plain',
        size: 1024,
        modifiedTime: '2024-01-15T10:30:00Z',
        webViewLink: 'https://drive.google.com/file/d/file123/view',
        parents: ['folder123']
      };

      mockDriveClient.moveFile.mockResolvedValue(mockFile);

      const result = await driveMoveFileTool.handler({
        fileId: 'file123',
        targetFolderId: 'folder123'
      });

      expect(result.isError).toBe(false);
      expect(mockDriveClient.moveFile).toHaveBeenCalledWith('file123', 'folder123', undefined);
    });

    it('should accept valid parameters with new name', async () => {
      const mockFile = {
        id: 'file123',
        name: 'renamed-file.txt',
        mimeType: 'text/plain',
        size: 1024,
        modifiedTime: '2024-01-15T10:30:00Z',
        webViewLink: 'https://drive.google.com/file/d/file123/view',
        parents: ['folder123']
      };

      mockDriveClient.moveFile.mockResolvedValue(mockFile);

      const result = await driveMoveFileTool.handler({
        fileId: 'file123',
        targetFolderId: 'folder123',
        newName: 'renamed-file.txt'
      });

      expect(result.isError).toBe(false);
      expect(mockDriveClient.moveFile).toHaveBeenCalledWith('file123', 'folder123', 'renamed-file.txt');
    });
  });

  describe('Successful Operations', () => {
    it('should move file successfully without renaming', async () => {
      const mockFile = {
        id: 'file123',
        name: 'document.pdf',
        mimeType: 'application/pdf',
        size: 2048,
        modifiedTime: '2024-01-15T10:30:00Z',
        webViewLink: 'https://drive.google.com/file/d/file123/view',
        parents: ['newfolder456']
      };

      mockDriveClient.moveFile.mockResolvedValue(mockFile);

      const result = await driveMoveFileTool.handler({
        fileId: 'file123',
        targetFolderId: 'newfolder456'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('File Moved Successfully');
      expect(result.content[0].text).toContain('document.pdf');
      expect(result.content[0].text).toContain('file123');
      expect(result.content[0].text).toContain('application/pdf');
      expect(result.content[0].text).toContain('2 KB');
      expect(result.content[0].text).toContain('newfolder456');
      expect(result.content[0].text).toContain('https://drive.google.com/file/d/file123/view');
    });

    it('should move and rename file successfully', async () => {
      const mockFile = {
        id: 'file123',
        name: 'new-document-name.pdf',
        mimeType: 'application/pdf',
        size: 2048,
        modifiedTime: '2024-01-15T10:30:00Z',
        webViewLink: 'https://drive.google.com/file/d/file123/view',
        parents: ['newfolder456']
      };

      mockDriveClient.moveFile.mockResolvedValue(mockFile);

      const result = await driveMoveFileTool.handler({
        fileId: 'file123',
        targetFolderId: 'newfolder456',
        newName: 'new-document-name.pdf'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('File Moved Successfully');
      expect(result.content[0].text).toContain('new-document-name.pdf');
      expect(result.content[0].text).toContain('Renamed to: new-document-name.pdf');
    });

    it('should handle file with minimal metadata', async () => {
      const mockFile = {
        id: 'file123',
        name: 'simple.txt',
        mimeType: 'text/plain'
      };

      mockDriveClient.moveFile.mockResolvedValue(mockFile);

      const result = await driveMoveFileTool.handler({
        fileId: 'file123',
        targetFolderId: 'folder456'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('File Moved Successfully');
      expect(result.content[0].text).toContain('simple.txt');
      expect(result.content[0].text).not.toContain('Size:');
      expect(result.content[0].text).not.toContain('Modified:');
    });

    it('should handle very small files correctly', async () => {
      const mockFile = {
        id: 'file123',
        name: 'tiny.txt',
        mimeType: 'text/plain',
        size: 100
      };

      mockDriveClient.moveFile.mockResolvedValue(mockFile);

      const result = await driveMoveFileTool.handler({
        fileId: 'file123',
        targetFolderId: 'folder456'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('< 1 KB');
    });
  });

  describe('Error Handling', () => {
    it('should handle file not found error', async () => {
      const error = new Error('File not found');
      mockDriveClient.moveFile.mockRejectedValue(error);

      const result = await driveMoveFileTool.handler({
        fileId: 'nonexistent',
        targetFolderId: 'folder123'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Drive Move Error');
      expect(result.content[0].text).toContain('File not found. Please check the file ID.');
    });

    it('should handle folder not found error', async () => {
      const error = new Error('Folder not found');
      mockDriveClient.moveFile.mockRejectedValue(error);

      const result = await driveMoveFileTool.handler({
        fileId: 'file123',
        targetFolderId: 'nonexistent'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Drive Move Error');
      expect(result.content[0].text).toContain('Target folder not found. Please check the folder ID.');
    });

    it('should handle resource not found error', async () => {
      const error = new Error('resource not found');
      mockDriveClient.moveFile.mockRejectedValue(error);

      const result = await driveMoveFileTool.handler({
        fileId: 'file123',
        targetFolderId: 'folder123'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Target folder not found. Please check the folder ID.');
    });

    it('should handle insufficient permissions error', async () => {
      const error = new Error('Insufficient permissions');
      mockDriveClient.moveFile.mockRejectedValue(error);

      const result = await driveMoveFileTool.handler({
        fileId: 'file123',
        targetFolderId: 'folder123'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Drive Move Error');
      expect(result.content[0].text).toContain('Insufficient permissions to move files in Google Drive');
    });

    it('should handle invalid request error', async () => {
      const error = new Error('Invalid request');
      mockDriveClient.moveFile.mockRejectedValue(error);

      const result = await driveMoveFileTool.handler({
        fileId: 'file123',
        targetFolderId: 'folder123'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Drive Move Error');
      expect(result.content[0].text).toContain('Invalid move request. Please check the file and folder IDs.');
    });

    it('should handle generic errors', async () => {
      const error = new Error('Network timeout');
      mockDriveClient.moveFile.mockRejectedValue(error);

      const result = await driveMoveFileTool.handler({
        fileId: 'file123',
        targetFolderId: 'folder123'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Drive Move Error');
      expect(result.content[0].text).toContain('Network timeout');
    });

    it('should handle non-Error objects', async () => {
      mockDriveClient.moveFile.mockRejectedValue('String error');

      const result = await driveMoveFileTool.handler({
        fileId: 'file123',
        targetFolderId: 'folder123'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Drive Move Error');
      expect(result.content[0].text).toContain('Unknown error occurred');
    });
  });

  describe('Tool Definition', () => {
    it('should have correct tool metadata', () => {
      expect(driveMoveFileTool.name).toBe('drive_move_file');
      expect(driveMoveFileTool.description).toBe('Move a file to a different folder in Google Drive');
      expect(driveMoveFileTool.inputSchema.type).toBe('object');
      expect(driveMoveFileTool.inputSchema.required).toEqual(['fileId', 'targetFolderId']);
    });

    it('should have correct input schema properties', () => {
      const properties = driveMoveFileTool.inputSchema.properties as any;
      
      expect(properties.fileId).toEqual({
        type: 'string',
        description: 'ID of the file to move'
      });
      
      expect(properties.targetFolderId).toEqual({
        type: 'string',
        description: 'ID of the target folder to move the file to'
      });
      
      expect(properties.newName).toEqual({
        type: 'string',
        description: 'Optional new name for the file (renames during move)'
      });
    });
  });
});
