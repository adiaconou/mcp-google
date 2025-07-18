/**
 * Gmail Download Attachment Tool Tests
 * 
 * Unit tests for the Gmail download attachment functionality
 */

import { gmailDownloadAttachmentTool } from '../../src/services/gmail/tools/downloadAttachment';
import { gmailClient } from '../../src/services/gmail/gmailClient';
import { GmailError, MCPErrorCode } from '../../src/types/mcp';
import { oauthManager } from '../../src/auth/oauthManager';

// Mock the OAuth manager
jest.mock('../../src/auth/oauthManager', () => ({
  oauthManager: {
    instance: {
      handleInsufficientScopeError: jest.fn()
    }
  }
}));

// Mock the Gmail client
jest.mock('../../src/services/gmail/gmailClient', () => ({
  gmailClient: {
    instance: {
      downloadAttachment: jest.fn()
    }
  }
}));

// Mock fs for file operations
jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn()
  },
  existsSync: jest.fn(),
  mkdirSync: jest.fn()
}));

// Mock path module
jest.mock('path', () => ({
  resolve: jest.fn(),
  join: jest.fn()
}));

describe('Gmail Download Attachment Tool', () => {
  let mockDownloadAttachment: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mocks
    mockDownloadAttachment = jest.fn();
    (gmailClient.instance as any).downloadAttachment = mockDownloadAttachment;
  });

  describe('Tool Definition', () => {
    it('should have correct tool definition', () => {
      expect(gmailDownloadAttachmentTool.name).toBe('gmail_download_attachment');
      expect(gmailDownloadAttachmentTool.description).toContain('Download email attachment');
      expect(gmailDownloadAttachmentTool.inputSchema.required).toEqual(['messageId', 'attachmentId']);
    });

    it('should have proper input schema', () => {
      const schema = gmailDownloadAttachmentTool.inputSchema;
      expect(schema.properties?.messageId).toBeDefined();
      expect(schema.properties?.attachmentId).toBeDefined();
      expect(schema.properties?.outputPath).toBeDefined();
      expect(schema.properties?.filename).toBeDefined();
      expect(schema.properties?.maxSizeBytes).toBeDefined();
    });
  });

  describe('Tool Handler', () => {
    it('should download attachment successfully', async () => {
      const mockFilePath = '/test/path/attachment.pdf';
      mockDownloadAttachment.mockResolvedValue(mockFilePath);

      const params = {
        messageId: 'msg123',
        attachmentId: 'att456',
        outputPath: '/test/path',
        filename: 'attachment.pdf'
      };

      const result = await gmailDownloadAttachmentTool.handler(params);

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Attachment downloaded successfully');
      expect(result.content[0].text).toContain(mockFilePath);
      expect(mockDownloadAttachment).toHaveBeenCalledWith({
        messageId: 'msg123',
        attachmentId: 'att456',
        outputPath: '/test/path',
        filename: 'attachment.pdf'
      });
    });

    it('should handle missing messageId', async () => {
      const params = {
        attachmentId: 'att456'
      };

      const result = await gmailDownloadAttachmentTool.handler(params);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Message ID is required');
    });

    it('should handle missing attachmentId', async () => {
      const params = {
        messageId: 'msg123'
      };

      const result = await gmailDownloadAttachmentTool.handler(params);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Attachment ID is required');
    });

    it('should handle empty messageId', async () => {
      const params = {
        messageId: '   ',
        attachmentId: 'att456'
      };

      const result = await gmailDownloadAttachmentTool.handler(params);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Message ID is required');
    });

    it('should handle empty attachmentId', async () => {
      const params = {
        messageId: 'msg123',
        attachmentId: '   '
      };

      const result = await gmailDownloadAttachmentTool.handler(params);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Attachment ID is required');
    });

    it('should handle download errors', async () => {
      const error = new GmailError('Download failed', MCPErrorCode.APIError);
      mockDownloadAttachment.mockRejectedValue(error);

      const params = {
        messageId: 'msg123',
        attachmentId: 'att456'
      };

      const result = await gmailDownloadAttachmentTool.handler(params);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error downloading attachment');
      expect(result.content[0].text).toContain('Download failed');
    });

    it('should handle authentication errors', async () => {
      const error = new GmailError('Missing required scopes', MCPErrorCode.AuthenticationError);
      mockDownloadAttachment.mockRejectedValue(error);

      const params = {
        messageId: 'msg123',
        attachmentId: 'att456'
      };

      const result = await gmailDownloadAttachmentTool.handler(params);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error downloading attachment');
      expect(result.content[0].text).toContain('Missing required scopes');
    });

    it('should pass optional parameters correctly', async () => {
      const mockFilePath = '/custom/path/custom-name.pdf';
      mockDownloadAttachment.mockResolvedValue(mockFilePath);

      const params = {
        messageId: 'msg123',
        attachmentId: 'att456',
        outputPath: '/custom/path',
        filename: 'custom-name.pdf',
        maxSizeBytes: 10000000
      };

      const result = await gmailDownloadAttachmentTool.handler(params);

      expect(result.isError).toBe(false);
      expect(mockDownloadAttachment).toHaveBeenCalledWith({
        messageId: 'msg123',
        attachmentId: 'att456',
        outputPath: '/custom/path',
        filename: 'custom-name.pdf',
        maxSizeBytes: 10000000
      });
    });

    it('should handle only required parameters', async () => {
      const mockFilePath = '/default/path/attachment.pdf';
      mockDownloadAttachment.mockResolvedValue(mockFilePath);

      const params = {
        messageId: 'msg123',
        attachmentId: 'att456'
      };

      const result = await gmailDownloadAttachmentTool.handler(params);

      expect(result.isError).toBe(false);
      expect(mockDownloadAttachment).toHaveBeenCalledWith({
        messageId: 'msg123',
        attachmentId: 'att456'
      });
    });

    it('should trim whitespace from required parameters', async () => {
      const mockFilePath = '/test/path/attachment.pdf';
      mockDownloadAttachment.mockResolvedValue(mockFilePath);

      const params = {
        messageId: '  msg123  ',
        attachmentId: '  att456  '
      };

      const result = await gmailDownloadAttachmentTool.handler(params);

      expect(result.isError).toBe(false);
      expect(mockDownloadAttachment).toHaveBeenCalledWith({
        messageId: 'msg123',
        attachmentId: 'att456'
      });
    });
  });
});
