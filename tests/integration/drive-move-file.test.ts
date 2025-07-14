/**
 * Integration tests for Drive Move File functionality
 * 
 * Tests the complete drive_move_file tool integration including OAuth authentication,
 * Google Drive API calls, and end-to-end file move operations.
 */

import { driveMoveFileTool } from '../../src/services/drive/tools/moveFile';
import { driveClient } from '../../src/services/drive/driveClient';
import { oauthManager } from '../../src/auth/oauthManager';

// Mock OAuth manager for integration tests
jest.mock('../../src/auth/oauthManager');

describe('Drive Move File Integration', () => {
  const mockOAuthManager = oauthManager.instance as jest.Mocked<typeof oauthManager.instance>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful authentication by default
    mockOAuthManager.ensureScopes.mockResolvedValue(undefined);
    mockOAuthManager.getOAuth2Client.mockResolvedValue({
      credentials: { access_token: 'mock-token' }
    } as any);
  });

  afterEach(() => {
    // Reset the drive client after each test
    driveClient.reset();
  });

  describe('Authentication Integration', () => {
    it('should handle authentication flow during move operation', async () => {
      // Mock the Google Drive API response
      const mockGoogleDrive = {
        files: {
          get: jest.fn().mockResolvedValue({
            data: {
              parents: ['oldparent123'],
              name: 'test-file.txt'
            }
          }),
          update: jest.fn().mockResolvedValue({
            data: {
              id: 'file123',
              name: 'test-file.txt',
              mimeType: 'text/plain',
              size: '1024',
              modifiedTime: '2024-01-15T10:30:00Z',
              webViewLink: 'https://drive.google.com/file/d/file123/view',
              parents: ['newfolder456']
            }
          })
        }
      };

      // Mock google.drive to return our mock
      jest.doMock('googleapis', () => ({
        google: {
          drive: jest.fn().mockReturnValue(mockGoogleDrive)
        }
      }));

      const result = await driveMoveFileTool.handler({
        fileId: 'file123',
        targetFolderId: 'newfolder456'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('File Moved Successfully');
      expect(mockOAuthManager.ensureScopes).toHaveBeenCalledWith([
        'https://www.googleapis.com/auth/drive'
      ]);
    });

    it('should handle authentication failure gracefully', async () => {
      // Mock authentication failure
      mockOAuthManager.ensureScopes.mockRejectedValue(new Error('Authentication failed'));

      const result = await driveMoveFileTool.handler({
        fileId: 'file123',
        targetFolderId: 'newfolder456'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to initialize Drive API client');
    });
  });

  describe('Google Drive API Integration', () => {
    it('should make correct API calls for file move', async () => {
      const mockGoogleDrive = {
        files: {
          get: jest.fn().mockResolvedValue({
            data: {
              parents: ['oldparent123'],
              name: 'document.pdf'
            }
          }),
          update: jest.fn().mockResolvedValue({
            data: {
              id: 'file123',
              name: 'document.pdf',
              mimeType: 'application/pdf',
              size: '2048',
              modifiedTime: '2024-01-15T10:30:00Z',
              webViewLink: 'https://drive.google.com/file/d/file123/view',
              parents: ['newfolder456']
            }
          })
        }
      };

      jest.doMock('googleapis', () => ({
        google: {
          drive: jest.fn().mockReturnValue(mockGoogleDrive)
        }
      }));

      const result = await driveMoveFileTool.handler({
        fileId: 'file123',
        targetFolderId: 'newfolder456'
      });

      expect(result.isError).toBe(false);
      expect(mockGoogleDrive.files.get).toHaveBeenCalledWith({
        fileId: 'file123',
        fields: 'parents,name'
      });
      expect(mockGoogleDrive.files.update).toHaveBeenCalledWith({
        fileId: 'file123',
        addParents: 'newfolder456',
        removeParents: 'oldparent123',
        requestBody: {},
        fields: 'id,name,mimeType,size,modifiedTime,createdTime,parents,webViewLink'
      });
    });

    it('should make correct API calls for file move with rename', async () => {
      const mockGoogleDrive = {
        files: {
          get: jest.fn().mockResolvedValue({
            data: {
              parents: ['oldparent123'],
              name: 'old-name.pdf'
            }
          }),
          update: jest.fn().mockResolvedValue({
            data: {
              id: 'file123',
              name: 'new-name.pdf',
              mimeType: 'application/pdf',
              size: '2048',
              modifiedTime: '2024-01-15T10:30:00Z',
              webViewLink: 'https://drive.google.com/file/d/file123/view',
              parents: ['newfolder456']
            }
          })
        }
      };

      jest.doMock('googleapis', () => ({
        google: {
          drive: jest.fn().mockReturnValue(mockGoogleDrive)
        }
      }));

      const result = await driveMoveFileTool.handler({
        fileId: 'file123',
        targetFolderId: 'newfolder456',
        newName: 'new-name.pdf'
      });

      expect(result.isError).toBe(false);
      expect(mockGoogleDrive.files.update).toHaveBeenCalledWith({
        fileId: 'file123',
        addParents: 'newfolder456',
        removeParents: 'oldparent123',
        requestBody: { name: 'new-name.pdf' },
        fields: 'id,name,mimeType,size,modifiedTime,createdTime,parents,webViewLink'
      });
      expect(result.content[0].text).toContain('Renamed to: new-name.pdf');
    });

    it('should handle multiple parent folders correctly', async () => {
      const mockGoogleDrive = {
        files: {
          get: jest.fn().mockResolvedValue({
            data: {
              parents: ['parent1', 'parent2', 'parent3'],
              name: 'shared-file.txt'
            }
          }),
          update: jest.fn().mockResolvedValue({
            data: {
              id: 'file123',
              name: 'shared-file.txt',
              mimeType: 'text/plain',
              parents: ['newfolder456']
            }
          })
        }
      };

      jest.doMock('googleapis', () => ({
        google: {
          drive: jest.fn().mockReturnValue(mockGoogleDrive)
        }
      }));

      const result = await driveMoveFileTool.handler({
        fileId: 'file123',
        targetFolderId: 'newfolder456'
      });

      expect(result.isError).toBe(false);
      expect(mockGoogleDrive.files.update).toHaveBeenCalledWith({
        fileId: 'file123',
        addParents: 'newfolder456',
        removeParents: 'parent1,parent2,parent3',
        requestBody: {},
        fields: 'id,name,mimeType,size,modifiedTime,createdTime,parents,webViewLink'
      });
    });
  });

  describe('Error Scenarios Integration', () => {
    it('should handle Drive API file not found error', async () => {
      const mockGoogleDrive = {
        files: {
          get: jest.fn().mockRejectedValue({
            code: 404,
            message: 'File not found'
          })
        }
      };

      jest.doMock('googleapis', () => ({
        google: {
          drive: jest.fn().mockReturnValue(mockGoogleDrive)
        }
      }));

      const result = await driveMoveFileTool.handler({
        fileId: 'nonexistent',
        targetFolderId: 'folder123'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Drive resource not found');
    });

    it('should handle Drive API permission error', async () => {
      const mockGoogleDrive = {
        files: {
          get: jest.fn().mockRejectedValue({
            code: 403,
            message: 'Insufficient permissions'
          })
        }
      };

      jest.doMock('googleapis', () => ({
        google: {
          drive: jest.fn().mockReturnValue(mockGoogleDrive)
        }
      }));

      const result = await driveMoveFileTool.handler({
        fileId: 'file123',
        targetFolderId: 'folder123'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Insufficient permissions for Drive access');
    });

    it('should handle Drive API rate limit error', async () => {
      const mockGoogleDrive = {
        files: {
          get: jest.fn().mockRejectedValue({
            code: 429,
            message: 'Rate limit exceeded'
          })
        }
      };

      jest.doMock('googleapis', () => ({
        google: {
          drive: jest.fn().mockReturnValue(mockGoogleDrive)
        }
      }));

      const result = await driveMoveFileTool.handler({
        fileId: 'file123',
        targetFolderId: 'folder123'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Rate limit exceeded');
    });

    it('should handle network connectivity issues', async () => {
      const mockGoogleDrive = {
        files: {
          get: jest.fn().mockRejectedValue(new Error('ECONNREFUSED'))
        }
      };

      jest.doMock('googleapis', () => ({
        google: {
          drive: jest.fn().mockReturnValue(mockGoogleDrive)
        }
      }));

      const result = await driveMoveFileTool.handler({
        fileId: 'file123',
        targetFolderId: 'folder123'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('ECONNREFUSED');
    });
  });

  describe('Response Format Integration', () => {
    it('should format successful response correctly', async () => {
      const mockGoogleDrive = {
        files: {
          get: jest.fn().mockResolvedValue({
            data: {
              parents: ['oldparent123'],
              name: 'test-document.pdf'
            }
          }),
          update: jest.fn().mockResolvedValue({
            data: {
              id: 'file123',
              name: 'test-document.pdf',
              mimeType: 'application/pdf',
              size: '1048576', // 1MB
              modifiedTime: '2024-01-15T10:30:00Z',
              createdTime: '2024-01-10T09:00:00Z',
              webViewLink: 'https://drive.google.com/file/d/file123/view',
              parents: ['newfolder456']
            }
          })
        }
      };

      jest.doMock('googleapis', () => ({
        google: {
          drive: jest.fn().mockReturnValue(mockGoogleDrive)
        }
      }));

      const result = await driveMoveFileTool.handler({
        fileId: 'file123',
        targetFolderId: 'newfolder456'
      });

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      
      const responseText = result.content[0].text;
      expect(responseText).toContain('📁 **File Moved Successfully**');
      expect(responseText).toContain('📄 **test-document.pdf**');
      expect(responseText).toContain('ID: file123');
      expect(responseText).toContain('Type: application/pdf');
      expect(responseText).toContain('Size: 1024 KB');
      expect(responseText).toContain('Modified: 1/15/2024');
      expect(responseText).toContain('Link: https://drive.google.com/file/d/file123/view');
      expect(responseText).toContain('New Location: newfolder456');
    });

    it('should handle missing optional fields gracefully', async () => {
      const mockGoogleDrive = {
        files: {
          get: jest.fn().mockResolvedValue({
            data: {
              parents: ['oldparent123'],
              name: 'minimal-file.txt'
            }
          }),
          update: jest.fn().mockResolvedValue({
            data: {
              id: 'file123',
              name: 'minimal-file.txt',
              mimeType: 'text/plain'
              // No size, modifiedTime, webViewLink, or parents
            }
          })
        }
      };

      jest.doMock('googleapis', () => ({
        google: {
          drive: jest.fn().mockReturnValue(mockGoogleDrive)
        }
      }));

      const result = await driveMoveFileTool.handler({
        fileId: 'file123',
        targetFolderId: 'newfolder456'
      });

      expect(result.isError).toBe(false);
      
      const responseText = result.content[0].text;
      expect(responseText).toContain('📁 **File Moved Successfully**');
      expect(responseText).toContain('📄 **minimal-file.txt**');
      expect(responseText).toContain('ID: file123');
      expect(responseText).toContain('Type: text/plain');
      expect(responseText).not.toContain('Size:');
      expect(responseText).not.toContain('Modified:');
      expect(responseText).not.toContain('Link:');
      expect(responseText).not.toContain('New Location:');
    });
  });
});
