/**
 * Format Cells Tool - MCP tool for formatting cells in Google Sheets spreadsheets
 * 
 * This tool allows applying formatting, filters, sorting, and conditional formatting
 * to cells in existing Google Sheets spreadsheets.
 */

import { sheetsClient, SheetsFormatParams } from '../sheetsClient';
import { CalendarError, MCPErrorCode } from '../../../types/mcp';

/**
 * Input schema for the sheets_format_cells tool
 */
export const formatCellsSchema = {
  name: 'sheets_format_cells',
  description: 'Apply formatting, filters, sorting, and conditional formatting to Google Sheets cells',
  inputSchema: {
    type: 'object',
    required: ['spreadsheetId', 'range'],
    properties: {
      spreadsheetId: {
        type: 'string',
        description: 'The ID of the Google Sheets spreadsheet to format'
      },
      range: {
        type: 'string',
        description: 'A1 notation range to format (e.g., A1:B2, C5:D10)'
      },
      // Basic styling
      backgroundColor: {
        type: 'string',
        description: 'Background color as hex code (e.g., #FF0000 for red)'
      },
      fontColor: {
        type: 'string',
        description: 'Font color as hex code (e.g., #000000 for black)'
      },
      bold: {
        type: 'boolean',
        description: 'Make text bold'
      },
      italic: {
        type: 'boolean',
        description: 'Make text italic'
      },
      fontSize: {
        type: 'number',
        description: 'Font size (6-400)'
      },
      textAlignment: {
        type: 'string',
        enum: ['LEFT', 'CENTER', 'RIGHT'],
        description: 'Horizontal text alignment'
      },
      // Data organization
      addFilter: {
        type: 'boolean',
        description: 'Add filter to the range for data sorting and filtering'
      },
      sortBy: {
        type: 'object',
        properties: {
          column: {
            type: 'number',
            description: 'Column index to sort by (0-based, 0=A, 1=B, etc.)'
          },
          ascending: {
            type: 'boolean',
            description: 'Sort in ascending order (default: true)'
          }
        },
        description: 'Sort data by specified column'
      },
      freezeRows: {
        type: 'number',
        description: 'Number of rows to freeze at the top (0-100)'
      },
      freezeColumns: {
        type: 'number',
        description: 'Number of columns to freeze on the left (0-26)'
      },
      // Conditional formatting
      conditionalFormat: {
        type: 'object',
        properties: {
          condition: {
            type: 'string',
            enum: ['GREATER_THAN', 'LESS_THAN', 'EQUAL', 'BETWEEN'],
            description: 'Condition type for highlighting cells'
          },
          value: {
            type: 'number',
            description: 'Comparison value for the condition'
          },
          value2: {
            type: 'number',
            description: 'Second value for BETWEEN condition'
          },
          backgroundColor: {
            type: 'string',
            description: 'Background color for matching cells (hex code)'
          }
        },
        description: 'Apply conditional formatting based on cell values'
      },
      // Number formatting
      numberFormat: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['CURRENCY', 'PERCENT', 'DATE', 'NUMBER'],
            description: 'Number format type'
          },
          decimalPlaces: {
            type: 'number',
            description: 'Number of decimal places (default: 2)'
          }
        },
        description: 'Apply number formatting to cells'
      }
    }
  }
};

/**
 * Format cells in a Google Sheets spreadsheet
 * @param args - Arguments for formatting cells
 * @returns Promise resolving to the formatting results
 */
