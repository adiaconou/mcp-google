/**
 * Gmail Search Messages Tool Unit Tests
 * 
 * Tests for the gmail_search_messages MCP tool following established patterns
 */

import { gmailSearchMessagesTool } from '../../src/services/gmail/tools/searchMessages';
import { gmailClient, GmailMessage } from '../../src/services/gmail/gmailClient';
import { CalendarError, MCPErrorCode } from '../../src/types/mcp';

// Mock the Gmail client
jest.mock('../../src/services/gmail/gmailClient', () => ({
  gmailClient: {
    instance: {
      searchMessages: jest.fn()
    }
  }
}));

const mockGmailClient = gmailClient.instance as jest.Mocked<typeof gmailClient.instance>;

describe('Gmail Search Messages Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Tool Definition', () => {
    test('has correct name and description', () => {
      expect(gmailSearchMessagesTool.name).toBe('gmail_search_messages');
      expect(gmailSearchMessagesTool.description).toContain('Search Gmail using advanced query syntax');
    });

    test('has correct input schema with required query', () => {
      const schema = gmailSearchMessagesTool.inputSchema;
      expect(schema.type).toBe('object');
      expect(schema.required).toContain('query');
      expect(schema.properties).toHaveProperty('query');
      expect(schema.properties).toHaveProperty('maxResults');
    });

    test('has handler function', () => {
      expect(typeof gmailSearchMessagesTool.handler).toBe('function');
    });
  });

  describe('Query Validation', () => {
    test('requires query parameter', async () => {
      const result = await gmailSearchMessagesTool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('Search query is required');
      expect(result.content[0].text).toContain('Examples:');
    });

    test('rejects empty query', async () => {
      const result = await gmailSearchMessagesTool.handler({ query: '' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Search query is required');
    });

    test('rejects whitespace-only query', async () => {
      const result = await gmailSearchMessagesTool.handler({ query: '   ' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Search query is required');
    });
  });

  describe('Message Searching', () => {
    test('successfully searches messages', async () => {
      const mockMessages: GmailMessage[] = [
        {
          id: '1',
          threadId: 'thread1',
          snippet: 'Important meeting reminder',
          subject: 'Meeting Tomorrow',
          from: 'boss@company.com',
          date: '2024-01-01T10:00:00Z',
          isRead: false,
          labels: ['INBOX', 'UNREAD']
        }
      ];

      mockGmailClient.searchMessages.mockResolvedValue(mockMessages);

      const result = await gmailSearchMessagesTool.handler({
        query: 'from:boss@company.com subject:meeting',
        maxResults: 10
      });

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('Found 1 message(s)');
      expect(result.content[0].text).toContain('Meeting Tomorrow');
      expect(result.content[0].text).toContain('boss@company.com');
      expect(result.content[0].text).toContain('[UNREAD]');
    });

    test('handles empty search results', async () => {
      mockGmailClient.searchMessages.mockResolvedValue([]);

      const result = await gmailSearchMessagesTool.handler({
        query: 'from:nonexistent@example.com'
      });

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('No messages found for search query');
      expect(result.content[0].text).toContain('from:nonexistent@example.com');
    });

    test('passes correct parameters to Gmail client', async () => {
      mockGmailClient.searchMessages.mockResolvedValue([]);

      await gmailSearchMessagesTool.handler({
        query: 'is:unread has:attachment',
        maxResults: 25
      });

      expect(mockGmailClient.searchMessages).toHaveBeenCalledWith('is:unread has:attachment', 25);
    });

    test('uses default maxResults when not provided', async () => {
      mockGmailClient.searchMessages.mockResolvedValue([]);

      await gmailSearchMessagesTool.handler({
        query: 'subject:test'
      });

      expect(mockGmailClient.searchMessages).toHaveBeenCalledWith('subject:test', 20);
    });
  });

  describe('Error Handling', () => {
    test('handles Gmail client errors', async () => {
      const error = new CalendarError('Gmail search failed', MCPErrorCode.APIError);
      mockGmailClient.searchMessages.mockRejectedValue(error);

      const result = await gmailSearchMessagesTool.handler({
        query: 'from:test@example.com'
      });

      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('Error: Gmail search failed');
    });

    test('handles unknown errors', async () => {
      mockGmailClient.searchMessages.mockRejectedValue(new Error('Network error'));

      const result = await gmailSearchMessagesTool.handler({
        query: 'subject:important'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error: Network error');
    });

    test('handles non-Error objects', async () => {
      mockGmailClient.searchMessages.mockRejectedValue('String error');

      const result = await gmailSearchMessagesTool.handler({
        query: 'from:test@example.com'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error: Unknown error');
    });
  });
});
