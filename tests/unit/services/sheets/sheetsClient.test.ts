/**
 * Unit tests for SheetsClient
 */

import { SheetsClient } from '../../../../src/services/sheets/sheetsClient';
import { oauthManager } from '../../../../src/auth/oauthManager';
import { google } from 'googleapis';
import { CalendarError, MCPErrorCode } from '../../../../src/types/mcp';

// Mock googleapis
jest.mock('googleapis');
const mockGoogle = google as jest.Mocked<typeof google>;

// Mock OAuth manager
jest.mock('../../../../src/auth/oauthManager');
const mockOAuthManager = oauthManager as jest.Mocked<typeof oauthManager>;

describe('SheetsClient', () => {
  let sheetsClient: SheetsClient;
  let mockSheetsApi: any;
  let mockOAuth2Client: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock OAuth2 client
    mockOAuth2Client = {
      setCredentials: jest.fn(),
      getAccessToken: jest.fn(),
    };

    // Create mock Sheets API
    mockSheetsApi = {
      spreadsheets: {
        create: jest.fn(),
        values: {
          update: jest.fn(),
        },
      },
    };

    // Mock google.sheets to return our mock API
    mockGoogle.sheets.mockReturnValue(mockSheetsApi);

    // Mock OAuth manager instance
    (mockOAuthManager as any).instance = {
      ensureScopes: jest.fn().mockResolvedValue(undefined),
      getOAuth2Client: jest.fn().mockResolvedValue(mockOAuth2Client),
      isAuthenticated: jest.fn().mockResolvedValue(true),
    };

    // Create new client instance
    sheetsClient = new SheetsClient();
  });

  describe('createSpreadsheet', () => {
    it('should create a spreadsheet with basic parameters', async () => {
      // Mock successful API response
      const mockResponse = {
        data: {
          spreadsheetId: 'test-spreadsheet-id',
          spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/test-spreadsheet-id',
          properties: {
            title: 'Test Spreadsheet',
          },
          sheets: [
            {
              properties: {
                sheetId: 0,
                title: 'Sheet1',
                index: 0,
                sheetType: 'GRID',
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 26,
                },
              },
            },
          ],
        },
      };

      mockSheetsApi.spreadsheets.create.mockResolvedValue(mockResponse);

      const result = await sheetsClient.createSpreadsheet({
        title: 'Test Spreadsheet',
      });

      expect(result).toEqual({
        spreadsheetId: 'test-spreadsheet-id',
        title: 'Test Spreadsheet',
        url: 'https://docs.google.com/spreadsheets/d/test-spreadsheet-id',
        sheets: [
          {
            sheetId: 0,
            title: 'Sheet1',
            index: 0,
            sheetType: 'GRID',
            gridProperties: {
              rowCount: 1000,
              columnCount: 26,
            },
          },
        ],
      });

      expect(mockOAuthManager.instance.ensureScopes).toHaveBeenCalledWith([
        'https://www.googleapis.com/auth/spreadsheets',
      ]);

      expect(mockSheetsApi.spreadsheets.create).toHaveBeenCalledWith({
        requestBody: {
          properties: {
            title: 'Test Spreadsheet',
          },
          sheets: [
            {
              properties: {
                title: 'Sheet1',
                sheetType: 'GRID',
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 26,
                },
              },
            },
          ],
        },
      });
    });

    it('should create a spreadsheet with initial data', async () => {
      // Mock successful API response
      const mockResponse = {
        data: {
          spreadsheetId: 'test-spreadsheet-id',
          spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/test-spreadsheet-id',
          properties: {
            title: 'Test Spreadsheet',
          },
          sheets: [
            {
              properties: {
                sheetId: 0,
                title: 'Sheet1',
                index: 0,
                sheetType: 'GRID',
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 26,
                },
              },
            },
          ],
        },
      };

      mockSheetsApi.spreadsheets.create.mockResolvedValue(mockResponse);
      mockSheetsApi.spreadsheets.values.update.mockResolvedValue({ data: {} });

      const initialData = [
        ['Name', 'Age', 'City'],
        ['John', '30', 'New York'],
        ['Jane', '25', 'Los Angeles'],
      ];

      const result = await sheetsClient.createSpreadsheet({
        title: 'Test Spreadsheet',
        initialData,
      });

      expect(result.spreadsheetId).toBe('test-spreadsheet-id');

      // Verify initial data was added
      expect(mockSheetsApi.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        range: 'Sheet1!A1:C3',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: initialData,
        },
      });
    });

    it('should validate required parameters', async () => {
      await expect(
        sheetsClient.createSpreadsheet({
          title: '',
        })
      ).rejects.toThrow(CalendarError);

      await expect(
        sheetsClient.createSpreadsheet({
          title: 'A'.repeat(256), // Too long
        })
      ).rejects.toThrow(CalendarError);
    });

    it('should validate initial data format', async () => {
      await expect(
        sheetsClient.createSpreadsheet({
          title: 'Test',
          initialData: 'invalid' as any,
        })
      ).rejects.toThrow(CalendarError);

      await expect(
        sheetsClient.createSpreadsheet({
          title: 'Test',
          initialData: [['valid'], 'invalid'] as any,
        })
      ).rejects.toThrow(CalendarError);
    });

    it('should validate email addresses', async () => {
      await expect(
        sheetsClient.createSpreadsheet({
          title: 'Test',
          shareWithUsers: ['invalid-email'],
        })
      ).rejects.toThrow(CalendarError);
    });

    it('should handle authentication errors', async () => {
      // Create a proper mock function for ensureScopes
      const mockEnsureScopes = jest.fn().mockRejectedValue(
        new CalendarError('Missing required scopes', MCPErrorCode.AuthenticationError)
      );
      
      (mockOAuthManager as any).instance.ensureScopes = mockEnsureScopes;

      await expect(
        sheetsClient.createSpreadsheet({
          title: 'Test Spreadsheet',
        })
      ).rejects.toThrow(CalendarError);
    });

    it('should handle API errors', async () => {
      mockSheetsApi.spreadsheets.create.mockRejectedValue(
        new Error('API Error')
      );

      await expect(
        sheetsClient.createSpreadsheet({
          title: 'Test Spreadsheet',
        })
      ).rejects.toThrow(CalendarError);
    });

    it('should handle missing response data', async () => {
      mockSheetsApi.spreadsheets.create.mockResolvedValue({
        data: null,
      });

      await expect(
        sheetsClient.createSpreadsheet({
          title: 'Test Spreadsheet',
        })
      ).rejects.toThrow(CalendarError);
    });
  });

  describe('error handling', () => {
    it('should handle 401 authentication errors', async () => {
      const error = { code: 401, message: 'Unauthorized' };
      mockSheetsApi.spreadsheets.create.mockRejectedValue(error);

      await expect(
        sheetsClient.createSpreadsheet({
          title: 'Test Spreadsheet',
        })
      ).rejects.toThrow('Authentication failed');
    });

    it('should handle 403 authorization errors', async () => {
      const error = { code: 403, message: 'Forbidden' };
      mockSheetsApi.spreadsheets.create.mockRejectedValue(error);

      await expect(
        sheetsClient.createSpreadsheet({
          title: 'Test Spreadsheet',
        })
      ).rejects.toThrow('Insufficient permissions');
    });

    it('should handle 429 rate limit errors', async () => {
      const error = { code: 429, message: 'Too Many Requests' };
      mockSheetsApi.spreadsheets.create.mockRejectedValue(error);

      await expect(
        sheetsClient.createSpreadsheet({
          title: 'Test Spreadsheet',
        })
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle 404 not found errors', async () => {
      const error = { code: 404, message: 'Not Found' };
      mockSheetsApi.spreadsheets.create.mockRejectedValue(error);

      await expect(
        sheetsClient.createSpreadsheet({
          title: 'Test Spreadsheet',
        })
      ).rejects.toThrow('Sheets resource not found');
    });

    it('should handle 400 bad request errors', async () => {
      const error = { code: 400, message: 'Bad Request' };
      mockSheetsApi.spreadsheets.create.mockRejectedValue(error);

      await expect(
        sheetsClient.createSpreadsheet({
          title: 'Test Spreadsheet',
        })
      ).rejects.toThrow('Invalid Sheets request');
    });

    it('should handle unknown errors', async () => {
      const error = { code: 500, message: 'Internal Server Error' };
      mockSheetsApi.spreadsheets.create.mockRejectedValue(error);

      await expect(
        sheetsClient.createSpreadsheet({
          title: 'Test Spreadsheet',
        })
      ).rejects.toThrow('Failed to create spreadsheet');
    });
  });
});
