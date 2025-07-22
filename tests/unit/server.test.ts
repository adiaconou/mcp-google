/**
 * Basic tests for Google MCP Server
 * 
 * These tests verify the basic functionality of the server setup.
 * More comprehensive tests will be added in subsequent phases.
 */

import { GoogleMCPServer } from '../../src/server';
import { toolRegistry } from '../../src/utils/toolRegistry';

describe('GoogleMCPServer', () => {
  let server: GoogleMCPServer;

  beforeEach(() => {
    // Clear the tool registry before each test to avoid duplicate registration
    toolRegistry.clear();
    server = new GoogleMCPServer();
  });

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
  });

  test('should initialize successfully', () => {
    expect(server).toBeInstanceOf(GoogleMCPServer);
  });

  test('should have correct status after initialization', () => {
    const status = server.getStatus();
    expect(status.running).toBe(true);
    expect(status.toolCount).toBe(17); // 2 Calendar + 4 Gmail + 5 Drive + 6 Sheets = 17 tools
    expect(status.tools).toContain('calendar_list_events');
    expect(status.tools).toContain('calendar_create_event');
    expect(status.tools).toContain('gmail_list_messages');
    expect(status.tools).toContain('gmail_get_message');
    expect(status.tools).toContain('gmail_download_attachment');
    expect(status.tools).toContain('gmail_export_email_screenshot');
    expect(status.tools).toContain('drive_list_files');
    expect(status.tools).toContain('drive_get_file');
    expect(status.tools).toContain('drive_upload_file');
    expect(status.tools).toContain('drive_create_folder');
    expect(status.tools).toContain('drive_move_file');
    expect(status.tools).toContain('sheets_create_spreadsheet');
    expect(status.tools).toContain('sheets_get_data');
    expect(status.tools).toContain('sheets_update_cells');
    expect(status.tools).toContain('sheets_format_cells');
    expect(status.tools).toContain('sheets_calculate');
    expect(status.tools).toContain('sheets_create_chart');
  });

  test('should register calendar tools correctly', () => {
    const status = server.getStatus();
    expect(status.tools).toEqual(
      expect.arrayContaining(['calendar_list_events', 'calendar_create_event'])
    );
  });
});
