/**
 * Sheets Get Data Tool - Get data from Google Sheets spreadsheet
 * 
 * This tool retrieves data from a Google Sheets spreadsheet with support for
 * range selection, value rendering options, and metadata inclusion.
 */

import { sheetsClient } from '../sheetsClient';
import { CalendarError } from '../../../types/mcp';

/**
 * MCP tool schema for getting spreadsheet data
 */
export const getDataSchema = {
  name: 'sheets_get_data',
  description: 'Get data from Google Sheets spreadsheet',
  inputSchema: {
    type: 'object',
    required: ['spreadsheetId'],
    properties: {
      spreadsheetId: {
        type: 'string',
        description: 'The ID of the spreadsheet to get data from'
      },
      range: {
        type: 'string',
        default: 'A1:Z1000',
        description: 'A1 notation range (e.g., A1:B10, Sheet1!A1:C5, A:A for entire column)'
      },
      sheetName: {
        type: 'string',
        description: 'Specific sheet name to read from (optional)'
      },
      valueRenderOption: {
        type: 'string',
        enum: ['FORMATTED_VALUE', 'UNFORMATTED_VALUE', 'FORMULA'] as string[],
        default: 'FORMATTED_VALUE',
        description: 'How values should be rendered in the output'
      },
      includeMetadata: {
        type: 'boolean',
        default: true,
        description: 'Whether to include spreadsheet metadata in the response'
      }
    }
  }
};

/**
 * Input parameters for the get data tool
 */
export interface GetDataInput {
  spreadsheetId: string;
  range?: string;
  sheetName?: string;
  valueRenderOption?: 'FORMATTED_VALUE' | 'UNFORMATTED_VALUE' | 'FORMULA';
  includeMetadata?: boolean;
}

/**
 * Get data from a Google Sheets spreadsheet
 * 
 * @param input - The input parameters for getting data
 * @returns Promise resolving to the spreadsheet data
 * @throws {CalendarError} If the request fails
 */
export async function getData(input: GetDataInput): Promise<{
  success: boolean;
  data?: {
    values: any[][];
    range: string;
    majorDimension: string;
    metadata?: {
      spreadsheetTitle: string;
      sheetTitle: string;
      rowCount: number;
      columnCount: number;
    };
    summary: {
      totalRows: number;
      totalColumns: number;
      nonEmptyRows: number;
      dataTypes: string[];
    };
  };
  error?: string;
}> {
  try {
    console.error('Sheets get data tool called with:', JSON.stringify(input, null, 2));

    // Prepare parameters for the client call
    const params: any = {
      spreadsheetId: input.spreadsheetId,
      includeMetadata: input.includeMetadata ?? true
    };

    // Only add optional properties if they have values
    if (input.range) {
      params.range = input.range;
    }
    if (input.sheetName) {
      params.sheetName = input.sheetName;
    }
    if (input.valueRenderOption) {
      params.valueRenderOption = input.valueRenderOption;
    }

    // Get data from the spreadsheet
    const response = await sheetsClient.instance.getData(params);

    // Analyze the data for summary information
    const summary = analyzeSpreadsheetData(response.values);

    // Format response for MCP
    const result = {
      success: true,
      data: {
        values: response.values,
        range: response.range,
        majorDimension: response.majorDimension,
        ...(response.metadata && { metadata: response.metadata }),
        summary
      }
    };

    console.error(`Successfully retrieved data: ${summary.totalRows} rows, ${summary.totalColumns} columns`);
    
    return result;

  } catch (error) {
    console.error('Sheets get data error:', error);

    if (error instanceof CalendarError) {
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: false,
      error: `Failed to get spreadsheet data: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Analyze spreadsheet data to provide summary information
 * @param values - 2D array of spreadsheet values
 * @returns Summary object with data analysis
 */
function analyzeSpreadsheetData(values: any[][]): {
  totalRows: number;
  totalColumns: number;
  nonEmptyRows: number;
  dataTypes: string[];
} {
  if (!values || values.length === 0) {
    return {
      totalRows: 0,
      totalColumns: 0,
      nonEmptyRows: 0,
      dataTypes: []
    };
  }

  const totalRows = values.length;
  const totalColumns = Math.max(...values.map(row => row.length));
  
  // Count non-empty rows
  let nonEmptyRows = 0;
  const dataTypes = new Set<string>();

  for (const row of values) {
    const hasData = row.some(cell => cell !== null && cell !== undefined && cell !== '');
    if (hasData) {
      nonEmptyRows++;
    }

    // Analyze data types in this row
    for (const cell of row) {
      if (cell !== null && cell !== undefined && cell !== '') {
        const cellType = typeof cell;
        if (cellType === 'string') {
          // Check if it's a number string
          if (!isNaN(Number(cell)) && !isNaN(parseFloat(cell))) {
            dataTypes.add('number');
          } else if (isDateString(cell)) {
            dataTypes.add('date');
          } else {
            dataTypes.add('text');
          }
        } else if (cellType === 'number') {
          dataTypes.add('number');
        } else if (cellType === 'boolean') {
          dataTypes.add('boolean');
        } else {
          dataTypes.add('other');
        }
      }
    }
  }

  return {
    totalRows,
    totalColumns,
    nonEmptyRows,
    dataTypes: Array.from(dataTypes).sort()
  };
}

/**
 * Check if a string represents a date
 * @param value - String value to check
 * @returns True if the string appears to be a date
 */
function isDateString(value: string): boolean {
  // Simple date pattern matching
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
    /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
    /^\d{1,2}\/\d{1,2}\/\d{2,4}$/ // M/D/YY or MM/DD/YYYY
  ];

  return datePatterns.some(pattern => pattern.test(value)) && !isNaN(Date.parse(value));
}
