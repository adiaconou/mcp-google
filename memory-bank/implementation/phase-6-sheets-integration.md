# Phase 6: Sheets API Integration

## Overview
Add comprehensive Google Sheets functionality to the MCP server, completing the core Google Workspace suite integration. This phase delivers essential spreadsheet manipulation tools that enable AI agents to create, read, and modify Google Sheets with data analysis, formatting, and calculation capabilities.

## Human Prerequisites
Before starting Phase 6 implementation, the user must complete these setup tasks:

### 1. Enable Google Sheets API
- Go to Google Cloud Console (same project from previous phases)
- Navigate to "APIs & Services" > "Library"
- Search for and enable "Google Sheets API"
- Verify the API is enabled in the project

### 2. Update OAuth Scopes
- No additional OAuth credential changes needed
- The existing OAuth setup will be extended to request Sheets scopes
- User will need to re-authorize to grant Sheets permissions during first use

### 3. Test Google Sheets Account
- Ensure the Google account has Google Sheets access
- Create a test spreadsheet for testing read functionality
- Add some sample data with various data types (text, numbers, dates)
- Note any important spreadsheets to avoid during testing

### 4. Optional: Prepare Test Data
- Prepare sample CSV data for import testing
- Create test data with various formats (numbers, dates, formulas)
- Consider different spreadsheet structures (headers, multiple sheets)

## Objectives
- Extend OAuth manager to include Google Sheets scopes
- Create Sheets API client with spreadsheet manipulation capabilities
- Implement core Sheets tools: create, read, and edit spreadsheets
- Add data analysis and calculation features
- Support formatting, charts, and advanced spreadsheet functions
- Complete the Google Workspace API integration suite

## Implementation Steps
1. ☐ Extend OAuth manager to support Sheets scopes
2. ☐ Create Sheets API client with authentication integration
3. ☐ Implement spreadsheet data parsing and formatting utilities
4. ☐ Create `sheets_create_spreadsheet` tool for spreadsheet creation
5. ☐ Implement `sheets_get_data` tool for reading spreadsheet data
6. ☐ Create `sheets_update_cells` tool for data modification
7. ☐ Implement `sheets_format_cells` tool for formatting operations
8. ☐ Add `sheets_create_chart` tool for data visualization
9. ☐ Create `sheets_manage_sheets` tool for worksheet management
10. ☐ Implement `sheets_calculate` tool for formula operations
11. ☐ Register Sheets tools with the MCP server
12. ☐ Create comprehensive error handling for Sheets operations
13. ☐ Add integration tests for Sheets functionality
14. ☐ Test Sheets tools with Claude Desktop

## Implementation Plan

### Step 1: Extend OAuth Manager for Sheets
**Files**: `src/auth/oauthManager.ts` (enhancement)
- Add Sheets scopes to OAuth configuration:
  - `https://www.googleapis.com/auth/spreadsheets` (for full spreadsheet access)
  - `https://www.googleapis.com/auth/spreadsheets.readonly` (for reading spreadsheets)
- Update scope management for Sheets-specific operations
- Add scope validation for spreadsheet access permissions
- Implement incremental authorization for Sheets scopes

### Step 2: Create Sheets API Client
**Files**: `src/services/sheets/sheetsClient.ts`
- Create SheetsClient class extending base API patterns
- Add authentication integration with OAuth manager
- Implement spreadsheet creation with template support
- Add data reading with range and filtering support
- Create batch update operations for efficient data manipulation
- Add formatting and chart creation capabilities
- Include comprehensive error handling and retry logic

### Step 3: Implement Spreadsheet Data Utilities
**Files**: `src/services/sheets/dataUtils.ts`
- Create utilities for parsing spreadsheet data and ranges
- Add data type detection and conversion utilities
- Implement formula parsing and validation
- Create data formatting and validation utilities
- Add chart data preparation and analysis
- Handle various data formats and cell types

