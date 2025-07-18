/**
 * Create Spreadsheet Tool - MCP tool for creating Google Sheets spreadsheets
 * 
 * This tool allows creating new Google Sheets spreadsheets with optional
 * initial data, folder placement, and user sharing.
 */

import { sheetsClient, SheetsCreateSpreadsheetParams } from '../sheetsClient';
import { CalendarError, MCPErrorCode } from '../../../types/mcp';

/**
 * Input schema for the sheets_create_spreadsheet tool
 */
export const createSpreadsheetSchema = {
  name: 'sheets_create_spreadsheet',
  description: 'Create a new Google Sheets spreadsheet with optional initial data and sharing',
  inputSchema: {
    type: 'object',
    required: ['title'],
    properties: {
      title: {
        type: 'string',
        description: 'Title for the new spreadsheet'
      },
      folderId: {
        type: 'string',
        description: 'Optional Google Drive folder ID to place the spreadsheet in'
      },
      initialData: {
        type: 'array',
        items: {
          type: 'array',
          items: {
            type: 'string'
          }
        },
        description: 'Optional initial data as a 2D array of strings (rows and columns)'
      },
      shareWithUsers: {
        type: 'array',
        items: {
          type: 'string',
          format: 'email'
        },
        description: 'Optional array of email addresses to share the spreadsheet with (writer access)'
      }
    }
  }
};

/**
 * Create a new Google Sheets spreadsheet
 * @param args - Arguments for creating the spreadsheet
 * @returns Promise resolving to the created spreadsheet information
 */
export async function createSpreadsheet(args: any): Promise<any> {
  try {
    // Validate required arguments
    if (!args.title || typeof args.title !== 'string') {
      throw new CalendarError(
        'Title is required and must be a string',
        MCPErrorCode.ValidationError
      );
    }

    // Prepare parameters
    const params: SheetsCreateSpreadsheetParams = {
      title: args.title.trim()
    };

    // Add optional parameters if provided
    if (args.folderId && typeof args.folderId === 'string') {
      params.folderId = args.folderId.trim();
    }

    if (args.initialData && Array.isArray(args.initialData)) {
      // Validate and convert initial data
      const validatedData: string[][] = [];
      for (let i = 0; i < args.initialData.length; i++) {
        const row = args.initialData[i];
        if (!Array.isArray(row)) {
          throw new CalendarError(
            `Initial data row ${i} must be an array`,
            MCPErrorCode.ValidationError
          );
        }
        
        const validatedRow: string[] = [];
        for (let j = 0; j < row.length; j++) {
          const cell = row[j];
          // Convert all cell values to strings
          validatedRow.push(cell !== null && cell !== undefined ? String(cell) : '');
        }
        validatedData.push(validatedRow);
      }
      params.initialData = validatedData;
    }

    if (args.shareWithUsers && Array.isArray(args.shareWithUsers)) {
      // Validate email addresses
      const emails: string[] = [];
      for (const email of args.shareWithUsers) {
        if (typeof email === 'string' && email.trim()) {
          emails.push(email.trim());
        }
      }
      if (emails.length > 0) {
        params.shareWithUsers = emails;
      }
    }

    console.error(`Creating spreadsheet: ${params.title}`);

    // Create the spreadsheet
    const spreadsheet = await sheetsClient.instance.createSpreadsheet(params);

    // Format response for MCP
    let message = `Successfully created spreadsheet "${spreadsheet.title}" with ID: ${spreadsheet.spreadsheetId}`;

    // Add additional information based on what was done
    const actions: string[] = [];
    if (params.initialData && params.initialData.length > 0) {
      actions.push(`Added ${params.initialData.length} rows of initial data`);
    }
    if (params.folderId) {
      actions.push(`Moved to specified Drive folder`);
    }
    if (params.shareWithUsers && params.shareWithUsers.length > 0) {
      actions.push(`Shared with ${params.shareWithUsers.length} user(s)`);
    }

    if (actions.length > 0) {
      message += `. ${actions.join(', ')}.`;
    }

    // Format spreadsheet details
    const spreadsheetDetails = {
      id: spreadsheet.spreadsheetId,
      title: spreadsheet.title,
      url: spreadsheet.url,
      sheets: spreadsheet.sheets.map(sheet => ({
        id: sheet.sheetId,
        title: sheet.title,
        index: sheet.index,
        type: sheet.sheetType,
        rowCount: sheet.gridProperties?.rowCount,
        columnCount: sheet.gridProperties?.columnCount
      }))
    };

    const responseText = `${message}

📊 **Spreadsheet Details:**
- **ID:** ${spreadsheetDetails.id}
- **Title:** ${spreadsheetDetails.title}
- **URL:** ${spreadsheetDetails.url}
- **Sheets:** ${spreadsheetDetails.sheets.length} sheet(s)

${spreadsheetDetails.sheets.map(sheet => 
  `  • ${sheet.title} (${sheet.rowCount || 'Unknown'} rows × ${sheet.columnCount || 'Unknown'} columns)`
).join('\n')}`;

    console.error(`Spreadsheet created successfully: ${spreadsheet.spreadsheetId}`);
    
    return {
      content: [{
        type: 'text' as const,
        text: responseText
      }],
      isError: false
    };

  } catch (error) {
    console.error('Error creating spreadsheet:', error);

    if (error instanceof CalendarError) {
      throw error;
    }

    throw new CalendarError(
      `Failed to create spreadsheet: ${error instanceof Error ? error.message : 'Unknown error'}`,
      MCPErrorCode.APIError,
      { originalError: error }
    );
  }
}
