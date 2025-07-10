/**
 * Gmail Service Integration Tests
 * 
 * Tests the complete Gmail service workflow including API integration,
 * error handling, and data transformation across the Gmail system.
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

import { GmailClient } from '../../src/services/gmail/gmailClient';
import { gmailListMessagesTool } from '../../src/services/gmail/tools/listMessages';
import { gmailGetMessageTool } from '../../src/services/gmail/tools/getMessage';
import { oauthManager } from '../../src/auth/oauthManager';

// Mock Gmail API
const mockGmailApi = {
  users: {
    messages: {
      list: jest.fn(),
      get: jest.fn(),
    },
  },
};

jest.mock('googleapis', () => ({
  google: {
    gmail: jest.fn(() => mockGmailApi),
    auth: {
      OAuth2: jest.fn(),
    },
  },
}));

describe('Gmail Service Integration', () => {
  let gmailClient: GmailClient;

  beforeEach(() => {
    jest.clearAllMocks();
    gmailClient = new GmailClient();
    
    // Mock OAuth client
    (oauthManager.instance.getOAuth2Client as jest.Mock).mockResolvedValue({
      credentials: { access_token: 'mock-token' }
    });
  });

  describe('gmail message listing integration', () => {
    test('should list messages successfully with proper data transformation', async () => {
      // Mock Gmail API responses
      const mockListResponse = {
        data: {
          messages: [
            { id: 'msg-1', threadId: 'thread-1' },
            { id: 'msg-2', threadId: 'thread-2' }
          ]
        }
      };

      const mockMessage1 = {
        data: {
          id: 'msg-1',
          threadId: 'thread-1',
          snippet: 'This is the first test message...',
          labelIds: ['INBOX'],
          payload: {
            headers: [
              { name: 'Subject', value: 'Test Subject 1' },
              { name: 'From', value: 'sender1@example.com' },
              { name: 'To', value: 'recipient@example.com' },
              { name: 'Date', value: 'Mon, 15 Jan 2024 10:00:00 +0000' }
            ],
            body: {
              data: Buffer.from('This is the message body').toString('base64')
            }
          }
        }
      };

      const mockMessage2 = {
        data: {
          id: 'msg-2',
          threadId: 'thread-2',
          snippet: 'This is the second test message...',
          labelIds: ['INBOX', 'UNREAD'],
          payload: {
            headers: [
              { name: 'Subject', value: 'Test Subject 2' },
              { name: 'From', value: 'sender2@example.com' },
              { name: 'Date', value: 'Tue, 16 Jan 2024 11:00:00 +0000' }
            ],
            body: {
              data: Buffer.from('This is another message body').toString('base64')
            }
          }
        }
      };

      mockGmailApi.users.messages.list.mockResolvedValue(mockListResponse);
      mockGmailApi.users.messages.get
        .mockResolvedValueOnce(mockMessage1)
        .mockResolvedValueOnce(mockMessage2);

      // Test Gmail client
      const messages = await gmailClient.listMessages({
        maxResults: 10,
        query: 'in:inbox'
      });

      // Verify API calls
      expect(mockGmailApi.users.messages.list).toHaveBeenCalledWith({
        userId: 'me',
        maxResults: 10,
        includeSpamTrash: false,
        q: 'in:inbox'
      });

      expect(mockGmailApi.users.messages.get).toHaveBeenCalledTimes(2);
      expect(mockGmailApi.users.messages.get).toHaveBeenCalledWith({
        userId: 'me',
        id: 'msg-1',
        format: 'metadata'
      });

      // Verify data transformation
      expect(messages).toHaveLength(2);
      
      // First message
      expect(messages[0]).toEqual({
        id: 'msg-1',
        threadId: 'thread-1',
        snippet: 'This is the first test message...',
        subject: 'Test Subject 1',
        from: 'sender1@example.com',
        to: 'recipient@example.com',
        date: 'Mon, 15 Jan 2024 10:00:00 +0000',
        body: 'This is the message body',
        isRead: true,
        labels: ['INBOX']
      });

      // Second message (unread)
      expect(messages[1]).toEqual({
        id: 'msg-2',
        threadId: 'thread-2',
        snippet: 'This is the second test message...',
        subject: 'Test Subject 2',
        from: 'sender2@example.com',
        date: 'Tue, 16 Jan 2024 11:00:00 +0000',
        body: 'This is another message body',
        isRead: false,
        labels: ['INBOX', 'UNREAD']
      });
    });

    test('should handle empty message list', async () => {
      mockGmailApi.users.messages.list.mockResolvedValue({
        data: { messages: [] }
      });

      const messages = await gmailClient.listMessages();

      expect(messages).toEqual([]);
      expect(mockGmailApi.users.messages.list).toHaveBeenCalled();
    });

    test('should handle messages with missing headers gracefully', async () => {
      const mockListResponse = {
        data: {
          messages: [{ id: 'msg-minimal', threadId: 'thread-minimal' }]
        }
      };

      const mockMinimalMessage = {
        data: {
          id: 'msg-minimal',
          threadId: 'thread-minimal',
          snippet: 'Minimal message',
          labelIds: ['INBOX'],
          payload: {
            headers: [], // No headers
            body: { data: '' }
          }
        }
      };

      mockGmailApi.users.messages.list.mockResolvedValue(mockListResponse);
      mockGmailApi.users.messages.get.mockResolvedValue(mockMinimalMessage);

      const messages = await gmailClient.listMessages();

      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({
        id: 'msg-minimal',
        threadId: 'thread-minimal',
        snippet: 'Minimal message',
        body: '',
        isRead: true,
        labels: ['INBOX']
      });
    });

    test('should handle API errors gracefully', async () => {
      mockGmailApi.users.messages.list.mockRejectedValue({
        code: 403,
        message: 'Insufficient permissions for Gmail access'
      });

      await expect(gmailClient.listMessages()).rejects.toThrow('Insufficient permissions for Gmail access');
    });

    test('should handle individual message fetch errors', async () => {
      const mockListResponse = {
        data: {
          messages: [
            { id: 'msg-good', threadId: 'thread-good' },
            { id: 'msg-bad', threadId: 'thread-bad' }
          ]
        }
      };

      const mockGoodMessage = {
        data: {
          id: 'msg-good',
          threadId: 'thread-good',
          snippet: 'Good message',
          labelIds: ['INBOX'],
          payload: {
            headers: [{ name: 'Subject', value: 'Good Subject' }],
            body: { data: '' }
          }
        }
      };

      mockGmailApi.users.messages.list.mockResolvedValue(mockListResponse);
      mockGmailApi.users.messages.get
        .mockResolvedValueOnce(mockGoodMessage)
        .mockRejectedValueOnce(new Error('Message not found'));

      const messages = await gmailClient.listMessages();

      // Should return only the successful message
      expect(messages).toHaveLength(1);
      expect(messages[0].id).toBe('msg-good');
    });
  });

  describe('tool integration with Gmail service', () => {
    test('should integrate list messages tool with Gmail client', async () => {
      const mockListResponse = {
        data: {
          messages: [{ id: 'tool-msg-1', threadId: 'tool-thread-1' }]
        }
      };

      const mockMessage = {
        data: {
          id: 'tool-msg-1',
          threadId: 'tool-thread-1',
          snippet: 'Tool test message snippet',
          labelIds: ['INBOX'],
          payload: {
            headers: [
              { name: 'Subject', value: 'Tool Test Subject' },
              { name: 'From', value: 'tooltest@example.com' },
              { name: 'Date', value: 'Wed, 17 Jan 2024 12:00:00 +0000' }
            ],
            body: { data: '' }
          }
        }
      };

      mockGmailApi.users.messages.list.mockResolvedValue(mockListResponse);
      mockGmailApi.users.messages.get.mockResolvedValue(mockMessage);

      const result = await gmailListMessagesTool.handler({
        maxResults: 5,
        query: 'from:tooltest@example.com'
      });

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Tool Test Subject');
      expect(result.content[0].text).toContain('tooltest@example.com');
      expect(result.content[0].text).toContain('Tool test message snippet');
    });

    test('should handle no messages found', async () => {
      mockGmailApi.users.messages.list.mockResolvedValue({
        data: { messages: [] }
      });

      const result = await gmailListMessagesTool.handler({
        query: 'from:nonexistent@example.com'
      });

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toBe('No messages found.');
    });

    test('should handle tool errors gracefully', async () => {
      mockGmailApi.users.messages.list.mockRejectedValue({
        code: 401,
        message: 'Authentication failed'
      });

      const result = await gmailListMessagesTool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Authentication failed');
    });

    test('should format multiple messages correctly', async () => {
      const mockListResponse = {
        data: {
          messages: [
            { id: 'msg-1', threadId: 'thread-1' },
            { id: 'msg-2', threadId: 'thread-2' }
          ]
        }
      };

      const mockMessage1 = {
        data: {
          id: 'msg-1',
          threadId: 'thread-1',
          snippet: 'First message',
          labelIds: ['INBOX'],
          payload: {
            headers: [
              { name: 'Subject', value: 'First Subject' },
              { name: 'From', value: 'first@example.com' }
            ],
            body: { data: '' }
          }
        }
      };

      const mockMessage2 = {
        data: {
          id: 'msg-2',
          threadId: 'thread-2',
          snippet: 'Second message',
          labelIds: ['INBOX', 'UNREAD'],
          payload: {
            headers: [
              { name: 'Subject', value: 'Second Subject' },
              { name: 'From', value: 'second@example.com' }
            ],
            body: { data: '' }
          }
        }
      };

      mockGmailApi.users.messages.list.mockResolvedValue(mockListResponse);
      mockGmailApi.users.messages.get
        .mockResolvedValueOnce(mockMessage1)
        .mockResolvedValueOnce(mockMessage2);

      const result = await gmailListMessagesTool.handler({});

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('First Subject');
      expect(result.content[0].text).toContain('Second Subject');
      expect(result.content[0].text).toContain('---'); // Message separator
      expect(result.content[0].text).toContain('[UNREAD]'); // Unread indicator
    });
  });

  describe('error handling across service layers', () => {
    test('should propagate authentication errors correctly', async () => {
      (oauthManager.instance.getOAuth2Client as jest.Mock).mockRejectedValue(
        new Error('Authentication failed')
      );

      await expect(gmailClient.listMessages()).rejects.toThrow('Failed to initialize Gmail API client');
    });

    test('should handle rate limiting errors', async () => {
      mockGmailApi.users.messages.list.mockRejectedValue({
        code: 429,
        message: 'Rate limit exceeded'
      });

      await expect(gmailClient.listMessages()).rejects.toThrow('Rate limit exceeded');
    });

    test('should handle network errors', async () => {
      mockGmailApi.users.messages.list.mockRejectedValue(
        new Error('Network error')
      );

      await expect(gmailClient.listMessages()).rejects.toThrow('Failed to list messages: Network error');
    });

    test('should handle invalid message format errors', async () => {
      const mockListResponse = {
        data: {
          messages: [{ id: 'invalid-msg', threadId: 'invalid-thread' }]
        }
      };

      mockGmailApi.users.messages.list.mockResolvedValue(mockListResponse);
      mockGmailApi.users.messages.get.mockResolvedValue({
        data: null // Invalid response
      });

      // Should handle gracefully and continue with other messages
      const messages = await gmailClient.listMessages();
      expect(messages).toEqual([]);
    });
  });

  describe('concurrent operations', () => {
    test('should handle concurrent Gmail operations', async () => {
      // Mock different responses for different operations
      mockGmailApi.users.messages.list.mockResolvedValue({
        data: { messages: [] }
      });

      // Execute multiple list operations concurrently
      const promises = [
        gmailClient.listMessages({ maxResults: 5 }),
        gmailClient.listMessages({ maxResults: 10, query: 'is:unread' }),
        gmailClient.listMessages({ query: 'from:test@example.com' })
      ];

      const results = await Promise.all(promises);

      // All operations should succeed
      expect(results).toHaveLength(3);
      expect(Array.isArray(results[0])).toBe(true);
      expect(Array.isArray(results[1])).toBe(true);
      expect(Array.isArray(results[2])).toBe(true);
    });
  });

  describe('getMessage integration with metadata format', () => {
    test('should retrieve message successfully with metadata format', async () => {
      // Test the exact scenario that was failing - using a message ID like the user encountered
      const testMessageId = '1906eadbc76bbcc7';
      const mockMessage = {
        data: {
          id: testMessageId,
          threadId: 'thread-abc123',
          snippet: 'This is a test message that should work with metadata format...',
          labelIds: ['INBOX'],
          payload: {
            headers: [
              { name: 'Subject', value: 'Test Message Subject' },
              { name: 'From', value: 'sender@example.com' },
              { name: 'To', value: 'recipient@example.com' },
              { name: 'Date', value: 'Thu, 18 Jan 2024 14:30:00 +0000' }
            ],
            body: {
              data: Buffer.from('This is the message body content').toString('base64')
            }
          }
        }
      };

      mockGmailApi.users.messages.get.mockResolvedValue(mockMessage);

      // Test Gmail client getMessage directly
      const message = await gmailClient.getMessage(testMessageId);

      // Verify API call uses metadata format
      expect(mockGmailApi.users.messages.get).toHaveBeenCalledWith({
        userId: 'me',
        id: testMessageId,
        format: 'metadata'
      });

      // Verify message data transformation
      expect(message).toEqual({
        id: testMessageId,
        threadId: 'thread-abc123',
        snippet: 'This is a test message that should work with metadata format...',
        subject: 'Test Message Subject',
        from: 'sender@example.com',
        to: 'recipient@example.com',
        date: 'Thu, 18 Jan 2024 14:30:00 +0000',
        body: 'This is the message body content',
        isRead: true,
        labels: ['INBOX']
      });
    });

    test('should integrate getMessage tool with Gmail client successfully', async () => {
      const testMessageId = '1906eadbc76bbcc7';
      const mockMessage = {
        data: {
          id: testMessageId,
          threadId: 'thread-def456',
          snippet: 'Tool integration test message...',
          labelIds: ['INBOX', 'IMPORTANT'],
          payload: {
            headers: [
              { name: 'Subject', value: 'Important Tool Test' },
              { name: 'From', value: 'important@example.com' },
              { name: 'To', value: 'user@example.com' },
              { name: 'Date', value: 'Fri, 19 Jan 2024 09:15:00 +0000' }
            ],
            body: {
              data: Buffer.from('This is an important message for tool testing').toString('base64')
            }
          }
        }
      };

      mockGmailApi.users.messages.get.mockResolvedValue(mockMessage);

      // Test getMessage tool
      const result = await gmailGetMessageTool.handler({ messageId: testMessageId });

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      
      const text = result.content[0].text;
      expect(text).toContain(`Message ID: ${testMessageId}`);
      expect(text).toContain('Subject: Important Tool Test');
      expect(text).toContain('From: important@example.com');
      expect(text).toContain('To: user@example.com');
      expect(text).toContain('Status: READ');
      expect(text).toContain('Labels: INBOX, IMPORTANT');
      expect(text).toContain('--- Message Body ---');
      expect(text).toContain('This is an important message for tool testing');
    });

    test('should handle 404 errors gracefully with improved error message', async () => {
      const testMessageId = 'nonexistent-message-id';
      
      mockGmailApi.users.messages.get.mockRejectedValue({
        code: 404,
        message: 'Requested entity was not found.'
      });

      // Test Gmail client error handling
      await expect(gmailClient.getMessage(testMessageId)).rejects.toThrow('Gmail resource not found during get message');

      // Test tool error handling
      const result = await gmailGetMessageTool.handler({ messageId: testMessageId });
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Gmail resource not found during get message');
    });

    test('should handle messages with minimal metadata gracefully', async () => {
      const testMessageId = 'minimal-message-id';
      const mockMinimalMessage = {
        data: {
          id: testMessageId,
          threadId: 'thread-minimal',
          snippet: 'Minimal message with no headers',
          labelIds: ['INBOX'],
          payload: {
            headers: [], // No headers
            body: { data: '' } // No body
          }
        }
      };

      mockGmailApi.users.messages.get.mockResolvedValue(mockMinimalMessage);

      const message = await gmailClient.getMessage(testMessageId);

      expect(message).toEqual({
        id: testMessageId,
        threadId: 'thread-minimal',
        snippet: 'Minimal message with no headers',
        body: '',
        isRead: true,
        labels: ['INBOX']
      });

      // Test tool formatting with minimal message
      const result = await gmailGetMessageTool.handler({ messageId: testMessageId });
      
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain(`Message ID: ${testMessageId}`);
      expect(result.content[0].text).toContain('[Preview]: Minimal message with no headers');
    });

    test('should handle authentication errors in getMessage', async () => {
      const testMessageId = 'auth-test-message';
      
      mockGmailApi.users.messages.get.mockRejectedValue({
        code: 401,
        message: 'Authentication failed'
      });

      await expect(gmailClient.getMessage(testMessageId)).rejects.toThrow('Authentication failed');

      const result = await gmailGetMessageTool.handler({ messageId: testMessageId });
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Authentication failed');
    });

    test('should handle rate limiting in getMessage', async () => {
      const testMessageId = 'rate-limit-test';
      
      mockGmailApi.users.messages.get.mockRejectedValue({
        code: 429,
        message: 'Rate limit exceeded'
      });

      await expect(gmailClient.getMessage(testMessageId)).rejects.toThrow('Rate limit exceeded');
    });

    test('should validate messageId parameter in getMessage tool', async () => {
      // Test missing messageId
      let result = await gmailGetMessageTool.handler({});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('Error: messageId is required and must be a string');

      // Test invalid messageId type
      result = await gmailGetMessageTool.handler({ messageId: 123 });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('Error: messageId is required and must be a string');

      // Test empty messageId
      result = await gmailGetMessageTool.handler({ messageId: '   ' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('Error: messageId cannot be empty');
    });

    test('should handle concurrent getMessage operations', async () => {
      const messageIds = ['msg1', 'msg2', 'msg3'];
      const mockMessages = messageIds.map((id, index) => ({
        data: {
          id,
          threadId: `thread-${id}`,
          snippet: `Message ${index + 1} snippet`,
          labelIds: ['INBOX'],
          payload: {
            headers: [
              { name: 'Subject', value: `Subject ${index + 1}` },
              { name: 'From', value: `sender${index + 1}@example.com` }
            ],
            body: { data: '' }
          }
        }
      }));

      mockGmailApi.users.messages.get
        .mockResolvedValueOnce(mockMessages[0])
        .mockResolvedValueOnce(mockMessages[1])
        .mockResolvedValueOnce(mockMessages[2]);

      // Execute concurrent getMessage operations
      const promises = messageIds.map(id => gmailClient.getMessage(id));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(results[0].id).toBe('msg1');
      expect(results[1].id).toBe('msg2');
      expect(results[2].id).toBe('msg3');
    });
  });

  describe('parameter validation and processing', () => {
    test('should handle various query parameters correctly', async () => {
      mockGmailApi.users.messages.list.mockResolvedValue({
        data: { messages: [] }
      });

      // Test different parameter combinations
      await gmailClient.listMessages({
        query: 'from:test@example.com subject:important',
        maxResults: 25,
        includeSpamTrash: true
      });

      expect(mockGmailApi.users.messages.list).toHaveBeenCalledWith({
        userId: 'me',
        maxResults: 25,
        includeSpamTrash: true,
        q: 'from:test@example.com subject:important'
      });
    });

    test('should cap maxResults at 100', async () => {
      mockGmailApi.users.messages.list.mockResolvedValue({
        data: { messages: [] }
      });

      await gmailClient.listMessages({ maxResults: 500 });

      expect(mockGmailApi.users.messages.list).toHaveBeenCalledWith({
        userId: 'me',
        maxResults: 100,
        includeSpamTrash: false
      });
    });

    test('should use default parameters when none provided', async () => {
      mockGmailApi.users.messages.list.mockResolvedValue({
        data: { messages: [] }
      });

      await gmailClient.listMessages();

      expect(mockGmailApi.users.messages.list).toHaveBeenCalledWith({
        userId: 'me',
        maxResults: 10,
        includeSpamTrash: false
      });
    });
  });
});
