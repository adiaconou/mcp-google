# Phase 6: Sheets API Integration (Simplified)

## Overview
Add essential Google Sheets functionality to the MCP server with 5 core tools. This phase delivers fundamental spreadsheet manipulation capabilities that enable AI agents to create, read, update, format, and calculate in Google Sheets. Each implementation step is fully isolated, implementing one complete tool with client method, tool definition, registration, and tests.

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

## Objectives
- Extend OAuth manager to include Google Sheets scopes
- Create Sheets API client with essential spreadsheet operations
- Implement 5 core Sheets tools: create, read, update, format, calculate
- Add comprehensive error handling for Sheets operations
- Complete integration with MCP server and Claude Desktop

## Implementation Steps
1. ☐ Extend OAuth manager to support Sheets scopes (with tests)
2. ☐ Implement `sheets_create_spreadsheet` tool (with unit/integration tests and MCP registration)
3. ☐ Implement `sheets_get_data` tool (with unit/integration tests and MCP registration)
4. ☐ Implement `sheets_update_cells` tool (with unit/integration tests and MCP registration)
5. ☐ Implement `sheets_format_cells` tool (with unit/integration tests and MCP registration)
6. ☐ Implement `sheets_calculate` tool (with unit/integration tests and MCP registration)
7. ☐ Final integration and server registration (with comprehensive testing)

## Implementation Plan

### Step 1: Extend OAuth Manager for Sheets
**Files**: `src/auth/oauthManager.ts` (enhancement)
- Add Sheets scopes to OAuth configuration:
  - `https://www.googleapis.com/auth/spreadsheets` (for full spreadsheet access)
- Update scope management for Sheets-specific operations
- Add scope validation for spreadsheet access permissions
- Add unit tests for Sheets scope handling

### Step 2: Create Sheets Create Spreadsheet Tool
**Files**: `src/services/sheets/sheetsClient.ts`, `src/services/sheets/tools/createSpreadsheet.ts`
- Create SheetsClient class extending base API patterns
- Add authentication integration with OAuth manager
- Implement spreadsheet creation with template support
- Add folder destination and sharing options
- Include comprehensive error handling and retry logic

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
      initialData: {
        type: "array",
        items: {
          type: "array",
          items: { type: "string" }
        },
        description: "Initial data as 2D array"
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

### Step 3: Create Sheets Get Data Tool
**Files**: `src/services/sheets/tools/getData.ts`
- Add `getData` method to SheetsClient
- Add spreadsheet ID and range validation
- Support various data formats (values, formulas, formatted)
- Extract data with type preservation
- Include metadata and formatting information

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
      includeMetadata: { type: "boolean", default: true }
    }
  }
}
```

### Step 4: Create Sheets Update Cells Tool
**Files**: `src/services/sheets/tools/updateCells.ts`
- Add `updateCells` method to SheetsClient
- Add data validation and type conversion
- Support various update modes (overwrite, append, insert)
- Include formula and calculation updates
- Add batch operations for efficiency

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
            }
          }
        }
      },
      valueInputOption: { 
        type: "string", 
        enum: ["RAW", "USER_ENTERED"],
        default: "USER_ENTERED"
      }
    }
  }
}
```

### Step 5: Create Sheets Format Cells Tool
**Files**: `src/services/sheets/tools/formatCells.ts`
- Add `formatCells` method to SheetsClient
- Add cell formatting (fonts, colors, borders)
- Support number formatting and data validation
- Include conditional formatting rules
- Add row and column formatting

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
          }
        }
      }
    }
  }
}
```

### Step 6: Create Sheets Calculate Tool
**Files**: `src/services/sheets/tools/calculate.ts`
- Add `calculate` method to SheetsClient
- Add formula validation and execution
- Support complex calculations and functions
- Include data analysis and aggregation
- Add formula copying and range operations

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
        enum: ["formula", "aggregate"] 
      },
      range: { type: "string", description: "A1 notation range for operation" },
      formula: { type: "string", description: "Formula to apply" },
      aggregateFunction: { 
        type: "string", 
        enum: ["SUM", "AVERAGE", "COUNT", "MAX", "MIN"] 
      },
      outputRange: { type: "string", description: "Where to place results" }
    }
  }
}
```

### Step 7: Register Sheets Tools with MCP Server
**Files**: `src/server.ts` (Sheets integration)
- Import and register all Sheets tools
- Add Sheets service initialization
- Update tool discovery to include Sheets tools
- Add Sheets-specific error handling
- Include Sheets tools in server capabilities

## Success Criteria

