/**
 * Gmail List Messages Tool Unit Tests
 * 
 * Tests for the gmail_list_messages MCP tool following established patterns
 */

import { gmailListMessagesTool } from '../../src/services/gmail/tools/listMessages';
import { gmailClient, GmailMessage } from '../../src/services/gmail/gmailClient';
import { CalendarError, MCPErrorCode } from '../../src/types/mcp';

// Mock the Gmail client
jest.mock('../../src/services/gmail/gmailClient', () => ({
  gmailClient: {
    instance: {
      listMessages: jest.fn()
    }
  }
}));

const mockGmailClient = gmailClient.instance as jest.Mocked<typeof gmailClient.instance>;

describe('Gmail List Messages Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Tool Definition', () => {
    test('has correct name and description', () => {
      expect(gmailListMessagesTool.name).toBe('gmail_list_messages');
      expect(gmailListMessagesTool.description).toContain('List');
      expect(gmailListMessagesTool.description).toContain('Gmail messages');
    });

    test('has correct input schema', () => {
      const schema = gmailListMessagesTool.inputSchema;
      expect(schema.type).toBe('object');
      expect(schema.properties).toHaveProperty('query');
      expect(schema.properties).toHaveProperty('maxResults');
      expect(schema.properties).toHaveProperty('includeSpamTrash');
      expect(schema.properties).toHaveProperty('fetchAll');
      expect(schema.properties).toHaveProperty('pageSize');
      expect(schema.properties).toHaveProperty('maxTotalResults');
      expect(schema.properties).toHaveProperty('pageToken');
    });

    test('has handler function', () => {
      expect(typeof gmailListMessagesTool.handler).toBe('function');
    });
  });

  describe('Message Listing', () => {
    test('successfully lists messages', async () => {
      const mockMessages: GmailMessage[] = [
        {
          id: '1',
          threadId: 'thread1',
          snippet: 'Test message snippet',
          subject: 'Test Subject',
          from: 'test@example.com',
          date: '2024-01-01T10:00:00Z',
          isRead: true,
          labels: ['INBOX']
        },
        {
          id: '2',
          threadId: 'thread2',
          snippet: 'Another message',
          subject: 'Another Subject',
          from: 'another@example.com',
          date: '2024-01-02T11:00:00Z',
          isRead: false,
          labels: ['INBOX', 'UNREAD']
        }
      ];

      mockGmailClient.listMessages.mockResolvedValue(mockMessages);

      const result = await gmailListMessagesTool.handler({
        maxResults: 10
      });

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Test Subject');
      expect(result.content[0].text).toContain('test@example.com');
      expect(result.content[0].text).toContain('[UNREAD]');
    });

    test('handles empty message list', async () => {
      mockGmailClient.listMessages.mockResolvedValue([]);

      const result = await gmailListMessagesTool.handler({});

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toBe('No messages found.');
    });

    test('passes parameters to Gmail client', async () => {
      mockGmailClient.listMessages.mockResolvedValue([]);

      const params = {
        query: 'from:test@example.com',
        maxResults: 5,
        includeSpamTrash: true
      };

      await gmailListMessagesTool.handler(params);

      expect(mockGmailClient.listMessages).toHaveBeenCalledWith(params);
    });

    test('passes pagination parameters to Gmail client', async () => {
      mockGmailClient.listMessages.mockResolvedValue([]);

      const params = {
        query: 'from:test@example.com',
        maxResults: 200,
        fetchAll: true,
        pageSize: 75,
        maxTotalResults: 500,
        pageToken: 'next-page-token'
      };

      await gmailListMessagesTool.handler(params);

      expect(mockGmailClient.listMessages).toHaveBeenCalledWith(params);
    });
  });

  describe('Message Formatting', () => {
    test('formats message with all fields', async () => {
      const mockMessage: GmailMessage = {
        id: '1',
        threadId: 'thread1',
        snippet: 'Test snippet',
        subject: 'Test Subject',
        from: 'test@example.com',
        date: '2024-01-01T10:00:00Z',
        isRead: true,
        labels: ['INBOX']
      };

      mockGmailClient.listMessages.mockResolvedValue([mockMessage]);

      const result = await gmailListMessagesTool.handler({});

      expect(result.content[0].text).toContain('Message ID: 1');
      expect(result.content[0].text).toContain('Subject: Test Subject');
      expect(result.content[0].text).toContain('From: test@example.com');
      expect(result.content[0].text).toContain('Preview: Test snippet');
      expect(result.content[0].text).not.toContain('[UNREAD]');
    });

    test('formats message with missing fields', async () => {
      const mockMessage: GmailMessage = {
        id: '1',
        threadId: 'thread1',
        snippet: '',
        isRead: false,
        labels: ['INBOX']
      };

      mockGmailClient.listMessages.mockResolvedValue([mockMessage]);

      const result = await gmailListMessagesTool.handler({});

      expect(result.content[0].text).toContain('Subject: No subject');
      expect(result.content[0].text).toContain('From: Unknown sender');
      expect(result.content[0].text).toContain('Date: No date');
      expect(result.content[0].text).toContain('[UNREAD]');
    });

    test('separates multiple messages with divider', async () => {
      const mockMessages: GmailMessage[] = [
        {
          id: '1',
          threadId: 'thread1',
          snippet: 'First message',
          subject: 'First',
          from: 'first@example.com',
          isRead: true,
          labels: ['INBOX']
        },
        {
          id: '2',
          threadId: 'thread2',
          snippet: 'Second message',
          subject: 'Second',
          from: 'second@example.com',
          isRead: true,
          labels: ['INBOX']
        }
      ];

      mockGmailClient.listMessages.mockResolvedValue(mockMessages);

      const result = await gmailListMessagesTool.handler({});

      expect(result.content[0].text).toContain('---');
      expect(result.content[0].text).toContain('First');
      expect(result.content[0].text).toContain('Second');
    });
  });

  describe('Error Handling', () => {
    test('handles Gmail client errors', async () => {
      const error = new CalendarError('Gmail API error', MCPErrorCode.APIError);
      mockGmailClient.listMessages.mockRejectedValue(error);

      const result = await gmailListMessagesTool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('Error: Gmail API error');
    });

    test('handles unknown errors', async () => {
      mockGmailClient.listMessages.mockRejectedValue(new Error('Unknown error'));

      const result = await gmailListMessagesTool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error: Unknown error');
    });

    test('handles non-Error objects', async () => {
      mockGmailClient.listMessages.mockRejectedValue('String error');

      const result = await gmailListMessagesTool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error: Unknown error');
    });
  });
});