export async function formatCells(args: any): Promise<any> {
  try {
    // Validate required arguments
    if (!args.spreadsheetId || typeof args.spreadsheetId !== 'string') {
      throw new CalendarError(
        'Spreadsheet ID is required and must be a string',
        MCPErrorCode.ValidationError
      );
    }

    if (!args.range || typeof args.range !== 'string') {
      throw new CalendarError(
        'Range is required and must be a string',
        MCPErrorCode.ValidationError
      );
    }

    // Prepare parameters
    const params: SheetsFormatParams = {
      spreadsheetId: args.spreadsheetId.trim(),
      range: args.range.trim()
    };

    // Add basic styling options
    if (args.backgroundColor && typeof args.backgroundColor === 'string') {
      params.backgroundColor = args.backgroundColor.trim();
    }

    if (args.fontColor && typeof args.fontColor === 'string') {
      params.fontColor = args.fontColor.trim();
    }

    if (args.bold !== undefined && typeof args.bold === 'boolean') {
      params.bold = args.bold;
    }

    if (args.italic !== undefined && typeof args.italic === 'boolean') {
      params.italic = args.italic;
    }

    if (args.fontSize && typeof args.fontSize === 'number') {
      params.fontSize = args.fontSize;
    }

    if (args.textAlignment && typeof args.textAlignment === 'string') {
      if (['LEFT', 'CENTER', 'RIGHT'].includes(args.textAlignment)) {
        params.textAlignment = args.textAlignment as 'LEFT' | 'CENTER' | 'RIGHT';
      } else {
        throw new CalendarError(
          'Text alignment must be LEFT, CENTER, or RIGHT',
          MCPErrorCode.ValidationError
        );
      }
    }

    // Add data organization options
    if (args.addFilter !== undefined && typeof args.addFilter === 'boolean') {
      params.addFilter = args.addFilter;
    }

    if (args.sortBy && typeof args.sortBy === 'object') {
      if (typeof args.sortBy.column === 'number') {
        params.sortBy = {
          column: args.sortBy.column,
          ascending: args.sortBy.ascending !== false // Default to true
        };
      } else {
        throw new CalendarError(
          'Sort column must be a number (0-based index)',
          MCPErrorCode.ValidationError
        );
      }
    }

    if (args.freezeRows !== undefined && typeof args.freezeRows === 'number') {
      params.freezeRows = args.freezeRows;
    }

    if (args.freezeColumns !== undefined && typeof args.freezeColumns === 'number') {
      params.freezeColumns = args.freezeColumns;
    }

    // Add conditional formatting
    if (args.conditionalFormat && typeof args.conditionalFormat === 'object') {
      const cf = args.conditionalFormat;
      
      if (!cf.condition || !['GREATER_THAN', 'LESS_THAN', 'EQUAL', 'BETWEEN'].includes(cf.condition)) {
        throw new CalendarError(
          'Conditional format condition must be GREATER_THAN, LESS_THAN, EQUAL, or BETWEEN',
          MCPErrorCode.ValidationError
        );
      }

      if (typeof cf.value !== 'number') {
        throw new CalendarError(
          'Conditional format value must be a number',
          MCPErrorCode.ValidationError
        );
      }

      if (!cf.backgroundColor || typeof cf.backgroundColor !== 'string') {
        throw new CalendarError(
          'Conditional format backgroundColor is required and must be a hex color',
          MCPErrorCode.ValidationError
        );
      }

      params.conditionalFormat = {
        condition: cf.condition,
        value: cf.value,
        backgroundColor: cf.backgroundColor.trim()
      };

      if (cf.condition === 'BETWEEN') {
        if (typeof cf.value2 !== 'number') {
          throw new CalendarError(
            'value2 is required for BETWEEN condition and must be a number',
            MCPErrorCode.ValidationError
          );
        }
        params.conditionalFormat.value2 = cf.value2;
      }
    }

    // Add number formatting
    if (args.numberFormat && typeof args.numberFormat === 'object') {
      const nf = args.numberFormat;
      
      if (!nf.type || !['CURRENCY', 'PERCENT', 'DATE', 'NUMBER'].includes(nf.type)) {
        throw new CalendarError(
          'Number format type must be CURRENCY, PERCENT, DATE, or NUMBER',
          MCPErrorCode.ValidationError
        );
      }

      params.numberFormat = {
        type: nf.type
      };

      if (nf.decimalPlaces !== undefined) {
        if (typeof nf.decimalPlaces !== 'number' || nf.decimalPlaces < 0 || nf.decimalPlaces > 10) {
          throw new CalendarError(
            'Decimal places must be a number between 0 and 10',
            MCPErrorCode.ValidationError
          );
        }
        params.numberFormat.decimalPlaces = nf.decimalPlaces;
      }
    }

    console.error(`Formatting cells in range ${params.range} of spreadsheet: ${params.spreadsheetId}`);

    // Format the cells
    const result = await sheetsClient.instance.formatCells(params);

    // Format response for MCP
    let message = `Successfully applied ${result.appliedFormats.length} formatting operation(s) to range ${params.range}`;

    // Add details about applied formats
    const formatDetails: string[] = [];
    for (const format of result.appliedFormats) {
      formatDetails.push(`• ${format}`);
    }

    const responseText = `${message}

🎨 **Applied Formatting:**
${formatDetails.join('\n')}

**Range:** ${params.range}
**Total Operations:** ${result.appliedFormats.length}`;

    console.error(`Formatting applied successfully: ${result.appliedFormats.length} operations`);
    
    return {
      content: [{
        type: 'text' as const,
        text: responseText
      }],
      isError: false
    };

  } catch (error) {
    console.error('Error formatting cells:', error);

    if (error instanceof CalendarError) {
      throw error;
    }

    throw new CalendarError(
      `Failed to format cells: ${error instanceof Error ? error.message : 'Unknown error'}`,
      MCPErrorCode.APIError,
      { originalError: error }
    );
  }
}
