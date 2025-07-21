/**
 * Sheets Calculate Tool - Perform calculations and formula operations in Google Sheets
 * 
 * This tool provides formula execution and aggregation capabilities for Google Sheets,
 * supporting both custom formulas and built-in aggregate functions.
 */

import { sheetsClient } from '../sheetsClient';
import type { MCPTool } from '../../../types/mcp';

/**
 * Arguments for the sheets_calculate tool
 */
interface SheetsCalculateArgs {
  spreadsheetId: string;
  operation: 'formula' | 'aggregate';
  range?: string;
  formula?: string;
  aggregateFunction?: 'SUM' | 'AVERAGE' | 'COUNT' | 'MAX' | 'MIN';
  outputRange?: string;
}

/**
 * Perform calculations and formula operations in Google Sheets
 * 
 * This tool supports two types of operations:
 * 1. Formula operations: Apply custom formulas to specific output ranges
 * 2. Aggregate operations: Calculate SUM, AVERAGE, COUNT, MAX, MIN on data ranges
 * 
 * @param args - The calculation arguments
 * @returns Promise resolving to the calculation results
 * @throws {Error} If the operation fails
 */
export async function calculate(args: SheetsCalculateArgs): Promise<{
  result: any;
  operation: string;
  range?: string;
  formula?: string;
  aggregateFunction?: string;
  outputRange?: string;
}> {
  // Validate required parameters
  if (!args.spreadsheetId || typeof args.spreadsheetId !== 'string') {
    throw new Error('Spreadsheet ID is required and must be a string');
  }

  if (!args.operation || !['formula', 'aggregate'].includes(args.operation)) {
    throw new Error('Operation must be either "formula" or "aggregate"');
  }

  // Validate operation-specific parameters
  if (args.operation === 'formula') {
    if (!args.formula || typeof args.formula !== 'string' || !args.formula.trim()) {
      throw new Error('Formula is required for formula operations');
    }
    if (!args.outputRange || typeof args.outputRange !== 'string' || !args.outputRange.trim()) {
      throw new Error('Output range is required for formula operations');
    }
  }

  if (args.operation === 'aggregate') {
    if (!args.range || typeof args.range !== 'string' || !args.range.trim()) {
      throw new Error('Range is required for aggregate operations');
    }
    if (!args.aggregateFunction || !['SUM', 'AVERAGE', 'COUNT', 'MAX', 'MIN'].includes(args.aggregateFunction)) {
      throw new Error('Aggregate function must be one of: SUM, AVERAGE, COUNT, MAX, MIN');
    }
  }

  // Build parameters object with proper typing
  const params: {
    spreadsheetId: string;
    operation: 'formula' | 'aggregate';
    range?: string;
    formula?: string;
    aggregateFunction?: 'SUM' | 'AVERAGE' | 'COUNT' | 'MAX' | 'MIN';
    outputRange?: string;
  } = {
    spreadsheetId: args.spreadsheetId.trim(),
    operation: args.operation
  };

  if (args.range) {
    params.range = args.range.trim();
  }
  if (args.formula) {
    params.formula = args.formula.trim();
  }
  if (args.aggregateFunction) {
    params.aggregateFunction = args.aggregateFunction;
  }
  if (args.outputRange) {
    params.outputRange = args.outputRange.trim();
  }

  try {
    // Execute the calculation using the sheets client
    const result = await sheetsClient.instance.calculate(params);

    // Return comprehensive result information
    const response: {
      result: any;
      operation: string;
      range?: string;
      formula?: string;
      aggregateFunction?: string;
      outputRange?: string;
    } = {
      result: result.result,
      operation: result.operation
    };

    if (result.range) {
      response.range = result.range;
    }
    if (params.formula) {
      response.formula = params.formula;
    }
    if (params.aggregateFunction) {
      response.aggregateFunction = params.aggregateFunction;
    }
    if (params.outputRange) {
      response.outputRange = params.outputRange;
    }

    return response;

  } catch (error) {
    throw new Error(`Failed to calculate: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * MCP tool definition for sheets_calculate
 */
export const sheetsCalculateTool: MCPTool = {
  name: 'sheets_calculate',
  description: 'Perform calculations and formula operations in Google Sheets. Supports both custom formulas and aggregate functions (SUM, AVERAGE, COUNT, MAX, MIN).',
  inputSchema: {
    type: 'object',
    required: ['spreadsheetId', 'operation'],
    properties: {
      spreadsheetId: {
        type: 'string',
        description: 'The ID of the Google Sheets spreadsheet'
      },
      operation: {
        type: 'string',
        enum: ['formula', 'aggregate'],
        description: 'Type of calculation operation to perform'
      },
      range: {
        type: 'string',
        description: 'A1 notation range for aggregate operations (e.g., A1:B10). Required for aggregate operations.'
      },
      formula: {
        type: 'string',
        description: 'Formula to apply (e.g., =A1+B1, =SUM(A1:A10)). Required for formula operations.'
      },
      aggregateFunction: {
        type: 'string',
        enum: ['SUM', 'AVERAGE', 'COUNT', 'MAX', 'MIN'],
        description: 'Aggregate function to apply to the range. Required for aggregate operations.'
      },
      outputRange: {
        type: 'string',
        description: 'A1 notation cell where to place the result (e.g., C1). Required for formula operations, optional for aggregate operations.'
      }
    }
  }
};