### Step 4: Create Sheets Create Spreadsheet Tool
**Files**: `src/services/sheets/tools/createSpreadsheet.ts`
- Implement `sheets_create_spreadsheet` MCP tool
- Add spreadsheet title and initial data support
- Support template-based spreadsheet creation
- Include folder destination and sharing options
- Add spreadsheet properties and metadata setting
- Return created spreadsheet information and access links

**Tool Schema**:
```typescript
{
  name: "sheets_create_spreadsheet",
  description: "Create a new Google Sheets spreadsheet",
  inputSchema: {
    type: "object",
    required: ["title"],
    properties: {
      title: { type: "string" },
      folderId: { type: "string", description: "Parent folder ID in Drive" },
      templateId: { type: "string", description: "Template spreadsheet ID to copy" },
      initialData: {
        type: "array",
        items: {
          type: "array",
          items: { type: "string" }
        },
        description: "Initial data as 2D array"
      },
      sheetNames: {
        type: "array",
        items: { type: "string" },
        description: "Names for initial sheets"
      },
      shareWithUsers: { 
        type: "array", 
        items: { type: "string", format: "email" },
        description: "Email addresses to share with"
      }
    }
  }
}
```

### Step 5: Implement Sheets Get Data Tool
**Files**: `src/services/sheets/tools/getData.ts`
- Create `sheets_get_data` MCP tool
- Add spreadsheet ID and range validation
- Support various data formats (values, formulas, formatted)
- Extract data with type preservation
- Include metadata and formatting information
- Support multiple sheet and range queries

**Tool Schema**:
```typescript
{
  name: "sheets_get_data",
  description: "Get data from Google Sheets spreadsheet",
  inputSchema: {
    type: "object",
    required: ["spreadsheetId"],
    properties: {
      spreadsheetId: { type: "string" },
      range: { type: "string", default: "A1:Z1000", description: "A1 notation range" },
      sheetName: { type: "string", description: "Specific sheet name" },
      valueRenderOption: { 
        type: "string", 
        enum: ["FORMATTED_VALUE", "UNFORMATTED_VALUE", "FORMULA"],
        default: "FORMATTED_VALUE"
      },
      dateTimeRenderOption: { 
        type: "string", 
        enum: ["SERIAL_NUMBER", "FORMATTED_STRING"],
        default: "FORMATTED_STRING"
      },
      includeGridData: { type: "boolean", default: false },
      includeMetadata: { type: "boolean", default: true }
    }
  }
}
```

### Step 6: Create Sheets Update Cells Tool
**Files**: `src/services/sheets/tools/updateCells.ts`
- Implement `sheets_update_cells` MCP tool
- Add data validation and type conversion
- Support various update modes (overwrite, append, insert)
- Include formula and calculation updates
- Add batch operations for efficiency
- Support range-based and cell-specific updates

**Tool Schema**:
```typescript
{
  name: "sheets_update_cells",
  description: "Update cells in Google Sheets spreadsheet",
  inputSchema: {
    type: "object",
    required: ["spreadsheetId", "updates"],
    properties: {
      spreadsheetId: { type: "string" },
      updates: {
        type: "array",
        items: {
          type: "object",
          required: ["range", "values"],
          properties: {
            range: { type: "string", description: "A1 notation range" },
            values: {
              type: "array",
              items: {
                type: "array",
                items: { type: ["string", "number", "boolean"] }
              }
            },
            majorDimension: { 
              type: "string", 
              enum: ["ROWS", "COLUMNS"],
              default: "ROWS"
            }
          }
        }
      },
      valueInputOption: { 
        type: "string", 
        enum: ["RAW", "USER_ENTERED"],
        default: "USER_ENTERED"
      },
      includeValuesInResponse: { type: "boolean", default: false }
    }
  }
}
```

### Step 7: Implement Sheets Format Cells Tool
**Files**: `src/services/sheets/tools/formatCells.ts`
- Create `sheets_format_cells` MCP tool
- Add cell formatting (fonts, colors, borders)
- Support number formatting and data validation
- Include conditional formatting rules
- Add row and column formatting
- Support format copying and templates

