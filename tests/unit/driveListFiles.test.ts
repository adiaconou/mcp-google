/**
 * Unit tests for Drive List Files tool
 */

import { driveListFilesTool } from '../../src/services/drive/tools/listFiles';
import { driveClient } from '../../src/services/drive/driveClient';

// Mock the drive client
jest.mock('../../src/services/drive/driveClient');

describe('Drive List Files Tool', () => {
  const mockDriveClient = {
    listFiles: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (driveClient as any).instance = mockDriveClient;
  });

  describe('Tool Definition', () => {
    it('should have correct tool metadata', () => {
      expect(driveListFilesTool.name).toBe('drive_list_files');
      expect(driveListFilesTool.description).toContain('List Google Drive files');
      expect(driveListFilesTool.inputSchema).toBeDefined();
      expect(driveListFilesTool.handler).toBeDefined();
    });

    it('should have correct input schema properties', () => {
      const schema = driveListFilesTool.inputSchema;
      expect(schema.type).toBe('object');
      expect(schema.properties).toHaveProperty('folderId');
      expect(schema.properties).toHaveProperty('query');
      expect(schema.properties).toHaveProperty('maxResults');
      expect(schema.properties).toHaveProperty('orderBy');
    });
  });

  describe('Tool Handler', () => {
    it('should list files successfully with default parameters', async () => {
      const mockFiles = [
        {
          id: 'file1',
          name: 'Document.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          modifiedTime: '2024-01-01T12:00:00Z',
          createdTime: '2024-01-01T10:00:00Z',
          webViewLink: 'https://drive.google.com/file/d/file1/view'
        },
        {
          id: 'file2',
          name: 'Spreadsheet.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          size: 2048,
          modifiedTime: '2024-01-02T12:00:00Z',
          createdTime: '2024-01-02T10:00:00Z'
        }
      ];

      mockDriveClient.listFiles.mockResolvedValue(mockFiles);

      const result = await driveListFilesTool.handler({});

      expect(mockDriveClient.listFiles).toHaveBeenCalledWith({
        maxResults: 20,
        orderBy: 'modifiedTime desc'
      });

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Drive Files');
      expect(result.content[0].text).toContain('Document.pdf');
      expect(result.content[0].text).toContain('Spreadsheet.xlsx');
      expect(result.content[0].text).toContain('1 KB');
      expect(result.content[0].text).toContain('2 KB');
    });

    it('should handle folder filtering', async () => {
      const mockFiles = [
        {
          id: 'file1',
          name: 'Folder File.txt',
          mimeType: 'text/plain',
          size: 512,
          modifiedTime: '2024-01-01T12:00:00Z',
          createdTime: '2024-01-01T10:00:00Z'
        }
      ];

      mockDriveClient.listFiles.mockResolvedValue(mockFiles);

      const params = {
        folderId: 'folder123',
        maxResults: 10
      };

      const result = await driveListFilesTool.handler(params);

      expect(mockDriveClient.listFiles).toHaveBeenCalledWith({
        folderId: 'folder123',
        maxResults: 10,
        orderBy: 'modifiedTime desc'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Folder File.txt');
    });

    it('should handle search queries', async () => {
      const mockFiles = [
        {
          id: 'file1',
          name: 'Important Report.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          modifiedTime: '2024-01-01T12:00:00Z',
          createdTime: '2024-01-01T10:00:00Z'
        }
      ];

      mockDriveClient.listFiles.mockResolvedValue(mockFiles);

      const params = {
        query: "name contains 'report'",
        orderBy: 'name'
      };

      const result = await driveListFilesTool.handler(params);

      expect(mockDriveClient.listFiles).toHaveBeenCalledWith({
        query: "name contains 'report'",
        maxResults: 20,
        orderBy: 'name'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Important Report.pdf');
    });

    it('should handle empty results', async () => {
      mockDriveClient.listFiles.mockResolvedValue([]);

      const result = await driveListFilesTool.handler({});

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toBe('No files found.');
    });

    it('should handle files without optional properties', async () => {
      const mockFiles = [
        {
          id: 'file1',
          name: 'Simple File.txt',
          mimeType: 'text/plain',
          modifiedTime: '2024-01-01T12:00:00Z',
          createdTime: '2024-01-01T10:00:00Z'
          // No size, webViewLink
        }
      ];

      mockDriveClient.listFiles.mockResolvedValue(mockFiles);

      const result = await driveListFilesTool.handler({});

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Simple File.txt');
      expect(result.content[0].text).toContain('text/plain');
      expect(result.content[0].text).not.toContain('Size:');
      expect(result.content[0].text).not.toContain('Link:');
    });

    it('should validate maxResults parameter', async () => {
      const mockFiles: any[] = [];
      mockDriveClient.listFiles.mockResolvedValue(mockFiles);

      // Test minimum boundary
      await driveListFilesTool.handler({ maxResults: 0 });
      expect(mockDriveClient.listFiles).toHaveBeenCalledWith({
        maxResults: 1,
        orderBy: 'modifiedTime desc'
      });

      // Clear mock and test maximum boundary
      mockDriveClient.listFiles.mockClear();
      await driveListFilesTool.handler({ maxResults: 150 });
      expect(mockDriveClient.listFiles).toHaveBeenCalledWith({
        maxResults: 100,
        orderBy: 'modifiedTime desc'
      });
    });

    it('should handle authentication errors', async () => {
      const authError = new Error('Authentication failed');
      mockDriveClient.listFiles.mockRejectedValue(authError);

      const result = await driveListFilesTool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('Drive List Files Error');
      expect(result.content[0].text).toContain('Authentication failed');
    });

    it('should handle permission errors', async () => {
      const permissionError = new Error('Insufficient permissions to access Google Drive');
      mockDriveClient.listFiles.mockRejectedValue(permissionError);

      const result = await driveListFilesTool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Insufficient permissions to access Google Drive');
    });

    it('should handle folder not found errors', async () => {
      const folderError = new Error('Folder not found');
      mockDriveClient.listFiles.mockRejectedValue(folderError);

      const result = await driveListFilesTool.handler({ folderId: 'invalid' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Folder not found');
    });

    it('should handle invalid query errors', async () => {
      const queryError = new Error('Invalid query syntax');
      mockDriveClient.listFiles.mockRejectedValue(queryError);

      const result = await driveListFilesTool.handler({ query: 'invalid syntax' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid search query');
    });

    it('should handle generic errors', async () => {
      const genericError = new Error('Network timeout');
      mockDriveClient.listFiles.mockRejectedValue(genericError);

      const result = await driveListFilesTool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Network timeout');
    });

    it('should handle non-Error exceptions', async () => {
      mockDriveClient.listFiles.mockRejectedValue('String error');

      const result = await driveListFilesTool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown error occurred');
    });

    it('should format file sizes correctly', async () => {
      const mockFiles = [
        {
          id: 'file1',
          name: 'Small.txt',
          mimeType: 'text/plain',
          size: 500, // < 1KB
          modifiedTime: '2024-01-01T12:00:00Z',
          createdTime: '2024-01-01T10:00:00Z'
        },
        {
          id: 'file2',
          name: 'Medium.pdf',
          mimeType: 'application/pdf',
          size: 1536, // 1.5KB
          modifiedTime: '2024-01-01T12:00:00Z',
          createdTime: '2024-01-01T10:00:00Z'
        }
      ];

      mockDriveClient.listFiles.mockResolvedValue(mockFiles);

      const result = await driveListFilesTool.handler({});

      expect(result.content[0].text).toContain('< 1 KB'); // Small file
      expect(result.content[0].text).toContain('2 KB');   // Medium file (rounded up)
    });
  });
});
