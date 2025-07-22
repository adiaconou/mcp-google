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
 * Update request for a specific range
 */
export interface SheetsUpdateRequest {
  range: string;
  values: (string | number | boolean)[][];
}

/**
 * Parameters for updating cells in a spreadsheet
 */
export interface SheetsUpdateParams {
  spreadsheetId: string;
  updates: SheetsUpdateRequest[];
  valueInputOption?: 'RAW' | 'USER_ENTERED';
}

/**
 * Parameters for getting data from a spreadsheet
 */
export interface SheetsGetDataParams {
  spreadsheetId: string;
  range?: string;
  sheetName?: string;
  valueRenderOption?: 'FORMATTED_VALUE' | 'UNFORMATTED_VALUE' | 'FORMULA';
  includeMetadata?: boolean;
}

/**
 * Parameters for formatting cells in a spreadsheet
 */
export interface SheetsFormatParams {
  spreadsheetId: string;
  range: string;
  // Basic styling
  backgroundColor?: string;
  fontColor?: string;
  bold?: boolean;
  italic?: boolean;
  fontSize?: number;
  textAlignment?: 'LEFT' | 'CENTER' | 'RIGHT';
  // Data organization
  addFilter?: boolean;
  sortBy?: {
    column: number;
    ascending?: boolean;
  };
  freezeRows?: number;
  freezeColumns?: number;
  // Conditional formatting
  conditionalFormat?: {
    condition: 'GREATER_THAN' | 'LESS_THAN' | 'EQUAL' | 'BETWEEN';
    value: number;
    value2?: number;
    backgroundColor: string;
  };
  // Number formatting
  numberFormat?: {
    type: 'CURRENCY' | 'PERCENT' | 'DATE' | 'NUMBER';
    decimalPlaces?: number;
  };
}

/**
 * Parameters for calculating formulas and aggregations in a spreadsheet
 */
export interface SheetsCalculateParams {
  spreadsheetId: string;
  operation: 'formula' | 'aggregate';
  range?: string;
  formula?: string;
  aggregateFunction?: 'SUM' | 'AVERAGE' | 'COUNT' | 'MAX' | 'MIN';
  outputRange?: string;
}

/**
 * Axis format options for charts
 */
export interface AxisFormatOptions {
  type: 'NUMBER' | 'CURRENCY' | 'PERCENT' | 'DATE';
  pattern?: string;
}

/**
 * Axis options for chart customization
 */
export interface AxisOptions {
  title?: string;
  minValue?: number;
  maxValue?: number;
  format?: AxisFormatOptions;
}

/**
 * Parameters for creating a chart in a spreadsheet
 */
export interface SheetsCreateChartParams {
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
    xAxis?: AxisOptions;
    yAxis?: AxisOptions;
  };
}

/**
 * Response from getting spreadsheet data
 */
export interface SheetsDataResponse {
  values: any[][];
  range: string;
  majorDimension: string;
  metadata?: {
    spreadsheetTitle: string;
    sheetTitle: string;
    rowCount: number;
    columnCount: number;
  };
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
   * Get data from a Google Sheets spreadsheet
   * @param params - Parameters for getting data
   * @returns Promise resolving to the spreadsheet data
   * @throws {CalendarError} If the request fails
   */
  async getData(params: SheetsGetDataParams): Promise<SheetsDataResponse> {
    try {
      const sheets = await this.ensureInitialized();
      
      // Validate required parameters
      this.validateGetDataParams(params);

      console.error(`Getting data from spreadsheet: ${params.spreadsheetId}`);

      // Build the range string
      let range = params.range || 'A1:Z1000';
      if (params.sheetName) {
        // If sheet name is provided, prepend it to the range
        range = `${params.sheetName}!${range}`;
      }

      // Make API request to get data
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: params.spreadsheetId,
        range: range,
        valueRenderOption: params.valueRenderOption || 'FORMATTED_VALUE',
        majorDimension: 'ROWS'
      });

      if (!response.data) {
        throw new Error('No data returned from Sheets API');
      }

      // Prepare the response
      const dataResponse: SheetsDataResponse = {
        values: response.data.values || [],
        range: response.data.range || range,
        majorDimension: response.data.majorDimension || 'ROWS'
      };

      // Add metadata if requested
      if (params.includeMetadata !== false) {
        try {
          const metadata = await this.getSpreadsheetMetadata(params.spreadsheetId, params.sheetName);
          dataResponse.metadata = metadata;
        } catch (error) {
          console.error('Failed to get metadata:', error);
          // Continue without metadata rather than failing the entire request
        }
      }

      const rowCount = dataResponse.values.length;
      const colCount = rowCount > 0 ? Math.max(...dataResponse.values.map(row => row.length)) : 0;
      console.error(`Successfully retrieved data: ${rowCount} rows, ${colCount} columns`);
      
