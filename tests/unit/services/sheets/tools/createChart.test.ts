/**
 * Unit tests for Sheets Create Chart Tool
 * 
 * Tests the sheets_create_chart tool functionality including chart creation,
 * parameter validation, chart type support, and error handling.
 */

import { createChart } from '../../../../../src/services/sheets/tools/createChart';
import { sheetsClient } from '../../../../../src/services/sheets/sheetsClient';

// Mock the sheets client
jest.mock('../../../../../src/services/sheets/sheetsClient');

describe('Sheets Create Chart Tool', () => {
  const mockCreateChart = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the sheets client instance
    (sheetsClient as any).instance = {
      createChart: mockCreateChart
    };
  });

  describe('Core Functionality', () => {
    it('should create a line chart successfully', async () => {
      const mockResult = {
        chartId: 12345,
        chartTitle: 'Sales Data Line Chart',
        chartType: 'LINE'
      };

      mockCreateChart.mockResolvedValue(mockResult);

      const args = {
        spreadsheetId: 'test-spreadsheet-id',
        dataRange: 'A1:B10',
        chartType: 'LINE' as const,
        title: 'Sales Data Line Chart'
      };

      const result = await createChart(args);

      expect(mockCreateChart).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        dataRange: 'A1:B10',
        chartType: 'LINE',
        title: 'Sales Data Line Chart'
      });
      expect(result.chartId).toBe(12345);
      expect(result.chartTitle).toBe('Sales Data Line Chart');
      expect(result.chartType).toBe('LINE');
      expect(result.spreadsheetId).toBe('test-spreadsheet-id');
      expect(result.dataRange).toBe('A1:B10');
    });

    it('should create a pie chart successfully', async () => {
      const mockResult = {
        chartId: 67890,
        chartTitle: 'Budget Distribution',
        chartType: 'PIE'
      };

      mockCreateChart.mockResolvedValue(mockResult);

      const args = {
        spreadsheetId: 'test-spreadsheet-id',
        dataRange: 'Sheet1!A1:B5',
        chartType: 'PIE' as const,
        title: 'Budget Distribution'
      };

      const result = await createChart(args);

      expect(result.chartType).toBe('PIE');
      expect(result.dataRange).toBe('Sheet1!A1:B5');
    });

    it('should create a chart with position specified', async () => {
      const mockResult = {
        chartId: 11111,
        chartTitle: 'Column Chart',
        chartType: 'COLUMN'
      };

      mockCreateChart.mockResolvedValue(mockResult);

      const args = {
        spreadsheetId: 'test-spreadsheet-id',
        dataRange: 'A1:C10',
        chartType: 'COLUMN' as const,
        position: {
          row: 5,
          column: 3
        }
      };

      const result = await createChart(args);

      expect(mockCreateChart).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        dataRange: 'A1:C10',
        chartType: 'COLUMN',
        position: {
          row: 5,
          column: 3
        }
      });
      expect(result.position).toEqual({ row: 5, column: 3 });
    });

    it('should create a chart with sheet ID specified', async () => {
      const mockResult = {
        chartId: 22222,
        chartTitle: 'BAR Chart',
        chartType: 'BAR'
      };

      mockCreateChart.mockResolvedValue(mockResult);

      const args = {
        spreadsheetId: 'test-spreadsheet-id',
        dataRange: 'A1:B20',
        chartType: 'BAR' as const,
        sheetId: 123456789
      };

      const result = await createChart(args);

      expect(mockCreateChart).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        dataRange: 'A1:B20',
        chartType: 'BAR',
        sheetId: 123456789
      });
    });

    it('should create a scatter chart without optional parameters', async () => {
      const mockResult = {
        chartId: 33333,
        chartTitle: 'SCATTER Chart',
        chartType: 'SCATTER'
      };

      mockCreateChart.mockResolvedValue(mockResult);

      const args = {
        spreadsheetId: 'test-spreadsheet-id',
        dataRange: 'B2:D15',
        chartType: 'SCATTER' as const
      };

      const result = await createChart(args);

      expect(mockCreateChart).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        dataRange: 'B2:D15',
        chartType: 'SCATTER'
      });
      expect(result.chartType).toBe('SCATTER');
    });

    it('should create an area chart successfully', async () => {
      const mockResult = {
        chartId: 44444,
        chartTitle: 'Area Chart Example',
        chartType: 'AREA'
      };

      mockCreateChart.mockResolvedValue(mockResult);

      const args = {
        spreadsheetId: 'test-spreadsheet-id',
        dataRange: 'A1:E10',
        chartType: 'AREA' as const,
        title: 'Area Chart Example'
      };

      const result = await createChart(args);

      expect(result.chartType).toBe('AREA');
      expect(result.chartTitle).toBe('Area Chart Example');
    });
  });

  describe('Parameter Validation', () => {
    it('should require spreadsheetId', async () => {
      const args = {
        dataRange: 'A1:B10',
        chartType: 'LINE' as const
        // Missing spreadsheetId
      };

      await expect(createChart(args as any)).rejects.toThrow('Spreadsheet ID is required and must be a string');
    });

    it('should require dataRange', async () => {
      const args = {
        spreadsheetId: 'test-spreadsheet-id',
        chartType: 'LINE' as const
        // Missing dataRange
      };

      await expect(createChart(args as any)).rejects.toThrow('Data range is required and must be a string');
    });

    it('should require chartType', async () => {
      const args = {
        spreadsheetId: 'test-spreadsheet-id',
        dataRange: 'A1:B10'
        // Missing chartType
      };

      await expect(createChart(args as any)).rejects.toThrow('Chart type is required and must be a string');
    });

    it('should validate chart type values', async () => {
      const args = {
        spreadsheetId: 'test-spreadsheet-id',
        dataRange: 'A1:B10',
        chartType: 'INVALID_TYPE' as any
      };

      await expect(createChart(args)).rejects.toThrow('Invalid chart type. Must be one of: LINE, BAR, COLUMN, PIE, SCATTER, AREA');
    });

    it('should validate spreadsheetId type', async () => {
      const args = {
        spreadsheetId: 123 as any,
        dataRange: 'A1:B10',
        chartType: 'LINE' as const
      };

      await expect(createChart(args)).rejects.toThrow('Spreadsheet ID is required and must be a string');
    });

    it('should validate dataRange type', async () => {
      const args = {
        spreadsheetId: 'test-spreadsheet-id',
        dataRange: 123 as any,
        chartType: 'LINE' as const
      };

      await expect(createChart(args)).rejects.toThrow('Data range is required and must be a string');
    });

    it('should validate title type if provided', async () => {
      const args = {
        spreadsheetId: 'test-spreadsheet-id',
        dataRange: 'A1:B10',
        chartType: 'LINE' as const,
        title: 123 as any
      };

      await expect(createChart(args)).rejects.toThrow('Chart title must be a string if provided');
    });

    it('should validate sheetId type if provided', async () => {
      const args = {
        spreadsheetId: 'test-spreadsheet-id',
        dataRange: 'A1:B10',
        chartType: 'LINE' as const,
        sheetId: 'invalid' as any
      };

      await expect(createChart(args)).rejects.toThrow('Sheet ID must be a non-negative number if provided');
    });

    it('should validate sheetId is non-negative', async () => {
      const args = {
        spreadsheetId: 'test-spreadsheet-id',
        dataRange: 'A1:B10',
        chartType: 'LINE' as const,
        sheetId: -1
      };

      await expect(createChart(args)).rejects.toThrow('Sheet ID must be a non-negative number if provided');
    });

    it('should validate position object structure', async () => {
      const args = {
        spreadsheetId: 'test-spreadsheet-id',
        dataRange: 'A1:B10',
        chartType: 'LINE' as const,
        position: 'invalid' as any
      };

      await expect(createChart(args)).rejects.toThrow('Position must be an object if provided');
    });

    it('should validate position row is non-negative number', async () => {
      const args = {
        spreadsheetId: 'test-spreadsheet-id',
        dataRange: 'A1:B10',
        chartType: 'LINE' as const,
        position: {
          row: -1,
          column: 0
        }
      };

      await expect(createChart(args)).rejects.toThrow('Position row must be a non-negative number');
    });

    it('should validate position column is non-negative number', async () => {
      const args = {
        spreadsheetId: 'test-spreadsheet-id',
        dataRange: 'A1:B10',
        chartType: 'LINE' as const,
        position: {
          row: 0,
          column: -1
        }
      };

      await expect(createChart(args)).rejects.toThrow('Position column must be a non-negative number');
    });

    it('should validate position row is a number', async () => {
      const args = {
        spreadsheetId: 'test-spreadsheet-id',
        dataRange: 'A1:B10',
        chartType: 'LINE' as const,
        position: {
          row: 'invalid' as any,
          column: 0
        }
      };

      await expect(createChart(args)).rejects.toThrow('Position row must be a non-negative number');
    });

    it('should validate position column is a number', async () => {
      const args = {
        spreadsheetId: 'test-spreadsheet-id',
        dataRange: 'A1:B10',
        chartType: 'LINE' as const,
        position: {
          row: 0,
          column: 'invalid' as any
        }
      };

      await expect(createChart(args)).rejects.toThrow('Position column must be a non-negative number');
    });
  });

  describe('Chart Type Support', () => {
    const chartTypes = ['LINE', 'BAR', 'COLUMN', 'PIE', 'SCATTER', 'AREA'] as const;

    chartTypes.forEach(chartType => {
      it(`should support ${chartType} chart type`, async () => {
        const mockResult = {
          chartId: 99999,
          chartTitle: `${chartType} Chart`,
          chartType: chartType
        };

        mockCreateChart.mockResolvedValue(mockResult);

        const args = {
          spreadsheetId: 'test-spreadsheet-id',
          dataRange: 'A1:B10',
          chartType: chartType
        };

        const result = await createChart(args);

        expect(mockCreateChart).toHaveBeenCalledWith({
          spreadsheetId: 'test-spreadsheet-id',
          dataRange: 'A1:B10',
          chartType: chartType
        });
        expect(result.chartType).toBe(chartType);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle sheets client errors', async () => {
      const error = new Error('Sheets API error');
      mockCreateChart.mockRejectedValue(error);

      const args = {
        spreadsheetId: 'test-spreadsheet-id',
        dataRange: 'A1:B10',
        chartType: 'LINE' as const
      };

      await expect(createChart(args)).rejects.toThrow('Failed to create chart: Sheets API error');
    });

    it('should handle unknown errors gracefully', async () => {
      mockCreateChart.mockRejectedValue('Unknown error');

      const args = {
        spreadsheetId: 'test-spreadsheet-id',
        dataRange: 'A1:B10',
        chartType: 'PIE' as const
      };

      await expect(createChart(args)).rejects.toThrow('Failed to create chart: Unknown error');
    });

    it('should handle authentication errors', async () => {
      const error = new Error('Authentication failed');
      mockCreateChart.mockRejectedValue(error);

      const args = {
        spreadsheetId: 'test-spreadsheet-id',
        dataRange: 'A1:B10',
        chartType: 'COLUMN' as const
      };

      await expect(createChart(args)).rejects.toThrow('Failed to create chart: Authentication failed');
    });
  });

  describe('Input Sanitization', () => {
    it('should trim whitespace from string parameters', async () => {
      const mockResult = {
        chartId: 55555,
        chartTitle: 'Test Chart',
        chartType: 'BAR'
      };

      mockCreateChart.mockResolvedValue(mockResult);

      const args = {
        spreadsheetId: '  test-spreadsheet-id  ',
        dataRange: '  A1:B10  ',
        chartType: 'BAR' as const,
        title: '  Test Chart  '
      };

      await createChart(args);

      expect(mockCreateChart).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        dataRange: 'A1:B10',
        chartType: 'BAR',
        title: 'Test Chart'
      });
    });

    it('should handle empty title by not including it', async () => {
      const mockResult = {
        chartId: 66666,
        chartTitle: 'SCATTER Chart',
        chartType: 'SCATTER'
      };

      mockCreateChart.mockResolvedValue(mockResult);

      const args = {
        spreadsheetId: 'test-spreadsheet-id',
        dataRange: 'A1:B10',
        chartType: 'SCATTER' as const,
        title: '   '  // Only whitespace
      };

      await createChart(args);

      // Should not include title in the call since it's empty after trimming
      expect(mockCreateChart).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        dataRange: 'A1:B10',
        chartType: 'SCATTER'
      });
    });
  });

  describe('Response Format', () => {
    it('should return complete response with all provided parameters', async () => {
      const mockResult = {
        chartId: 77777,
        chartTitle: 'Complete Chart',
        chartType: 'LINE'
      };

      mockCreateChart.mockResolvedValue(mockResult);

      const args = {
        spreadsheetId: 'test-spreadsheet-id',
        dataRange: 'A1:B10',
        chartType: 'LINE' as const,
        title: 'Complete Chart',
        sheetId: 123,
        position: {
          row: 2,
          column: 4
        }
      };

      const result = await createChart(args);

      expect(result).toEqual({
        chartId: 77777,
        chartTitle: 'Complete Chart',
        chartType: 'LINE',
        spreadsheetId: 'test-spreadsheet-id',
        dataRange: 'A1:B10',
        position: {
          row: 2,
          column: 4
        }
      });
    });

    it('should return response without optional parameters when not provided', async () => {
      const mockResult = {
        chartId: 88888,
        chartTitle: 'Simple Chart',
        chartType: 'PIE'
      };

      mockCreateChart.mockResolvedValue(mockResult);

      const args = {
        spreadsheetId: 'test-spreadsheet-id',
        dataRange: 'A1:B10',
        chartType: 'PIE' as const
      };

      const result = await createChart(args);

      expect(result).toEqual({
        chartId: 88888,
        chartTitle: 'Simple Chart',
        chartType: 'PIE',
        spreadsheetId: 'test-spreadsheet-id',
        dataRange: 'A1:B10'
      });
      expect(result.position).toBeUndefined();
    });
  });

  describe('Axis Options', () => {
    it('should create chart with custom axis titles', async () => {
      const mockResult = {
        chartId: 99999,
        chartTitle: 'Custom Axis Chart',
        chartType: 'LINE'
      };

      mockCreateChart.mockResolvedValue(mockResult);

      const args = {
        spreadsheetId: 'test-spreadsheet-id',
        dataRange: 'A1:B10',
        chartType: 'LINE' as const,
        axisOptions: {
          xAxis: {
            title: 'Time Period'
          },
          yAxis: {
            title: 'Revenue ($)'
          }
        }
      };

      await createChart(args);

      expect(mockCreateChart).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        dataRange: 'A1:B10',
        chartType: 'LINE',
        axisOptions: {
          xAxis: {
            title: 'Time Period'
          },
          yAxis: {
            title: 'Revenue ($)'
          }
        }
      });
    });

    it('should create chart with axis value ranges', async () => {
      const mockResult = {
        chartId: 11111,
        chartTitle: 'Range Chart',
        chartType: 'COLUMN'
      };

      mockCreateChart.mockResolvedValue(mockResult);

      const args = {
        spreadsheetId: 'test-spreadsheet-id',
        dataRange: 'A1:B10',
        chartType: 'COLUMN' as const,
        axisOptions: {
          yAxis: {
            minValue: 0,
            maxValue: 100
          }
        }
      };

      await createChart(args);

      expect(mockCreateChart).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        dataRange: 'A1:B10',
        chartType: 'COLUMN',
        axisOptions: {
          yAxis: {
            minValue: 0,
            maxValue: 100
          }
        }
      });
    });

    it('should validate axis options object structure', async () => {
      const args = {
        spreadsheetId: 'test-spreadsheet-id',
        dataRange: 'A1:B10',
        chartType: 'LINE' as const,
        axisOptions: 'invalid' as any
      };

      await expect(createChart(args)).rejects.toThrow('Axis options must be an object if provided');
    });

    it('should validate X-axis title type', async () => {
      const args = {
        spreadsheetId: 'test-spreadsheet-id',
        dataRange: 'A1:B10',
        chartType: 'LINE' as const,
        axisOptions: {
          xAxis: {
            title: 123 as any
          }
        }
      };

      await expect(createChart(args)).rejects.toThrow('X-axis title must be a string if provided');
    });

    it('should validate Y-axis minValue and maxValue relationship', async () => {
      const args = {
        spreadsheetId: 'test-spreadsheet-id',
        dataRange: 'A1:B10',
        chartType: 'LINE' as const,
        axisOptions: {
          yAxis: {
            minValue: 100,
            maxValue: 50
          }
        }
      };

      await expect(createChart(args)).rejects.toThrow('Y-axis minValue must be less than maxValue');
    });

    it('should validate axis format type', async () => {
      const args = {
        spreadsheetId: 'test-spreadsheet-id',
        dataRange: 'A1:B10',
        chartType: 'LINE' as const,
        axisOptions: {
          yAxis: {
            format: {
              type: 'INVALID' as any
            }
          }
        }
      };

      await expect(createChart(args)).rejects.toThrow('Y-axis format type must be NUMBER, CURRENCY, PERCENT, or DATE');
    });
  });
});
