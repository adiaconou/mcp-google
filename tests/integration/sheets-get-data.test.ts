/**
 * Integration tests for Sheets Get Data Tool
 */

import { getData } from '../../src/services/sheets/tools/getData';
import { sheetsClient } from '../../src/services/sheets/sheetsClient';
import { oauthManager } from '../../src/auth/oauthManager';

// Mock the OAuth manager
jest.mock('../../src/auth/oauthManager');
// Mock the sheets client
jest.mock('../../src/services/sheets/sheetsClient');

const mockOAuthManager = oauthManager as jest.Mocked<typeof oauthManager>;
const mockSheetsClient = sheetsClient as jest.Mocked<typeof sheetsClient>;

describe('Sheets Get Data Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
    
    // Set up default mocks
    (mockOAuthManager.instance as any) = {
      isAuthenticated: jest.fn().mockResolvedValue(true),
      ensureScopes: jest.fn().mockResolvedValue(undefined),
      getOAuth2Client: jest.fn().mockResolvedValue({}),
    };
    
    (mockSheetsClient.instance as any) = {
      getData: jest.fn(),
    };
  });

  describe('getData integration', () => {
    it('should handle authentication errors gracefully', async () => {
      // Mock authentication failure by making the sheetsClient.getData throw an auth error
      jest.spyOn(sheetsClient.instance, 'getData').mockRejectedValue(
        new Error('Authentication required')
      );

      const result = await getData({
        spreadsheetId: 'test-spreadsheet-id'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication required');
    });

    it('should handle invalid spreadsheet ID', async () => {
      // Mock authentication success
      jest.spyOn(oauthManager.instance, 'isAuthenticated').mockResolvedValue(true);
      jest.spyOn(oauthManager.instance, 'ensureScopes').mockResolvedValue();

      // Mock API error for invalid spreadsheet
      jest.spyOn(sheetsClient.instance, 'getData').mockRejectedValue({
        code: 404,
        message: 'Requested entity was not found.'
      });

      const result = await getData({
        spreadsheetId: 'invalid-spreadsheet-id'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle network errors', async () => {
      // Mock authentication success
      jest.spyOn(oauthManager.instance, 'isAuthenticated').mockResolvedValue(true);
      jest.spyOn(oauthManager.instance, 'ensureScopes').mockResolvedValue();

      // Mock network error
      jest.spyOn(sheetsClient.instance, 'getData').mockRejectedValue(
        new Error('Network error')
      );

      const result = await getData({
        spreadsheetId: 'test-spreadsheet-id'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should handle rate limiting', async () => {
      // Mock authentication success
      jest.spyOn(oauthManager.instance, 'isAuthenticated').mockResolvedValue(true);
      jest.spyOn(oauthManager.instance, 'ensureScopes').mockResolvedValue();

      // Mock rate limit error
      jest.spyOn(sheetsClient.instance, 'getData').mockRejectedValue({
        code: 429,
        message: 'Quota exceeded'
      });

      const result = await getData({
        spreadsheetId: 'test-spreadsheet-id'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle permission errors', async () => {
      // Mock authentication success
      jest.spyOn(oauthManager.instance, 'isAuthenticated').mockResolvedValue(true);
      jest.spyOn(oauthManager.instance, 'ensureScopes').mockResolvedValue();

      // Mock permission error
      jest.spyOn(sheetsClient.instance, 'getData').mockRejectedValue({
        code: 403,
        message: 'The caller does not have permission'
      });

      const result = await getData({
        spreadsheetId: 'test-spreadsheet-id'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('parameter validation', () => {
    it('should validate spreadsheet ID format', async () => {
      const result = await getData({
        spreadsheetId: '' // Empty spreadsheet ID
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle various range formats', async () => {
      // Mock authentication and successful response
      jest.spyOn(oauthManager.instance, 'isAuthenticated').mockResolvedValue(true);
      jest.spyOn(oauthManager.instance, 'ensureScopes').mockResolvedValue();
      
      const mockResponse = {
        values: [['Test']],
        range: 'Sheet1!A1:A1',
        majorDimension: 'ROWS'
      };
      
      jest.spyOn(sheetsClient.instance, 'getData').mockResolvedValue(mockResponse);

      // Test different range formats
      const ranges = ['A1:B2', 'Sheet1!A1:B2', 'A:A', '1:1'];
      
      for (const range of ranges) {
        const result = await getData({
          spreadsheetId: 'test-spreadsheet-id',
          range
        });

        expect(result.success).toBe(true);
      }
    });
  });

  describe('data analysis integration', () => {
    it('should analyze mixed data types correctly', async () => {
      // Mock authentication success
      jest.spyOn(oauthManager.instance, 'isAuthenticated').mockResolvedValue(true);
      jest.spyOn(oauthManager.instance, 'ensureScopes').mockResolvedValue();

      const mockResponse = {
        values: [
          ['Name', 'Age', 'Date', 'Active'],
          ['John', '30', '2023-01-01', 'true'],
          ['Jane', '25', '2023-02-15', 'false'],
          ['', '35', '2023-03-20', '']
        ],
        range: 'Sheet1!A1:D4',
        majorDimension: 'ROWS',
        metadata: {
          spreadsheetTitle: 'Test Data',
          sheetTitle: 'Sheet1',
          rowCount: 1000,
          columnCount: 26
        }
      };

      jest.spyOn(sheetsClient.instance, 'getData').mockResolvedValue(mockResponse);

      const result = await getData({
        spreadsheetId: 'test-spreadsheet-id'
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.summary.totalRows).toBe(4);
      expect(result.data!.summary.totalColumns).toBe(4);
      expect(result.data!.summary.nonEmptyRows).toBe(4); // All rows have some data
      expect(result.data!.summary.dataTypes).toContain('text');
      expect(result.data!.summary.dataTypes).toContain('number');
      expect(result.data!.summary.dataTypes).toContain('date');
    });

    it('should handle large datasets efficiently', async () => {
      // Mock authentication success
      jest.spyOn(oauthManager.instance, 'isAuthenticated').mockResolvedValue(true);
      jest.spyOn(oauthManager.instance, 'ensureScopes').mockResolvedValue();

      // Create a large dataset
      const largeDataset: string[][] = [];
      for (let i = 0; i < 1000; i++) {
        largeDataset.push([`Row ${i}`, i.toString(), `2023-01-${(i % 28) + 1}`]);
      }

      const mockResponse = {
        values: largeDataset,
        range: 'Sheet1!A1:C1000',
        majorDimension: 'ROWS'
      };

      jest.spyOn(sheetsClient.instance, 'getData').mockResolvedValue(mockResponse);

      const startTime = Date.now();
      const result = await getData({
        spreadsheetId: 'test-spreadsheet-id'
      });
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.data!.summary.totalRows).toBe(1000);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  afterEach(() => {
    // Restore all mocks
    jest.restoreAllMocks();
  });
});
