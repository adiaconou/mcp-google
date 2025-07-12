/**
 * Unit tests for Drive Create Folder Tool
 */

import { driveCreateFolderTool } from '../../src/services/drive/tools/createFolder';
import { driveClient } from '../../src/services/drive/driveClient';

// Mock the drive client
jest.mock('../../src/services/drive/driveClient');

describe('Drive Create Folder Tool', () => {
  const mockDriveClient = {
    createFolder: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (driveClient as any).instance = mockDriveClient;
  });

  describe('Tool Definition', () => {
    it('should have correct tool definition', () => {
      expect(driveCreateFolderTool.name).toBe('drive_create_folder');
      expect(driveCreateFolderTool.description).toBe('Create a new folder in Google Drive');
      expect(driveCreateFolderTool.inputSchema.required).toEqual(['name']);
      expect(driveCreateFolderTool.inputSchema.properties?.name).toBeDefined();
      expect(driveCreateFolderTool.inputSchema.properties?.parentFolderId).toBeDefined();
      expect(driveCreateFolderTool.inputSchema.properties?.description).toBeDefined();
    });
  });

  describe('Input Validation', () => {
    it('should return error for missing name', async () => {
      const result = await driveCreateFolderTool.handler({});
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Folder name must be a non-empty string');
    });

    it('should return error for empty name', async () => {
      const result = await driveCreateFolderTool.handler({ name: '' });
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Folder name must be a non-empty string');
    });

    it('should return error for whitespace-only name', async () => {
      const result = await driveCreateFolderTool.handler({ name: '   ' });
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Folder name must be a non-empty string');
    });
  });

  describe('Folder Creation', () => {
    it('should create folder successfully with minimal parameters', async () => {
      const mockFolder = {
        id: 'folder123',
        name: 'Test Folder',
        mimeType: 'application/vnd.google-apps.folder',
        createdTime: '2024-01-01T12:00:00Z',
        webViewLink: 'https://drive.google.com/drive/folders/folder123'
      };

      mockDriveClient.createFolder.mockResolvedValue(mockFolder);

      const result = await driveCreateFolderTool.handler({ name: 'Test Folder' });

      expect(mockDriveClient.createFolder).toHaveBeenCalledWith('Test Folder', undefined, undefined);
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Folder Created Successfully');
      expect(result.content[0].text).toContain('Test Folder');
      expect(result.content[0].text).toContain('folder123');
    });

    it('should create folder with parent folder ID', async () => {
      const mockFolder = {
        id: 'folder123',
        name: 'Subfolder',
        mimeType: 'application/vnd.google-apps.folder',
        parents: ['parent123']
      };

      mockDriveClient.createFolder.mockResolvedValue(mockFolder);

      const result = await driveCreateFolderTool.handler({
        name: 'Subfolder',
        parentFolderId: 'parent123'
      });

      expect(mockDriveClient.createFolder).toHaveBeenCalledWith('Subfolder', 'parent123', undefined);
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Parent Folder: parent123');
    });

    it('should create folder with description', async () => {
      const mockFolder = {
        id: 'folder123',
        name: 'Documented Folder',
        mimeType: 'application/vnd.google-apps.folder'
      };

      mockDriveClient.createFolder.mockResolvedValue(mockFolder);

      const result = await driveCreateFolderTool.handler({
        name: 'Documented Folder',
        description: 'A folder with description'
      });

      expect(mockDriveClient.createFolder).toHaveBeenCalledWith('Documented Folder', undefined, 'A folder with description');
      expect(result.isError).toBe(false);
    });

    it('should trim whitespace from parameters', async () => {
      const mockFolder = {
        id: 'folder123',
        name: 'Trimmed Folder',
        mimeType: 'application/vnd.google-apps.folder'
      };

      mockDriveClient.createFolder.mockResolvedValue(mockFolder);

      await driveCreateFolderTool.handler({
        name: '  Trimmed Folder  ',
        parentFolderId: '  parent123  ',
        description: '  Description with spaces  '
      });

      expect(mockDriveClient.createFolder).toHaveBeenCalledWith('Trimmed Folder', 'parent123', 'Description with spaces');
    });
  });

  describe('Error Handling', () => {
    it('should handle drive client errors', async () => {
      mockDriveClient.createFolder.mockRejectedValue(new Error('Drive API error'));

      const result = await driveCreateFolderTool.handler({ name: 'Test Folder' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Drive Create Folder Error');
      expect(result.content[0].text).toContain('Drive API error');
    });

    it('should handle unknown errors', async () => {
      mockDriveClient.createFolder.mockRejectedValue('Unknown error');

      const result = await driveCreateFolderTool.handler({ name: 'Test Folder' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown error occurred');
    });
  });
});