**Tool Schema**:
```typescript
{
  name: "sheets_format_cells",
  description: "Apply formatting to cells in Google Sheets",
  inputSchema: {
    type: "object",
    required: ["spreadsheetId", "range"],
    properties: {
      spreadsheetId: { type: "string" },
      range: { type: "string", description: "A1 notation range" },
      format: {
        type: "object",
        properties: {
          backgroundColor: { type: "string" },
          textFormat: {
            type: "object",
            properties: {
              bold: { type: "boolean" },
              italic: { type: "boolean" },
              fontSize: { type: "number" },
              foregroundColor: { type: "string" },
              fontFamily: { type: "string" }
            }
          },
          numberFormat: {
            type: "object",
            properties: {
              type: { 
                type: "string", 
                enum: ["TEXT", "NUMBER", "PERCENT", "CURRENCY", "DATE", "TIME"] 
              },
              pattern: { type: "string" }
            }
          },
          borders: {
            type: "object",
            properties: {
              top: { type: "object" },
              bottom: { type: "object" },
              left: { type: "object" },
              right: { type: "object" }
            }
          }
        }
      }
    }
  }
}
```

### Step 8: Add Sheets Create Chart Tool
**Files**: `src/services/sheets/tools/createChart.ts`
- Create `sheets_create_chart` MCP tool
- Add chart type selection and configuration
- Support data range selection for charts
- Include chart customization (titles, legends, colors)
- Add chart positioning and sizing
- Support various chart types (line, bar, pie, scatter)

**Tool Schema**:
```typescript
{
  name: "sheets_create_chart",
  description: "Create a chart in Google Sheets spreadsheet",
  inputSchema: {
    type: "object",
    required: ["spreadsheetId", "chartType", "dataRange"],
    properties: {
      spreadsheetId: { type: "string" },
      sheetId: { type: "number", default: 0 },
      chartType: { 
        type: "string", 
        enum: ["LINE", "AREA", "COLUMN", "BAR", "PIE", "SCATTER", "COMBO"] 
      },
      dataRange: { type: "string", description: "A1 notation range for chart data" },
      title: { type: "string" },
      position: {
        type: "object",
        properties: {
          overlayPosition: {
            type: "object",
            properties: {
              anchorCell: { type: "string" },
              offsetXPixels: { type: "number" },
              offsetYPixels: { type: "number" },
              widthPixels: { type: "number" },
              heightPixels: { type: "number" }
            }
          }
        }
      },
      legendPosition: { 
        type: "string", 
        enum: ["BOTTOM_LEGEND", "LEFT_LEGEND", "RIGHT_LEGEND", "TOP_LEGEND", "NO_LEGEND"],
        default: "BOTTOM_LEGEND"
      }
    }
  }
}
```

### Step 9: Create Sheets Manage Sheets Tool
**Files**: `src/services/sheets/tools/manageSheets.ts`
- Implement `sheets_manage_sheets` tool for worksheet management
- Add sheet creation, deletion, and renaming
- Support sheet copying and moving
- Include sheet protection and permissions
- Add sheet formatting and properties
- Support sheet organization and structure

**Tool Schema**:
```typescript
{
  name: "sheets_manage_sheets",
  description: "Manage sheets within Google Sheets spreadsheet",
  inputSchema: {
    type: "object",
    required: ["spreadsheetId", "action"],
    properties: {
      spreadsheetId: { type: "string" },
      action: { 
        type: "string", 
        enum: ["add", "delete", "duplicate", "update", "move"] 
      },
      sheetId: { type: "number" },
      sheetName: { type: "string" },
      newSheetName: { type: "string" },
      index: { type: "number" },
      gridProperties: {
        type: "object",
        properties: {
          rowCount: { type: "number" },
          columnCount: { type: "number" },
          frozenRowCount: { type: "number" },
          frozenColumnCount: { type: "number" }
        }
      }
    }
  }
}
```

### Step 10: Implement Sheets Calculate Tool
**Files**: `src/services/sheets/tools/calculate.ts`
- Create `sheets_calculate` tool for formula operations
- Add formula validation and execution
- Support complex calculations and functions
- Include data analysis and aggregation
- Add formula copying and range operations
- Support custom function creation

