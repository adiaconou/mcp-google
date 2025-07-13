/**
 * Unit tests for sheets_create_spreadsheet tool
 */

import { createSpreadsheet } from '../../src/services/sheets/tools/createSpreadsheet';
import { sheetsClient } from '../../src/services/sheets/sheetsClient';
import { CalendarError, MCPErrorCode } from '../../src/types/mcp';

// Mock the sheets client
jest.mock('../../src/services/sheets/sheetsClient');
const mockSheetsClient = sheetsClient as jest.Mocked<typeof sheetsClient>;

describe('createSpreadsheet tool', () => {
  let mockCreateSpreadsheet: jest.MockedFunction<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock function
    mockCreateSpreadsheet = jest.fn();
    
    // Mock the client instance
    (mockSheetsClient as any).instance = {
      createSpreadsheet: mockCreateSpreadsheet,
    };
  });

  it('should create a spreadsheet with basic parameters', async () => {
    const mockSpreadsheet = {
      spreadsheetId: 'test-id',
      title: 'Test Spreadsheet',
      url: 'https://docs.google.com/spreadsheets/d/test-id',
      sheets: [
        {
          sheetId: 0,
          title: 'Sheet1',
          index: 0,
          sheetType: 'GRID',
          gridProperties: {
            rowCount: 1000,
            columnCount: 26,
          },
        },
      ],
    };

    mockCreateSpreadsheet.mockResolvedValue(mockSpreadsheet);

    const result = await createSpreadsheet({
      title: 'Test Spreadsheet',
    });

    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('Successfully created spreadsheet "Test Spreadsheet" with ID: test-id');
    expect(result.content[0].text).toContain('📊 **Spreadsheet Details:**');
    expect(result.content[0].text).toContain('- **ID:** test-id');
    expect(result.content[0].text).toContain('- **Title:** Test Spreadsheet');
    expect(result.content[0].text).toContain('- **URL:** https://docs.google.com/spreadsheets/d/test-id');
    expect(result.content[0].text).toContain('• Sheet1 (1000 rows × 26 columns)');
    expect(result.isError).toBe(false);

    expect(mockCreateSpreadsheet).toHaveBeenCalledWith({
      title: 'Test Spreadsheet',
    });
  });

  it('should create a spreadsheet with all optional parameters', async () => {
    const mockSpreadsheet = {
      spreadsheetId: 'test-id',
      title: 'Test Spreadsheet',
      url: 'https://docs.google.com/spreadsheets/d/test-id',
      sheets: [
        {
          sheetId: 0,
          title: 'Sheet1',
          index: 0,
          sheetType: 'GRID',
          gridProperties: {
            rowCount: 1000,
            columnCount: 26,
          },
        },
      ],
    };

    mockCreateSpreadsheet.mockResolvedValue(mockSpreadsheet);

    const initialData = [
      ['Name', 'Age'],
      ['John', '30'],
    ];

    const result = await createSpreadsheet({
      title: 'Test Spreadsheet',
      folderId: 'folder-123',
      initialData,
      shareWithUsers: ['user@example.com'],
    });

    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('Added 2 rows of initial data');
    expect(result.content[0].text).toContain('Moved to specified Drive folder');
    expect(result.content[0].text).toContain('Shared with 1 user(s)');
    expect(result.isError).toBe(false);

    expect(mockCreateSpreadsheet).toHaveBeenCalledWith({
      title: 'Test Spreadsheet',
      folderId: 'folder-123',
      initialData,
      shareWithUsers: ['user@example.com'],
    });
  });

  it('should validate and convert initial data', async () => {
    const mockSpreadsheet = {
      spreadsheetId: 'test-id',
      title: 'Test Spreadsheet',
      url: 'https://docs.google.com/spreadsheets/d/test-id',
      sheets: [],
    };

    mockCreateSpreadsheet.mockResolvedValue(mockSpreadsheet);

    // Test with mixed data types
    const result = await createSpreadsheet({
      title: 'Test Spreadsheet',
      initialData: [
        ['Name', 'Age', 'Active'],
        ['John', 30, true],
        ['Jane', null, false],
      ],
    });

    expect(result.content).toBeDefined();
    expect(result.isError).toBe(false);

    // Verify data was converted to strings
    expect(mockCreateSpreadsheet).toHaveBeenCalledWith({
      title: 'Test Spreadsheet',
      initialData: [
        ['Name', 'Age', 'Active'],
        ['John', '30', 'true'],
        ['Jane', '', 'false'],
      ],
    });
  });

  it('should filter and validate email addresses', async () => {
    const mockSpreadsheet = {
      spreadsheetId: 'test-id',
      title: 'Test Spreadsheet',
      url: 'https://docs.google.com/spreadsheets/d/test-id',
      sheets: [],
    };

    mockCreateSpreadsheet.mockResolvedValue(mockSpreadsheet);

    const result = await createSpreadsheet({
      title: 'Test Spreadsheet',
      shareWithUsers: ['  user@example.com  ', '', 'another@test.com', null],
    });

    expect(result.content).toBeDefined();
    expect(result.isError).toBe(false);

    // Verify emails were filtered and trimmed
    expect(mockCreateSpreadsheet).toHaveBeenCalledWith({
      title: 'Test Spreadsheet',
      shareWithUsers: ['user@example.com', 'another@test.com'],
    });
  });

  it('should validate required title parameter', async () => {
    await expect(createSpreadsheet({})).rejects.toThrow(CalendarError);
    await expect(createSpreadsheet({ title: null })).rejects.toThrow(CalendarError);
    await expect(createSpreadsheet({ title: 123 })).rejects.toThrow(CalendarError);
  });

  it('should validate initial data structure', async () => {
    await expect(
      createSpreadsheet({
        title: 'Test',
        initialData: 'invalid',
      })
    ).rejects.toThrow(CalendarError);

    await expect(
      createSpreadsheet({
        title: 'Test',
        initialData: [['valid'], 'invalid'],
      })
    ).rejects.toThrow(CalendarError);
  });

  it('should handle client errors', async () => {
    mockCreateSpreadsheet.mockRejectedValue(
      new CalendarError('API Error', MCPErrorCode.APIError)
    );

    await expect(
      createSpreadsheet({
        title: 'Test Spreadsheet',
      })
    ).rejects.toThrow(CalendarError);
  });

  it('should handle unknown errors', async () => {
    mockCreateSpreadsheet.mockRejectedValue(
      new Error('Unknown error')
    );

    await expect(
      createSpreadsheet({
        title: 'Test Spreadsheet',
      })
    ).rejects.toThrow(CalendarError);
  });

  it('should trim whitespace from string parameters', async () => {
    const mockSpreadsheet = {
      spreadsheetId: 'test-id',
      title: 'Test Spreadsheet',
      url: 'https://docs.google.com/spreadsheets/d/test-id',
      sheets: [],
    };

    mockCreateSpreadsheet.mockResolvedValue(mockSpreadsheet);

    await createSpreadsheet({
      title: '  Test Spreadsheet  ',
      folderId: '  folder-123  ',
    });

    expect(mockCreateSpreadsheet).toHaveBeenCalledWith({
      title: 'Test Spreadsheet',
      folderId: 'folder-123',
    });
  });

  it('should handle spreadsheets with no grid properties', async () => {
    const mockSpreadsheet = {
      spreadsheetId: 'test-id',
      title: 'Test Spreadsheet',
      url: 'https://docs.google.com/spreadsheets/d/test-id',
      sheets: [
        {
          sheetId: 0,
          title: 'Sheet1',
          index: 0,
          sheetType: 'GRID',
          gridProperties: undefined,
        },
      ],
    };

    mockCreateSpreadsheet.mockResolvedValue(mockSpreadsheet);

    const result = await createSpreadsheet({
      title: 'Test Spreadsheet',
    });

    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('• Sheet1 (Unknown rows × Unknown columns)');
    expect(result.isError).toBe(false);
  });
});
