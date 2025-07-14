/**
 * Integration tests for Sheets Format Cells functionality
 * 
 * These tests verify the formatCells tool works end-to-end with the Google Sheets API.
 * They require valid authentication and test against real Google Sheets.
 */

import { formatCells } from '../../src/services/sheets/tools/formatCells';
import { createSpreadsheet } from '../../src/services/sheets/tools/createSpreadsheet';
import { updateCells } from '../../src/services/sheets/tools/updateCells';
import { oauthManager } from '../../src/auth/oauthManager';

describe('Sheets Format Cells Integration', () => {
  let testSpreadsheetId: string;

  beforeAll(async () => {
    // Ensure authentication
    const isAuth = await oauthManager.instance.isAuthenticated();
    if (!isAuth) {
      console.log('Authentication required for integration tests');
      await oauthManager.instance.authenticate();
    }

    // Create a test spreadsheet
    const createResult = await createSpreadsheet({
      title: `Format Cells Test ${Date.now()}`,
      sheets: [{
        title: 'Test Data',
        rowCount: 20,
        columnCount: 10
      }]
    });

    if (createResult.isError) {
      throw new Error('Failed to create test spreadsheet');
    }

    // Extract spreadsheet ID from the response
    const match = createResult.content[0].text.match(/Spreadsheet ID: ([a-zA-Z0-9-_]+)/);
    if (!match) {
      throw new Error('Could not extract spreadsheet ID from response');
    }
    testSpreadsheetId = match[1];

    // Add some test data
    await updateCells({
      spreadsheetId: testSpreadsheetId,
      updates: [{
        range: 'A1:D5',
        values: [
          ['Name', 'Score', 'Grade', 'Status'],
          ['Alice', 95, 'A', 'Pass'],
          ['Bob', 87, 'B', 'Pass'],
          ['Charlie', 72, 'C', 'Pass'],
          ['David', 45, 'F', 'Fail']
        ]
      }]
    });
  });

  afterAll(async () => {
    // Clean up: delete the test spreadsheet
    if (testSpreadsheetId) {
      try {
        // Note: We don't have a delete spreadsheet tool, so we'll leave it
        // In a real scenario, you might want to move it to trash via Drive API
        console.log(`Test spreadsheet created: ${testSpreadsheetId}`);
      } catch (error) {
        console.warn('Failed to clean up test spreadsheet:', error);
      }
    }
  });

  describe('Basic Formatting', () => {
    it('should apply basic cell styling', async () => {
      const result = await formatCells({
        spreadsheetId: testSpreadsheetId,
        range: 'A1:D1',
        backgroundColor: '#4285F4',
        fontColor: '#FFFFFF',
        bold: true,
        fontSize: 12,
        textAlignment: 'CENTER'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Successfully applied');
      expect(result.content[0].text).toContain('formatting operation(s)');
    });

    it('should apply number formatting', async () => {
      const result = await formatCells({
        spreadsheetId: testSpreadsheetId,
        range: 'B2:B5',
        numberFormat: {
          type: 'NUMBER',
          decimalPlaces: 1
        }
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Successfully applied');
    });
  });

  describe('Conditional Formatting', () => {
    it('should apply conditional formatting for scores > 90', async () => {
      const result = await formatCells({
        spreadsheetId: testSpreadsheetId,
        range: 'B2:B5',
        conditionalFormat: {
          condition: 'GREATER_THAN',
          value: 90,
          backgroundColor: '#00FF00'
        }
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Successfully applied');
    });

    it('should apply conditional formatting for scores between 70-89', async () => {
      const result = await formatCells({
        spreadsheetId: testSpreadsheetId,
        range: 'B2:B5',
        conditionalFormat: {
          condition: 'BETWEEN',
          value: 70,
          value2: 89,
          backgroundColor: '#FFFF00'
        }
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Successfully applied');
    });
  });

  describe('Data Organization', () => {
    it('should add filters and freeze header row', async () => {
      const result = await formatCells({
        spreadsheetId: testSpreadsheetId,
        range: 'A1:D5',
        addFilter: true,
        freezeRows: 1
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Successfully applied');
    });

    it('should sort data by score descending', async () => {
      const result = await formatCells({
        spreadsheetId: testSpreadsheetId,
        range: 'A1:D5',
        sortBy: {
          column: 1, // Score column (0-based)
          ascending: false
        }
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Successfully applied');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle invalid spreadsheet ID', async () => {
      await expect(formatCells({
        spreadsheetId: 'invalid-id',
        range: 'A1:B2',
        bold: true
      })).rejects.toThrow();
    });

    it('should handle invalid range', async () => {
      await expect(formatCells({
        spreadsheetId: testSpreadsheetId,
        range: 'INVALID:RANGE',
        bold: true
      })).rejects.toThrow();
    });
  });
});
