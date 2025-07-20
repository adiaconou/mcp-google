/**
 * Unit tests for Sheets Format Cells Tool
 * 
 * These tests verify the formatCells tool functionality including parameter validation,
 * successful formatting operations, and error handling scenarios.
 */

import { formatCells } from '../../../../../src/services/sheets/tools/formatCells';
import { sheetsClient } from '../../../../../src/services/sheets/sheetsClient';
import { CalendarError, MCPErrorCode } from '../../../../../src/types/mcp';

// Mock the sheets client
jest.mock('../../../../../src/services/sheets/sheetsClient');

const mockSheetsClient = sheetsClient as jest.Mocked<typeof sheetsClient>;

describe('formatCells', () => {
  const mockFormatCells = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the sheets client instance
    (sheetsClient as any).instance = {
      formatCells: mockFormatCells
    };
  });

  describe('Parameter Validation', () => {
    it('should require spreadsheetId', async () => {
      await expect(formatCells({
        range: 'A1:B2'
      })).rejects.toThrow(CalendarError);
      
      await expect(formatCells({
        range: 'A1:B2'
      })).rejects.toThrow('Spreadsheet ID is required');
    });

    it('should require range', async () => {
      await expect(formatCells({
        spreadsheetId: 'test-id'
      })).rejects.toThrow(CalendarError);
      
      await expect(formatCells({
        spreadsheetId: 'test-id'
      })).rejects.toThrow('Range is required');
    });

    it('should validate spreadsheetId type', async () => {
      await expect(formatCells({
        spreadsheetId: 123,
        range: 'A1:B2'
      })).rejects.toThrow('Spreadsheet ID is required and must be a string');
    });

    it('should validate range type', async () => {
      await expect(formatCells({
        spreadsheetId: 'test-id',
        range: 123
      })).rejects.toThrow('Range is required and must be a string');
    });

    it('should validate text alignment values', async () => {
      await expect(formatCells({
        spreadsheetId: 'test-id',
        range: 'A1:B2',
        textAlignment: 'INVALID'
      })).rejects.toThrow('Text alignment must be LEFT, CENTER, or RIGHT');
    });

    it('should validate conditional format parameters', async () => {
      // Missing condition
      await expect(formatCells({
        spreadsheetId: 'test-id',
        range: 'A1:B2',
        conditionalFormat: {
          value: 100,
          backgroundColor: '#FF0000'
        }
      })).rejects.toThrow('Conditional format condition must be GREATER_THAN, LESS_THAN, EQUAL, or BETWEEN');

      // Invalid condition
      await expect(formatCells({
        spreadsheetId: 'test-id',
        range: 'A1:B2',
        conditionalFormat: {
          condition: 'INVALID',
          value: 100,
          backgroundColor: '#FF0000'
        }
      })).rejects.toThrow('Conditional format condition must be GREATER_THAN, LESS_THAN, EQUAL, or BETWEEN');

      // Missing value
      await expect(formatCells({
        spreadsheetId: 'test-id',
        range: 'A1:B2',
        conditionalFormat: {
          condition: 'GREATER_THAN',
          backgroundColor: '#FF0000'
        }
      })).rejects.toThrow('Conditional format value must be a number');

      // Missing backgroundColor
      await expect(formatCells({
        spreadsheetId: 'test-id',
        range: 'A1:B2',
        conditionalFormat: {
          condition: 'GREATER_THAN',
          value: 100
        }
      })).rejects.toThrow('Conditional format backgroundColor is required and must be a hex color');

      // BETWEEN condition missing value2
      await expect(formatCells({
        spreadsheetId: 'test-id',
        range: 'A1:B2',
        conditionalFormat: {
          condition: 'BETWEEN',
          value: 100,
          backgroundColor: '#FF0000'
        }
      })).rejects.toThrow('value2 is required for BETWEEN condition and must be a number');
    });

    it('should validate number format parameters', async () => {
      // Invalid type
      await expect(formatCells({
        spreadsheetId: 'test-id',
        range: 'A1:B2',
        numberFormat: {
          type: 'INVALID'
        }
      })).rejects.toThrow('Number format type must be CURRENCY, PERCENT, DATE, or NUMBER');

      // Invalid decimal places
      await expect(formatCells({
        spreadsheetId: 'test-id',
        range: 'A1:B2',
        numberFormat: {
          type: 'CURRENCY',
          decimalPlaces: -1
        }
      })).rejects.toThrow('Decimal places must be a number between 0 and 10');

      await expect(formatCells({
        spreadsheetId: 'test-id',
        range: 'A1:B2',
        numberFormat: {
          type: 'CURRENCY',
          decimalPlaces: 15
        }
      })).rejects.toThrow('Decimal places must be a number between 0 and 10');
    });

    it('should validate sort parameters', async () => {
      await expect(formatCells({
        spreadsheetId: 'test-id',
        range: 'A1:B2',
        sortBy: {
          column: 'invalid'
        }
      })).rejects.toThrow('Sort column must be a number (0-based index)');
    });
  });

  describe('Successful Operations', () => {
    beforeEach(() => {
      mockFormatCells.mockResolvedValue({
        formattedRanges: 1,
        appliedFormats: ['basic styling', 'number formatting']
      });
    });

    it('should format cells with basic styling', async () => {
      const result = await formatCells({
        spreadsheetId: 'test-id',
        range: 'A1:B2',
        backgroundColor: '#FF0000',
        fontColor: '#FFFFFF',
        bold: true,
        italic: false,
        fontSize: 12,
        textAlignment: 'CENTER'
      });

      expect(mockFormatCells).toHaveBeenCalledWith({
        spreadsheetId: 'test-id',
        range: 'A1:B2',
        backgroundColor: '#FF0000',
        fontColor: '#FFFFFF',
        bold: true,
        italic: false,
        fontSize: 12,
        textAlignment: 'CENTER'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Successfully applied 2 formatting operation(s)');
      expect(result.content[0].text).toContain('basic styling');
      expect(result.content[0].text).toContain('number formatting');
    });

    it('should format cells with data organization', async () => {
      const result = await formatCells({
        spreadsheetId: 'test-id',
        range: 'A1:D10',
        addFilter: true,
        sortBy: {
          column: 0,
          ascending: true
        },
        freezeRows: 1,
        freezeColumns: 2
      });

      expect(mockFormatCells).toHaveBeenCalledWith({
        spreadsheetId: 'test-id',
        range: 'A1:D10',
        addFilter: true,
        sortBy: {
          column: 0,
          ascending: true
        },
        freezeRows: 1,
        freezeColumns: 2
      });

      expect(result.isError).toBe(false);
    });

    it('should format cells with conditional formatting', async () => {
      const result = await formatCells({
        spreadsheetId: 'test-id',
        range: 'A1:B2',
        conditionalFormat: {
          condition: 'GREATER_THAN',
          value: 100,
          backgroundColor: '#00FF00'
        }
      });

      expect(mockFormatCells).toHaveBeenCalledWith({
        spreadsheetId: 'test-id',
        range: 'A1:B2',
        conditionalFormat: {
          condition: 'GREATER_THAN',
          value: 100,
          backgroundColor: '#00FF00'
        }
      });

      expect(result.isError).toBe(false);
    });

    it('should format cells with BETWEEN conditional formatting', async () => {
      const result = await formatCells({
        spreadsheetId: 'test-id',
        range: 'A1:B2',
        conditionalFormat: {
          condition: 'BETWEEN',
          value: 50,
          value2: 100,
          backgroundColor: '#FFFF00'
        }
      });

      expect(mockFormatCells).toHaveBeenCalledWith({
        spreadsheetId: 'test-id',
        range: 'A1:B2',
        conditionalFormat: {
          condition: 'BETWEEN',
          value: 50,
          value2: 100,
          backgroundColor: '#FFFF00'
        }
      });

      expect(result.isError).toBe(false);
    });

    it('should format cells with number formatting', async () => {
      const result = await formatCells({
        spreadsheetId: 'test-id',
        range: 'A1:B2',
        numberFormat: {
          type: 'CURRENCY',
          decimalPlaces: 2
        }
      });

      expect(mockFormatCells).toHaveBeenCalledWith({
        spreadsheetId: 'test-id',
        range: 'A1:B2',
        numberFormat: {
          type: 'CURRENCY',
          decimalPlaces: 2
        }
      });

      expect(result.isError).toBe(false);
    });

    it('should handle default sort ascending value', async () => {
      const result = await formatCells({
        spreadsheetId: 'test-id',
        range: 'A1:B2',
        sortBy: {
          column: 1
          // ascending not specified, should default to true
        }
      });

      expect(mockFormatCells).toHaveBeenCalledWith({
        spreadsheetId: 'test-id',
        range: 'A1:B2',
        sortBy: {
          column: 1,
          ascending: true
        }
      });

      expect(result.isError).toBe(false);
    });

    it('should trim whitespace from string parameters', async () => {
      const result = await formatCells({
        spreadsheetId: '  test-id  ',
        range: '  A1:B2  ',
        backgroundColor: '  #FF0000  ',
        fontColor: '  #FFFFFF  '
      });

      expect(mockFormatCells).toHaveBeenCalledWith({
        spreadsheetId: 'test-id',
        range: 'A1:B2',
        backgroundColor: '#FF0000',
        fontColor: '#FFFFFF'
      });

      expect(result.isError).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle CalendarError from client', async () => {
      const clientError = new CalendarError('Invalid range format', MCPErrorCode.ValidationError);
      mockFormatCells.mockRejectedValue(clientError);

      await expect(formatCells({
        spreadsheetId: 'test-id',
        range: 'A1:B2'
      })).rejects.toThrow(clientError);
    });

    it('should handle generic errors from client', async () => {
      const genericError = new Error('Network error');
      mockFormatCells.mockRejectedValue(genericError);

      await expect(formatCells({
        spreadsheetId: 'test-id',
        range: 'A1:B2'
      })).rejects.toThrow(CalendarError);
      
      await expect(formatCells({
        spreadsheetId: 'test-id',
        range: 'A1:B2'
      })).rejects.toThrow('Failed to format cells: Network error');
    });

    it('should handle unknown errors from client', async () => {
      mockFormatCells.mockRejectedValue('Unknown error');

      await expect(formatCells({
        spreadsheetId: 'test-id',
        range: 'A1:B2'
      })).rejects.toThrow(CalendarError);
      
      await expect(formatCells({
        spreadsheetId: 'test-id',
        range: 'A1:B2'
      })).rejects.toThrow('Failed to format cells: Unknown error');
    });
  });
});
