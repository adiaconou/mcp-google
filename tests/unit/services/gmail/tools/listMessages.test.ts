/**
 * Gmail List Messages Tool Unit Tests
 * 
 * Simplified tests using factory functions and common patterns
 */

import { gmailListMessagesTool } from '../../../../../src/services/gmail/tools/listMessages';
import { gmailClient, GmailMessage } from '../../../../../src/services/gmail/gmailClient';
import { CalendarError, MCPErrorCode } from '../../../../../src/types/mcp';
import { mockFactories, testHelpers, testPatterns } from '../../../../helpers/testFactories';

// Mock the Gmail client
jest.mock('../../../../../src/services/gmail/gmailClient', () => ({
  gmailClient: {
    instance: {
      listMessages: jest.fn()
    }
  }
}));

const mockGmailClient = gmailClient.instance as jest.Mocked<typeof gmailClient.instance>;

describe('Gmail List Messages Tool', () => {
  beforeEach(testPatterns.clientTestSetup(mockGmailClient));

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
      const mockMessages = [
        mockFactories.gmailMessage({ 
          id: '1', 
          subject: 'Test Subject',
          from: 'test@example.com'
        }),
        mockFactories.gmailMessage({ 
          id: '2', 
          subject: 'Another Subject',
          from: 'another@example.com',
          isRead: false,
          labels: ['INBOX', 'UNREAD']
        })
      ];

      mockGmailClient.listMessages.mockResolvedValue(mockMessages);

      const result = await gmailListMessagesTool.handler({ maxResults: 10 });
      const text = testHelpers.expectSuccessResult(result);

      expect(text).toContain('Test Subject');
      expect(text).toContain('test@example.com');
      expect(text).toContain('[UNREAD]');
    });

    test('handles empty message list', async () => {
      mockGmailClient.listMessages.mockResolvedValue([]);

      const result = await gmailListMessagesTool.handler({});
      const text = testHelpers.expectSuccessResult(result);

      expect(text).toBe('No messages found.');
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
      const mockMessage = mockFactories.gmailMessage({
        id: '1',
        snippet: 'Test snippet',
        subject: 'Test Subject',
        from: 'test@example.com'
      });

      mockGmailClient.listMessages.mockResolvedValue([mockMessage]);
      const result = await gmailListMessagesTool.handler({});
      const text = testHelpers.expectSuccessResult(result);

      expect(text).toContain('Message ID: 1');
      expect(text).toContain('Subject: Test Subject');
      expect(text).toContain('From: test@example.com');
      expect(text).toContain('Preview: Test snippet');
      expect(text).not.toContain('[UNREAD]');
    });

    test('formats message with missing fields', async () => {
      const mockMessage = mockFactories.gmailMessage({
        id: '1',
        snippet: '',
        isRead: false
      });
      // Remove the optional fields to test missing data handling
      delete (mockMessage as any).subject;
      delete (mockMessage as any).from;
      delete (mockMessage as any).date;

      mockGmailClient.listMessages.mockResolvedValue([mockMessage]);
      const result = await gmailListMessagesTool.handler({});
      const text = testHelpers.expectSuccessResult(result);

      expect(text).toContain('Subject: No subject');
      expect(text).toContain('From: Unknown sender');
      expect(text).toContain('Date: No date');
      expect(text).toContain('[UNREAD]');
    });

    test('separates multiple messages with divider', async () => {
      const mockMessages = [
        mockFactories.gmailMessage({ subject: 'First', from: 'first@example.com' }),
        mockFactories.gmailMessage({ subject: 'Second', from: 'second@example.com' })
      ];

      mockGmailClient.listMessages.mockResolvedValue(mockMessages);
      const result = await gmailListMessagesTool.handler({});
      const text = testHelpers.expectSuccessResult(result);

      expect(text).toContain('---');
      expect(text).toContain('First');
      expect(text).toContain('Second');
    });
  });

  describe('Error Handling', () => {
    test('handles Gmail client errors', async () => {
      const error = new CalendarError('Gmail API error', MCPErrorCode.APIError);
      mockGmailClient.listMessages.mockRejectedValue(error);

      const result = await gmailListMessagesTool.handler({});
      testHelpers.expectErrorResult(result, 'Gmail API error');
    });

    test('handles unknown errors', async () => {
      mockGmailClient.listMessages.mockRejectedValue(new Error('Unknown error'));

      const result = await gmailListMessagesTool.handler({});
      testHelpers.expectErrorResult(result, 'Unknown error');
    });

    test('handles non-Error objects', async () => {
      mockGmailClient.listMessages.mockRejectedValue('String error');

      const result = await gmailListMessagesTool.handler({});
      testHelpers.expectErrorResult(result, 'Unknown error');
    });
  });
});
