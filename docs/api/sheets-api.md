# Google Sheets API Reference

## Table of Contents

- [Overview](#overview)
- [Sheet Read Operations](#sheet-read-operations)
  - [Read Cell Range](#read-cell-range)
  - [Read Multiple Ranges](#read-multiple-ranges)
  - [Get Sheet Metadata](#get-sheet-metadata)
- [Sheet Creation Operations](#sheet-creation-operations)
  - [Create New Spreadsheet](#create-new-spreadsheet)
  - [Create Additional Sheet](#create-additional-sheet)
- [Sheet Update Operations](#sheet-update-operations)
  - [Append Rows](#append-rows)
  - [Update Cell Range](#update-cell-range)
  - [Batch Update](#batch-update)
- [Formatting Operations](#formatting-operations)
  - [Apply Cell Formatting](#apply-cell-formatting)
  - [Auto-resize Columns](#auto-resize-columns)
- [Formula and Calculation Operations](#formula-and-calculation-operations)
  - [Insert Formulas](#insert-formulas)
  - [Recalculate Sheet](#recalculate-sheet)
- [Data Analysis Operations](#data-analysis-operations)
  - [Sort Range](#sort-range)
  - [Filter Data](#filter-data)
- [Error Handling](#error-handling)
  - [Common Error Codes](#common-error-codes)
  - [Error Response Format](#error-response-format)
- [Usage Examples](#usage-examples)
  - [Employee Database Management](#employee-database-management)
  - [Financial Report Generation](#financial-report-generation)
  - [Data Import and Processing](#data-import-and-processing)
- [Rate Limits and Quotas](#rate-limits-and-quotas)
- [Best Practices](#best-practices)
- [Data Type Handling](#data-type-handling)

## Overview

The Google Sheets API module provides comprehensive spreadsheet creation and manipulation capabilities, enabling AI agents to create, read, and update Google Sheets for data management, analysis, and reporting workflows.

## Sheet Read Operations

### Read Cell Range

**Function**: `sheets.read_range(sheet_id, range)`

**Description**: Read data from a specific range of cells in a Google Sheet.

**Parameters**:
- `sheet_id` (string, required): The unique identifier of the Google Sheet
- `range` (string, required): A1 notation range (e.g., "Sheet1!A1:D10")

**Range Examples**:
- `"Sheet1!A1:D10"` - Rectangle from A1 to D10
- `"Sheet1!A:A"` - Entire column A
- `"Sheet1!1:1"` - Entire row 1
- `"Sheet1!A1:Z"` - From A1 to column Z (all rows)
- `"Data!B2:E100"` - Named sheet range

**Returns**:
```json
{
  "range": "Sheet1!A1:D3",
  "majorDimension": "ROWS",
  "values": [
    ["Name", "Age", "Department", "Salary"],
    ["John Doe", "30", "Engineering", "75000"],
    ["Jane Smith", "28", "Marketing", "65000"]
  ]
}
```

### Read Multiple Ranges

**Function**: `sheets.read_ranges(sheet_id, ranges)`

**Description**: Read data from multiple ranges in a single request.

**Parameters**:
- `sheet_id` (string, required): The unique identifier of the Google Sheet
- `ranges` (array, required): Array of A1 notation ranges

**Example**:
```javascript
const data = await sheets.read_ranges("1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms", [
  "Sheet1!A1:D1",  // Headers
  "Sheet1!A2:D100", // Data
  "Summary!B2:B5"   // Summary values
]);
```

**Returns**: Array of range data objects

### Get Sheet Metadata

**Function**: `sheets.get_metadata(sheet_id)`

**Description**: Retrieve spreadsheet metadata including sheet names, properties, and structure.

**Parameters**:
- `sheet_id` (string, required): The unique identifier of the Google Sheet

**Returns**:
```json
{
  "spreadsheetId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
  "properties": {
    "title": "Employee Database",
    "locale": "en_US",
    "autoRecalc": "ON_CHANGE",
    "timeZone": "America/Los_Angeles"
  },
  "sheets": [
    {
      "properties": {
        "sheetId": 0,
        "title": "Employees",
        "index": 0,
        "sheetType": "GRID",
        "gridProperties": {
          "rowCount": 1000,
          "columnCount": 26
        }
      }
    },
    {
      "properties": {
        "sheetId": 1,
        "title": "Summary",
        "index": 1,
        "sheetType": "GRID"
      }
    }
  ]
}
```

## Sheet Creation Operations

### Create New Spreadsheet

**Function**: `sheets.create(title, headers, rows)`

**Description**: Create a new Google Sheet with specified title, headers, and initial data.

**Parameters**:
- `title` (string, required): Title for the new spreadsheet
- `headers` (array, optional): Column headers for the first row
- `rows` (array, optional): Initial data rows

**Simple Creation**:
```javascript
const newSheet = await sheets.create(
  "Project Tracker",
  ["Task", "Assignee", "Status", "Due Date"],
  [
    ["Setup development environment", "John Doe", "In Progress", "2023-12-20"],
    ["Design user interface", "Jane Smith", "Not Started", "2023-12-25"],
    ["Implement authentication", "Bob Johnson", "Not Started", "2023-12-30"]
  ]
);
```

**Advanced Creation with Formatting**:
```javascript
const formattedSheet = await sheets.create(
  "Sales Report Q4 2023",
  ["Month", "Revenue", "Expenses", "Profit"],
  [
    ["October", 125000, 85000, 40000],
    ["November", 135000, 90000, 45000],
    ["December", 150000, 95000, 55000]
  ],
  {
    formatting: {
      headerStyle: {
        backgroundColor: { red: 0.2, green: 0.6, blue: 0.9 },
        textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }
      },
      numberFormat: {
        columns: [1, 2, 3], // Revenue, Expenses, Profit columns
        pattern: "$#,##0"
      }
    }
  }
);
```

**Returns**: Created spreadsheet metadata including spreadsheet ID

### Create Additional Sheet

**Function**: `sheets.add_sheet(sheet_id, sheet_name, properties)`

**Description**: Add a new sheet to an existing spreadsheet.

**Parameters**:
- `sheet_id` (string, required): The unique identifier of the spreadsheet
- `sheet_name` (string, required): Name for the new sheet
- `properties` (object, optional): Sheet properties (grid size, formatting)

**Example**:
```javascript
await sheets.add_sheet(
  "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
  "Q1 2024 Data",
  {
    gridProperties: {
      rowCount: 500,
      columnCount: 10
    }
  }
);
```

## Sheet Update Operations

### Append Rows

**Function**: `sheets.append_rows(sheet_id, range, rows)`

**Description**: Add new rows of data to the end of a sheet or specified range.

**Parameters**:
- `sheet_id` (string, required): The unique identifier of the spreadsheet
- `range` (string, required): Target range for appending data
- `rows` (array, required): Array of row data to append

**Example**:
```javascript
await sheets.append_rows(
  "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
  "Employees!A:D",
  [
    ["Alice Brown", "32", "Design", "70000"],
    ["Charlie Wilson", "29", "Sales", "60000"]
  ]
);
```

**Options**:
- `valueInputOption`: "RAW" or "USER_ENTERED" (for formula interpretation)
- `insertDataOption`: "OVERWRITE" or "INSERT_ROWS"

### Update Cell Range

**Function**: `sheets.update_range(sheet_id, range, values)`

**Description**: Update data in a specific range of cells.

**Parameters**:
- `sheet_id` (string, required): The unique identifier of the spreadsheet
- `range` (string, required): A1 notation range to update
- `values` (array, required): 2D array of values to write

**Example**:
```javascript
await sheets.update_range(
  "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
  "Summary!B2:B5",
  [
    [150000],  // Total Revenue
    [95000],   // Total Expenses
    [55000],   // Total Profit
    [36.7]     // Profit Margin %
  ]
);
```

### Batch Update

**Function**: `sheets.batch_update(sheet_id, updates)`

**Description**: Perform multiple update operations in a single request.

**Parameters**:
- `sheet_id` (string, required): The unique identifier of the spreadsheet
- `updates` (array, required): Array of update operations

**Batch Update Example**:
```javascript
const batchUpdates = [
  {
    range: "Sheet1!A1:D1",
    values: [["Updated", "Column", "Headers", "Here"]]
  },
  {
    range: "Sheet1!A2:D3",
    values: [
      ["New", "Data", "Row", "1"],
      ["New", "Data", "Row", "2"]
    ]
  }
];

await sheets.batch_update("1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms", batchUpdates);
```

## Formatting Operations

### Apply Cell Formatting

**Function**: `sheets.format_cells(sheet_id, range, format)`

**Description**: Apply formatting to a range of cells.

**Parameters**:
- `sheet_id` (string, required): The unique identifier of the spreadsheet
- `range` (string, required): A1 notation range to format
- `format` (object, required): Formatting specifications

**Formatting Options**:
```javascript
const formatting = {
  backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
  textFormat: {
    bold: true,
    italic: false,
    fontSize: 12,
    foregroundColor: { red: 0, green: 0, blue: 0 }
  },
  numberFormat: {
    type: "CURRENCY",
    pattern: "$#,##0.00"
  },
  borders: {
    top: { style: "SOLID", width: 1 },
    bottom: { style: "SOLID", width: 1 },
    left: { style: "SOLID", width: 1 },
    right: { style: "SOLID", width: 1 }
  }
};

await sheets.format_cells("1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms", "A1:D1", formatting);
```

### Auto-resize Columns

**Function**: `sheets.auto_resize_columns(sheet_id, sheet_name, start_column, end_column)`

**Description**: Automatically resize columns to fit content.

**Parameters**:
- `sheet_id` (string, required): The unique identifier of the spreadsheet
- `sheet_name` (string, required): Name of the sheet
- `start_column` (number, required): Starting column index (0-based)
- `end_column` (number, required): Ending column index (0-based)

## Formula and Calculation Operations

### Insert Formulas

**Function**: `sheets.insert_formula(sheet_id, cell, formula)`

**Description**: Insert a formula into a specific cell.

**Parameters**:
- `sheet_id` (string, required): The unique identifier of the spreadsheet
- `cell` (string, required): Target cell in A1 notation
- `formula` (string, required): Formula to insert (without = sign)

**Formula Examples**:
```javascript
// Sum formula
await sheets.insert_formula("1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms", "D10", "SUM(D2:D9)");

// Average formula
await sheets.insert_formula("1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms", "E10", "AVERAGE(D2:D9)");

// Conditional formula
await sheets.insert_formula("1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms", "F2", "IF(D2>50000,\"High\",\"Low\")");
```

### Recalculate Sheet

**Function**: `sheets.recalculate(sheet_id)`

**Description**: Force recalculation of all formulas in the spreadsheet.

**Parameters**:
- `sheet_id` (string, required): The unique identifier of the spreadsheet

## Data Analysis Operations

### Sort Range

**Function**: `sheets.sort_range(sheet_id, range, sort_specs)`

**Description**: Sort data in a specified range.

**Parameters**:
- `sheet_id` (string, required): The unique identifier of the spreadsheet
- `range` (string, required): Range to sort
- `sort_specs` (array, required): Sort specifications

**Sort Example**:
```javascript
await sheets.sort_range(
  "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
  "A2:D100",
  [
    { columnIndex: 3, ascending: false }, // Sort by salary (column D) descending
    { columnIndex: 0, ascending: true }   // Then by name (column A) ascending
  ]
);
```

### Filter Data

**Function**: `sheets.apply_filter(sheet_id, range, filter_criteria)`

**Description**: Apply filters to a data range.

**Parameters**:
- `sheet_id` (string, required): The unique identifier of the spreadsheet
- `range` (string, required): Range to filter
- `filter_criteria` (object, required): Filter specifications

## Error Handling

### Common Error Codes
- `404`: Spreadsheet or sheet not found
- `403`: Insufficient permissions
- `401`: Authentication required
- `400`: Invalid range or data format
- `429`: Rate limit exceeded

### Error Response Format
```json
{
  "error": {
    "code": 400,
    "message": "Invalid range",
    "details": "Range 'Sheet1!A1:Z1000000' exceeds sheet dimensions"
  }
}
```

## Usage Examples

### Employee Database Management
```javascript
// Create employee database
const employeeSheet = await sheets.create(
  "Employee Database 2024",
  ["Employee ID", "Name", "Department", "Salary", "Start Date"],
  [
    ["EMP001", "John Doe", "Engineering", 75000, "2023-01-15"],
    ["EMP002", "Jane Smith", "Marketing", 65000, "2023-02-01"],
    ["EMP003", "Bob Johnson", "Sales", 60000, "2023-03-10"]
  ]
);

// Add summary calculations
await sheets.insert_formula(employeeSheet.spreadsheetId, "D100", "AVERAGE(D2:D99)");
await sheets.insert_formula(employeeSheet.spreadsheetId, "D101", "MAX(D2:D99)");
await sheets.insert_formula(employeeSheet.spreadsheetId, "D102", "MIN(D2:D99)");

// Format headers
await sheets.format_cells(employeeSheet.spreadsheetId, "A1:E1", {
  backgroundColor: { red: 0.2, green: 0.6, blue: 0.9 },
  textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }
});
```

### Financial Report Generation
```javascript
// Create monthly financial report
const financialData = [
  ["January", 120000, 80000, "=B2-C2"],
  ["February", 135000, 85000, "=B3-C3"],
  ["March", 150000, 90000, "=B4-C4"]
];

const reportSheet = await sheets.create(
  "Q1 2024 Financial Report",
  ["Month", "Revenue", "Expenses", "Profit"],
  financialData
);

// Add totals row
await sheets.append_rows(reportSheet.spreadsheetId, "A:D", [
  ["TOTAL", "=SUM(B2:B4)", "=SUM(C2:C4)", "=SUM(D2:D4)"]
]);

// Format currency columns
await sheets.format_cells(reportSheet.spreadsheetId, "B:D", {
  numberFormat: { type: "CURRENCY", pattern: "$#,##0" }
});
```

### Data Import and Processing
```javascript
// Import data from external source
const importedData = [
  ["Product", "Sales", "Region"],
  ["Widget A", 1500, "North"],
  ["Widget B", 2300, "South"],
  ["Widget C", 1800, "East"]
];

const dataSheet = await sheets.create("Sales Data Import", [], importedData);

// Add analysis columns
await sheets.update_range(dataSheet.spreadsheetId, "D1:F1", [
  ["Category", "Performance", "Rank"]
]);

// Add formulas for analysis
await sheets.insert_formula(dataSheet.spreadsheetId, "E2", "IF(B2>2000,\"High\",IF(B2>1500,\"Medium\",\"Low\"))");
await sheets.insert_formula(dataSheet.spreadsheetId, "F2", "RANK(B2,B$2:B$4,0)");

// Copy formulas down
await sheets.update_range(dataSheet.spreadsheetId, "E3:F4", [
  ["=IF(B3>2000,\"High\",IF(B3>1500,\"Medium\",\"Low\"))", "=RANK(B3,B$2:B$4,0)"],
  ["=IF(B4>2000,\"High\",IF(B4>1500,\"Medium\",\"Low\"))", "=RANK(B4,B$2:B$4,0)"]
]);
```

## Rate Limits and Quotas

- **Read requests per day**: 300,000,000
- **Write requests per day**: 300,000,000
- **Requests per 100 seconds per user**: 100
- **Cells per request**: 10,000,000

## Best Practices

1. **Use batch operations**: Group multiple updates for efficiency
2. **Optimize range selections**: Use specific ranges rather than entire columns/rows
3. **Handle large datasets**: Use pagination for reading large amounts of data
4. **Cache metadata**: Store sheet structure information locally
5. **Validate data types**: Ensure data matches expected column formats
6. **Use appropriate number formats**: Apply currency, date, and percentage formats
7. **Implement error handling**: Handle quota limits and invalid ranges gracefully

## Data Type Handling

- **Numbers**: Automatically detected and formatted
- **Dates**: Use ISO format (YYYY-MM-DD) or locale-specific formats
- **Formulas**: Prefix with = sign, use proper cell references
- **Text**: Strings are preserved as-is
- **Boolean**: TRUE/FALSE values
- **Empty cells**: Use null or empty string values
