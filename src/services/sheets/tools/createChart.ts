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
  description: 'Create charts and graphs in Google Sheets spreadsheets. Supports line, bar, column, pie, scatter, and area charts with customizable positioning and titles.',
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
      }
    }
  }
};
