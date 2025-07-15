/**
 * Integration tests for Sheets Update Cells functionality
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

import { sheetsClient } from '../../src/services/sheets/sheetsClient';
import { updateCells } from '../../src/services/sheets/tools/updateCells';
import { createSpreadsheet } from '../../src/services/sheets/tools/createSpreadsheet';
import { oauthManager } from '../../src/auth/oauthManager';

// Mock Google Sheets API
const mockSheetsApi = {
  spreadsheets: {
    create: jest.fn(),
    values: {
      batchUpdate: jest.fn(),
    },
  },
};

jest.mock('googleapis', () => ({
  google: {
    sheets: jest.fn(() => mockSheetsApi),
    auth: {
      OAuth2: jest.fn(),
    },
  },
}));

describe('Sheets Update Cells Integration', () => {
  let testSpreadsheetId: string;

  beforeEach(() => {
    jest.clearAllMocks();
    testSpreadsheetId = 'mock-spreadsheet-id-123';
    
    // Mock OAuth client
    (oauthManager.instance.getOAuth2Client as jest.Mock).mockResolvedValue({
      credentials: { access_token: 'mock-token' }
    });

    // Mock successful API responses
    mockSheetsApi.spreadsheets.create.mockResolvedValue({
      data: {
        spreadsheetId: testSpreadsheetId,
        properties: {
          title: 'Test Spreadsheet - Update Cells'
        }
      }
    });

    mockSheetsApi.spreadsheets.values.batchUpdate.mockResolvedValue({
      data: {
        totalUpdatedCells: 4,
        totalUpdatedColumns: 2,
        totalUpdatedRows: 2,
        totalUpdatedSheets: 1,
        responses: [{
          updatedCells: 4,
          updatedColumns: 2,
          updatedRows: 2
        }]
      }
    });
  });

  it('should update cells with basic data', async () => {
    const result = await updateCells({
      spreadsheetId: testSpreadsheetId,
      updates: [{
        range: 'A1:B2',
        values: [
          ['Name', 'Age'],
          ['John Doe', 30]
        ]
      }]
    });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Successfully updated 4 cells in 1 range(s)');
    expect(result.content[0].text).toContain('A1:B2 - 4 cells');
    
    // Verify API was called correctly
    expect(mockSheetsApi.spreadsheets.values.batchUpdate).toHaveBeenCalledWith({
      spreadsheetId: testSpreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: [{
          range: 'A1:B2',
          values: [
            ['Name', 'Age'],
            ['John Doe', 30]
          ]
        }]
      }
    });
  });

  it('should update multiple ranges', async () => {
    // Mock response for multiple ranges
    mockSheetsApi.spreadsheets.values.batchUpdate.mockResolvedValue({
      data: {
        totalUpdatedCells: 7,
        totalUpdatedColumns: 3,
        totalUpdatedRows: 5,
        totalUpdatedSheets: 1,
        responses: [
          { updatedCells: 4, updatedColumns: 2, updatedRows: 2 },
          { updatedCells: 3, updatedColumns: 1, updatedRows: 3 }
        ]
      }
    });

    const result = await updateCells({
      spreadsheetId: testSpreadsheetId,
      updates: [
        {
          range: 'A4:B5',
          values: [
            ['Product', 'Price'],
            ['Widget', 19.99]
          ]
        },
        {
          range: 'D1:D3',
          values: [
            ['Status'],
            ['Active'],
            ['Pending']
          ]
        }
      ]
    });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Successfully updated 7 cells in 2 range(s)');
    expect(result.content[0].text).toContain('A4:B5 - 4 cells');
    expect(result.content[0].text).toContain('D1:D3 - 3 cells');
  });

  it('should handle different data types', async () => {
    mockSheetsApi.spreadsheets.values.batchUpdate.mockResolvedValue({
      data: {
        totalUpdatedCells: 5,
        totalUpdatedColumns: 5,
        totalUpdatedRows: 1,
        totalUpdatedSheets: 1,
        responses: [{ updatedCells: 5, updatedColumns: 5, updatedRows: 1 }]
      }
    });

    const result = await updateCells({
      spreadsheetId: testSpreadsheetId,
      updates: [{
        range: 'A7:E7',
        values: [['Text', 42, true, 3.14, '2023-01-01']]
      }]
    });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Successfully updated 5 cells in 1 range(s)');
  });

  it('should handle formulas with USER_ENTERED option', async () => {
    mockSheetsApi.spreadsheets.values.batchUpdate.mockResolvedValue({
      data: {
        totalUpdatedCells: 3,
        totalUpdatedColumns: 3,
        totalUpdatedRows: 1,
        totalUpdatedSheets: 1,
        responses: [{ updatedCells: 3, updatedColumns: 3, updatedRows: 1 }]
      }
    });

    const result = await updateCells({
      spreadsheetId: testSpreadsheetId,
      updates: [{
        range: 'A9:C9',
        values: [['=SUM(1,2,3)', '=NOW()', '=CONCATENATE("Hello", " ", "World")']]
      }],
      valueInputOption: 'USER_ENTERED'
    });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Successfully updated 3 cells in 1 range(s)');
    expect(result.content[0].text).toContain('Value Input Option:** USER_ENTERED');
    
    // Verify USER_ENTERED option was used
    expect(mockSheetsApi.spreadsheets.values.batchUpdate).toHaveBeenCalledWith({
      spreadsheetId: testSpreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: [{
          range: 'A9:C9',
          values: [['=SUM(1,2,3)', '=NOW()', '=CONCATENATE("Hello", " ", "World")']]
        }]
      }
    });
  });

  it('should handle formulas with RAW option', async () => {
    mockSheetsApi.spreadsheets.values.batchUpdate.mockResolvedValue({
      data: {
        totalUpdatedCells: 2,
        totalUpdatedColumns: 2,
        totalUpdatedRows: 1,
        totalUpdatedSheets: 1,
        responses: [{ updatedCells: 2, updatedColumns: 2, updatedRows: 1 }]
      }
    });

    const result = await updateCells({
      spreadsheetId: testSpreadsheetId,
      updates: [{
        range: 'A11:B11',
        values: [['=SUM(1,2,3)', 'This is literal text']]
      }],
      valueInputOption: 'RAW'
    });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Successfully updated 2 cells in 1 range(s)');
    expect(result.content[0].text).toContain('Value Input Option:** RAW');
    
    // Verify RAW option was used
    expect(mockSheetsApi.spreadsheets.values.batchUpdate).toHaveBeenCalledWith({
      spreadsheetId: testSpreadsheetId,
      requestBody: {
        valueInputOption: 'RAW',
        data: [{
          range: 'A11:B11',
          values: [['=SUM(1,2,3)', 'This is literal text']]
        }]
      }
    });
  });

  it('should handle single cell updates', async () => {
    mockSheetsApi.spreadsheets.values.batchUpdate.mockResolvedValue({
      data: {
        totalUpdatedCells: 1,
        totalUpdatedColumns: 1,
        totalUpdatedRows: 1,
        totalUpdatedSheets: 1,
        responses: [{ updatedCells: 1, updatedColumns: 1, updatedRows: 1 }]
      }
    });

    const result = await updateCells({
      spreadsheetId: testSpreadsheetId,
      updates: [{
        range: 'F1',
        values: [['Single Cell Value']]
      }]
    });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Successfully updated 1 cells in 1 range(s)');
  });

  it('should handle error for invalid spreadsheet ID', async () => {
    mockSheetsApi.spreadsheets.values.batchUpdate.mockRejectedValue({
      code: 404,
      message: 'Requested entity was not found.'
    });

    try {
      await updateCells({
        spreadsheetId: 'invalid-spreadsheet-id',
        updates: [{
          range: 'A1',
          values: [['test']]
        }]
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.message).toContain('Sheets resource not found during update cells');
    }
  });

  it('should handle error for invalid range', async () => {
    try {
      await updateCells({
        spreadsheetId: testSpreadsheetId,
        updates: [{
          range: 'INVALID_RANGE',
          values: [['test']]
        }]
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.message).toContain('Invalid range format. Use A1 notation');
    }
  });

  it('should handle large data updates', async () => {
    mockSheetsApi.spreadsheets.values.batchUpdate.mockResolvedValue({
      data: {
        totalUpdatedCells: 100,
        totalUpdatedColumns: 10,
        totalUpdatedRows: 10,
        totalUpdatedSheets: 1,
        responses: [{ updatedCells: 100, updatedColumns: 10, updatedRows: 10 }]
      }
    });

    // Create a 10x10 grid of data
    const largeData: string[][] = [];
    for (let i = 0; i < 10; i++) {
      const row: string[] = [];
      for (let j = 0; j < 10; j++) {
        row.push(`Cell ${i + 1},${j + 1}`);
      }
      largeData.push(row);
    }

    const result = await updateCells({
      spreadsheetId: testSpreadsheetId,
      updates: [{
        range: 'A15:J24',
        values: largeData
      }]
    });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Successfully updated 100 cells in 1 range(s)');
  });
});
