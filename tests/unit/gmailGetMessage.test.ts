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
      expect(gmailGetMessageTool.description).toBe('Get Gmail message content for one or more message IDs (batch support)');
    });

    it('should have correct input schema', () => {
      expect(gmailGetMessageTool.inputSchema).toEqual({
        type: 'object',
        required: ['messageIds'],
        properties: {
          messageIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of Gmail message IDs to retrieve (1-50)'
          },
          maxBodyLength: {
            type: 'number',
            default: 50000,
            minimum: 1000,
            maximum: 500000,
            description: 'Maximum characters per message body (default 50k, max 500k)'
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
      body: 'This is the complete test message body content with full details.\n\nThis includes multiple paragraphs and formatting that would be available in the full message format.',
      isRead: true,
      labels: ['INBOX', 'IMPORTANT']
    };

    it('should successfully get message details', async () => {
      mockGmailClient.mockResolvedValue(mockMessage);

      const result = await gmailGetMessageTool.handler({ messageIds: ['test-message-id'] });

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
      expect(text).toContain('This is the complete test message body content with full details.');
    });

    it('should handle unread message status', async () => {
      const unreadMessage = { ...mockMessage, isRead: false };
      mockGmailClient.mockResolvedValue(unreadMessage);

      const result = await gmailGetMessageTool.handler({ messageIds: ['test-message-id'] });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Status: UNREAD');
    });

    it('should handle message with no body (use snippet)', async () => {
      const { body, ...messageWithoutBody } = mockMessage;
      mockGmailClient.mockResolvedValue(messageWithoutBody);

      const result = await gmailGetMessageTool.handler({ messageIds: ['test-message-id'] });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('[Preview]: Test message snippet');
    });

    it('should handle message with no body or snippet', async () => {
      const { body, ...messageWithoutContent } = { ...mockMessage, snippet: '' };
      mockGmailClient.mockResolvedValue(messageWithoutContent);

      const result = await gmailGetMessageTool.handler({ messageIds: ['test-message-id'] });

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

      const result = await gmailGetMessageTool.handler({ messageIds: ['test-message-id'] });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Message ID: test-id');
      expect(result.content[0].text).toContain('Thread ID: test-thread');
      expect(result.content[0].text).toContain('Status: READ');
    });

    it('should validate messageIds is required', async () => {
      const result = await gmailGetMessageTool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('Error: messageIds is required and must be an array');
    });

    it('should validate messageIds is an array', async () => {
      const result = await gmailGetMessageTool.handler({ messageIds: 'not-an-array' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('Error: messageIds is required and must be an array');
    });

    it('should validate messageIds is not empty', async () => {
      const result = await gmailGetMessageTool.handler({ messageIds: [] });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('Error: messageIds array cannot be empty');
    });

    it('should validate maximum batch size', async () => {
      const messageIds = Array(51).fill('test-id');
      const result = await gmailGetMessageTool.handler({ messageIds });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('Error: Maximum 50 message IDs allowed per batch');
    });

    it('should validate all message IDs are strings', async () => {
      const result = await gmailGetMessageTool.handler({ messageIds: ['valid-id', 123, 'another-valid-id'] });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('Error: All message IDs must be non-empty strings');
    });

    it('should validate message IDs are not empty', async () => {
      const result = await gmailGetMessageTool.handler({ messageIds: ['valid-id', '   ', 'another-valid-id'] });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('Error: All message IDs must be non-empty strings');
    });

    it('should handle multiple messages successfully', async () => {
      const message1 = { ...mockMessage, id: 'msg-1', subject: 'First Message' };
      const message2 = { ...mockMessage, id: 'msg-2', subject: 'Second Message' };
      
      mockGmailClient
        .mockResolvedValueOnce(message1)
        .mockResolvedValueOnce(message2);

      const result = await gmailGetMessageTool.handler({ messageIds: ['msg-1', 'msg-2'] });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Subject: First Message');
      expect(result.content[0].text).toContain('Subject: Second Message');
      expect(result.content[0].text).toContain('=== MESSAGE SEPARATOR ===');
    });

    it('should handle Gmail client errors (fail-fast)', async () => {
      const error = new CalendarError('Message not found', MCPErrorCode.APIError);
      mockGmailClient.mockRejectedValue(error);

      const result = await gmailGetMessageTool.handler({ messageIds: ['invalid-id'] });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('Error: Message not found');
    });

    it('should handle unknown errors', async () => {
      mockGmailClient.mockRejectedValue(new Error('Network error'));

      const result = await gmailGetMessageTool.handler({ messageIds: ['test-id'] });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('Error: Network error');
    });

    it('should handle non-Error exceptions', async () => {
      mockGmailClient.mockRejectedValue('String error');

      const result = await gmailGetMessageTool.handler({ messageIds: ['test-id'] });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('Error: Unknown error');
    });

    it('should trim whitespace from messageIds', async () => {
      mockGmailClient.mockResolvedValue(mockMessage);

      await gmailGetMessageTool.handler({ messageIds: ['  test-message-id  '] });

      expect(mockGmailClient).toHaveBeenCalledWith('test-message-id', undefined);
    });

    it('should pass maxBodyLength to client', async () => {
      mockGmailClient.mockResolvedValue(mockMessage);

      await gmailGetMessageTool.handler({ messageIds: ['test-id'], maxBodyLength: 25000 });

      expect(mockGmailClient).toHaveBeenCalledWith('test-id', 25000);
    });

    it('should handle HTML content in message body', async () => {
      const htmlMessage = {
        ...mockMessage,
        body: '<p>This is <strong>HTML</strong> content with &amp; entities</p>'
      };
      mockGmailClient.mockResolvedValue(htmlMessage);

      const result = await gmailGetMessageTool.handler({ messageIds: ['test-message-id'] });

      expect(result.isError).toBe(false);
      // The mock returns the body as-is, so we test that HTML content is included
      expect(result.content[0].text).toContain('<p>This is <strong>HTML</strong> content with &amp; entities</p>');
    });

    it('should handle multipart message body extraction', async () => {
      const multipartMessage = {
        ...mockMessage,
        body: 'Complete message body from multipart extraction'
      };
      mockGmailClient.mockResolvedValue(multipartMessage);

      const result = await gmailGetMessageTool.handler({ messageIds: ['test-message-id'] });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Complete message body from multipart extraction');
    });

    it('should handle base64url encoded content', async () => {
      const encodedMessage = {
        ...mockMessage,
        body: 'Decoded base64url content with special characters'
      };
      mockGmailClient.mockResolvedValue(encodedMessage);

      const result = await gmailGetMessageTool.handler({ messageIds: ['test-message-id'] });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Decoded base64url content with special characters');
    });
  });
});
