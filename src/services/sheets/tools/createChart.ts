/**
 * Sheets Create Chart Tool - Create charts and graphs in Google Sheets
 * 
 * This tool provides chart creation capabilities for Google Sheets,
 * supporting various chart types including line, bar, column, pie, scatter, and area charts.
 */

import { sheetsClient } from '../sheetsClient';
import type { MCPTool } from '../../../types/mcp';

/**
 * Arguments for the sheets_create_chart tool
 */
interface SheetsCreateChartArgs {
  spreadsheetId: string;
  dataRange: string;
  chartType: 'LINE' | 'BAR' | 'COLUMN' | 'PIE' | 'SCATTER' | 'AREA';
  title?: string;
  sheetId?: number;
  position?: {
    row: number;
    column: number;
  };
  axisOptions?: {
    xAxis?: {
      title?: string;
      minValue?: number;
      maxValue?: number;
      format?: {
        type: 'NUMBER' | 'CURRENCY' | 'PERCENT' | 'DATE';
        pattern?: string;
      };
    };
    yAxis?: {
      title?: string;
      minValue?: number;
      maxValue?: number;
      format?: {
        type: 'NUMBER' | 'CURRENCY' | 'PERCENT' | 'DATE';
        pattern?: string;
      };
    };
  };
}

/**
 * Create a chart in a Google Sheets spreadsheet
 * 
 * This tool creates various types of charts and graphs in Google Sheets using the specified
 * data range. The chart will be embedded in the spreadsheet and can be positioned as needed.
 * 
 * @param args - The chart creation arguments
 * @returns Promise resolving to the chart creation results
 * @throws {Error} If the operation fails
 */
