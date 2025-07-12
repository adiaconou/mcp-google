/**
 * Integration tests for Drive Create Folder Tool
 */

import { driveCreateFolderTool } from '../../src/services/drive/tools/createFolder';

describe('Drive Create Folder Integration', () => {
  // Skip integration tests if no auth token is available
  const skipIfNoAuth = process.env.SKIP_INTEGRATION_TESTS === 'true';

  beforeAll(() => {
    if (skipIfNoAuth) {
      console.log('Skipping Drive create folder integration tests - no auth token');
    }
  });

  describe('Real Drive API Integration', () => {
    it('should create a folder in Drive', async () => {
      if (skipIfNoAuth) {
        pending('Skipping - no auth token available');
        return;
      }

      const testFolderName = `MCP-Test-Folder-${Date.now()}`;
      
      const result = await driveCreateFolderTool.handler({
        name: testFolderName,
        description: 'Test folder created by MCP integration test'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Folder Created Successfully');
      expect(result.content[0].text).toContain(testFolderName);
      expect(result.content[0].text).toContain('ID:');
      expect(result.content[0].text).toContain('application/vnd.google-apps.folder');
    }, 10000);

    it('should create a subfolder with parent ID', async () => {
      if (skipIfNoAuth) {
        pending('Skipping - no auth token available');
        return;
      }

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
      
      // @ts-ignore - parentIdMatch is checked above
      const parentId = parentIdMatch[1];

      // Create subfolder
      const subFolderName = `MCP-Subfolder-${Date.now()}`;
      const subResult = await driveCreateFolderTool.handler({
        name: subFolderName,
        parentFolderId: parentId
      });

      expect(subResult.isError).toBe(false);
      expect(subResult.content[0].text).toContain('Folder Created Successfully');
      expect(subResult.content[0].text).toContain(subFolderName);
      expect(subResult.content[0].text).toContain(`Parent Folder: ${parentId}`);
    }, 15000);

    it('should handle invalid parent folder ID', async () => {
      if (skipIfNoAuth) {
        pending('Skipping - no auth token available');
        return;
      }

      const result = await driveCreateFolderTool.handler({
        name: 'Test Folder',
        parentFolderId: 'invalid-folder-id'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Drive Create Folder Error');
    }, 10000);
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
  });
});