**Tool Schema**:
```typescript
{
  name: "sheets_calculate",
  description: "Perform calculations and formula operations in Google Sheets",
  inputSchema: {
    type: "object",
    required: ["spreadsheetId", "operation"],
    properties: {
      spreadsheetId: { type: "string" },
      operation: { 
        type: "string", 
        enum: ["formula", "aggregate", "analyze", "pivot"] 
      },
      range: { type: "string", description: "A1 notation range for operation" },
      formula: { type: "string", description: "Formula to apply" },
      aggregateFunction: { 
        type: "string", 
        enum: ["SUM", "AVERAGE", "COUNT", "MAX", "MIN", "MEDIAN"] 
      },
      outputRange: { type: "string", description: "Where to place results" },
      pivotConfig: {
        type: "object",
        properties: {
          sourceRange: { type: "string" },
          rows: { type: "array", items: { type: "string" } },
          columns: { type: "array", items: { type: "string" } },
          values: { type: "array", items: { type: "string" } }
        }
      }
    }
  }
}
```

### Step 11: Register Sheets Tools with MCP Server
**Files**: `src/server.ts` (Sheets integration)
- Import and register all Sheets tools
- Add Sheets service initialization
- Update tool discovery to include Sheets tools
- Add Sheets-specific error handling
- Include Sheets tools in server capabilities

### Step 12: Create Sheets Error Handling
**Files**: `src/utils/errors.ts` (Sheets errors)
- Add SheetsError class for Sheets-specific errors
- Map Sheets API error codes to user-friendly messages
- Handle spreadsheet access and permission errors
- Add data validation and formula error handling
- Create recovery suggestions for common spreadsheet issues

### Step 13: Add Sheets Integration Tests
**Files**: `tests/integration/sheets.test.ts`
- Test Sheets OAuth scope authorization
- Validate spreadsheet creation and metadata
- Test data reading and range operations
- Verify data updates and formula calculations
- Test formatting and chart creation
- Validate sheet management operations
- Add error scenario testing

### Step 14: Test Sheets Tools with MCP Client
**Manual Testing**:
- Connect with Claude Desktop
- Test Sheets tool discovery
- Create spreadsheets using sheets_create_spreadsheet
- Read data using sheets_get_data
- Update cells using sheets_update_cells
- Test formatting and chart creation tools
- Validate calculation and analysis features

## Success Criteria

### Functional Requirements
- ☐ OAuth flow includes Sheets scopes and completes successfully
- ☐ `sheets_create_spreadsheet` creates spreadsheets with proper structure
- ☐ `sheets_get_data` retrieves and formats spreadsheet data correctly
- ☐ `sheets_update_cells` modifies data while preserving formatting
- ☐ Formatting tools apply styles correctly in Google Sheets
- ☐ Chart creation tools generate visualizations properly

### Technical Requirements
- ☐ Sheets API integration follows established multi-service patterns
- ☐ Data operations handle various data types and formats
- ☐ Error handling provides clear guidance for Sheets-specific issues
- ☐ Performance meets targets for spreadsheet operations
- ☐ Formula calculations execute correctly and efficiently

### User Experience Requirements
- ☐ Spreadsheet data displays in organized, readable format
- ☐ Data updates reflect immediately in Google Sheets interface
- ☐ Chart creation provides meaningful visualizations
- ☐ Error messages guide users to solutions
- ☐ Tools respond within reasonable time limits

## Key Files Created

### Sheets Service Implementation
```
src/services/sheets/
├── sheetsClient.ts           # Sheets API wrapper
├── dataUtils.ts              # Data parsing and utilities
└── tools/
    ├── createSpreadsheet.ts  # Create spreadsheet tool
    ├── getData.ts            # Get spreadsheet data tool
    ├── updateCells.ts        # Update cells tool
    ├── formatCells.ts        # Cell formatting tool
    ├── createChart.ts        # Chart creation tool
    ├── manageSheets.ts       # Sheet management tool
    └── calculate.ts          # Formula and calculation tool
```

