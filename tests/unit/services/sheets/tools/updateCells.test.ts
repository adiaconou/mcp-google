/**
 * Unit tests for Sheets Update Cells tool
 */

import { updateCells } from '../../../../../src/services/sheets/tools/updateCells';
import { sheetsClient } from '../../../../../src/services/sheets/sheetsClient';
import { CalendarError, MCPErrorCode } from '../../../../../src/types/mcp';

// Mock the sheets client
jest.mock('../../../../../src/services/sheets/sheetsClient');

describe('Sheets Update Cells Tool', () => {
  const mockUpdateCells = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the sheets client instance
    (sheetsClient as any).instance = {
      updateCells: mockUpdateCells
    };
  });

  describe('Input Validation', () => {
    it('should require spreadsheetId', async () => {
      await expect(updateCells({})).rejects.toThrow(
        new CalendarError('Spreadsheet ID is required and must be a string', MCPErrorCode.ValidationError)
      );
    });

    it('should require spreadsheetId to be a string', async () => {
      await expect(updateCells({ spreadsheetId: 123 })).rejects.toThrow(
        new CalendarError('Spreadsheet ID is required and must be a string', MCPErrorCode.ValidationError)
      );
    });

    it('should require updates array', async () => {
      await expect(updateCells({ spreadsheetId: 'test-id' })).rejects.toThrow(
        new CalendarError('Updates array is required and must contain at least one update', MCPErrorCode.ValidationError)
      );
    });

    it('should require non-empty updates array', async () => {
      await expect(updateCells({ 
        spreadsheetId: 'test-id',
        updates: []
      })).rejects.toThrow(
        new CalendarError('Updates array is required and must contain at least one update', MCPErrorCode.ValidationError)
      );
    });

    it('should validate update objects', async () => {
      await expect(updateCells({
        spreadsheetId: 'test-id',
        updates: ['invalid']
      })).rejects.toThrow(
        new CalendarError('Update 0: Must be an object with range and values', MCPErrorCode.ValidationError)
      );
    });

    it('should require range in updates', async () => {
      await expect(updateCells({
        spreadsheetId: 'test-id',
        updates: [{ values: [['test']] }]
      })).rejects.toThrow(
        new CalendarError('Update 0: Range is required and must be a string', MCPErrorCode.ValidationError)
      );
    });

    it('should require values in updates', async () => {
      await expect(updateCells({
        spreadsheetId: 'test-id',
        updates: [{ range: 'A1:B2' }]
      })).rejects.toThrow(
        new CalendarError('Update 0: Values must be a 2D array', MCPErrorCode.ValidationError)
      );
    });

    it('should validate values as 2D array', async () => {
      await expect(updateCells({
        spreadsheetId: 'test-id',
        updates: [{ 
          range: 'A1:B2',
          values: 'invalid'
        }]
      })).rejects.toThrow(
        new CalendarError('Update 0: Values must be a 2D array', MCPErrorCode.ValidationError)
      );
    });

    it('should validate each row as array', async () => {
      await expect(updateCells({
        spreadsheetId: 'test-id',
        updates: [{ 
          range: 'A1:B2',
          values: ['invalid-row']
        }]
      })).rejects.toThrow(
        new CalendarError('Update 0, row 0: Each row must be an array', MCPErrorCode.ValidationError)
      );
    });

    it('should validate valueInputOption', async () => {
      await expect(updateCells({
        spreadsheetId: 'test-id',
        updates: [{ 
          range: 'A1:B2',
          values: [['test']]
        }],
        valueInputOption: 'INVALID'
      })).rejects.toThrow(
        new CalendarError('Value input option must be either RAW or USER_ENTERED', MCPErrorCode.ValidationError)
      );
    });
  });

  describe('Successful Updates', () => {
    it('should update cells with basic data', async () => {
      const mockResult = {
        updatedCells: 4,
        updatedRanges: 1
      };
      mockUpdateCells.mockResolvedValue(mockResult);

      const result = await updateCells({
        spreadsheetId: 'test-spreadsheet-id',
        updates: [{
          range: 'A1:B2',
          values: [
            ['Name', 'Age'],
            ['John', 30]
          ]
        }]
      });

      expect(mockUpdateCells).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        updates: [{
          range: 'A1:B2',
          values: [
            ['Name', 'Age'],
            ['John', 30]
          ]
        }]
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Successfully updated 4 cells in 1 range(s)');
      expect(result.content[0].text).toContain('A1:B2 - 4 cells');
    });

    it('should handle multiple ranges', async () => {
      const mockResult = {
        updatedCells: 6,
        updatedRanges: 2
      };
      mockUpdateCells.mockResolvedValue(mockResult);

      const result = await updateCells({
        spreadsheetId: 'test-spreadsheet-id',
        updates: [
          {
            range: 'A1:B2',
            values: [['Name', 'Age'], ['John', 30]]
          },
          {
            range: 'D1:D2',
            values: [['Status'], ['Active']]
          }
        ]
      });

      expect(mockUpdateCells).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        updates: [
          {
            range: 'A1:B2',
            values: [['Name', 'Age'], ['John', 30]]
          },
          {
            range: 'D1:D2',
            values: [['Status'], ['Active']]
          }
        ]
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Successfully updated 6 cells in 2 range(s)');
      expect(result.content[0].text).toContain('A1:B2 - 4 cells');
      expect(result.content[0].text).toContain('D1:D2 - 2 cells');
    });

    it('should handle different data types', async () => {
      const mockResult = {
        updatedCells: 3,
        updatedRanges: 1
      };
      mockUpdateCells.mockResolvedValue(mockResult);

      const result = await updateCells({
        spreadsheetId: 'test-spreadsheet-id',
        updates: [{
          range: 'A1:C1',
          values: [['Text', 42, true]]
        }]
      });

      expect(mockUpdateCells).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        updates: [{
          range: 'A1:C1',
          values: [['Text', 42, true]]
        }]
      });

      expect(result.isError).toBe(false);
    });

    it('should handle null and undefined values', async () => {
      const mockResult = {
        updatedCells: 4,
        updatedRanges: 1
      };
      mockUpdateCells.mockResolvedValue(mockResult);

      const result = await updateCells({
        spreadsheetId: 'test-spreadsheet-id',
        updates: [{
          range: 'A1:D1',
          values: [['Text', null, undefined, 'More text']]
        }]
      });

      expect(mockUpdateCells).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        updates: [{
          range: 'A1:D1',
          values: [['Text', '', '', 'More text']]
        }]
      });

      expect(result.isError).toBe(false);
    });

    it('should handle RAW value input option', async () => {
      const mockResult = {
        updatedCells: 2,
        updatedRanges: 1
      };
      mockUpdateCells.mockResolvedValue(mockResult);

      const result = await updateCells({
        spreadsheetId: 'test-spreadsheet-id',
        updates: [{
          range: 'A1:B1',
          values: [['=SUM(1,2)', 'Raw text']]
        }],
        valueInputOption: 'RAW'
      });

      expect(mockUpdateCells).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        updates: [{
          range: 'A1:B1',
          values: [['=SUM(1,2)', 'Raw text']]
        }],
        valueInputOption: 'RAW'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Value Input Option:** RAW');
    });

    it('should handle USER_ENTERED value input option', async () => {
      const mockResult = {
        updatedCells: 2,
        updatedRanges: 1
      };
      mockUpdateCells.mockResolvedValue(mockResult);

      const result = await updateCells({
        spreadsheetId: 'test-spreadsheet-id',
        updates: [{
          range: 'A1:B1',
          values: [['=SUM(1,2)', 'Formatted text']]
        }],
        valueInputOption: 'USER_ENTERED'
      });

      expect(mockUpdateCells).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        updates: [{
          range: 'A1:B1',
          values: [['=SUM(1,2)', 'Formatted text']]
        }],
        valueInputOption: 'USER_ENTERED'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Value Input Option:** USER_ENTERED');
    });

    it('should default to USER_ENTERED when no option specified', async () => {
      const mockResult = {
        updatedCells: 1,
        updatedRanges: 1
      };
      mockUpdateCells.mockResolvedValue(mockResult);

      await updateCells({
        spreadsheetId: 'test-spreadsheet-id',
        updates: [{
          range: 'A1',
          values: [['test']]
        }]
      });

      expect(mockUpdateCells).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        updates: [{
          range: 'A1',
          values: [['test']]
        }]
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors', async () => {
      const apiError = new Error('Sheets API error');
      mockUpdateCells.mockRejectedValue(apiError);

      await expect(updateCells({
        spreadsheetId: 'test-spreadsheet-id',
        updates: [{
          range: 'A1',
          values: [['test']]
        }]
      })).rejects.toThrow(
        new CalendarError('Failed to update cells: Sheets API error', MCPErrorCode.APIError)
      );
    });

    it('should propagate CalendarError', async () => {
      const calendarError = new CalendarError('Custom error', MCPErrorCode.AuthenticationError);
      mockUpdateCells.mockRejectedValue(calendarError);

      await expect(updateCells({
        spreadsheetId: 'test-spreadsheet-id',
        updates: [{
          range: 'A1',
          values: [['test']]
        }]
      })).rejects.toThrow(calendarError);
    });

    it('should handle unknown errors', async () => {
      mockUpdateCells.mockRejectedValue('Unknown error');

      await expect(updateCells({
        spreadsheetId: 'test-spreadsheet-id',
        updates: [{
          range: 'A1',
          values: [['test']]
        }]
      })).rejects.toThrow(
        new CalendarError('Failed to update cells: Unknown error', MCPErrorCode.APIError)
      );
    });
  });

  describe('Data Conversion', () => {
    it('should convert non-primitive types to strings', async () => {
      const mockResult = {
        updatedCells: 3,
        updatedRanges: 1
      };
      mockUpdateCells.mockResolvedValue(mockResult);

      const complexObject = { key: 'value' };
      const date = new Date('2023-01-01');

      await updateCells({
        spreadsheetId: 'test-spreadsheet-id',
        updates: [{
          range: 'A1:C1',
          values: [[complexObject, date, Symbol('test')]]
        }]
      });

      expect(mockUpdateCells).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        updates: [{
          range: 'A1:C1',
          values: [['[object Object]', date.toString(), 'Symbol(test)']]
        }]
      });
    });

    it('should trim whitespace from spreadsheetId and ranges', async () => {
      const mockResult = {
        updatedCells: 1,
        updatedRanges: 1
      };
      mockUpdateCells.mockResolvedValue(mockResult);

      await updateCells({
        spreadsheetId: '  test-spreadsheet-id  ',
        updates: [{
          range: '  A1:B2  ',
          values: [['test']]
        }]
      });

      expect(mockUpdateCells).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        updates: [{
          range: 'A1:B2',
          values: [['test']]
        }]
      });
    });
  });
});
