/**
 * Unit tests for Gmail Get Message Tool
 */

import { gmailGetMessageTool } from '../../src/services/gmail/tools/getMessage';
import { gmailClient } from '../../src/services/gmail/gmailClient';
import { CalendarError, MCPErrorCode } from '../../src/types/mcp';

// Mock the Gmail client
jest.mock('../../src/services/gmail/gmailClient', () => ({
  gmailClient: {
    instance: {
      getMessage: jest.fn()
    }
  }
}));

const mockGmailClient = gmailClient.instance.getMessage as jest.MockedFunction<typeof gmailClient.instance.getMessage>;

describe('Gmail Get Message Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Tool Definition', () => {
    it('should have correct name and description', () => {
      expect(gmailGetMessageTool.name).toBe('gmail_get_message');
      expect(gmailGetMessageTool.description).toBe('Get detailed Gmail message content by message ID');
    });

    it('should have correct input schema', () => {
      expect(gmailGetMessageTool.inputSchema).toEqual({
        type: 'object',
        required: ['messageId'],
        properties: {
          messageId: {
            type: 'string',
            description: 'Gmail message ID to retrieve'
          }
        }
      });
    });

    it('should have a handler function', () => {
      expect(typeof gmailGetMessageTool.handler).toBe('function');
    });
  });

  describe('Handler Function', () => {
    const mockMessage = {
      id: 'test-message-id',
      threadId: 'test-thread-id',
      snippet: 'Test message snippet',
      subject: 'Test Subject',
      from: 'sender@example.com',
      to: 'recipient@example.com',
      date: '2024-01-15T10:30:00Z',
      body: 'This is the test message body content.',
      isRead: true,
      labels: ['INBOX', 'IMPORTANT']
    };

    it('should successfully get message details', async () => {
      mockGmailClient.mockResolvedValue(mockMessage);

      const result = await gmailGetMessageTool.handler({ messageId: 'test-message-id' });

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      
      const text = result.content[0].text;
      expect(text).toContain('Message ID: test-message-id');
      expect(text).toContain('Subject: Test Subject');
      expect(text).toContain('From: sender@example.com');
      expect(text).toContain('To: recipient@example.com');
      expect(text).toContain('Status: READ');
      expect(text).toContain('Labels: INBOX, IMPORTANT');
      expect(text).toContain('--- Message Body ---');
      expect(text).toContain('This is the test message body content.');
    });

    it('should handle unread message status', async () => {
      const unreadMessage = { ...mockMessage, isRead: false };
      mockGmailClient.mockResolvedValue(unreadMessage);

      const result = await gmailGetMessageTool.handler({ messageId: 'test-message-id' });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Status: UNREAD');
    });

    it('should handle message with no body (use snippet)', async () => {
      const { body, ...messageWithoutBody } = mockMessage;
      mockGmailClient.mockResolvedValue(messageWithoutBody);

      const result = await gmailGetMessageTool.handler({ messageId: 'test-message-id' });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('[Preview]: Test message snippet');
    });

    it('should handle message with no body or snippet', async () => {
      const { body, ...messageWithoutContent } = { ...mockMessage, snippet: '' };
      mockGmailClient.mockResolvedValue(messageWithoutContent);

      const result = await gmailGetMessageTool.handler({ messageId: 'test-message-id' });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('[No content available]');
    });

    it('should handle message with minimal fields', async () => {
      const minimalMessage = {
        id: 'test-id',
        threadId: 'test-thread',
        snippet: 'Test snippet',
        isRead: true,
        labels: []
      };
      mockGmailClient.mockResolvedValue(minimalMessage);

      const result = await gmailGetMessageTool.handler({ messageId: 'test-message-id' });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Message ID: test-id');
      expect(result.content[0].text).toContain('Thread ID: test-thread');
      expect(result.content[0].text).toContain('Status: READ');
    });

    it('should validate messageId is required', async () => {
      const result = await gmailGetMessageTool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('Error: messageId is required and must be a string');
    });

    it('should validate messageId is a string', async () => {
      const result = await gmailGetMessageTool.handler({ messageId: 123 });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('Error: messageId is required and must be a string');
    });

    it('should validate messageId is not empty', async () => {
      const result = await gmailGetMessageTool.handler({ messageId: '   ' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('Error: messageId cannot be empty');
    });

    it('should handle Gmail client errors', async () => {
      const error = new CalendarError('Message not found', MCPErrorCode.APIError);
      mockGmailClient.mockRejectedValue(error);

      const result = await gmailGetMessageTool.handler({ messageId: 'invalid-id' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('Error: Message not found');
    });

    it('should handle unknown errors', async () => {
      mockGmailClient.mockRejectedValue(new Error('Network error'));

      const result = await gmailGetMessageTool.handler({ messageId: 'test-id' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('Error: Network error');
    });

    it('should handle non-Error exceptions', async () => {
      mockGmailClient.mockRejectedValue('String error');

      const result = await gmailGetMessageTool.handler({ messageId: 'test-id' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('Error: Unknown error');
    });

    it('should trim whitespace from messageId', async () => {
      mockGmailClient.mockResolvedValue(mockMessage);

      await gmailGetMessageTool.handler({ messageId: '  test-message-id  ' });

      expect(mockGmailClient).toHaveBeenCalledWith('test-message-id');
    });
  });
});
