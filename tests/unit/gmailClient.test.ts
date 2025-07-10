/**
 * Gmail Client Unit Tests
 * 
 * Tests for the Gmail API client functionality including message operations,
 * authentication integration, and error handling.
 */

import { GmailClient, gmailClient } from '../../src/services/gmail/gmailClient';
import { CalendarError, MCPErrorCode } from '../../src/types/mcp';
import { oauthManager } from '../../src/auth/oauthManager';

// Mock the OAuth manager
jest.mock('../../src/auth/oauthManager', () => ({
  oauthManager: {
    instance: {
      getOAuth2Client: jest.fn(),
      ensureScopes: jest.fn().mockResolvedValue(undefined)
    }
  }
}));

// Mock googleapis
jest.mock('googleapis', () => ({
  google: {
    gmail: jest.fn()
  }
}));

describe('GmailClient', () => {
  let client: GmailClient;
  let mockGmailApi: any;
  let mockOAuth2Client: any;

  beforeEach(() => {
    // Reset the singleton
    gmailClient.reset();
    client = gmailClient.instance;

    // Create mock OAuth2 client
    mockOAuth2Client = {
      setCredentials: jest.fn()
    };

    // Create mock Gmail API
    mockGmailApi = {
      users: {
        messages: {
          list: jest.fn(),
          get: jest.fn(),
          send: jest.fn()
        }
      }
    };

    // Setup mocks
    (oauthManager.instance.getOAuth2Client as jest.Mock).mockResolvedValue(mockOAuth2Client);
    const { google } = require('googleapis');
    google.gmail.mockReturnValue(mockGmailApi);

    // Clear console logs
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should create a new client instance', () => {
      expect(client).toBeInstanceOf(GmailClient);
    });

    it('should provide singleton access', () => {
      const instance1 = gmailClient.instance;
      const instance2 = gmailClient.instance;
      expect(instance1).toBe(instance2);
    });

    it('should reset singleton instance', () => {
      const instance1 = gmailClient.instance;
      gmailClient.reset();
      const instance2 = gmailClient.instance;
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('listMessages', () => {
    it('should list messages successfully', async () => {
      // Mock API response
      const mockResponse = {
        data: {
          messages: [
            { id: 'msg1', threadId: 'thread1' },
            { id: 'msg2', threadId: 'thread2' }
          ]
        }
      };

      const mockMessageDetails = {
        data: {
          id: 'msg1',
          threadId: 'thread1',
          snippet: 'Test message snippet',
          labelIds: ['INBOX'],
          payload: {
            headers: [
              { name: 'Subject', value: 'Test Subject' },
              { name: 'From', value: 'test@example.com' },
              { name: 'Date', value: '2024-01-01T10:00:00Z' }
            ],
            body: {
              data: Buffer.from('Test message body').toString('base64')
            }
          }
        }
      };

      mockGmailApi.users.messages.list.mockResolvedValue(mockResponse);
      mockGmailApi.users.messages.get.mockResolvedValue(mockMessageDetails);

      const result = await client.listMessages({ maxResults: 2 });

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'msg1',
        threadId: 'thread1',
        snippet: 'Test message snippet',
        subject: 'Test Subject',
        from: 'test@example.com'
      });

      expect(mockGmailApi.users.messages.list).toHaveBeenCalledWith({
        userId: 'me',
        maxResults: 2,
        includeSpamTrash: false
      });
    });

    it('should handle empty message list', async () => {
      mockGmailApi.users.messages.list.mockResolvedValue({
        data: { messages: [] }
      });

      const result = await client.listMessages();

      expect(result).toEqual([]);
      expect(mockGmailApi.users.messages.list).toHaveBeenCalled();
    });

    it('should apply query filter', async () => {
      mockGmailApi.users.messages.list.mockResolvedValue({
        data: { messages: [] }
      });

      await client.listMessages({ 
        query: 'from:test@example.com',
        maxResults: 5
      });

      expect(mockGmailApi.users.messages.list).toHaveBeenCalledWith({
        userId: 'me',
        maxResults: 5,
        includeSpamTrash: false,
        q: 'from:test@example.com'
      });
    });

    it('should cap maxResults at 100', async () => {
      mockGmailApi.users.messages.list.mockResolvedValue({
        data: { messages: [] }
      });

      await client.listMessages({ maxResults: 200 });

      expect(mockGmailApi.users.messages.list).toHaveBeenCalledWith({
        userId: 'me',
        maxResults: 100,
        includeSpamTrash: false
      });
    });
  });

  describe('getMessage', () => {
    it('should get message successfully', async () => {
      const mockResponse = {
        data: {
          id: 'msg1',
          threadId: 'thread1',
          snippet: 'Test message',
          labelIds: ['INBOX'],
          payload: {
            headers: [
              { name: 'Subject', value: 'Test Subject' },
              { name: 'From', value: 'sender@example.com' }
            ],
            body: {
              data: Buffer.from('Message body content').toString('base64')
            }
          }
        }
      };

      mockGmailApi.users.messages.get.mockResolvedValue(mockResponse);

      const result = await client.getMessage('msg1');

      expect(result).toMatchObject({
        id: 'msg1',
        threadId: 'thread1',
        snippet: 'Test message',
        subject: 'Test Subject',
        from: 'sender@example.com',
        body: 'Message body content',
        isRead: true
      });

      expect(mockGmailApi.users.messages.get).toHaveBeenCalledWith({
        userId: 'me',
        id: 'msg1',
        format: 'metadata'
      });
    });

    it('should handle multipart messages', async () => {
      const mockResponse = {
        data: {
          id: 'msg1',
          threadId: 'thread1',
          snippet: 'Multipart message',
          labelIds: ['INBOX'],
          payload: {
            headers: [
              { name: 'Subject', value: 'Multipart Test' }
            ],
            parts: [
              {
                mimeType: 'text/plain',
                body: {
                  data: Buffer.from('Plain text content').toString('base64')
                }
              },
              {
                mimeType: 'text/html',
                body: {
                  data: Buffer.from('<p>HTML content</p>').toString('base64')
                }
              }
            ]
          }
        }
      };

      mockGmailApi.users.messages.get.mockResolvedValue(mockResponse);

      const result = await client.getMessage('msg1');

      expect(result.body).toBe('Plain text content');
    });

    it('should mark unread messages correctly', async () => {
      const mockResponse = {
        data: {
          id: 'msg1',
          threadId: 'thread1',
          snippet: 'Unread message',
          labelIds: ['INBOX', 'UNREAD'],
          payload: {
            headers: [],
            body: { data: '' }
          }
        }
      };

      mockGmailApi.users.messages.get.mockResolvedValue(mockResponse);

      const result = await client.getMessage('msg1');

      expect(result.isRead).toBe(false);
    });
  });

  describe('sendMessage', () => {
    it('should send message successfully', async () => {
      const mockSendResponse = {
        data: { id: 'sent-msg-id' }
      };

      const mockGetResponse = {
        data: {
          id: 'sent-msg-id',
          threadId: 'thread1',
          snippet: 'Sent message',
          labelIds: ['SENT'],
          payload: {
            headers: [
              { name: 'Subject', value: 'Test Subject' },
              { name: 'To', value: 'recipient@example.com' }
            ],
            body: {
              data: Buffer.from('Test message body').toString('base64')
            }
          }
        }
      };

      mockGmailApi.users.messages.send.mockResolvedValue(mockSendResponse);
      mockGmailApi.users.messages.get.mockResolvedValue(mockGetResponse);

      const params = {
        to: ['recipient@example.com'],
        subject: 'Test Subject',
        body: 'Test message body'
      };

      const result = await client.sendMessage(params);

      expect(result.id).toBe('sent-msg-id');
      expect(result.subject).toBe('Test Subject');

      expect(mockGmailApi.users.messages.send).toHaveBeenCalledWith({
        userId: 'me',
        requestBody: {
          raw: expect.any(String)
        }
      });
    });

    it('should validate required fields', async () => {
      const invalidParams = {
        to: [],
        subject: '',
        body: 'Test body'
      };

      await expect(client.sendMessage(invalidParams as any))
        .rejects
        .toThrow(CalendarError);
    });

    it('should validate email addresses', async () => {
      const invalidParams = {
        to: ['invalid-email'],
        subject: 'Test Subject',
        body: 'Test body'
      };

      await expect(client.sendMessage(invalidParams))
        .rejects
        .toThrow('Invalid email address');
    });

    it('should include CC and BCC recipients', async () => {
      const mockSendResponse = { data: { id: 'sent-msg-id' } };
      const mockGetResponse = {
        data: {
          id: 'sent-msg-id',
          threadId: 'thread1',
          snippet: 'Sent message',
          labelIds: ['SENT'],
          payload: { headers: [], body: { data: '' } }
        }
      };

      mockGmailApi.users.messages.send.mockResolvedValue(mockSendResponse);
      mockGmailApi.users.messages.get.mockResolvedValue(mockGetResponse);

      const params = {
        to: ['to@example.com'],
        cc: ['cc@example.com'],
        bcc: ['bcc@example.com'],
        subject: 'Test Subject',
        body: 'Test body'
      };

      await client.sendMessage(params);

      expect(mockGmailApi.users.messages.send).toHaveBeenCalled();
    });
  });

  describe('searchMessages', () => {
    it('should search messages successfully', async () => {
      const mockResponse = {
        data: {
          messages: [
            { id: 'search-result-1', threadId: 'thread1' }
          ]
        }
      };

      const mockMessageDetails = {
        data: {
          id: 'search-result-1',
          threadId: 'thread1',
          snippet: 'Search result',
          labelIds: ['INBOX'],
          payload: {
            headers: [
              { name: 'Subject', value: 'Search Result Subject' }
            ],
            body: { data: '' }
          }
        }
      };

      mockGmailApi.users.messages.list.mockResolvedValue(mockResponse);
      mockGmailApi.users.messages.get.mockResolvedValue(mockMessageDetails);

      const result = await client.searchMessages('from:test@example.com');

      expect(result).toHaveLength(1);
      expect(result[0].subject).toBe('Search Result Subject');

      expect(mockGmailApi.users.messages.list).toHaveBeenCalledWith({
        userId: 'me',
        maxResults: 20,
        includeSpamTrash: false,
        q: 'from:test@example.com'
      });
    });

    it('should validate search query', async () => {
      await expect(client.searchMessages(''))
        .rejects
        .toThrow('Search query is required');

      await expect(client.searchMessages('   '))
        .rejects
        .toThrow('Search query is required');
    });

    it('should limit search results', async () => {
      mockGmailApi.users.messages.list.mockResolvedValue({
        data: { messages: [] }
      });

      await client.searchMessages('test query', 150);

      expect(mockGmailApi.users.messages.list).toHaveBeenCalledWith({
        userId: 'me',
        maxResults: 100, // Should be capped at 100
        includeSpamTrash: false,
        q: 'test query'
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors', async () => {
      (oauthManager.instance.getOAuth2Client as jest.Mock).mockRejectedValue(
        new Error('Authentication failed')
      );

      await expect(client.listMessages())
        .rejects
        .toThrow(CalendarError);
    });

    it('should handle API errors', async () => {
      const apiError = {
        code: 403,
        message: 'Insufficient permissions'
      };

      mockGmailApi.users.messages.list.mockRejectedValue(apiError);

      await expect(client.listMessages())
        .rejects
        .toThrow('Insufficient permissions for Gmail access');
    });

    it('should handle rate limit errors', async () => {
      const rateLimitError = {
        code: 429,
        message: 'Rate limit exceeded'
      };

      mockGmailApi.users.messages.list.mockRejectedValue(rateLimitError);

      await expect(client.listMessages())
        .rejects
        .toThrow('Rate limit exceeded');
    });

    it('should handle not found errors', async () => {
      const notFoundError = {
        code: 404,
        message: 'Message not found'
      };

      mockGmailApi.users.messages.get.mockRejectedValue(notFoundError);

      await expect(client.getMessage('nonexistent'))
        .rejects
        .toThrow('Gmail resource not found');
    });
  });

  describe('Message Body Extraction', () => {
    it('should extract body from simple message', async () => {
      const mockResponse = {
        data: {
          id: 'msg1',
          threadId: 'thread1',
          snippet: 'Simple message',
          labelIds: ['INBOX'],
          payload: {
            headers: [],
            body: {
              data: Buffer.from('Simple message body').toString('base64')
            }
          }
        }
      };

      mockGmailApi.users.messages.get.mockResolvedValue(mockResponse);

      const result = await client.getMessage('msg1');

      expect(result.body).toBe('Simple message body');
    });

    it('should handle missing body data', async () => {
      const mockResponse = {
        data: {
          id: 'msg1',
          threadId: 'thread1',
          snippet: 'No body message',
          labelIds: ['INBOX'],
          payload: {
            headers: [],
            body: {}
          }
        }
      };

      mockGmailApi.users.messages.get.mockResolvedValue(mockResponse);

      const result = await client.getMessage('msg1');

      expect(result.body).toBe('');
    });

    it('should handle malformed base64 data', async () => {
      const mockResponse = {
        data: {
          id: 'msg1',
          threadId: 'thread1',
          snippet: 'Malformed message',
          labelIds: ['INBOX'],
          payload: {
            headers: [],
            body: {
              data: 'invalid-base64-data!!!'
            }
          }
        }
      };

      mockGmailApi.users.messages.get.mockResolvedValue(mockResponse);

      const result = await client.getMessage('msg1');

      expect(result.body).toBe('');
    });
  });
});
