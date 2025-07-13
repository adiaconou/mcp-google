/**
 * Sheets API Client - Google Sheets API wrapper with OAuth integration
 * 
 * This file implements a type-safe wrapper around the Google Sheets API
 * with integrated OAuth authentication and error handling.
 */

import { google, sheets_v4 } from 'googleapis';
import { oauthManager } from '../../auth/oauthManager';
import { 
  CalendarError, 
  MCPErrorCode 
} from '../../types/mcp';

/**
 * Sheets spreadsheet interface for our application
 */
export interface SheetsSpreadsheet {
  spreadsheetId: string;
  title: string;
  url: string;
  sheets: SheetsSheet[];
  createdTime?: string;
  modifiedTime?: string;
}

/**
 * Sheets sheet interface
 */
export interface SheetsSheet {
  sheetId: number;
  title: string;
  index: number;
  sheetType: string;
  gridProperties?: {
    rowCount: number;
    columnCount: number;
  } | undefined;
}

/**
 * Parameters for creating a new spreadsheet
 */
export interface SheetsCreateSpreadsheetParams {
  title: string;
  folderId?: string;
  initialData?: string[][];
  shareWithUsers?: string[];
}

/**
 * Sheets API Client
 * 
 * Provides type-safe access to Google Sheets API with integrated OAuth
 * authentication and comprehensive error handling.
 */
export class SheetsClient {
  private sheets: sheets_v4.Sheets | null = null;

  constructor() {
    // No initialization needed in constructor
  }

  /**
   * Initialize Sheets API client with authentication and scope validation
   * @throws {CalendarError} If authentication fails
   */
  private async initializeClient(): Promise<void> {
    try {
      // Ensure we have all required Sheets scopes before initializing
      await oauthManager.instance.ensureScopes([
        'https://www.googleapis.com/auth/spreadsheets'
      ]);

      const oauth2Client = await oauthManager.instance.getOAuth2Client();
      this.sheets = google.sheets({ version: 'v4', auth: oauth2Client });
    } catch (error) {
      // Handle scope-related errors specifically
      if (error instanceof CalendarError && error.message.includes('Missing required scopes')) {
        throw new CalendarError(
          'Sheets access requires additional permissions. Please reauthenticate to grant Sheets access.',
          MCPErrorCode.AuthenticationError
        );
      }
      throw new CalendarError(
        'Failed to initialize Sheets API client: User is not authenticated',
        MCPErrorCode.AuthenticationError
      );
    }
  }

  /**
   * Ensure the client is initialized
   * @throws {CalendarError} If initialization fails
   */
  private async ensureInitialized(): Promise<sheets_v4.Sheets> {
    if (!this.sheets) {
      await this.initializeClient();
    }
    
    if (!this.sheets) {
      throw new CalendarError(
        'Sheets API client failed to initialize',
        MCPErrorCode.InternalError
      );
    }
    
    return this.sheets;
  }

  /**
   * Create a new Google Sheets spreadsheet
   * @param params - Parameters for creating the spreadsheet
   * @returns Promise resolving to the created spreadsheet
   * @throws {CalendarError} If the request fails
   */
  async createSpreadsheet(params: SheetsCreateSpreadsheetParams): Promise<SheetsSpreadsheet> {
    try {
      const sheets = await this.ensureInitialized();
      
      // Validate required parameters
      this.validateCreateSpreadsheetParams(params);

      console.error(`Creating new spreadsheet: ${params.title}`);

      // Create the spreadsheet request
      const createRequest: sheets_v4.Schema$Spreadsheet = {
        properties: {
          title: params.title
        },
        sheets: [
          {
            properties: {
              title: 'Sheet1',
              sheetType: 'GRID',
              gridProperties: {
                rowCount: 1000,
                columnCount: 26
              }
            }
          }
        ]
      };

      // Make API request to create spreadsheet
      const response = await sheets.spreadsheets.create({
        requestBody: createRequest
      });

      if (!response.data || !response.data.spreadsheetId) {
        throw new Error('No data returned from Sheets API');
      }

      const spreadsheet = this.convertToSheetsSpreadsheet(response.data);

      // Add initial data if provided
      if (params.initialData && params.initialData.length > 0) {
        await this.addInitialData(spreadsheet.spreadsheetId, params.initialData);
      }

      // Move to folder if specified
      if (params.folderId) {
        await this.moveToFolder(spreadsheet.spreadsheetId, params.folderId);
      }

      // Share with users if specified
      if (params.shareWithUsers && params.shareWithUsers.length > 0) {
        await this.shareWithUsers(spreadsheet.spreadsheetId, params.shareWithUsers);
      }

      console.error(`Spreadsheet created successfully with ID: ${spreadsheet.spreadsheetId}`);
      
      return spreadsheet;

    } catch (error) {
      throw this.handleApiError(error, 'create spreadsheet');
    }
  }