### Enhanced Core Files
```
src/auth/
└── oauthManager.ts           # Extended with Sheets scopes

src/utils/
└── errors.ts                 # Enhanced with Sheets errors

tests/integration/
└── sheets.test.ts            # Sheets integration tests
```

## Sheets Tools Summary

### Spreadsheet Management Tools
- **`sheets_create_spreadsheet`**: Create new spreadsheets with templates and data
- **`sheets_get_data`**: Read spreadsheet data with various formats
- **`sheets_update_cells`**: Update cell data with batch operations
- **`sheets_manage_sheets`**: Manage worksheets within spreadsheets

### Data Analysis and Visualization Tools
- **`sheets_format_cells`**: Apply formatting to cells and ranges
- **`sheets_create_chart`**: Create charts and data visualizations
- **`sheets_calculate`**: Perform calculations and formula operations

## Performance Targets

### Response Time Requirements
- Spreadsheet creation: < 3 seconds
- Data reading (< 1000 cells): < 2 seconds
- Data updates (< 100 cells): < 2 seconds
- Formatting operations: < 1 second
- Chart creation: < 3 seconds

### Resource Usage Limits
- Memory usage: < 300MB including all services
- Concurrent operations: Support 5+ simultaneous spreadsheet operations
- Batch operations: Efficient handling of large data sets
- API rate limiting: Respect Sheets API quotas with intelligent backoff

## Security Considerations

### Spreadsheet Access Control
- Request minimal necessary Sheets scopes
- Validate spreadsheet access permissions before operations
- Secure handling of spreadsheet data and formulas
- Clear audit trail of spreadsheet operations

### Privacy Protection
- No persistent storage of spreadsheet data
- Secure token management for Sheets access
- User control over spreadsheet access and operations
- Respect spreadsheet sharing and permission settings

## Testing Strategy

### Integration Testing Focus
- Complete Sheets OAuth flow with scope validation
- Spreadsheet operations with various data types
- Formula calculations and data analysis workflows
- Chart creation and visualization scenarios
- Error handling and recovery scenarios

### Manual Testing Checklist
- [ ] Sheets OAuth authorization completes successfully
- [ ] Create spreadsheet appears in Google Sheets interface
- [ ] Get data retrieves correct values and formatting
- [ ] Update cells changes appear in Google Sheets
- [ ] Formatting operations work correctly
- [ ] Charts display properly with correct data
- [ ] Error scenarios provide helpful guidance

## Risk Mitigation

### Technical Risks
- **Large Data Sets**: Implement pagination and batch processing
- **Formula Complexity**: Handle various formula types and errors
- **Rate Limits**: Implement intelligent rate limiting and user guidance
- **Data Validation**: Ensure data integrity and type safety

### User Experience Risks
- **Data Privacy**: Clear documentation about spreadsheet access
- **Accidental Changes**: Confirmation for destructive operations
- **Performance**: Set expectations for large spreadsheet operations

## Next Phase Preparation

### Production Hardening Readiness (Phase 7)
- All Google APIs integrated and tested
- Multi-service authentication working smoothly
- Error handling comprehensive across all services
- Performance optimization opportunities identified

### Complete Google Workspace Integration
- Cross-service workflows (e.g., email spreadsheet reports)
- Unified data handling across all Google services
- Comprehensive error handling and recovery
- Performance optimization for multi-service operations

## Value Delivered

### User Benefits
- **Data Analysis**: AI-powered spreadsheet analysis and manipulation
- **Automation**: Automated data entry and calculation workflows
- **Visualization**: Intelligent chart creation and data presentation
- **Integration**: Seamless integration with other Google Workspace tools

### Development Benefits
- **Complete API Suite**: Full Google Workspace API integration
- **Data Handling Patterns**: Comprehensive data manipulation framework
- **Performance Optimization**: Efficient handling of large data operations
- **Production Readiness**: Foundation for production deployment

This phase completes the core Google Workspace API integration, providing users with comprehensive spreadsheet capabilities while establishing the foundation for production hardening and advanced features in the final phase.
