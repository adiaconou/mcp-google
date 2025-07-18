/**
 * Integration tests for Drive Create Folder Tool
 * 
 * Tests the drive_create_folder MCP tool with mocked Drive API interactions.
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
      createFolder: jest.fn(),
    },
    reset: jest.fn(),
  },
}));

import { driveCreateFolderTool } from '../../src/services/drive/tools/createFolder';
import { oauthManager } from '../../src/auth/oauthManager';
import { driveClient } from '../../src/services/drive/driveClient';
import { CalendarError } from '../../src/types/mcp';

describe('Drive Create Folder Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock OAuth client
    (oauthManager.instance.getOAuth2Client as jest.Mock).mockResolvedValue({
      credentials: { access_token: 'mock-token' }
    });

    // Mock the DriveClient createFolder method
    (driveClient.instance.createFolder as jest.Mock).mockResolvedValue({
      id: 'mock-folder-id-123',
      name: 'Test Folder',
      mimeType: 'application/vnd.google-apps.folder',
      createdTime: '2024-01-01T12:00:00.000Z',
      modifiedTime: '2024-01-01T12:00:00.000Z',
      parents: ['root']
    });
  });

  describe('Real Drive API Integration', () => {
    it('should create a folder in Drive', async () => {
      const testFolderName = `MCP-Test-Folder-${Date.now()}`;
      
      const result = await driveCreateFolderTool.handler({
        name: testFolderName,
        description: 'Test folder created by MCP integration test'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Folder Created Successfully');
      expect(result.content[0].text).toContain('Test Folder');
      expect(result.content[0].text).toContain('ID:');
      expect(result.content[0].text).toContain('application/vnd.google-apps.folder');
      
      // Verify DriveClient was called with correct parameters
      expect(driveClient.instance.createFolder).toHaveBeenCalledWith(
        testFolderName,
        undefined,
        'Test folder created by MCP integration test'
      );
    });

    it('should create a subfolder with parent ID', async () => {
      // Mock first call for parent folder
      (driveClient.instance.createFolder as jest.Mock)
        .mockResolvedValueOnce({
          id: 'mock-parent-folder-id',
          name: 'Parent Folder',
          mimeType: 'application/vnd.google-apps.folder',
          createdTime: '2024-01-01T12:00:00.000Z',
          modifiedTime: '2024-01-01T12:00:00.000Z',
          parents: ['root']
        })
        .mockResolvedValueOnce({
          id: 'mock-subfolder-id',
          name: 'Sub Folder',
          mimeType: 'application/vnd.google-apps.folder',
          createdTime: '2024-01-01T12:00:00.000Z',
          modifiedTime: '2024-01-01T12:00:00.000Z',
          parents: ['mock-parent-folder-id']
        });

      // First create a parent folder
      const parentFolderName = `MCP-Parent-${Date.now()}`;
      const parentResult = await driveCreateFolderTool.handler({
        name: parentFolderName
      });

      expect(parentResult.isError).toBe(false);
      
      // Extract parent folder ID from the response
      const parentIdMatch = parentResult.content[0]?.text?.match(/ID: ([^\n]+)/);
      expect(parentIdMatch).toBeTruthy();
      
      if (!parentIdMatch || !parentIdMatch[1]) {
        throw new Error('Parent ID not found');
      }
      
      const parentId = parentIdMatch[1];

      // Create subfolder
      const subFolderName = `MCP-Subfolder-${Date.now()}`;
      const subResult = await driveCreateFolderTool.handler({
        name: subFolderName,
        parentFolderId: parentId
      });

      expect(subResult.isError).toBe(false);
      expect(subResult.content[0].text).toContain('Folder Created Successfully');
      expect(subResult.content[0].text).toContain('Sub Folder');
      expect(subResult.content[0].text).toContain(`Parent Folder: ${parentId}`);
      
      // Verify both calls were made
      expect(driveClient.instance.createFolder).toHaveBeenCalledTimes(2);
      expect(driveClient.instance.createFolder).toHaveBeenNthCalledWith(2,
        subFolderName,
        parentId,
        undefined
      );
    });

    it('should handle invalid parent folder ID', async () => {
      // Mock DriveClient to throw an error for invalid parent ID
      (driveClient.instance.createFolder as jest.Mock).mockRejectedValueOnce(
        new CalendarError('Drive resource not found', -32003)
      );

      const result = await driveCreateFolderTool.handler({
        name: 'Test Folder',
        parentFolderId: 'invalid-folder-id'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Drive Create Folder Error');
      expect(result.content[0].text).toContain('Drive resource not found');
    });

    it('should handle authentication errors gracefully', async () => {
      // Mock DriveClient to throw an authentication error
      (driveClient.instance.createFolder as jest.Mock).mockRejectedValueOnce(
        new CalendarError('Authentication failed', -32000)
      );

      const result = await driveCreateFolderTool.handler({
        name: 'Test Folder'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Drive Create Folder Error');
      expect(result.content[0].text).toContain('Authentication failed');
    });

    it('should handle network errors gracefully', async () => {
      // Mock DriveClient to throw a network error
      (driveClient.instance.createFolder as jest.Mock).mockRejectedValueOnce(
        new Error('Network error: ECONNREFUSED')
      );

      const result = await driveCreateFolderTool.handler({
        name: 'Test Folder'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Drive Create Folder Error');
      expect(result.content[0].text).toContain('Network error: ECONNREFUSED');
    });
  });

  describe('Input Validation', () => {
    it('should reject empty folder name', async () => {
      const result = await driveCreateFolderTool.handler({
        name: ''
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Folder name must be a non-empty string');
    });

    it('should reject missing folder name', async () => {
      const result = await driveCreateFolderTool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Folder name must be a non-empty string');
    });

    it('should reject non-string folder name', async () => {
      const result = await driveCreateFolderTool.handler({
        name: 123
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Folder name must be a non-empty string');
    });
  });

  describe('Tool Registration', () => {
    it('should have correct tool definition', () => {
      expect(driveCreateFolderTool.name).toBe('drive_create_folder');
      expect(driveCreateFolderTool.description).toContain('Create a new folder in Google Drive');
      expect(driveCreateFolderTool.inputSchema).toBeDefined();
      expect(driveCreateFolderTool.inputSchema.required).toContain('name');
      expect(driveCreateFolderTool.handler).toBeDefined();
    });

    it('should have proper input schema', () => {
      const schema = driveCreateFolderTool.inputSchema;
      expect(schema.type).toBe('object');
      expect(schema.properties).toHaveProperty('name');
      expect(schema.properties).toHaveProperty('description');
      expect(schema.properties).toHaveProperty('parentFolderId');
      
      const nameProp = schema.properties?.name;
      expect(nameProp?.type).toBe('string');
      
      const descriptionProp = schema.properties?.description;
      expect(descriptionProp?.type).toBe('string');
      
      const parentFolderIdProp = schema.properties?.parentFolderId;
      expect(parentFolderIdProp?.type).toBe('string');
    });
  });
});
