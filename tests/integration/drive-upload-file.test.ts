/**
 * Drive Upload File Integration Tests
 * 
 * Integration tests for the drive_upload_file tool with real Google Drive API calls.
 * These tests require valid OAuth authentication and test actual file upload functionality.
 */

import { driveUploadFileTool } from '../../src/services/drive/tools/uploadFile';
import { oauthManager } from '../../src/auth/oauthManager';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Drive Upload File Integration Tests', () => {
  let testFilePath: string;
  let testFileContent: string;

  beforeAll(async () => {
    // Check if we're authenticated
    const isAuth = await oauthManager.instance.isAuthenticated();
    if (!isAuth) {
      console.warn('Skipping Drive upload integration tests - not authenticated');
      return;
    }

    // Create a test file for uploading
    testFileContent = `Test file for Drive upload integration test\nCreated at: ${new Date().toISOString()}`;
    testFilePath = join(tmpdir(), `mcp-test-upload-${Date.now()}.txt`);
    await fs.writeFile(testFilePath, testFileContent, 'utf-8');
  });

  afterAll(async () => {
    // Clean up test file
    if (testFilePath) {
      try {
        await fs.unlink(testFilePath);
      } catch (error) {
        // File might not exist, ignore error
      }
    }
  });

  beforeEach(async () => {
    const isAuth = await oauthManager.instance.isAuthenticated();
    if (!isAuth) {
      pending('Not authenticated - skipping test');
    }
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
      expect(result.content[0].text).toContain('mcp-test-upload-');
      expect(result.content[0].text).toContain('ID:');
      expect(result.content[0].text).toContain('Type: text/plain');
    }, 30000); // 30 second timeout for file upload

    it('should upload file with custom name', async () => {
      const customName = `custom-upload-${Date.now()}.txt`;
      
      const result = await driveUploadFileTool.handler({
        filePath: testFilePath,
        fileName: customName
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain(customName);
      expect(result.content[0].text).toContain('📤 **File Uploaded Successfully**');
    }, 30000);

    it('should upload file with description', async () => {
      const description = 'Integration test file upload';
      
      const result = await driveUploadFileTool.handler({
        filePath: testFilePath,
        description: description
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('📤 **File Uploaded Successfully**');
      // Note: Description is set but not displayed in the response
    }, 30000);

    it('should handle file not found error', async () => {
      const nonExistentPath = join(tmpdir(), 'non-existent-file.txt');
      
      const result = await driveUploadFileTool.handler({
        filePath: nonExistentPath
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('❌ **Drive Upload Error**');
      expect(result.content[0].text).toContain('File not found');
    });

    it('should handle invalid folder ID', async () => {
      const result = await driveUploadFileTool.handler({
        filePath: testFilePath,
        folderId: 'invalid-folder-id-12345'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('❌ **Drive Upload Error**');
      // The exact error message may vary depending on Google's response
    }, 30000);
  });

  describe('File Size and Type Handling', () => {
    it('should handle small text files', async () => {
      // Create a very small file
      const smallFilePath = join(tmpdir(), `small-test-${Date.now()}.txt`);
      await fs.writeFile(smallFilePath, 'Small file content', 'utf-8');

      try {
        const result = await driveUploadFileTool.handler({
          filePath: smallFilePath
        });

        expect(result.isError).toBe(false);
        expect(result.content[0].text).toContain('Size: < 1 KB');
      } finally {
        await fs.unlink(smallFilePath);
      }
    }, 30000);

    it('should handle larger text files', async () => {
      // Create a larger file (a few KB)
      const largeContent = 'Large file content\n'.repeat(200); // ~3.6KB
      const largeFilePath = join(tmpdir(), `large-test-${Date.now()}.txt`);
      await fs.writeFile(largeFilePath, largeContent, 'utf-8');

      try {
        const result = await driveUploadFileTool.handler({
          filePath: largeFilePath
        });

        expect(result.isError).toBe(false);
        expect(result.content[0].text).toContain('Size:');
        expect(result.content[0].text).toContain('KB');
      } finally {
        await fs.unlink(largeFilePath);
      }
    }, 30000);
  });

  describe('Response Format Validation', () => {
    it('should include all expected metadata in response', async () => {
      const result = await driveUploadFileTool.handler({
        filePath: testFilePath
      });

      expect(result.isError).toBe(false);
      
      const responseText = result.content[0].text;
      expect(responseText).toContain('📤 **File Uploaded Successfully**');
      expect(responseText).toContain('ID:');
      expect(responseText).toContain('Type:');
      expect(responseText).toContain('Size:');
      expect(responseText).toContain('Created:');
      expect(responseText).toContain('Link:');
    }, 30000);

    it('should format timestamps correctly', async () => {
      const result = await driveUploadFileTool.handler({
        filePath: testFilePath
      });

      expect(result.isError).toBe(false);
      
      const responseText = result.content[0].text;
      expect(responseText).toMatch(/Created:.*\d{4}/); // Should contain year
    }, 30000);

    it('should include Google Drive link', async () => {
      const result = await driveUploadFileTool.handler({
        filePath: testFilePath
      });

      expect(result.isError).toBe(false);
      
      const responseText = result.content[0].text;
      expect(responseText).toContain('Link: https://drive.google.com');
    }, 30000);
  });

  describe('Authentication Error Handling', () => {
    it('should handle authentication errors gracefully', async () => {
      // Temporarily clear authentication
      const originalTokens = await oauthManager.instance.getAuthStatus();
      await oauthManager.instance.clearTokens();

      try {
        const result = await driveUploadFileTool.handler({
          filePath: testFilePath
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('❌ **Drive Upload Error**');
      } finally {
        // Note: We can't easily restore tokens in this test environment
        // The user would need to re-authenticate manually
      }
    });
  });
});
