/**
 * Gmail Download Attachment Integration Tests
 * 
 * Integration tests for the Gmail download attachment functionality
 * including end-to-end workflow testing.
 */

import { gmailClient } from '../../src/services/gmail/gmailClient';
import { oauthManager } from '../../src/auth/oauthManager';
import { GmailError, MCPErrorCode } from '../../src/types/mcp';
import * as fs from 'fs';
import * as path from 'path';

// Mock the OAuth manager for integration tests
jest.mock('../../src/auth/oauthManager', () => ({
  oauthManager: {
    instance: {
      getOAuth2Client: jest.fn(),
      ensureScopes: jest.fn().mockResolvedValue(undefined),
      isAuthenticated: jest.fn().mockResolvedValue(true)
    }
  }
}));

// Mock googleapis
jest.mock('googleapis', () => ({
  google: {
    gmail: jest.fn()
  }
}));

// Mock fs operations
jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn()
  },
  existsSync: jest.fn(),
  mkdirSync: jest.fn()
}));

describe('Gmail Download Attachment Integration', () => {
  let mockGmailApi: any;
  let mockOAuth2Client: any;

  beforeEach(() => {
    // Reset the Gmail client singleton
    gmailClient.reset();

    // Create mock OAuth2 client
    mockOAuth2Client = {
      setCredentials: jest.fn()
    };

    // Create mock Gmail API
    mockGmailApi = {
      users: {
        messages: {
          get: jest.fn(),
          attachments: {
            get: jest.fn()
          }
        }
      }
    };

    // Setup mocks
    (oauthManager.instance.getOAuth2Client as jest.Mock).mockResolvedValue(mockOAuth2Client);
    const { google } = require('googleapis');
    google.gmail.mockReturnValue(mockGmailApi);

    // Mock fs operations
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);

    // Clear console logs
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('End-to-End Download Flow', () => {
    it('should download attachment successfully with full workflow', async () => {
      // Mock message with attachment
      const mockMessageResponse = {
        data: {
          id: 'msg123',
          payload: {
            parts: [
              {
                partId: 'part-0',
                filename: 'document.pdf',
                mimeType: 'application/pdf',
                headers: [{ name: 'Content-Disposition', value: 'attachment; filename="document.pdf"' }],
                body: {
                  attachmentId: 'real-att-id-456',
                  size: 1024
                }
              }
            ]
          }
        }
      };

      // Mock attachment data
      const mockAttachmentResponse = {
        data: {
          data: Buffer.from('PDF content').toString('base64')
        }
      };

      mockGmailApi.users.messages.get.mockResolvedValue(mockMessageResponse);
      mockGmailApi.users.messages.attachments.get.mockResolvedValue(mockAttachmentResponse);

      // Execute download
      const result = await gmailClient.instance.downloadAttachment({
        messageId: 'msg123',
        attachmentId: 'part-0', // This is now the partId
        outputPath: process.cwd(),
        filename: 'test-document.pdf'
      });

      // Verify the workflow
      expect(mockGmailApi.users.messages.get).toHaveBeenCalledWith({
        userId: 'me',
        id: 'msg123',
        format: 'full'
      });

      expect(mockGmailApi.users.messages.attachments.get).toHaveBeenCalledWith({
        userId: 'me',
        messageId: 'msg123',
        id: 'real-att-id-456'
      });

      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('test-document.pdf'),
        expect.any(Buffer)
      );

      expect(result).toContain('test-document.pdf');
    });

    it('should handle attachment metadata extraction', async () => {
      // Mock message with multiple attachments
      const mockMessageResponse = {
        data: {
          id: 'msg123',
          payload: {
            parts: [
              {
                partId: 'part-pdf',
                filename: 'document.pdf',
                mimeType: 'application/pdf',
                headers: [{ name: 'Content-Disposition', value: 'attachment' }],
                body: { attachmentId: 'pdf-real-id', size: 2048 }
              },
              {
                partId: 'part-jpg',
                filename: 'image.jpg',
                mimeType: 'image/jpeg',
                headers: [{ name: 'Content-Disposition', value: 'attachment' }],
                body: { attachmentId: 'jpg-real-id', size: 1024 }
              },
              {
                partId: 'part-inline',
                filename: 'inline-image.png',
                mimeType: 'image/png',
                headers: [{ name: 'Content-Disposition', value: 'inline' }],
                body: { attachmentId: 'inline-real-id', size: 512 }
              },
              {
                // Part without attachment disposition
                partId: 'part-text',
                mimeType: 'text/plain',
                body: { data: 'text content' }
              }
            ]
          }
        }
      };

      mockGmailApi.users.messages.get.mockResolvedValue(mockMessageResponse);

      // Get attachment metadata
      const attachments = await gmailClient.instance.getAttachmentMetadata('msg123');

      expect(attachments).toHaveLength(2); // Should only find the 2 non-inline attachments
      expect(attachments[0]).toEqual({
        partId: 'part-pdf',
        filename: 'document.pdf',
        mimeType: 'application/pdf',
        size: 2048
      });
      expect(attachments[1]).toEqual({
        partId: 'part-jpg',
        filename: 'image.jpg',
        mimeType: 'image/jpeg',
        size: 1024
      });
    });

    it('should handle nested attachment parts', async () => {
      // Mock message with nested multipart structure
      const mockMessageResponse = {
        data: {
          id: 'msg123',
          payload: {
            parts: [
              {
                partId: '0',
                mimeType: 'multipart/mixed',
                parts: [
                  {
                    partId: '0.0',
                    mimeType: 'text/plain',
                    body: { data: 'text content' }
                  },
                  {
                    partId: '0.1',
                    filename: 'nested-attachment.doc',
                    mimeType: 'application/msword',
                    headers: [{ name: 'Content-Disposition', value: 'attachment' }],
                    body: {
                      attachmentId: 'nested-real-id-456',
                      size: 4096
                    }
                  }
                ]
              }
            ]
          }
        }
      };

      mockGmailApi.users.messages.get.mockResolvedValue(mockMessageResponse);

      const attachments = await gmailClient.instance.getAttachmentMetadata('msg123');

      expect(attachments).toHaveLength(1);
      expect(attachments[0]).toEqual({
        partId: '0.1',
        filename: 'nested-attachment.doc',
        mimeType: 'application/msword',
        size: 4096
      });
    });

    it('should validate attachment exists before download', async () => {
      // Mock message without the requested attachment
      const mockMessageResponse = {
        data: {
          id: 'msg123',
          payload: {
            partId: '0',
            parts: [
              {
                partId: '1',
                filename: 'other-file.txt',
                mimeType: 'text/plain',
                headers: [{ name: 'Content-Disposition', value: 'attachment' }],
                body: {
                  attachmentId: 'other123',
                  size: 512
                }
              }
            ]
          }
        }
      };

      mockGmailApi.users.messages.get.mockResolvedValue(mockMessageResponse);

      // Try to download non-existent attachment
      await expect(
        gmailClient.instance.downloadAttachment({
          messageId: 'msg123',
          attachmentId: 'nonexistent-part-id'
        })
      ).rejects.toThrow('Attachment with Part ID nonexistent-part-id not found');
    });

    it('should enforce size limits', async () => {
      // Mock message with large attachment
      const mockMessageResponse = {
        data: {
          id: 'msg123',
          payload: {
            parts: [
              {
                partId: 'large-part-id',
                filename: 'large-file.zip',
                mimeType: 'application/zip',
                headers: [{ name: 'Content-Disposition', value: 'attachment' }],
                body: {
                  attachmentId: 'large-real-id',
                  size: 50000000 // 50MB
                }
              }
            ]
          }
        }
      };

      mockGmailApi.users.messages.get.mockResolvedValue(mockMessageResponse);

      // Try to download with size limit
      await expect(
        gmailClient.instance.downloadAttachment({
          messageId: 'msg123',
          attachmentId: 'large-part-id',
          maxSizeBytes: 10000000 // 10MB limit
        })
      ).rejects.toThrow('Attachment size (50000000 bytes) exceeds maximum allowed size');
    });

    it('should handle base64url decoding correctly', async () => {
      const mockMessageResponse = {
        data: {
          id: 'msg123',
          payload: {
            parts: [
              {
                partId: 'part-456',
                filename: 'test.txt',
                mimeType: 'text/plain',
                headers: [{ name: 'Content-Disposition', value: 'attachment' }],
                body: {
                  attachmentId: 'real-att-id-456',
                  size: 100
                }
              }
            ]
          }
        }
      };

      // Mock attachment with base64url encoded data (Gmail API format)
      const originalText = 'Hello, World! This is a test file.';
      const base64urlData = Buffer.from(originalText)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      const mockAttachmentResponse = {
        data: {
          data: base64urlData
        }
      };

      mockGmailApi.users.messages.get.mockResolvedValue(mockMessageResponse);
      mockGmailApi.users.messages.attachments.get.mockResolvedValue(mockAttachmentResponse);

      await gmailClient.instance.downloadAttachment({
        messageId: 'msg123',
        attachmentId: 'part-456'
      });

      // Verify the decoded content was written correctly
      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        Buffer.from(originalText)
      );
    });
  });

  describe('Error Scenarios', () => {
    it('should handle Gmail API errors gracefully', async () => {
      const apiError = {
        code: 403,
        message: 'Insufficient permissions'
      };

      mockGmailApi.users.messages.get.mockRejectedValue(apiError);

      await expect(
        gmailClient.instance.getAttachmentMetadata('msg123')
      ).rejects.toThrow('Insufficient permissions for Gmail access');
    });

    it('should handle missing attachment data', async () => {
      const mockMessageResponse = {
        data: {
          id: 'msg123',
          payload: {
            parts: [
              {
                partId: 'part-456',
                filename: 'test.txt',
                mimeType: 'text/plain',
                headers: [{ name: 'Content-Disposition', value: 'attachment' }],
                body: {
                  attachmentId: 'real-att-id-456',
                  size: 100
                }
              }
            ]
          }
        }
      };

      const mockAttachmentResponse = {
        data: {} // Missing data field
      };

      mockGmailApi.users.messages.get.mockResolvedValue(mockMessageResponse);
      mockGmailApi.users.messages.attachments.get.mockResolvedValue(mockAttachmentResponse);

      await expect(
        gmailClient.instance.downloadAttachment({
          messageId: 'msg123',
          attachmentId: 'part-456'
        })
      ).rejects.toThrow('No attachment data returned from Gmail API');
    });

    it('should handle file system errors', async () => {
      const mockMessageResponse = {
        data: {
          id: 'msg123',
          payload: {
            parts: [
              {
                partId: 'part-456',
                filename: 'test.txt',
                mimeType: 'text/plain',
                headers: [{ name: 'Content-Disposition', value: 'attachment' }],
                body: {
                  attachmentId: 'real-att-id-456',
                  size: 100
                }
              }
            ]
          }
        }
      };

      const mockAttachmentResponse = {
        data: {
          data: Buffer.from('test content').toString('base64')
        }
      };

      mockGmailApi.users.messages.get.mockResolvedValue(mockMessageResponse);
      mockGmailApi.users.messages.attachments.get.mockResolvedValue(mockAttachmentResponse);

      // Mock file write error
      (fs.promises.writeFile as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      await expect(
        gmailClient.instance.downloadAttachment({
          messageId: 'msg123',
          attachmentId: 'part-456'
        })
      ).rejects.toThrow('Permission denied');
    });
  });
});
