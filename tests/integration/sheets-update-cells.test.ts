/**
 * Integration tests for Sheets Update Cells functionality
 */

import { sheetsClient } from '../../src/services/sheets/sheetsClient';
import { updateCells } from '../../src/services/sheets/tools/updateCells';
import { createSpreadsheet } from '../../src/services/sheets/tools/createSpreadsheet';
import { oauthManager } from '../../src/auth/oauthManager';

describe('Sheets Update Cells Integration', () => {
  let testSpreadsheetId: string;

  beforeAll(async () => {
    // Ensure authentication
    const isAuth = await oauthManager.instance.isAuthenticated();
    if (!isAuth) {
      console.log('Skipping integration tests - not authenticated');
      return;
    }

    // Create a test spreadsheet for integration tests
    try {
      const result = await createSpreadsheet({
        title: `Test Spreadsheet - Update Cells - ${Date.now()}`
      });
      
      // Extract spreadsheet ID from the response
      const idMatch = result.content[0].text.match(/ID:\*\* ([a-zA-Z0-9-_]+)/);
      if (idMatch) {
        testSpreadsheetId = idMatch[1];
        console.log(`Created test spreadsheet: ${testSpreadsheetId}`);
      } else {
        throw new Error('Could not extract spreadsheet ID from response');
      }
    } catch (error) {
      console.error('Failed to create test spreadsheet:', error);
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    // Clean up test spreadsheet
    if (testSpreadsheetId) {
      try {
        // Note: We don't have a delete spreadsheet tool yet, so we'll leave it
        // In a real implementation, you might want to delete test spreadsheets
        console.log(`Test spreadsheet ${testSpreadsheetId} left for manual cleanup`);
      } catch (error) {
        console.error('Failed to clean up test spreadsheet:', error);
      }
    }
  });

  beforeEach(async () => {
    const isAuth = await oauthManager.instance.isAuthenticated();
    if (!isAuth) {
      console.log('Skipping test - not authenticated');
      return;
    }
  });

  it('should update cells with basic data', async () => {
    const isAuth = await oauthManager.instance.isAuthenticated();
    if (!isAuth || !testSpreadsheetId) {
      console.log('Skipping test - not authenticated or no test spreadsheet');
      return;
    }

    const result = await updateCells({
      spreadsheetId: testSpreadsheetId,
      updates: [{
        range: 'A1:B2',
        values: [
          ['Name', 'Age'],
          ['John Doe', 30]
        ]
      }]
    });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Successfully updated 4 cells in 1 range(s)');
    expect(result.content[0].text).toContain('A1:B2 - 4 cells');
  }, 15000);

  it('should update multiple ranges', async () => {
    const isAuth = await oauthManager.instance.isAuthenticated();
    if (!isAuth || !testSpreadsheetId) {
      console.log('Skipping test - not authenticated or no test spreadsheet');
      return;
    }

    const result = await updateCells({
      spreadsheetId: testSpreadsheetId,
      updates: [
        {
          range: 'A4:B5',
          values: [
            ['Product', 'Price'],
            ['Widget', 19.99]
          ]
        },
        {
          range: 'D1:D3',
          values: [
            ['Status'],
            ['Active'],
            ['Pending']
          ]
        }
      ]
    });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Successfully updated 7 cells in 2 range(s)');
    expect(result.content[0].text).toContain('A4:B5 - 4 cells');
    expect(result.content[0].text).toContain('D1:D3 - 3 cells');
  }, 15000);

  it('should handle different data types', async () => {
    const isAuth = await oauthManager.instance.isAuthenticated();
    if (!isAuth || !testSpreadsheetId) {
      console.log('Skipping test - not authenticated or no test spreadsheet');
      return;
    }

    const result = await updateCells({
      spreadsheetId: testSpreadsheetId,
      updates: [{
        range: 'A7:E7',
        values: [['Text', 42, true, 3.14, '2023-01-01']]
      }]
    });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Successfully updated 5 cells in 1 range(s)');
  }, 15000);

  it('should handle formulas with USER_ENTERED option', async () => {
    const isAuth = await oauthManager.instance.isAuthenticated();
    if (!isAuth || !testSpreadsheetId) {
      console.log('Skipping test - not authenticated or no test spreadsheet');
      return;
    }

    const result = await updateCells({
      spreadsheetId: testSpreadsheetId,
      updates: [{
        range: 'A9:C9',
        values: [['=SUM(1,2,3)', '=NOW()', '=CONCATENATE("Hello", " ", "World")']]
      }],
      valueInputOption: 'USER_ENTERED'
    });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Successfully updated 3 cells in 1 range(s)');
    expect(result.content[0].text).toContain('Value Input Option:** USER_ENTERED');
  }, 15000);

  it('should handle formulas with RAW option', async () => {
    const isAuth = await oauthManager.instance.isAuthenticated();
    if (!isAuth || !testSpreadsheetId) {
      console.log('Skipping test - not authenticated or no test spreadsheet');
      return;
    }

    const result = await updateCells({
      spreadsheetId: testSpreadsheetId,
      updates: [{
        range: 'A11:B11',
        values: [['=SUM(1,2,3)', 'This is literal text']]
      }],
      valueInputOption: 'RAW'
    });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Successfully updated 2 cells in 1 range(s)');
    expect(result.content[0].text).toContain('Value Input Option:** RAW');
  }, 15000);

  it('should handle single cell updates', async () => {
    const isAuth = await oauthManager.instance.isAuthenticated();
    if (!isAuth || !testSpreadsheetId) {
      console.log('Skipping test - not authenticated or no test spreadsheet');
      return;
    }

    const result = await updateCells({
      spreadsheetId: testSpreadsheetId,
      updates: [{
        range: 'F1',
        values: [['Single Cell Value']]
      }]
    });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Successfully updated 1 cells in 1 range(s)');
  }, 15000);

  it('should handle error for invalid spreadsheet ID', async () => {
    const isAuth = await oauthManager.instance.isAuthenticated();
    if (!isAuth) {
      console.log('Skipping test - not authenticated');
      return;
    }

    await expect(updateCells({
      spreadsheetId: 'invalid-spreadsheet-id',
      updates: [{
        range: 'A1',
        values: [['test']]
      }]
    })).rejects.toThrow();
  }, 15000);

  it('should handle error for invalid range', async () => {
    const isAuth = await oauthManager.instance.isAuthenticated();
    if (!isAuth || !testSpreadsheetId) {
      console.log('Skipping test - not authenticated or no test spreadsheet');
      return;
    }

    await expect(updateCells({
      spreadsheetId: testSpreadsheetId,
      updates: [{
        range: 'INVALID_RANGE',
        values: [['test']]
      }]
    })).rejects.toThrow();
  }, 15000);

  it('should handle large data updates', async () => {
    const isAuth = await oauthManager.instance.isAuthenticated();
    if (!isAuth || !testSpreadsheetId) {
      console.log('Skipping test - not authenticated or no test spreadsheet');
      return;
    }

    // Create a 10x10 grid of data
    const largeData: string[][] = [];
    for (let i = 0; i < 10; i++) {
      const row: string[] = [];
      for (let j = 0; j < 10; j++) {
        row.push(`Cell ${i + 1},${j + 1}`);
      }
      largeData.push(row);
    }

    const result = await updateCells({
      spreadsheetId: testSpreadsheetId,
      updates: [{
        range: 'A15:J24',
        values: largeData
      }]
    });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Successfully updated 100 cells in 1 range(s)');
  }, 20000);
});
