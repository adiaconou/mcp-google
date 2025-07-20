/**
 * Unit tests for Sheets Get Data Tool
 */

import { getData } from '../../../../../src/services/sheets/tools/getData';
import { sheetsClient } from '../../../../../src/services/sheets/sheetsClient';
import { CalendarError, MCPErrorCode } from '../../../../../src/types/mcp';

// Mock the sheets client
jest.mock('../../../../../src/services/sheets/sheetsClient');

const mockSheetsClient = sheetsClient as jest.Mocked<typeof sheetsClient>;
const mockGetData = jest.fn();

// Set up the mock implementation
(mockSheetsClient.instance as any) = {
  getData: mockGetData,
};

describe('Sheets Get Data Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn(); // Mock console.error
  });

  describe('getData', () => {
    it('should successfully get data from spreadsheet', async () => {
      const mockResponse = {
        values: [
          ['Name', 'Age', 'City'],
          ['John', '30', 'New York'],
          ['Jane', '25', 'Los Angeles']
        ],
        range: 'Sheet1!A1:C3',
        majorDimension: 'ROWS',
        metadata: {
          spreadsheetTitle: 'Test Spreadsheet',
          sheetTitle: 'Sheet1',
          rowCount: 1000,
          columnCount: 26
        }
      };

      mockGetData.mockResolvedValue(mockResponse);

      const result = await getData({
        spreadsheetId: 'test-spreadsheet-id'
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.values).toEqual(mockResponse.values);
      expect(result.data!.range).toBe(mockResponse.range);
      expect(result.data!.majorDimension).toBe(mockResponse.majorDimension);
      expect(result.data!.metadata).toEqual(mockResponse.metadata);
      expect(result.data!.summary).toEqual({
        totalRows: 3,
        totalColumns: 3,
        nonEmptyRows: 3,
        dataTypes: ['number', 'text']
      });

      expect(mockGetData).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        includeMetadata: true
      });
    });

    it('should get data with custom range', async () => {
      const mockResponse = {
        values: [['A1', 'B1'], ['A2', 'B2']],
        range: 'Sheet1!A1:B2',
        majorDimension: 'ROWS'
      };

      mockGetData.mockResolvedValue(mockResponse);

      const result = await getData({
        spreadsheetId: 'test-spreadsheet-id',
        range: 'A1:B2'
      });

      expect(result.success).toBe(true);
      expect(mockGetData).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        range: 'A1:B2',
        includeMetadata: true
      });
    });

    it('should get data with specific sheet name', async () => {
      const mockResponse = {
        values: [['Data1', 'Data2']],
        range: 'MySheet!A1:B1',
        majorDimension: 'ROWS'
      };

      mockGetData.mockResolvedValue(mockResponse);

      const result = await getData({
        spreadsheetId: 'test-spreadsheet-id',
        sheetName: 'MySheet'
      });

      expect(result.success).toBe(true);
      expect(mockGetData).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        sheetName: 'MySheet',
        includeMetadata: true
      });
    });

    it('should get data with custom value render option', async () => {
      const mockResponse = {
        values: [['=SUM(A1:A2)', '100']],
        range: 'Sheet1!A1:B1',
        majorDimension: 'ROWS'
      };

      mockGetData.mockResolvedValue(mockResponse);

      const result = await getData({
        spreadsheetId: 'test-spreadsheet-id',
        valueRenderOption: 'FORMULA'
      });

      expect(result.success).toBe(true);
      expect(mockGetData).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        valueRenderOption: 'FORMULA',
        includeMetadata: true
      });
    });

    it('should get data without metadata when requested', async () => {
      const mockResponse = {
        values: [['Test']],
        range: 'Sheet1!A1:A1',
        majorDimension: 'ROWS'
      };

      mockGetData.mockResolvedValue(mockResponse);

      const result = await getData({
        spreadsheetId: 'test-spreadsheet-id',
        includeMetadata: false
      });

      expect(result.success).toBe(true);
      expect(result.data!.metadata).toBeUndefined();
      expect(mockGetData).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        includeMetadata: false
      });
    });

    it('should handle empty spreadsheet data', async () => {
      const mockResponse = {
        values: [],
        range: 'Sheet1!A1:Z1000',
        majorDimension: 'ROWS'
      };

      mockGetData.mockResolvedValue(mockResponse);

      const result = await getData({
        spreadsheetId: 'test-spreadsheet-id'
      });

      expect(result.success).toBe(true);
      expect(result.data!.summary).toEqual({
        totalRows: 0,
        totalColumns: 0,
        nonEmptyRows: 0,
        dataTypes: []
      });
    });

    it('should analyze different data types correctly', async () => {
      const mockResponse = {
        values: [
          ['Text', '123', 'true', '2023-01-01', ''],
          ['More text', '45.67', 'false', '12/31/2023', null]
        ],
        range: 'Sheet1!A1:E2',
        majorDimension: 'ROWS'
      };

      mockGetData.mockResolvedValue(mockResponse);

      const result = await getData({
        spreadsheetId: 'test-spreadsheet-id'
      });

      expect(result.success).toBe(true);
      expect(result.data!.summary.dataTypes).toContain('text');
      expect(result.data!.summary.dataTypes).toContain('number');
      expect(result.data!.summary.dataTypes).toContain('date');
      expect(result.data!.summary.nonEmptyRows).toBe(2);
    });

    it('should handle CalendarError from client', async () => {
      const error = new CalendarError('Spreadsheet not found', MCPErrorCode.APIError);
      mockGetData.mockRejectedValue(error);

      const result = await getData({
        spreadsheetId: 'invalid-spreadsheet-id'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Spreadsheet not found');
    });

    it('should handle generic error from client', async () => {
      const error = new Error('Network error');
      mockGetData.mockRejectedValue(error);

      const result = await getData({
        spreadsheetId: 'test-spreadsheet-id'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to get spreadsheet data: Network error');
    });

    it('should handle unknown error from client', async () => {
      mockGetData.mockRejectedValue('Unknown error');

      const result = await getData({
        spreadsheetId: 'test-spreadsheet-id'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to get spreadsheet data: Unknown error');
    });

    it('should pass all parameters correctly', async () => {
      const mockResponse = {
        values: [['Test']],
        range: 'CustomSheet!B2:C3',
        majorDimension: 'ROWS',
        metadata: {
          spreadsheetTitle: 'Test',
          sheetTitle: 'CustomSheet',
          rowCount: 100,
          columnCount: 10
        }
      };

      mockGetData.mockResolvedValue(mockResponse);

      await getData({
        spreadsheetId: 'test-spreadsheet-id',
        range: 'B2:C3',
        sheetName: 'CustomSheet',
        valueRenderOption: 'UNFORMATTED_VALUE',
        includeMetadata: true
      });

      expect(mockGetData).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        range: 'B2:C3',
        sheetName: 'CustomSheet',
        valueRenderOption: 'UNFORMATTED_VALUE',
        includeMetadata: true
      });
    });
  });

  describe('Data Analysis', () => {
    it('should correctly identify date strings', async () => {
      const mockResponse = {
        values: [
          ['2023-01-01', '01/15/2023', '12-25-2023', '1/1/23'],
          ['Not a date', '123', 'true', '']
        ],
        range: 'Sheet1!A1:D2',
        majorDimension: 'ROWS'
      };

      mockGetData.mockResolvedValue(mockResponse);

      const result = await getData({
        spreadsheetId: 'test-spreadsheet-id'
      });

      expect(result.success).toBe(true);
      expect(result.data!.summary.dataTypes).toContain('date');
      expect(result.data!.summary.dataTypes).toContain('text');
      expect(result.data!.summary.dataTypes).toContain('number');
    });

    it('should handle rows with different lengths', async () => {
      const mockResponse = {
        values: [
          ['A', 'B', 'C', 'D'],
          ['E', 'F'],
          ['G', 'H', 'I']
        ],
        range: 'Sheet1!A1:D3',
        majorDimension: 'ROWS'
      };

      mockGetData.mockResolvedValue(mockResponse);

      const result = await getData({
        spreadsheetId: 'test-spreadsheet-id'
      });

      expect(result.success).toBe(true);
      expect(result.data!.summary.totalColumns).toBe(4); // Max length
      expect(result.data!.summary.totalRows).toBe(3);
      expect(result.data!.summary.nonEmptyRows).toBe(3);
    });

    it('should handle completely empty rows', async () => {
      const mockResponse = {
        values: [
          ['A', 'B'],
          ['', ''],
          ['C', 'D'],
          []
        ],
        range: 'Sheet1!A1:B4',
        majorDimension: 'ROWS'
      };

      mockGetData.mockResolvedValue(mockResponse);

      const result = await getData({
        spreadsheetId: 'test-spreadsheet-id'
      });

      expect(result.success).toBe(true);
      expect(result.data!.summary.totalRows).toBe(4);
      expect(result.data!.summary.nonEmptyRows).toBe(2); // Only rows with actual data
    });
  });
});
