/**
 * Unit tests for Sheets Calculate Tool
 * 
 * Tests the sheets_calculate tool functionality including formula operations,
 * aggregate functions, parameter validation, and error handling.
 */

import { calculate } from '../../../../../src/services/sheets/tools/calculate';
import { sheetsClient } from '../../../../../src/services/sheets/sheetsClient';

// Mock the sheets client
jest.mock('../../../../../src/services/sheets/sheetsClient');

describe('Sheets Calculate Tool', () => {
  const mockCalculate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the sheets client instance
    (sheetsClient as any).instance = {
      calculate: mockCalculate
    };
  });

  describe('Core Functionality', () => {
    it('should execute formula operation successfully', async () => {
      const mockResult = {
        result: 150,
        operation: 'formula',
        range: 'C1'
      };

      mockCalculate.mockResolvedValue(mockResult);

      const args = {
        spreadsheetId: 'test-spreadsheet-id',
        operation: 'formula' as const,
        formula: '=A1+B1',
        outputRange: 'C1'
      };

      const result = await calculate(args);

      expect(mockCalculate).toHaveBeenCalledWith(args);
      expect(result.result).toBe(150);
      expect(result.operation).toBe('formula');
      expect(result.formula).toBe('=A1+B1');
    });

    it('should execute SUM aggregate operation', async () => {
      const mockResult = {
        result: 500,
        operation: 'aggregate',
        range: 'A1:A10'
      };

      mockCalculate.mockResolvedValue(mockResult);

      const args = {
        spreadsheetId: 'test-spreadsheet-id',
        operation: 'aggregate' as const,
        range: 'A1:A10',
        aggregateFunction: 'SUM' as const
      };

      const result = await calculate(args);

      expect(mockCalculate).toHaveBeenCalledWith(args);
      expect(result.result).toBe(500);
      expect(result.aggregateFunction).toBe('SUM');
    });

    it('should execute AVERAGE aggregate operation', async () => {
      const mockResult = {
        result: 25.5,
        operation: 'aggregate',
        range: 'B1:B20'
      };

      mockCalculate.mockResolvedValue(mockResult);

      const args = {
        spreadsheetId: 'test-spreadsheet-id',
        operation: 'aggregate' as const,
        range: 'B1:B20',
        aggregateFunction: 'AVERAGE' as const
      };

      const result = await calculate(args);

      expect(result.result).toBe(25.5);
      expect(result.aggregateFunction).toBe('AVERAGE');
    });

    it('should handle aggregate with output range', async () => {
      const mockResult = {
        result: 300,
        operation: 'aggregate',
        range: 'A1:A5'
      };

      mockCalculate.mockResolvedValue(mockResult);

      const args = {
        spreadsheetId: 'test-spreadsheet-id',
        operation: 'aggregate' as const,
        range: 'A1:A5',
        aggregateFunction: 'SUM' as const,
        outputRange: 'B1'
      };

      const result = await calculate(args);

      expect(mockCalculate).toHaveBeenCalledWith({
        ...args,
        outputRange: 'B1'
      });
      expect(result.outputRange).toBe('B1');
    });
  });

  describe('Parameter Validation', () => {
    it('should require spreadsheetId', async () => {
      const args = {
        operation: 'formula' as const,
        formula: '=A1+B1',
        outputRange: 'C1'
        // Missing spreadsheetId
      };

      await expect(calculate(args as any)).rejects.toThrow('Spreadsheet ID is required and must be a string');
    });

    it('should require formula for formula operations', async () => {
      const args = {
        spreadsheetId: 'test-spreadsheet-id',
        operation: 'formula' as const,
        outputRange: 'C1'
        // Missing formula
      };

      await expect(calculate(args)).rejects.toThrow('Formula is required for formula operations');
    });

    it('should require outputRange for formula operations', async () => {
      const args = {
        spreadsheetId: 'test-spreadsheet-id',
        operation: 'formula' as const,
        formula: '=A1+B1'
        // Missing outputRange
      };

      await expect(calculate(args)).rejects.toThrow('Output range is required for formula operations');
    });

    it('should require range for aggregate operations', async () => {
      const args = {
        spreadsheetId: 'test-spreadsheet-id',
        operation: 'aggregate' as const,
        aggregateFunction: 'SUM' as const
        // Missing range
      };

      await expect(calculate(args)).rejects.toThrow('Range is required for aggregate operations');
    });

    it('should require valid aggregateFunction for aggregate operations', async () => {
      const args = {
        spreadsheetId: 'test-spreadsheet-id',
        operation: 'aggregate' as const,
        range: 'A1:A10',
        aggregateFunction: 'INVALID' as any
      };

      await expect(calculate(args)).rejects.toThrow('Aggregate function must be one of: SUM, AVERAGE, COUNT, MAX, MIN');
    });

    it('should reject invalid operation type', async () => {
      const args = {
        spreadsheetId: 'test-spreadsheet-id',
        operation: 'invalid' as any,
        formula: '=A1+B1',
        outputRange: 'C1'
      };

      await expect(calculate(args)).rejects.toThrow('Operation must be either "formula" or "aggregate"');
    });
  });

  describe('Error Handling', () => {
    it('should handle sheets client errors', async () => {
      const error = new Error('Sheets API error');
      mockCalculate.mockRejectedValue(error);

      const args = {
        spreadsheetId: 'test-spreadsheet-id',
        operation: 'formula' as const,
        formula: '=A1+B1',
        outputRange: 'C1'
      };

      await expect(calculate(args)).rejects.toThrow('Failed to calculate: Sheets API error');
    });

    it('should handle unknown errors gracefully', async () => {
      mockCalculate.mockRejectedValue('Unknown error');

      const args = {
        spreadsheetId: 'test-spreadsheet-id',
        operation: 'aggregate' as const,
        range: 'A1:A10',
        aggregateFunction: 'SUM' as const
      };

      await expect(calculate(args)).rejects.toThrow('Failed to calculate: Unknown error');
    });
  });

  describe('Input Sanitization', () => {
    it('should trim whitespace from string parameters', async () => {
      const mockResult = {
        result: 100,
        operation: 'formula',
        range: 'C1'
      };

      mockCalculate.mockResolvedValue(mockResult);

      const args = {
        spreadsheetId: '  test-spreadsheet-id  ',
        operation: 'formula' as const,
        formula: '  =A1+B1  ',
        outputRange: '  C1  '
      };

      await calculate(args);

      expect(mockCalculate).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        operation: 'formula',
        formula: '=A1+B1',
        outputRange: 'C1'
      });
    });
  });
});