  /**
   * Add initial data to a newly created spreadsheet
   * @param spreadsheetId - The ID of the spreadsheet
   * @param data - 2D array of initial data
   */
  private async addInitialData(spreadsheetId: string, data: string[][]): Promise<void> {
    try {
      const sheets = await this.ensureInitialized();

      // Determine the range based on data dimensions
      const numRows = data.length;
      const numCols = Math.max(...data.map(row => row.length));
      const endColumn = String.fromCharCode(65 + numCols - 1); // A=65, B=66, etc.
      const range = `Sheet1!A1:${endColumn}${numRows}`;

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: data
        }
      });

      console.error(`Added initial data to spreadsheet (${numRows} rows, ${numCols} columns)`);
    } catch (error) {
      console.error('Failed to add initial data:', error);
      // Don't throw here - spreadsheet was created successfully
    }
  }

  /**
   * Move spreadsheet to a specific Drive folder
   * @param spreadsheetId - The ID of the spreadsheet
   * @param folderId - The ID of the target folder
   */
  private async moveToFolder(spreadsheetId: string, folderId: string): Promise<void> {
    try {
      // We need Drive API access for this operation
      await oauthManager.instance.ensureScopes([
        'https://www.googleapis.com/auth/drive'
      ]);

      const oauth2Client = await oauthManager.instance.getOAuth2Client();
      const drive = google.drive({ version: 'v3', auth: oauth2Client });

      // Get current parents
      const file = await drive.files.get({
        fileId: spreadsheetId,
        fields: 'parents'
      });

      const previousParents = file.data.parents?.join(',') || '';

      // Move to new folder
      await drive.files.update({
        fileId: spreadsheetId,
        addParents: folderId,
        removeParents: previousParents,
        fields: 'id, parents'
      });

      console.error(`Moved spreadsheet to folder: ${folderId}`);
    } catch (error) {
      console.error('Failed to move to folder:', error);
      // Don't throw here - spreadsheet was created successfully
    }
  }

  /**
   * Share spreadsheet with specified users
   * @param spreadsheetId - The ID of the spreadsheet
   * @param userEmails - Array of email addresses to share with
   */
  private async shareWithUsers(spreadsheetId: string, userEmails: string[]): Promise<void> {
    try {
      // We need Drive API access for sharing
      await oauthManager.instance.ensureScopes([
        'https://www.googleapis.com/auth/drive'
      ]);

      const oauth2Client = await oauthManager.instance.getOAuth2Client();
      const drive = google.drive({ version: 'v3', auth: oauth2Client });

      // Share with each user
      for (const email of userEmails) {
        if (this.isValidEmail(email)) {
          await drive.permissions.create({
            fileId: spreadsheetId,
            requestBody: {
              role: 'writer',
              type: 'user',
              emailAddress: email
            }
          });
          console.error(`Shared spreadsheet with: ${email}`);
        } else {
          console.error(`Invalid email address skipped: ${email}`);
        }
      }
    } catch (error) {
      console.error('Failed to share with users:', error);
      // Don't throw here - spreadsheet was created successfully
    }
  }

  /**
   * Convert Sheets API spreadsheet to our SheetsSpreadsheet format
   * @param sheetsSpreadsheet - Sheets API spreadsheet object
   * @returns SheetsSpreadsheet in our format
   */
  private convertToSheetsSpreadsheet(sheetsSpreadsheet: sheets_v4.Schema$Spreadsheet): SheetsSpreadsheet {
    const sheets: SheetsSheet[] = [];
    
    if (sheetsSpreadsheet.sheets) {
      for (const sheet of sheetsSpreadsheet.sheets) {
        if (sheet.properties) {
          sheets.push({
            sheetId: sheet.properties.sheetId || 0,
            title: sheet.properties.title || 'Untitled',
            index: sheet.properties.index || 0,
            sheetType: sheet.properties.sheetType || 'GRID',
            gridProperties: sheet.properties.gridProperties ? {
              rowCount: sheet.properties.gridProperties.rowCount || 1000,
              columnCount: sheet.properties.gridProperties.columnCount || 26
            } : undefined
          });
        }
      }
    }

    const spreadsheet: SheetsSpreadsheet = {
      spreadsheetId: sheetsSpreadsheet.spreadsheetId || '',
      title: sheetsSpreadsheet.properties?.title || 'Untitled Spreadsheet',
      url: sheetsSpreadsheet.spreadsheetUrl || '',
      sheets
    };

    return spreadsheet;
  }

  /**
   * Validate parameters for creating a spreadsheet
   * @param params - Parameters to validate
   * @throws {CalendarError} If validation fails
   */
  private validateCreateSpreadsheetParams(params: SheetsCreateSpreadsheetParams): void {
    if (!params.title?.trim()) {
      throw new CalendarError('Spreadsheet title is required', MCPErrorCode.ValidationError);
    }

    if (params.title.length > 255) {
      throw new CalendarError('Spreadsheet title cannot exceed 255 characters', MCPErrorCode.ValidationError);
    }

    // Validate folder ID if provided
    if (params.folderId && !params.folderId.trim()) {
      throw new CalendarError('Folder ID cannot be empty if provided', MCPErrorCode.ValidationError);
    }

    // Validate initial data if provided
    if (params.initialData) {
      if (!Array.isArray(params.initialData)) {
        throw new CalendarError('Initial data must be a 2D array', MCPErrorCode.ValidationError);
      }

      if (params.initialData.length > 1000) {
        throw new CalendarError('Initial data cannot exceed 1000 rows', MCPErrorCode.ValidationError);
      }

      for (const row of params.initialData) {
        if (!Array.isArray(row)) {
          throw new CalendarError('Each row in initial data must be an array', MCPErrorCode.ValidationError);
        }
        if (row.length > 26) {
          throw new CalendarError('Each row cannot exceed 26 columns', MCPErrorCode.ValidationError);
        }
      }
    }

    // Validate email addresses if provided
    if (params.shareWithUsers) {
      if (!Array.isArray(params.shareWithUsers)) {
        throw new CalendarError('Share with users must be an array of email addresses', MCPErrorCode.ValidationError);
      }

      for (const email of params.shareWithUsers) {
        if (!this.isValidEmail(email)) {
          throw new CalendarError(
            `Invalid email address: ${email}`,
            MCPErrorCode.ValidationError
          );
        }
      }
    }
  }

  /**
   * Basic email validation
   * @param email - Email address to validate
   * @returns True if email format is valid
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Handle Sheets API errors and convert to CalendarError
   * @param error - The error from the API call
   * @param operation - Description of the operation that failed
   * @returns CalendarError with appropriate error code and message
   */
  private handleApiError(error: unknown, operation: string): CalendarError {
    console.error(`Sheets API error during ${operation}:`, error);

    if (error instanceof CalendarError) {
      return error;
    }

    const err = error as { code?: number | string; message?: string };

    switch (err.code) {
      case 401:
        return new CalendarError('Authentication failed. Please re-authenticate.', MCPErrorCode.AuthenticationError);
      case 403:
        return new CalendarError('Insufficient permissions for Sheets access.', MCPErrorCode.AuthorizationError);
      case 429:
        return new CalendarError('Rate limit exceeded. Please try again later.', MCPErrorCode.RateLimitError);
      case 404:
        return new CalendarError(`Sheets resource not found during ${operation}.`, MCPErrorCode.APIError);
      case 400:
        return new CalendarError(`Invalid Sheets request for ${operation}: ${err.message}`, MCPErrorCode.ValidationError);
      default:
        return new CalendarError(`Failed to ${operation}: ${err.message || 'Unknown error'}`, MCPErrorCode.APIError, { originalError: error });
    }
  }
}

/**
 * Global Sheets client instance
 * This singleton pattern ensures consistent API access across the application
 */
let _sheetsClient: SheetsClient | null = null;

export const sheetsClient = {
  get instance(): SheetsClient {
    if (!_sheetsClient) {
      _sheetsClient = new SheetsClient();
    }
    return _sheetsClient;
  },
  
  reset(): void {
    _sheetsClient = null;
  }
};