export async function createChart(args: SheetsCreateChartArgs): Promise<{
  chartId: number;
  chartTitle: string;
  chartType: string;
  spreadsheetId: string;
  dataRange: string;
  position?: {
    row: number;
    column: number;
  };
}> {
  // Validate required parameters
  if (!args.spreadsheetId || typeof args.spreadsheetId !== 'string') {
    throw new Error('Spreadsheet ID is required and must be a string');
  }

  if (!args.dataRange || typeof args.dataRange !== 'string') {
    throw new Error('Data range is required and must be a string');
  }

  if (!args.chartType || typeof args.chartType !== 'string') {
    throw new Error('Chart type is required and must be a string');
  }

  // Validate chart type
  const validChartTypes = ['LINE', 'BAR', 'COLUMN', 'PIE', 'SCATTER', 'AREA'];
  if (!validChartTypes.includes(args.chartType)) {
    throw new Error(`Invalid chart type. Must be one of: ${validChartTypes.join(', ')}`);
  }

  // Validate optional parameters
  if (args.title && typeof args.title !== 'string') {
    throw new Error('Chart title must be a string if provided');
  }

  if (args.sheetId !== undefined && (typeof args.sheetId !== 'number' || args.sheetId < 0)) {
    throw new Error('Sheet ID must be a non-negative number if provided');
  }

  if (args.position) {
    if (typeof args.position !== 'object' || args.position === null) {
      throw new Error('Position must be an object if provided');
    }
    if (typeof args.position.row !== 'number' || args.position.row < 0) {
      throw new Error('Position row must be a non-negative number');
    }
    if (typeof args.position.column !== 'number' || args.position.column < 0) {
      throw new Error('Position column must be a non-negative number');
    }
  }

  // Validate axis options if provided
  if (args.axisOptions) {
    if (typeof args.axisOptions !== 'object' || args.axisOptions === null) {
      throw new Error('Axis options must be an object if provided');
    }

    // Validate X-axis options
    if (args.axisOptions.xAxis) {
      const xAxis = args.axisOptions.xAxis;
      if (xAxis.title && typeof xAxis.title !== 'string') {
        throw new Error('X-axis title must be a string if provided');
      }
      if (xAxis.minValue !== undefined && typeof xAxis.minValue !== 'number') {
        throw new Error('X-axis minValue must be a number if provided');
      }
      if (xAxis.maxValue !== undefined && typeof xAxis.maxValue !== 'number') {
        throw new Error('X-axis maxValue must be a number if provided');
      }
      if (xAxis.minValue !== undefined && xAxis.maxValue !== undefined && xAxis.minValue >= xAxis.maxValue) {
        throw new Error('X-axis minValue must be less than maxValue');
      }
      if (xAxis.format) {
        if (!['NUMBER', 'CURRENCY', 'PERCENT', 'DATE'].includes(xAxis.format.type)) {
          throw new Error('X-axis format type must be NUMBER, CURRENCY, PERCENT, or DATE');
        }
        if (xAxis.format.pattern && typeof xAxis.format.pattern !== 'string') {
          throw new Error('X-axis format pattern must be a string if provided');
        }
      }
    }

    // Validate Y-axis options
    if (args.axisOptions.yAxis) {
      const yAxis = args.axisOptions.yAxis;
      if (yAxis.title && typeof yAxis.title !== 'string') {
        throw new Error('Y-axis title must be a string if provided');
      }
      if (yAxis.minValue !== undefined && typeof yAxis.minValue !== 'number') {
        throw new Error('Y-axis minValue must be a number if provided');
      }
      if (yAxis.maxValue !== undefined && typeof yAxis.maxValue !== 'number') {
        throw new Error('Y-axis maxValue must be a number if provided');
      }
      if (yAxis.minValue !== undefined && yAxis.maxValue !== undefined && yAxis.minValue >= yAxis.maxValue) {
        throw new Error('Y-axis minValue must be less than maxValue');
      }
      if (yAxis.format) {
        if (!['NUMBER', 'CURRENCY', 'PERCENT', 'DATE'].includes(yAxis.format.type)) {
          throw new Error('Y-axis format type must be NUMBER, CURRENCY, PERCENT, or DATE');
        }
        if (yAxis.format.pattern && typeof yAxis.format.pattern !== 'string') {
          throw new Error('Y-axis format pattern must be a string if provided');
        }
      }
    }
  }

  // Build parameters object with proper typing
  const params: {
    spreadsheetId: string;
    dataRange: string;
    chartType: 'LINE' | 'BAR' | 'COLUMN' | 'PIE' | 'SCATTER' | 'AREA';
    title?: string;
    sheetId?: number;
    position?: {
      row: number;
      column: number;
    };
    axisOptions?: {
      xAxis?: {
        title?: string;
        minValue?: number;
        maxValue?: number;
        format?: {
          type: 'NUMBER' | 'CURRENCY' | 'PERCENT' | 'DATE';
          pattern?: string;
        };
      };
      yAxis?: {
        title?: string;
        minValue?: number;
        maxValue?: number;
        format?: {
          type: 'NUMBER' | 'CURRENCY' | 'PERCENT' | 'DATE';
          pattern?: string;
        };
      };
    };
  } = {
    spreadsheetId: args.spreadsheetId.trim(),
    dataRange: args.dataRange.trim(),
    chartType: args.chartType
  };

  if (args.title && args.title.trim()) {
    params.title = args.title.trim();
  }
  if (args.sheetId !== undefined) {
    params.sheetId = args.sheetId;
  }
  if (args.position) {
    params.position = {
      row: args.position.row,
      column: args.position.column
    };
  }
  if (args.axisOptions) {
    params.axisOptions = args.axisOptions;
  }

  try {
    // Execute the chart creation using the sheets client
    const result = await sheetsClient.instance.createChart(params);

    // Return comprehensive result information
    const response: {
      chartId: number;
      chartTitle: string;
      chartType: string;
      spreadsheetId: string;
      dataRange: string;
      position?: {
        row: number;
        column: number;
      };
    } = {
      chartId: result.chartId,
      chartTitle: result.chartTitle,
      chartType: result.chartType,
      spreadsheetId: params.spreadsheetId,
      dataRange: params.dataRange
    };

    if (params.position) {
      response.position = params.position;
    }

    return response;

  } catch (error) {
    throw new Error(`Failed to create chart: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * MCP tool definition for sheets_create_chart
 */
export const sheetsCreateChartTool: MCPTool = {
  name: 'sheets_create_chart',
  description: 'Create charts and graphs in Google Sheets spreadsheets. Supports line, bar, column, pie, scatter, and area charts with customizable positioning, titles, and axis options including custom titles, value ranges, and number formatting.',
  inputSchema: {
    type: 'object',
    required: ['spreadsheetId', 'dataRange', 'chartType'],
    properties: {
      spreadsheetId: {
        type: 'string',
        description: 'The ID of the Google Sheets spreadsheet where the chart will be created'
      },
      dataRange: {
        type: 'string',
        description: 'A1 notation range for the chart data source (e.g., A1:B10, Sheet1!A1:C20). This range should include both labels and data values.'
      },
      chartType: {
        type: 'string',
        enum: ['LINE', 'BAR', 'COLUMN', 'PIE', 'SCATTER', 'AREA'],
        description: 'Type of chart to create. LINE: line chart, BAR: horizontal bar chart, COLUMN: vertical bar chart, PIE: pie chart, SCATTER: scatter plot, AREA: area chart'
      },
      title: {
        type: 'string',
        description: 'Optional title for the chart. If not provided, a default title based on chart type will be used.'
      },
      sheetId: {
        type: 'number',
        description: 'Optional sheet ID where the chart should be placed. If not provided, the chart will be placed on the same sheet as the data range.'
      },
      position: {
        type: 'object',
        properties: {
          row: {
            type: 'number',
            description: 'Row position (0-based) where the chart should be anchored'
          },
          column: {
            type: 'number',
            description: 'Column position (0-based) where the chart should be anchored'
          }
        },
        required: ['row', 'column'],
        description: 'Optional position for chart placement. If not provided, the chart will be placed at the top-left corner (0,0).'
      },
      axisOptions: {
        type: 'object',
        properties: {
          xAxis: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'Custom title for the X-axis'
              },
              minValue: {
                type: 'number',
                description: 'Minimum value for the X-axis range'
              },
              maxValue: {
                type: 'number',
                description: 'Maximum value for the X-axis range'
              },
              format: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['NUMBER', 'CURRENCY', 'PERCENT', 'DATE'],
                    description: 'Format type for X-axis values'
                  },
                  pattern: {
                    type: 'string',
                    description: 'Custom format pattern (e.g., "$#,##0.00" for currency)'
                  }
                },
                required: ['type'],
                description: 'Number format options for X-axis values'
              }
            },
            description: 'Customization options for the X-axis'
          },
          yAxis: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'Custom title for the Y-axis'
              },
              minValue: {
                type: 'number',
                description: 'Minimum value for the Y-axis range'
              },
              maxValue: {
                type: 'number',
                description: 'Maximum value for the Y-axis range'
              },
              format: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['NUMBER', 'CURRENCY', 'PERCENT', 'DATE'],
                    description: 'Format type for Y-axis values'
                  },
                  pattern: {
                    type: 'string',
                    description: 'Custom format pattern (e.g., "$#,##0.00" for currency)'
                  }
                },
                required: ['type'],
                description: 'Number format options for Y-axis values'
              }
            },
            description: 'Customization options for the Y-axis'
          }
        },
        description: 'Optional axis customization options including titles, ranges, and formatting'
      }
    }
  }
};
