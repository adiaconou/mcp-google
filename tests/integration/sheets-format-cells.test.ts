/**
 * Integration tests for Sheets Format Cells functionality
 * 
 * These tests verify the formatCells tool works end-to-end with mocked Google Sheets API.
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

// Mock the SheetsClient directly
jest.mock('../../src/services/sheets/sheetsClient', () => ({
  sheetsClient: {
    instance: {
      formatCells: jest.fn(),
    },
  },
}));

import { formatCells } from '../../src/services/sheets/tools/formatCells';
import { oauthManager } from '../../src/auth/oauthManager';
import { sheetsClient } from '../../src/services/sheets/sheetsClient';
import { CalendarError } from '../../src/types/mcp';

describe('Sheets Format Cells Integration', () => {
  let testSpreadsheetId: string;

  beforeEach(() => {
    jest.clearAllMocks();
    testSpreadsheetId = 'mock-spreadsheet-id-123';
    
    // Mock OAuth client
    (oauthManager.instance.getOAuth2Client as jest.Mock).mockResolvedValue({
      credentials: { access_token: 'mock-token' }
    });

    // Mock the SheetsClient formatCells method
    (sheetsClient.instance.formatCells as jest.Mock).mockResolvedValue({
      formattedRanges: 1,
      appliedFormats: ['basic styling']
    });
  });

  describe('Basic Formatting', () => {
    it('should apply basic cell styling', async () => {
      const result = await formatCells({
        spreadsheetId: testSpreadsheetId,
        range: 'A1:D1',
        backgroundColor: '#4285F4',
        fontColor: '#FFFFFF',
        bold: true,
        fontSize: 12,
        textAlignment: 'CENTER'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Successfully applied');
      expect(result.content[0].text).toContain('formatting operation(s)');
      
      // Verify SheetsClient was called with correct parameters
      expect(sheetsClient.instance.formatCells).toHaveBeenCalledWith({
        spreadsheetId: testSpreadsheetId,
        range: 'A1:D1',
        backgroundColor: '#4285F4',
        fontColor: '#FFFFFF',
        bold: true,
        fontSize: 12,
        textAlignment: 'CENTER'
      });
    });

    it('should apply number formatting', async () => {
      const result = await formatCells({
        spreadsheetId: testSpreadsheetId,
        range: 'B2:B5',
        numberFormat: {
          type: 'NUMBER',
          decimalPlaces: 1
        }
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Successfully applied');
      
      // Verify SheetsClient was called with correct parameters
      expect(sheetsClient.instance.formatCells).toHaveBeenCalledWith({
        spreadsheetId: testSpreadsheetId,
        range: 'B2:B5',
        numberFormat: {
          type: 'NUMBER',
          decimalPlaces: 1
        }
      });
    });
  });

  describe('Conditional Formatting', () => {
    it('should apply conditional formatting for scores > 90', async () => {
      const result = await formatCells({
        spreadsheetId: testSpreadsheetId,
        range: 'B2:B5',
        conditionalFormat: {
          condition: 'GREATER_THAN',
          value: 90,
          backgroundColor: '#00FF00'
        }
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Successfully applied');
      
      // Verify SheetsClient was called with correct parameters
      expect(sheetsClient.instance.formatCells).toHaveBeenCalledWith({
        spreadsheetId: testSpreadsheetId,
        range: 'B2:B5',
        conditionalFormat: {
          condition: 'GREATER_THAN',
          value: 90,
          backgroundColor: '#00FF00'
        }
      });
    });

    it('should apply conditional formatting for scores between 70-89', async () => {
      const result = await formatCells({
        spreadsheetId: testSpreadsheetId,
        range: 'B2:B5',
        conditionalFormat: {
          condition: 'BETWEEN',
          value: 70,
          value2: 89,
          backgroundColor: '#FFFF00'
        }
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Successfully applied');
      
      // Verify SheetsClient was called with correct parameters
      expect(sheetsClient.instance.formatCells).toHaveBeenCalledWith({
        spreadsheetId: testSpreadsheetId,
        range: 'B2:B5',
        conditionalFormat: {
          condition: 'BETWEEN',
          value: 70,
          value2: 89,
          backgroundColor: '#FFFF00'
        }
      });
    });
  });

  describe('Data Organization', () => {
    it('should add filters and freeze header row', async () => {
      const result = await formatCells({
        spreadsheetId: testSpreadsheetId,
        range: 'A1:D5',
        addFilter: true,
        freezeRows: 1
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Successfully applied');
      
      // Verify SheetsClient was called with correct parameters
      expect(sheetsClient.instance.formatCells).toHaveBeenCalledWith({
        spreadsheetId: testSpreadsheetId,
        range: 'A1:D5',
        addFilter: true,
        freezeRows: 1
      });
    });

    it('should sort data by score descending', async () => {
      const result = await formatCells({
        spreadsheetId: testSpreadsheetId,
        range: 'A1:D5',
        sortBy: {
          column: 1, // Score column (0-based)
          ascending: false
        }
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Successfully applied');
      
      // Verify SheetsClient was called with correct parameters
      expect(sheetsClient.instance.formatCells).toHaveBeenCalledWith({
        spreadsheetId: testSpreadsheetId,
        range: 'A1:D5',
        sortBy: {
          column: 1,
          ascending: false
        }
      });
    });
  });

  describe('Error Scenarios', () => {
    it('should handle invalid spreadsheet ID', async () => {
      // Mock SheetsClient to throw an error for this specific test
      (sheetsClient.instance.formatCells as jest.Mock).mockRejectedValueOnce(
        new CalendarError('Sheets resource not found', -32003)
      );

      // The formatCells tool re-throws CalendarError instances, so we expect it to throw
      await expect(formatCells({
        spreadsheetId: 'invalid-id',
        range: 'A1:B2',
        bold: true
      })).rejects.toThrow('Sheets resource not found');
    });

    it('should handle invalid range', async () => {
      // Mock SheetsClient to throw an error for this specific test
      (sheetsClient.instance.formatCells as jest.Mock).mockRejectedValueOnce(
        new CalendarError('Invalid range', -32602)
      );

      // The formatCells tool re-throws CalendarError instances, so we expect it to throw
      await expect(formatCells({
        spreadsheetId: testSpreadsheetId,
        range: 'INVALID:RANGE',
        bold: true
      })).rejects.toThrow('Invalid range');
    });
  });
});