### Functional Requirements
- ☐ OAuth flow includes Sheets scopes and completes successfully
- ☐ `sheets_create_spreadsheet` creates spreadsheets with proper structure
- ☐ `sheets_get_data` retrieves and formats spreadsheet data correctly
- ☐ `sheets_update_cells` modifies data while preserving formatting
- ☐ `sheets_format_cells` applies styles correctly in Google Sheets
- ☐ `sheets_calculate` executes formulas and aggregations properly

### Technical Requirements
- ☐ Sheets API integration follows established multi-service patterns
- ☐ Data operations handle various data types and formats
- ☐ Error handling provides clear guidance for Sheets-specific issues
- ☐ Performance meets targets for spreadsheet operations (<3 seconds)
- ☐ Formula calculations execute correctly and efficiently

### User Experience Requirements
- ☐ Spreadsheet data displays in organized, readable format
- ☐ Data updates reflect immediately in Google Sheets interface
- ☐ Error messages guide users to solutions
- ☐ Tools respond within reasonable time limits

## Key Files Created

### Sheets Service Implementation
```
src/services/sheets/
├── sheetsClient.ts           # Sheets API wrapper
└── tools/
    ├── createSpreadsheet.ts  # Create spreadsheet tool
    ├── getData.ts            # Get spreadsheet data tool
    ├── updateCells.ts        # Update cells tool
    ├── formatCells.ts        # Cell formatting tool
    ├── calculate.ts          # Formula and calculation tool
    └── index.ts              # Tool registration
```

### Enhanced Core Files
```
src/auth/
└── oauthManager.ts           # Extended with Sheets scopes

tests/unit/
├── sheetsCreateSpreadsheet.test.ts
├── sheetsGetData.test.ts
├── sheetsUpdateCells.test.ts
├── sheetsFormatCells.test.ts
└── sheetsCalculate.test.ts

tests/integration/
├── sheets-create-spreadsheet.test.ts
├── sheets-get-data.test.ts
├── sheets-update-cells.test.ts
├── sheets-format-cells.test.ts
└── sheets-calculate.test.ts
```

## Sheets Tools Summary

### Core Spreadsheet Tools
- **`sheets_create_spreadsheet`**: Create new spreadsheets with title, initial data, and sharing
- **`sheets_get_data`**: Read spreadsheet data with range and formatting options
- **`sheets_update_cells`**: Update cell values with batch operations and formula support
- **`sheets_format_cells`**: Apply formatting (fonts, colors, borders, number formats)
- **`sheets_calculate`**: Execute formulas and perform aggregations (SUM, AVERAGE, COUNT, etc.)

## Performance Targets

### Response Time Requirements
- Spreadsheet creation: < 3 seconds
- Data reading (< 1000 cells): < 2 seconds
- Data updates (< 100 cells): < 2 seconds
- Formatting operations: < 1 second
- Formula calculations: < 2 seconds

### Resource Usage Limits
- Memory usage: < 300MB including all services
- Concurrent operations: Support 5+ simultaneous spreadsheet operations
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
- Error handling and recovery scenarios

### Manual Testing Checklist
- [ ] Sheets OAuth authorization completes successfully
- [ ] Create spreadsheet appears in Google Sheets interface
- [ ] Get data retrieves correct values and formatting
- [ ] Update cells changes appear in Google Sheets
- [ ] Formatting operations work correctly
- [ ] Formula calculations produce expected results
- [ ] Error scenarios provide helpful guidance

## Key Simplifications Made

1. **5 Essential Tools Only**: Focus on core spreadsheet CRUD operations
2. **No Complex Features**: Removed charts, pivot tables, advanced sheet management
3. **No Separate Utility Files**: Keep logic in client methods and tool handlers
4. **Incremental Client Building**: Add methods only when implementing corresponding tools
5. **Isolated Implementation**: Each step delivers a complete, working tool
6. **Proven Patterns**: Follow exact structure from successful Drive implementation

## Value Delivered

### User Benefits
- **Spreadsheet Creation**: AI-powered spreadsheet creation with initial data
- **Data Management**: Read and update spreadsheet data through AI agents
- **Formatting Control**: Apply professional formatting to spreadsheets
- **Calculation Support**: Execute formulas and perform data analysis
- **Integration**: Seamless integration with other Google Workspace tools

### Development Benefits
- **Complete API Integration**: Essential Google Sheets functionality
- **Proven Patterns**: Consistent implementation following established patterns
- **Comprehensive Testing**: Full unit and integration test coverage
- **Production Ready**: Error handling and performance optimization

This simplified phase delivers essential Google Sheets functionality while maintaining the proven patterns and quality standards established in previous phases, with each implementation step being fully isolated and delivering a complete, working tool.