      return dataResponse;

    } catch (error) {
      throw this.handleApiError(error, 'get data');
    }
  }

  /**
   * Get spreadsheet metadata for the response
   * @param spreadsheetId - The ID of the spreadsheet
   * @param sheetName - Optional specific sheet name
   * @returns Metadata object
   */
  private async getSpreadsheetMetadata(spreadsheetId: string, sheetName?: string): Promise<{
    spreadsheetTitle: string;
    sheetTitle: string;
    rowCount: number;
    columnCount: number;
  }> {
    const sheets = await this.ensureInitialized();
    
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'properties.title,sheets.properties'
    });

    if (!response.data) {
      throw new Error('No metadata returned from Sheets API');
    }

    const spreadsheetTitle = response.data.properties?.title || 'Untitled Spreadsheet';
    
    // Find the target sheet
    let targetSheet = response.data.sheets?.[0]; // Default to first sheet
    if (sheetName && response.data.sheets) {
      const foundSheet = response.data.sheets.find(sheet => 
        sheet.properties?.title === sheetName
      );
      if (foundSheet) {
        targetSheet = foundSheet;
      }
    }

    const sheetTitle = targetSheet?.properties?.title || 'Sheet1';
    const rowCount = targetSheet?.properties?.gridProperties?.rowCount || 1000;
    const columnCount = targetSheet?.properties?.gridProperties?.columnCount || 26;

    return {
      spreadsheetTitle,
      sheetTitle,
      rowCount,
      columnCount
    };
  }

  /**
   * Validate parameters for getting data
   * @param params - Parameters to validate
   * @throws {CalendarError} If validation fails
   */
  private validateGetDataParams(params: SheetsGetDataParams): void {
    if (!params.spreadsheetId?.trim()) {
      throw new CalendarError('Spreadsheet ID is required', MCPErrorCode.ValidationError);
    }

    // Validate range format if provided
    if (params.range) {
      const range = params.range.trim();
      // Basic A1 notation validation - allow single cells, ranges, or full columns/rows
      if (!/^[A-Z]+[0-9]*:[A-Z]+[0-9]*$|^[A-Z]+[0-9]+$|^[A-Z]+:[A-Z]+$|^[0-9]+:[0-9]+$/.test(range)) {
        throw new CalendarError(
          'Invalid range format. Use A1 notation (e.g., A1:B2, A1, A:B, 1:5)',
          MCPErrorCode.ValidationError
        );
      }
    }

    // Validate sheet name if provided
    if (params.sheetName && !params.sheetName.trim()) {
      throw new CalendarError('Sheet name cannot be empty if provided', MCPErrorCode.ValidationError);
    }

    // Validate value render option
    if (params.valueRenderOption && 
        !['FORMATTED_VALUE', 'UNFORMATTED_VALUE', 'FORMULA'].includes(params.valueRenderOption)) {
      throw new CalendarError(
        'Value render option must be FORMATTED_VALUE, UNFORMATTED_VALUE, or FORMULA',
        MCPErrorCode.ValidationError
      );
    }
  }

  /**
   * Update cells in a Google Sheets spreadsheet
   * @param params - Parameters for updating cells
   * @returns Promise resolving when updates are complete
   * @throws {CalendarError} If the request fails
   */
  async updateCells(params: SheetsUpdateParams): Promise<{ updatedCells: number; updatedRanges: number }> {
    try {
      const sheets = await this.ensureInitialized();
      
      // Validate required parameters
      this.validateUpdateCellsParams(params);

      console.error(`Updating cells in spreadsheet: ${params.spreadsheetId}`);

      // Prepare batch update request
      const requests: sheets_v4.Schema$ValueRange[] = [];
      
      for (const update of params.updates) {
        requests.push({
          range: update.range,
          values: update.values
        });
      }

      // Make API request to update cells
      const response = await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: params.spreadsheetId,
        requestBody: {
          valueInputOption: params.valueInputOption || 'USER_ENTERED',
          data: requests
        }
      });

      if (!response.data) {
        throw new Error('No data returned from Sheets API');
      }

      // Calculate total updated cells
      let totalUpdatedCells = 0;
      if (response.data.responses) {
        for (const updateResponse of response.data.responses) {
          totalUpdatedCells += updateResponse.updatedCells || 0;
        }
      }

      console.error(`Successfully updated ${totalUpdatedCells} cells in ${params.updates.length} ranges`);
      
      return {
        updatedCells: totalUpdatedCells,
        updatedRanges: params.updates.length
      };

    } catch (error) {
      throw this.handleApiError(error, 'update cells');
    }
  }

  /**
   * Format cells in a Google Sheets spreadsheet
   * @param params - Parameters for formatting cells
   * @returns Promise resolving when formatting is complete
   * @throws {CalendarError} If the request fails
   */
  async formatCells(params: SheetsFormatParams): Promise<{ formattedRanges: number; appliedFormats: string[] }> {
    try {
      const sheets = await this.ensureInitialized();
      
      // Validate required parameters
      this.validateFormatCellsParams(params);

      console.error(`Formatting cells in spreadsheet: ${params.spreadsheetId}`);

      // Build batch update requests
      const requests: sheets_v4.Schema$Request[] = [];
      const appliedFormats: string[] = [];

      // Get sheet ID for the range
      const sheetId = await this.getSheetIdFromRange(params.spreadsheetId, params.range);

      // Parse range to get grid range
      const gridRange = this.parseRangeToGridRange(params.range, sheetId);

      // Add basic styling requests
      if (params.backgroundColor || params.fontColor || params.bold !== undefined || 
          params.italic !== undefined || params.fontSize || params.textAlignment) {
        
        const cellFormat: sheets_v4.Schema$CellFormat = {};
        
        if (params.backgroundColor || params.fontColor) {
          if (params.backgroundColor) {
            cellFormat.backgroundColor = this.hexToColor(params.backgroundColor);
          }
          cellFormat.textFormat = cellFormat.textFormat || {};
          if (params.fontColor) {
            cellFormat.textFormat.foregroundColor = this.hexToColor(params.fontColor);
          }
        }

        if (params.bold !== undefined || params.italic !== undefined || params.fontSize) {
          cellFormat.textFormat = cellFormat.textFormat || {};
          if (params.bold !== undefined) cellFormat.textFormat.bold = params.bold;
          if (params.italic !== undefined) cellFormat.textFormat.italic = params.italic;
          if (params.fontSize) cellFormat.textFormat.fontSize = params.fontSize;
        }

        if (params.textAlignment) {
          cellFormat.horizontalAlignment = params.textAlignment;
        }

        requests.push({
          repeatCell: {
            range: gridRange,
            cell: { userEnteredFormat: cellFormat },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
          }
        });
        appliedFormats.push('basic styling');
      }

      // Add number formatting
      if (params.numberFormat) {
        const numberFormat = this.buildNumberFormat(params.numberFormat);
        requests.push({
          repeatCell: {
            range: gridRange,
            cell: { userEnteredFormat: { numberFormat } },
            fields: 'userEnteredFormat.numberFormat'
          }
        });
        appliedFormats.push('number formatting');
      }

      // Add filter
      if (params.addFilter) {
        requests.push({
          setBasicFilter: {
            filter: {
              range: gridRange
            }
          }
        });
        appliedFormats.push('filter');
      }

      // Add sorting
      if (params.sortBy) {
        requests.push({
          sortRange: {
            range: gridRange,
            sortSpecs: [{
              dimensionIndex: params.sortBy.column,
              sortOrder: params.sortBy.ascending !== false ? 'ASCENDING' : 'DESCENDING'
            }]
          }
        });
        appliedFormats.push('sorting');
      }

      // Add freeze rows/columns
      if (params.freezeRows !== undefined || params.freezeColumns !== undefined) {
        requests.push({
          updateSheetProperties: {
            properties: {
              sheetId: sheetId,
              gridProperties: {
                frozenRowCount: params.freezeRows || 0,
                frozenColumnCount: params.freezeColumns || 0
              }
            },
            fields: 'gridProperties.frozenRowCount,gridProperties.frozenColumnCount'
          }
        });
        appliedFormats.push('freeze panes');
      }

      // Add conditional formatting
      if (params.conditionalFormat) {
        const conditionalFormatRule = this.buildConditionalFormatRule(params.conditionalFormat, gridRange);
        requests.push({
          addConditionalFormatRule: {
            rule: conditionalFormatRule,
            index: 0
          }
        });
        appliedFormats.push('conditional formatting');
      }

      // Execute batch update
      if (requests.length > 0) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: params.spreadsheetId,
          requestBody: {
            requests: requests
          }
        });
      }

      console.error(`Successfully applied ${appliedFormats.length} formatting operations`);
      
      return {
        formattedRanges: 1,
        appliedFormats: appliedFormats
      };

    } catch (error) {
      throw this.handleApiError(error, 'format cells');
    }
  }

  /**
   * Perform calculations and formula operations in a Google Sheets spreadsheet
   * @param params - Parameters for the calculation operation
   * @returns Promise resolving to the calculation results
   * @throws {Error} If the request fails
   */
  async calculate(params: SheetsCalculateParams): Promise<{ result: any; operation: string; range?: string }> {
    try {
      const sheets = await this.ensureInitialized();
      
      // Validate required parameters
      this.validateCalculateParams(params);

      console.error(`Performing ${params.operation} operation in spreadsheet: ${params.spreadsheetId}`);

      if (params.operation === 'formula') {
        return await this.executeFormulaOperation(sheets, params);
      } else {
        return await this.executeAggregateOperation(sheets, params);
      }

    } catch (error) {
      throw this.handleCalculateError(error, params.operation);
    }
  }

  /**
   * Validate parameters for calculate operation
   * @param params - Parameters to validate
   * @throws {Error} If validation fails
   */
  private validateCalculateParams(params: SheetsCalculateParams): void {
    if (!params.spreadsheetId?.trim()) {
      throw new Error('Spreadsheet ID is required and must be a string');
    }

    if (!params.operation || !['formula', 'aggregate'].includes(params.operation)) {
      throw new Error('Operation must be either "formula" or "aggregate"');
    }

    if (params.operation === 'formula') {
      if (!params.formula?.trim()) {
        throw new Error('Formula is required for formula operations');
      }
      if (!params.outputRange?.trim()) {
        throw new Error('Output range is required for formula operations');
      }
    }

    if (params.operation === 'aggregate') {
      if (!params.range?.trim()) {
        throw new Error('Range is required for aggregate operations');
      }
      if (!params.aggregateFunction || !['SUM', 'AVERAGE', 'COUNT', 'MAX', 'MIN'].includes(params.aggregateFunction)) {
        throw new Error('Aggregate function must be one of: SUM, AVERAGE, COUNT, MAX, MIN');
      }
    }

    // Validate range formats if provided
    if (params.range && !/^[A-Z]+[0-9]*:[A-Z]+[0-9]*$|^[A-Z]+[0-9]+$/.test(params.range.trim())) {
      throw new Error('Invalid range format. Use A1 notation (e.g., A1:B2, A1:Z100)');
    }

    if (params.outputRange && !/^[A-Z]+[0-9]+$/.test(params.outputRange.trim())) {
      throw new Error('Invalid output range format. Use A1 notation (e.g., A1)');
    }
  }

  /**
   * Execute formula operation
   * @param sheets - Sheets API client
   * @param params - Calculate parameters
   * @returns Promise resolving to formula result
   */
  private async executeFormulaOperation(sheets: sheets_v4.Sheets, params: SheetsCalculateParams): Promise<{ result: any; operation: string; range?: string }> {
    if (!params.formula || !params.outputRange) {
      throw new Error('Formula and output range are required for formula operations');
    }

    // Apply the formula to the output range
    await sheets.spreadsheets.values.update({
      spreadsheetId: params.spreadsheetId,
      range: params.outputRange,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[params.formula]]
      }
    });

    // Get the calculated result
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: params.spreadsheetId,
      range: params.outputRange,
      valueRenderOption: 'FORMATTED_VALUE'
    });

    const result = response.data.values?.[0]?.[0] || null;

    console.error(`Formula operation completed: ${params.formula} = ${result}`);

    return {
      result: result,
      operation: 'formula',
      range: params.outputRange
    };
  }

  /**
   * Execute aggregate operation
   * @param sheets - Sheets API client
   * @param params - Calculate parameters
   * @returns Promise resolving to aggregate result
   */
  private async executeAggregateOperation(sheets: sheets_v4.Sheets, params: SheetsCalculateParams): Promise<{ result: any; operation: string; range?: string }> {
    if (!params.range || !params.aggregateFunction) {
      throw new Error('Range and aggregate function are required for aggregate operations');
    }

    // Build the formula based on the aggregate function
    let formula: string;
    switch (params.aggregateFunction) {
      case 'SUM':
        formula = `=SUM(${params.range})`;
        break;
      case 'AVERAGE':
        formula = `=AVERAGE(${params.range})`;
        break;
      case 'COUNT':
        formula = `=COUNT(${params.range})`;
        break;
      case 'MAX':
        formula = `=MAX(${params.range})`;
        break;
      case 'MIN':
        formula = `=MIN(${params.range})`;
        break;
      default:
        throw new Error(`Unsupported aggregate function: ${params.aggregateFunction}`);
    }

    // Use a temporary cell to calculate the result
    const tempRange = params.outputRange || 'Z1000';
    
    // Apply the formula to get the result
    await sheets.spreadsheets.values.update({
      spreadsheetId: params.spreadsheetId,
      range: tempRange,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[formula]]
      }
    });

    // Get the calculated result
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: params.spreadsheetId,
      range: tempRange,
      valueRenderOption: 'FORMATTED_VALUE'
    });

    const result = response.data.values?.[0]?.[0] || null;

    // Clear the temporary cell if we used one
    if (!params.outputRange) {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: params.spreadsheetId,
        range: tempRange
      });
    }

    console.error(`Aggregate operation completed: ${params.aggregateFunction}(${params.range}) = ${result}`);

    return {
      result: result,
      operation: 'aggregate',
      range: params.range
    };
  }

  /**
   * Handle calculate operation errors
   * @param error - The error from the operation
   * @param operation - Description of the operation that failed
   * @returns Error with appropriate message
   */
  private handleCalculateError(error: unknown, operation: string): Error {
    console.error(`Calculate operation error during ${operation}:`, error);

    if (error instanceof Error) {
      return error;
    }

    const err = error as { code?: number | string; message?: string };

    switch (err.code) {
      case 401:
        return new Error('Authentication failed. Please re-authenticate.');
      case 403:
        return new Error('Insufficient permissions for Sheets access.');
      case 429:
        return new Error('Rate limit exceeded. Please try again later.');
      case 404:
        return new Error(`Spreadsheet not found during ${operation}.`);
      case 400:
        return new Error(`Invalid request for ${operation}: ${err.message}`);
      default:
        return new Error(`Failed to ${operation}: ${err.message || 'Unknown error'}`);
    }
  }

  /**
   * Create a chart in a Google Sheets spreadsheet
   * @param params - Parameters for creating the chart
   * @returns Promise resolving to the chart creation result
   * @throws {CalendarError} If the request fails
   */
  async createChart(params: SheetsCreateChartParams): Promise<{ chartId: number; chartTitle: string; chartType: string }> {
    try {
      const sheets = await this.ensureInitialized();
      
      // Validate required parameters
      this.validateCreateChartParams(params);

      console.error(`Creating chart in spreadsheet: ${params.spreadsheetId}`);

      // Get sheet ID for the chart placement
      const sheetId = params.sheetId ?? await this.getSheetIdFromRange(params.spreadsheetId, params.dataRange);

      // Parse data range to get source range
      const sourceRange = this.parseRangeToGridRange(params.dataRange, sheetId);

      // Build chart specification
      const chartSpec = this.buildChartSpec(params, sourceRange);

      // Determine chart position
      const position = this.buildChartPosition(params, sheetId);

      // Create the chart request
      const addChartRequest: sheets_v4.Schema$Request = {
        addChart: {
          chart: {
            spec: chartSpec,
            position: position
          }
        }
      };

      // Execute the batch update to add the chart
      const response = await sheets.spreadsheets.batchUpdate({
        spreadsheetId: params.spreadsheetId,
        requestBody: {
          requests: [addChartRequest]
        }
      });

      if (!response.data?.replies?.[0]?.addChart?.chart) {
        throw new Error('No chart data returned from Sheets API');
      }

      const chart = response.data.replies[0].addChart.chart;
      const chartId = chart.chartId || 0;
      const chartTitle = params.title || `${params.chartType} Chart`;

      console.error(`Chart created successfully with ID: ${chartId}`);
      
      return {
        chartId: chartId,
        chartTitle: chartTitle,
        chartType: params.chartType
      };

    } catch (error) {
      throw this.handleApiError(error, 'create chart');
    }
  }

  /**
   * Validate parameters for creating a chart
   * @param params - Parameters to validate
   * @throws {CalendarError} If validation fails
   */
  private validateCreateChartParams(params: SheetsCreateChartParams): void {
    if (!params.spreadsheetId?.trim()) {
      throw new CalendarError('Spreadsheet ID is required', MCPErrorCode.ValidationError);
    }

    if (!params.dataRange?.trim()) {
      throw new CalendarError('Data range is required', MCPErrorCode.ValidationError);
    }

    // Validate data range format
    const range = params.dataRange.trim();
    if (!/^[A-Z]+[0-9]*:[A-Z]+[0-9]*$|^[A-Z]+[0-9]+$/.test(range.replace(/^[^!]*!/, ''))) {
      throw new CalendarError(
        'Invalid data range format. Use A1 notation (e.g., A1:B10, Sheet1!A1:B10)',
        MCPErrorCode.ValidationError
      );
    }

    // Validate chart type
    const validChartTypes = ['LINE', 'BAR', 'COLUMN', 'PIE', 'SCATTER', 'AREA'];
    if (!validChartTypes.includes(params.chartType)) {
      throw new CalendarError(
        `Invalid chart type. Must be one of: ${validChartTypes.join(', ')}`,
        MCPErrorCode.ValidationError
      );
    }

    // Validate title if provided
    if (params.title && params.title.length > 100) {
      throw new CalendarError('Chart title cannot exceed 100 characters', MCPErrorCode.ValidationError);
    }

    // Validate sheet ID if provided
    if (params.sheetId !== undefined && params.sheetId < 0) {
      throw new CalendarError('Sheet ID must be a non-negative number', MCPErrorCode.ValidationError);
    }

    // Validate position if provided
    if (params.position) {
      if (params.position.row < 0 || params.position.column < 0) {
        throw new CalendarError('Chart position row and column must be non-negative', MCPErrorCode.ValidationError);
      }
    }
  }

  /**
   * Build chart specification based on chart type and parameters
   * @param params - Chart creation parameters
   * @param sourceRange - Data source range
   * @returns Chart specification object
   */
  private buildChartSpec(params: SheetsCreateChartParams, sourceRange: sheets_v4.Schema$GridRange): sheets_v4.Schema$ChartSpec {
    const title = params.title || `${params.chartType} Chart`;

    // Split the source range into domain and series ranges
    const { domainRange, seriesRanges } = this.splitChartSourceRanges(sourceRange);

    // Base chart spec
    const chartSpec: sheets_v4.Schema$ChartSpec = {
      title: title,
      titleTextFormat: {
        fontSize: 16,
        bold: true
      }
    };

    // Configure chart type-specific properties
    switch (params.chartType) {
      case 'LINE':
        chartSpec.basicChart = {
          chartType: 'LINE',
          legendPosition: 'BOTTOM_LEGEND',
          axis: this.buildAxisSpecs(params, 'LINE'),
          domains: [
            {
              domain: {
                sourceRange: {
                  sources: [domainRange]
                }
              }
            }
          ],
          series: seriesRanges.map(range => ({
            series: {
              sourceRange: {
                sources: [range]
              }
            },
            targetAxis: 'LEFT_AXIS'
          }))
        };
        break;

      case 'BAR':
        chartSpec.basicChart = {
          chartType: 'BAR',
          legendPosition: 'BOTTOM_LEGEND',
          axis: [
            {
              position: 'BOTTOM_AXIS',
              title: 'Values'
            },
            {
              position: 'LEFT_AXIS',
              title: 'Categories'
            }
          ],
          domains: [
            {
              domain: {
                sourceRange: {
                  sources: [domainRange]
                }
              }
            }
          ],
          series: seriesRanges.map(range => ({
            series: {
              sourceRange: {
                sources: [range]
              }
            },
            targetAxis: 'BOTTOM_AXIS'
          }))
        };
        break;

      case 'COLUMN':
        chartSpec.basicChart = {
          chartType: 'COLUMN',
          legendPosition: 'BOTTOM_LEGEND',
          axis: [
            {
              position: 'BOTTOM_AXIS',
              title: 'Categories'
            },
            {
              position: 'LEFT_AXIS',
              title: 'Values'
            }
          ],
          domains: [
            {
              domain: {
                sourceRange: {
                  sources: [domainRange]
                }
              }
            }
          ],
          series: seriesRanges.map(range => ({
            series: {
              sourceRange: {
                sources: [range]
              }
            },
            targetAxis: 'LEFT_AXIS'
          }))
        };
        break;

      case 'PIE':
        // PIE charts use the original range structure but need proper domain/series split
        chartSpec.pieChart = {
          legendPosition: 'LABELED_LEGEND',
          domain: {
            sourceRange: {
              sources: [domainRange]
            }
          },
          series: {
            sourceRange: {
              sources: [seriesRanges[0] || domainRange]
            }
          }
        };
        break;

      case 'SCATTER':
        chartSpec.basicChart = {
          chartType: 'SCATTER',
          legendPosition: 'BOTTOM_LEGEND',
          axis: [
            {
              position: 'BOTTOM_AXIS',
              title: 'X-Values'
            },
            {
              position: 'LEFT_AXIS',
              title: 'Y-Values'
            }
          ],
          domains: [
            {
              domain: {
                sourceRange: {
                  sources: [domainRange]
                }
              }
            }
          ],
          series: seriesRanges.map(range => ({
            series: {
              sourceRange: {
                sources: [range]
              }
            },
            targetAxis: 'LEFT_AXIS'
          }))
        };
        break;

      case 'AREA':
        chartSpec.basicChart = {
          chartType: 'AREA',
          legendPosition: 'BOTTOM_LEGEND',
          stackedType: 'NOT_STACKED',
          axis: [
            {
              position: 'BOTTOM_AXIS',
              title: 'X-Axis'
            },
            {
              position: 'LEFT_AXIS',
              title: 'Y-Axis'
            }
          ],
          domains: [
            {
              domain: {
                sourceRange: {
                  sources: [domainRange]
                }
              }
            }
          ],
          series: seriesRanges.map(range => ({
            series: {
              sourceRange: {
                sources: [range]
              }
            },
            targetAxis: 'LEFT_AXIS'
          }))
        };
        break;

      default:
        throw new CalendarError(`Unsupported chart type: ${params.chartType}`, MCPErrorCode.ValidationError);
    }

    return chartSpec;
  }

  /**
   * Split chart source range into domain and series ranges
   * @param sourceRange - The full data range
   * @returns Object with domain range and series ranges
   */
  private splitChartSourceRanges(sourceRange: sheets_v4.Schema$GridRange): {
    domainRange: sheets_v4.Schema$GridRange;
    seriesRanges: sheets_v4.Schema$GridRange[];
  } {
    const { sheetId, startRowIndex, endRowIndex, startColumnIndex, endColumnIndex } = sourceRange;
    
    if (sheetId === undefined || sheetId === null || 
        startRowIndex === undefined || startRowIndex === null ||
        endRowIndex === undefined || endRowIndex === null ||
        startColumnIndex === undefined || startColumnIndex === null ||
        endColumnIndex === undefined || endColumnIndex === null) {
      throw new CalendarError('Invalid source range for chart', MCPErrorCode.ValidationError);
    }

    const numColumns = endColumnIndex - startColumnIndex;
    
    // If only one column, use it for both domain and series
    if (numColumns <= 1) {
      return {
        domainRange: sourceRange,
        seriesRanges: [sourceRange]
      };
    }

    // Split into domain (first column) and series (remaining columns)
    const domainRange: sheets_v4.Schema$GridRange = {
      sheetId,
      startRowIndex,
      endRowIndex,
      startColumnIndex,
      endColumnIndex: startColumnIndex + 1
    };

    const seriesRanges: sheets_v4.Schema$GridRange[] = [];
    
    // Create a series range for each remaining column
    for (let col = startColumnIndex + 1; col < endColumnIndex; col++) {
      seriesRanges.push({
        sheetId,
        startRowIndex,
        endRowIndex,
        startColumnIndex: col,
        endColumnIndex: col + 1
      });
    }

    return {
      domainRange,
      seriesRanges
    };
  }

  /**
   * Build axis specifications for charts with custom options
   * @param params - Chart creation parameters
   * @param chartType - Type of chart being created
   * @returns Array of axis specifications
   */
  private buildAxisSpecs(params: SheetsCreateChartParams, chartType: string): sheets_v4.Schema$BasicChartAxis[] {
    const axes: sheets_v4.Schema$BasicChartAxis[] = [];

    // Determine default axis titles based on chart type
    let defaultXTitle = 'X-Axis';
    let defaultYTitle = 'Y-Axis';

    switch (chartType) {
      case 'BAR':
        defaultXTitle = 'Values';
        defaultYTitle = 'Categories';
        break;
      case 'COLUMN':
        defaultXTitle = 'Categories';
        defaultYTitle = 'Values';
        break;
      case 'SCATTER':
        defaultXTitle = 'X-Values';
        defaultYTitle = 'Y-Values';
        break;
      case 'LINE':
      case 'AREA':
        defaultXTitle = 'X-Axis';
        defaultYTitle = 'Y-Axis';
        break;
    }

    // Build X-axis (bottom axis)
    const xAxis: sheets_v4.Schema$BasicChartAxis = {
      position: 'BOTTOM_AXIS',
      title: params.axisOptions?.xAxis?.title || defaultXTitle
    };

    // Add X-axis range if specified
    if (params.axisOptions?.xAxis?.minValue !== undefined || params.axisOptions?.xAxis?.maxValue !== undefined) {
      xAxis.viewWindowOptions = {};
      if (params.axisOptions.xAxis.minValue !== undefined) {
        xAxis.viewWindowOptions.viewWindowMin = params.axisOptions.xAxis.minValue;
      }
      if (params.axisOptions.xAxis.maxValue !== undefined) {
        xAxis.viewWindowOptions.viewWindowMax = params.axisOptions.xAxis.maxValue;
      }
    }

    axes.push(xAxis);

    // Build Y-axis (left axis)
    const yAxis: sheets_v4.Schema$BasicChartAxis = {
      position: 'LEFT_AXIS',
      title: params.axisOptions?.yAxis?.title || defaultYTitle
    };

    // Add Y-axis range if specified
    if (params.axisOptions?.yAxis?.minValue !== undefined || params.axisOptions?.yAxis?.maxValue !== undefined) {
      yAxis.viewWindowOptions = {};
      if (params.axisOptions.yAxis.minValue !== undefined) {
        yAxis.viewWindowOptions.viewWindowMin = params.axisOptions.yAxis.minValue;
      }
      if (params.axisOptions.yAxis.maxValue !== undefined) {
        yAxis.viewWindowOptions.viewWindowMax = params.axisOptions.yAxis.maxValue;
      }
    }

    axes.push(yAxis);

    return axes;
  }

  /**
   * Build number format for axis
   * @param format - Axis format options
   * @returns NumberFormat object for axis
   */
  private buildAxisNumberFormat(format: AxisFormatOptions): sheets_v4.Schema$NumberFormat {
    const numberFormat: sheets_v4.Schema$NumberFormat = {
      type: format.type
    };

    if (format.pattern) {
      numberFormat.pattern = format.pattern;
    } else {
      // Set default patterns based on type
      switch (format.type) {
        case 'CURRENCY':
          numberFormat.pattern = '$#,##0.00';
          break;
        case 'PERCENT':
          numberFormat.pattern = '0.00%';
          break;
        case 'DATE':
          numberFormat.pattern = 'M/d/yyyy';
          break;
        case 'NUMBER':
          numberFormat.pattern = '#,##0.00';
          break;
      }
    }

    return numberFormat;
  }

  /**
   * Build chart position specification
   * @param params - Chart creation parameters
   * @param sheetId - Target sheet ID
   * @returns Chart position object
   */
  private buildChartPosition(params: SheetsCreateChartParams, sheetId: number): sheets_v4.Schema$EmbeddedObjectPosition {
    const position: sheets_v4.Schema$EmbeddedObjectPosition = {
      overlayPosition: {
        anchorCell: {
          sheetId: sheetId,
          rowIndex: params.position?.row || 0,
          columnIndex: params.position?.column || 0
        },
        offsetXPixels: 0,
        offsetYPixels: 0,
        widthPixels: 600,
        heightPixels: 371
      }
    };

    return position;
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
   * Validate parameters for updating cells
   * @param params - Parameters to validate
   * @throws {CalendarError} If validation fails
   */
  private validateUpdateCellsParams(params: SheetsUpdateParams): void {
    if (!params.spreadsheetId?.trim()) {
      throw new CalendarError('Spreadsheet ID is required', MCPErrorCode.ValidationError);
    }

    if (!params.updates || !Array.isArray(params.updates) || params.updates.length === 0) {
      throw new CalendarError('At least one update is required', MCPErrorCode.ValidationError);
    }

    if (params.updates.length > 100) {
      throw new CalendarError('Cannot update more than 100 ranges at once', MCPErrorCode.ValidationError);
    }

    // Validate each update request
    for (let i = 0; i < params.updates.length; i++) {
      const update = params.updates[i];
      
      if (!update.range?.trim()) {
        throw new CalendarError(`Update ${i}: Range is required`, MCPErrorCode.ValidationError);
      }

      // Basic A1 notation validation
      if (!/^[A-Z]+[0-9]+:[A-Z]+[0-9]+$|^[A-Z]+[0-9]+$/.test(update.range.trim())) {
        throw new CalendarError(`Update ${i}: Invalid range format. Use A1 notation (e.g., A1:B2)`, MCPErrorCode.ValidationError);
      }

      if (!update.values || !Array.isArray(update.values)) {
        throw new CalendarError(`Update ${i}: Values must be a 2D array`, MCPErrorCode.ValidationError);
      }

      if (update.values.length === 0) {
        throw new CalendarError(`Update ${i}: Values cannot be empty`, MCPErrorCode.ValidationError);
      }

      // Validate each row
      for (let j = 0; j < update.values.length; j++) {
        const row = update.values[j];
        if (!Array.isArray(row)) {
          throw new CalendarError(`Update ${i}, row ${j}: Each row must be an array`, MCPErrorCode.ValidationError);
        }
      }
    }

    // Validate value input option
    if (params.valueInputOption && !['RAW', 'USER_ENTERED'].includes(params.valueInputOption)) {
      throw new CalendarError('Value input option must be either RAW or USER_ENTERED', MCPErrorCode.ValidationError);
    }
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
   * Validate parameters for formatting cells
   * @param params - Parameters to validate
   * @throws {CalendarError} If validation fails
   */
  private validateFormatCellsParams(params: SheetsFormatParams): void {
    if (!params.spreadsheetId?.trim()) {
      throw new CalendarError('Spreadsheet ID is required', MCPErrorCode.ValidationError);
    }

    if (!params.range?.trim()) {
      throw new CalendarError('Range is required', MCPErrorCode.ValidationError);
    }

    // Validate range format
    const range = params.range.trim();
    if (!/^[A-Z]+[0-9]*:[A-Z]+[0-9]*$|^[A-Z]+[0-9]+$/.test(range)) {
      throw new CalendarError(
        'Invalid range format. Use A1 notation (e.g., A1:B2, A1:Z100)',
        MCPErrorCode.ValidationError
      );
    }

    // Validate hex colors if provided
    if (params.backgroundColor && !this.isValidHexColor(params.backgroundColor)) {
      throw new CalendarError('Background color must be a valid hex color (e.g., #FF0000)', MCPErrorCode.ValidationError);
    }

    if (params.fontColor && !this.isValidHexColor(params.fontColor)) {
      throw new CalendarError('Font color must be a valid hex color (e.g., #000000)', MCPErrorCode.ValidationError);
    }

    // Validate font size
    if (params.fontSize && (params.fontSize < 6 || params.fontSize > 400)) {
      throw new CalendarError('Font size must be between 6 and 400', MCPErrorCode.ValidationError);
    }

    // Validate sort column
    if (params.sortBy && (params.sortBy.column < 0 || params.sortBy.column > 25)) {
      throw new CalendarError('Sort column must be between 0 and 25 (A-Z)', MCPErrorCode.ValidationError);
    }

    // Validate freeze counts
    if (params.freezeRows && (params.freezeRows < 0 || params.freezeRows > 100)) {
      throw new CalendarError('Freeze rows must be between 0 and 100', MCPErrorCode.ValidationError);
    }

    if (params.freezeColumns && (params.freezeColumns < 0 || params.freezeColumns > 26)) {
      throw new CalendarError('Freeze columns must be between 0 and 26', MCPErrorCode.ValidationError);
    }

    // Validate conditional formatting
    if (params.conditionalFormat) {
      if (!params.conditionalFormat.backgroundColor || !this.isValidHexColor(params.conditionalFormat.backgroundColor)) {
        throw new CalendarError('Conditional format background color must be a valid hex color', MCPErrorCode.ValidationError);
      }
    }
  }

  /**
   * Get sheet ID from a range string
   * @param spreadsheetId - The spreadsheet ID
   * @param range - The range string (may include sheet name)
   * @returns Promise resolving to the sheet ID
   */
  private async getSheetIdFromRange(spreadsheetId: string, range: string): Promise<number> {
    try {
      const sheets = await this.ensureInitialized();
      
      // Check if range includes sheet name (e.g., "Sheet1!A1:B2")
      let sheetName = 'Sheet1'; // Default
      if (range.includes('!')) {
        sheetName = range.split('!')[0];
      }

      // Get spreadsheet metadata to find sheet ID
      const response = await sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'sheets.properties'
      });

      if (!response.data?.sheets) {
        throw new Error('No sheets found in spreadsheet');
      }

      // Find the sheet by name
      const sheet = response.data.sheets.find(s => s.properties?.title === sheetName);
      if (!sheet?.properties?.sheetId) {
        throw new Error(`Sheet "${sheetName}" not found`);
      }

      return sheet.properties.sheetId;
    } catch (error) {
      throw new CalendarError(`Failed to get sheet ID: ${error instanceof Error ? error.message : 'Unknown error'}`, MCPErrorCode.APIError);
    }
  }

  /**
   * Parse A1 notation range to GridRange object
   * @param range - A1 notation range (e.g., "A1:B2" or "Sheet1!A1:B2")
   * @param sheetId - The sheet ID
   * @returns GridRange object
   */
  private parseRangeToGridRange(range: string, sheetId: number): sheets_v4.Schema$GridRange {
    // Remove sheet name if present
    const rangeOnly = range.includes('!') ? range.split('!')[1] : range;
    
    // Parse range like "A1:B2" or "A1"
    const parts = rangeOnly.split(':');
    const startCell = parts[0];
    const endCell = parts[1] || startCell;

    // Parse start cell
    const startMatch = startCell.match(/^([A-Z]+)([0-9]+)$/);
    if (!startMatch) {
      throw new CalendarError('Invalid range format', MCPErrorCode.ValidationError);
    }

    const startCol = this.columnLettersToIndex(startMatch[1]);
    const startRow = parseInt(startMatch[2]) - 1; // Convert to 0-based

    // Parse end cell
    const endMatch = endCell.match(/^([A-Z]+)([0-9]+)$/);
    if (!endMatch) {
      throw new CalendarError('Invalid range format', MCPErrorCode.ValidationError);
    }

    const endCol = this.columnLettersToIndex(endMatch[1]) + 1; // End is exclusive
    const endRow = parseInt(endMatch[2]); // End is exclusive, so no -1

    return {
      sheetId,
      startRowIndex: startRow,
      endRowIndex: endRow,
      startColumnIndex: startCol,
      endColumnIndex: endCol
    };
  }

  /**
   * Convert column letters to index (A=0, B=1, etc.)
   * @param letters - Column letters (e.g., "A", "AB")
   * @returns Column index
   */
  private columnLettersToIndex(letters: string): number {
    let result = 0;
    for (let i = 0; i < letters.length; i++) {
      result = result * 26 + (letters.charCodeAt(i) - 65 + 1);
    }
    return result - 1; // Convert to 0-based
  }

  /**
   * Convert hex color to Google Sheets Color object
   * @param hex - Hex color string (e.g., "#FF0000")
   * @returns Color object
   */
  private hexToColor(hex: string): sheets_v4.Schema$Color {
    // Remove # if present
    const cleanHex = hex.replace('#', '');
    
    // Parse RGB values
    const r = parseInt(cleanHex.substr(0, 2), 16) / 255;
    const g = parseInt(cleanHex.substr(2, 2), 16) / 255;
    const b = parseInt(cleanHex.substr(4, 2), 16) / 255;

    return { red: r, green: g, blue: b };
  }

  /**
   * Build number format object
   * @param format - Number format parameters
   * @returns NumberFormat object
   */
  private buildNumberFormat(format: { type: string; decimalPlaces?: number }): sheets_v4.Schema$NumberFormat {
    const decimalPlaces = format.decimalPlaces ?? 2;

    switch (format.type) {
      case 'CURRENCY':
        return {
          type: 'CURRENCY',
          pattern: `$#,##0.${'0'.repeat(decimalPlaces)}`
        };
      case 'PERCENT':
        return {
          type: 'PERCENT',
          pattern: `0.${'0'.repeat(decimalPlaces)}%`
        };
      case 'DATE':
        return {
          type: 'DATE',
          pattern: 'M/d/yyyy'
        };
      case 'NUMBER':
        return {
          type: 'NUMBER',
          pattern: `#,##0.${'0'.repeat(decimalPlaces)}`
        };
      default:
        throw new CalendarError(`Unsupported number format type: ${format.type}`, MCPErrorCode.ValidationError);
    }
  }

  /**
   * Build conditional format rule
   * @param condition - Conditional format parameters
   * @param range - Grid range to apply to
   * @returns ConditionalFormatRule object
   */
  private buildConditionalFormatRule(
    condition: { condition: string; value: number; value2?: number; backgroundColor: string },
    range: sheets_v4.Schema$GridRange
  ): sheets_v4.Schema$ConditionalFormatRule {
    let booleanRule: sheets_v4.Schema$BooleanRule;

    switch (condition.condition) {
      case 'GREATER_THAN':
        booleanRule = {
          condition: { type: 'NUMBER_GREATER', values: [{ userEnteredValue: condition.value.toString() }] },
          format: { backgroundColor: this.hexToColor(condition.backgroundColor) }
        };
        break;
      case 'LESS_THAN':
        booleanRule = {
          condition: { type: 'NUMBER_LESS', values: [{ userEnteredValue: condition.value.toString() }] },
          format: { backgroundColor: this.hexToColor(condition.backgroundColor) }
        };
        break;
      case 'EQUAL':
        booleanRule = {
          condition: { type: 'NUMBER_EQ', values: [{ userEnteredValue: condition.value.toString() }] },
          format: { backgroundColor: this.hexToColor(condition.backgroundColor) }
        };
        break;
      case 'BETWEEN':
        if (condition.value2 === undefined) {
          throw new CalendarError('value2 is required for BETWEEN condition', MCPErrorCode.ValidationError);
        }
        booleanRule = {
          condition: { 
            type: 'NUMBER_BETWEEN', 
            values: [
              { userEnteredValue: condition.value.toString() },
              { userEnteredValue: condition.value2.toString() }
            ]
          },
          format: { backgroundColor: this.hexToColor(condition.backgroundColor) }
        };
        break;
      default:
        throw new CalendarError(`Unsupported condition type: ${condition.condition}`, MCPErrorCode.ValidationError);
    }

    return {
      ranges: [range],
      booleanRule
    };
  }

  /**
   * Validate hex color format
   * @param color - Color string to validate
   * @returns True if valid hex color
   */
  private isValidHexColor(color: string): boolean {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
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
