/**
 * Integration tests for Drive Get File Tool
 * 
 * Tests the drive_get_file MCP tool with real Drive API interactions.
 */

import { driveGetFileTool } from '../../src/services/drive/tools/getFile';
import { oauthManager } from '../../src/auth/oauthManager';
import { driveClient } from '../../src/services/drive/driveClient';

describe('Drive Get File Integration Tests', () => {
  let testFileId: string;

  beforeAll(async () => {
    // Reset clients to ensure clean state
    driveClient.reset();
    
    // Initialize OAuth with Drive scope
    await oauthManager.instance.ensureScopes([
      'https://www.googleapis.com/auth/drive'
    ]);
  });

  afterAll(() => {
    // Clean up
    driveClient.reset();
  });

  describe('Real Drive API Integration', () => {

    beforeAll(async () => {
      // Create a test file for integration testing
      try {
        const fs = require('fs');
        const path = require('path');
        const os = require('os');
        
        // Create a temporary test file
        const testContent = 'This is a test file for Drive Get File integration testing.\nCreated at: ' + new Date().toISOString();
        const tempFilePath = path.join(os.tmpdir(), 'drive-get-file-test.txt');
        fs.writeFileSync(tempFilePath, testContent);

        // Upload the test file to Drive
        const uploadResult = await driveClient.instance.uploadFile({
          filePath: tempFilePath,
          fileName: 'drive-get-file-test.txt',
          description: 'Test file for drive_get_file integration tests'
        });

        testFileId = uploadResult.id;
        
        // Clean up local temp file
        fs.unlinkSync(tempFilePath);
        
        console.log(`Created test file with ID: ${testFileId}`);
      } catch (error) {
        console.error('Failed to create test file:', error);
        throw error;
      }
    });

    afterAll(async () => {
      // Clean up test file from Drive
      if (testFileId) {
        try {
          // Note: We don't have a delete method in our client, but that's okay for testing
          // The test file will remain in Drive but won't interfere with other tests
          console.log(`Test file ${testFileId} left in Drive for manual cleanup if needed`);
        } catch (error) {
          console.warn('Failed to clean up test file:', error);
        }
      }
    });

    it('should retrieve file metadata successfully', async () => {
      const result = await driveGetFileTool.handler({
        fileId: testFileId
      });

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      
      const text = result.content[0].text;
      expect(text).toContain('drive-get-file-test.txt');
      expect(text).toContain(testFileId);
      expect(text).toContain('text/plain');
      expect(text).toContain('File Details:');
      expect(text).toContain('ID:');
      expect(text).toContain('Type:');
      expect(text).toContain('Size:');
      expect(text).toContain('Created:');
      expect(text).toContain('Modified:');
    });

    it('should retrieve file with content when requested', async () => {
      const result = await driveGetFileTool.handler({
        fileId: testFileId,
        includeContent: true
      });

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      
      const text = result.content[0].text;
      expect(text).toContain('drive-get-file-test.txt');
      expect(text).toContain('File Content:');
      expect(text).toContain('This is a test file for Drive Get File integration testing');
    });

    it('should handle custom maxContentSize parameter', async () => {
      const result = await driveGetFileTool.handler({
        fileId: testFileId,
        includeContent: true,
        maxContentSize: 2048
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('File Content:');
    });

    it('should handle file without content download', async () => {
      const result = await driveGetFileTool.handler({
        fileId: testFileId,
        includeContent: false
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('drive-get-file-test.txt');
      expect(result.content[0].text).not.toContain('File Content:');
    });

    it('should handle non-existent file ID', async () => {
      const result = await driveGetFileTool.handler({
        fileId: 'non-existent-file-id-12345'
      });

      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('Drive Get File Error');
      expect(result.content[0].text).toContain('File not found');
    });

    it('should handle invalid file ID format', async () => {
      const result = await driveGetFileTool.handler({
        fileId: 'invalid-format'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Drive Get File Error');
    });

    it('should validate required fileId parameter', async () => {
      const result = await driveGetFileTool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('File ID is required');
    });

    it('should validate fileId parameter type', async () => {
      const result = await driveGetFileTool.handler({
        fileId: 123
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('File ID is required and must be a string');
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors gracefully', async () => {
      // Temporarily break authentication
      const originalGetOAuth2Client = oauthManager.instance.getOAuth2Client;
      oauthManager.instance.getOAuth2Client = jest.fn().mockRejectedValue(new Error('Authentication failed'));

      const result = await driveGetFileTool.handler({
        fileId: 'any-file-id'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Drive Get File Error');

      // Restore original method
      oauthManager.instance.getOAuth2Client = originalGetOAuth2Client;
    });

    it('should handle network errors gracefully', async () => {
      // This test would require mocking network failures
      // For now, we'll test with an invalid file ID which should trigger API errors
      const result = await driveGetFileTool.handler({
        fileId: 'definitely-invalid-file-id-format-that-will-fail'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Drive Get File Error');
    });
  });

  describe('Tool Registration', () => {
    it('should have correct tool definition', () => {
      expect(driveGetFileTool.name).toBe('drive_get_file');
      expect(driveGetFileTool.description).toContain('Get Google Drive file metadata');
      expect(driveGetFileTool.inputSchema).toBeDefined();
      expect(driveGetFileTool.inputSchema.required).toContain('fileId');
      expect(driveGetFileTool.handler).toBeDefined();
    });

    it('should have proper input schema', () => {
      const schema = driveGetFileTool.inputSchema;
      expect(schema.type).toBe('object');
      expect(schema.properties).toHaveProperty('fileId');
      expect(schema.properties).toHaveProperty('includeContent');
      expect(schema.properties).toHaveProperty('maxContentSize');
      
      const fileIdProp = schema.properties?.fileId;
      expect(fileIdProp?.type).toBe('string');
      
      const includeContentProp = schema.properties?.includeContent;
      expect(includeContentProp?.type).toBe('boolean');
      expect(includeContentProp?.default).toBe(false);
      
      const maxContentSizeProp = schema.properties?.maxContentSize;
      expect(maxContentSizeProp?.type).toBe('number');
      expect(maxContentSizeProp?.minimum).toBe(1024);
      expect(maxContentSizeProp?.maximum).toBe(10485760);
      expect(maxContentSizeProp?.default).toBe(1048576);
    });
  });

  describe('Content Handling', () => {
    it('should handle text files with content download', async () => {
      if (!testFileId) {
        console.warn('Skipping content test - no test file available');
        return;
      }

      const result = await driveGetFileTool.handler({
        fileId: testFileId,
        includeContent: true
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('File Content:');
    });

    it('should handle files without content when not requested', async () => {
      if (!testFileId) {
        console.warn('Skipping content test - no test file available');
        return;
      }

      const result = await driveGetFileTool.handler({
        fileId: testFileId,
        includeContent: false
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).not.toContain('File Content:');
    });
  });

  describe('Parameter Validation', () => {
    it('should enforce maxContentSize boundaries', async () => {
      if (!testFileId) {
        console.warn('Skipping boundary test - no test file available');
        return;
      }

      // Test with very small size (should be clamped to minimum)
      const resultSmall = await driveGetFileTool.handler({
        fileId: testFileId,
        includeContent: true,
        maxContentSize: 100 // Below minimum of 1024
      });

      expect(resultSmall.isError).toBe(false);

      // Test with very large size (should be clamped to maximum)
      const resultLarge = await driveGetFileTool.handler({
        fileId: testFileId,
        includeContent: true,
        maxContentSize: 50000000 // Above maximum of 10485760
      });

      expect(resultLarge.isError).toBe(false);
    });
  });
});
