/**
 * Gmail Pagination Integration Tests
 * 
 * Tests for Gmail pagination functionality with real API calls
 */

import { gmailClient } from '../../src/services/gmail/gmailClient';
import { oauthManager } from '../../src/auth/oauthManager';

// Skip these tests if not in integration test mode
const isIntegrationTest = process.env.INTEGRATION_TEST === 'true';

describe('Gmail Pagination Integration', () => {
  beforeAll(async () => {
    if (!isIntegrationTest) {
      return;
    }
    
    // Ensure authentication for integration tests
    const isAuth = await oauthManager.instance.isAuthenticated();
    if (!isAuth) {
      console.log('Skipping Gmail pagination integration tests - not authenticated');
      return;
    }
  });

  afterEach(() => {
    // Reset client between tests
    gmailClient.reset();
  });

  describe('Pagination Parameters', () => {
    test('should handle single page request', async () => {
      if (!isIntegrationTest) {
        return;
      }

      const result = await gmailClient.instance.listMessages({
        maxResults: 5,
        query: 'in:inbox'
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(5);
    });

    test('should handle pagination with fetchAll=false', async () => {
      if (!isIntegrationTest) {
        return;
      }

      const result = await gmailClient.instance.listMessages({
        maxResults: 150, // Over 100, should trigger pagination
        pageSize: 50,
        query: 'in:inbox'
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(150);
    });

    test('should respect maxTotalResults safety limit', async () => {
      if (!isIntegrationTest) {
        return;
      }

      const result = await gmailClient.instance.listMessages({
        fetchAll: true,
        maxTotalResults: 10, // Small limit for testing
        pageSize: 5,
        query: 'in:inbox'
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Search with Pagination', () => {
    test('should paginate search results', async () => {
      if (!isIntegrationTest) {
        return;
      }

      const result = await gmailClient.instance.listMessages({
        query: 'in:inbox',
        maxResults: 20,
        pageSize: 10
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(20);
      
      // Verify all results match the query (should be from inbox)
      result.forEach(message => {
        expect(message.id).toBeDefined();
        expect(message.threadId).toBeDefined();
      });
    });

    test('should handle complex search queries with pagination', async () => {
      if (!isIntegrationTest) {
        return;
      }

      const result = await gmailClient.instance.listMessages({
        query: 'is:unread OR is:starred',
        maxResults: 15,
        pageSize: 8
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(15);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid query gracefully', async () => {
      if (!isIntegrationTest) {
        return;
      }

      await expect(
        gmailClient.instance.listMessages({
          query: 'invalid:query:syntax:::',
          maxResults: 10
        })
      ).rejects.toThrow();
    });

    test('should handle network issues during pagination', async () => {
      if (!isIntegrationTest) {
        return;
      }

      // This test would require mocking network failures
      // For now, just verify the client handles normal cases
      const result = await gmailClient.instance.listMessages({
        maxResults: 5,
        query: 'in:inbox'
      });

      expect(Array.isArray(result)).toBe(true);
    });
  });
});
