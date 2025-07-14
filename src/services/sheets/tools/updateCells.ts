/**
 * Update Cells Tool - MCP tool for updating cells in Google Sheets spreadsheets
 * 
 * This tool allows updating cell values in existing Google Sheets spreadsheets
 * with support for multiple ranges and different value input options.
 */

import { sheetsClient, SheetsUpdateParams } from '../sheetsClient';
import { CalendarError, MCPErrorCode } from '../../../types/mcp';

/**
 * Input schema for the sheets_update_cells tool
 */
export const updateCellsSchema = {
  name: 'sheets_update_cells',
  description: 'Update cells in Google Sheets spreadsheet with new values',
  inputSchema: {
    type: 'object',
    required: ['spreadsheetId', 'updates'],
    properties: {
      spreadsheetId: {
        type: 'string',
        description: 'The ID of the Google Sheets spreadsheet to update'
      },
      updates: {
        type: 'array',
        items: {
          type: 'object',
          required: ['range', 'values'],
          properties: {
            range: {
              type: 'string',
              description: 'A1 notation range (e.g., A1:B2, C5:D10)'
            },
            values: {
              type: 'array',
              description: 'Values as a 2D array (rows and columns)'
            }
          }
        },
        description: 'Array of range updates to apply'
      },
      valueInputOption: {
        type: 'string',
        enum: ['RAW', 'USER_ENTERED'],
        description: 'How values should be interpreted (RAW = literal values, USER_ENTERED = parse formulas/formatting)'
      }
    }
  }
};

/**
 * Update cells in a Google Sheets spreadsheet
 * @param args - Arguments for updating cells
 * @returns Promise resolving to the update results
 */
export async function updateCells(args: any): Promise<any> {
  try {
    // Validate required arguments
    if (!args.spreadsheetId || typeof args.spreadsheetId !== 'string') {
      throw new CalendarError(
        'Spreadsheet ID is required and must be a string',
        MCPErrorCode.ValidationError
      );
    }

    if (!args.updates || !Array.isArray(args.updates) || args.updates.length === 0) {
      throw new CalendarError(
        'Updates array is required and must contain at least one update',
        MCPErrorCode.ValidationError
      );
    }

    // Prepare parameters
    const params: SheetsUpdateParams = {
      spreadsheetId: args.spreadsheetId.trim(),
      updates: []
    };

    // Add optional value input option
    if (args.valueInputOption && typeof args.valueInputOption === 'string') {
      if (['RAW', 'USER_ENTERED'].includes(args.valueInputOption)) {
        params.valueInputOption = args.valueInputOption as 'RAW' | 'USER_ENTERED';
      } else {
        throw new CalendarError(
          'Value input option must be either RAW or USER_ENTERED',
          MCPErrorCode.ValidationError
        );
      }
    }

    // Validate and convert updates
    for (let i = 0; i < args.updates.length; i++) {
      const update = args.updates[i];
      
      if (!update || typeof update !== 'object') {
        throw new CalendarError(
          `Update ${i}: Must be an object with range and values`,
          MCPErrorCode.ValidationError
        );
      }

      if (!update.range || typeof update.range !== 'string') {
        throw new CalendarError(
          `Update ${i}: Range is required and must be a string`,
          MCPErrorCode.ValidationError
        );
      }

      if (!update.values || !Array.isArray(update.values)) {
        throw new CalendarError(
          `Update ${i}: Values must be a 2D array`,
          MCPErrorCode.ValidationError
        );
      }

      // Validate and convert values
      const validatedValues: (string | number | boolean)[][] = [];
      for (let j = 0; j < update.values.length; j++) {
        const row = update.values[j];
        if (!Array.isArray(row)) {
          throw new CalendarError(
            `Update ${i}, row ${j}: Each row must be an array`,
            MCPErrorCode.ValidationError
          );
        }
        
        const validatedRow: (string | number | boolean)[] = [];
        for (let k = 0; k < row.length; k++) {
          const cell = row[k];
          // Convert cell values to appropriate types
          if (cell === null || cell === undefined) {
            validatedRow.push('');
          } else if (typeof cell === 'string' || typeof cell === 'number' || typeof cell === 'boolean') {
            validatedRow.push(cell);
          } else {
            // Convert other types to string
            validatedRow.push(String(cell));
          }
        }
        validatedValues.push(validatedRow);
      }

      params.updates.push({
        range: update.range.trim(),
        values: validatedValues
      });
    }

    console.error(`Updating ${params.updates.length} ranges in spreadsheet: ${params.spreadsheetId}`);

    // Update the cells
    const result = await sheetsClient.instance.updateCells(params);

    // Format response for MCP
    let message = `Successfully updated ${result.updatedCells} cells in ${result.updatedRanges} range(s)`;

    // Add details about each update
    const updateDetails: string[] = [];
    for (let i = 0; i < params.updates.length; i++) {
      const update = params.updates[i];
      const totalCells = update.values.reduce((sum, row) => sum + row.length, 0);
      updateDetails.push(`• ${update.range} - ${totalCells} cells`);
    }

    const responseText = `${message}

📊 **Update Details:**
${updateDetails.join('\n')}

**Value Input Option:** ${params.valueInputOption || 'USER_ENTERED'}
**Total Cells Updated:** ${result.updatedCells}
**Total Ranges Updated:** ${result.updatedRanges}`;

    console.error(`Cells updated successfully: ${result.updatedCells} cells in ${result.updatedRanges} ranges`);
    
    return {
      content: [{
        type: 'text' as const,
        text: responseText
      }],
      isError: false
    };

  } catch (error) {
    console.error('Error updating cells:', error);

    if (error instanceof CalendarError) {
      throw error;
    }

    throw new CalendarError(
      `Failed to update cells: ${error instanceof Error ? error.message : 'Unknown error'}`,
      MCPErrorCode.APIError,
      { originalError: error }
    );
  }
}
