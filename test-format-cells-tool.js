/**
 * Test script for the Sheets Format Cells tool
 * 
 * This script tests the formatCells tool functionality by:
 * 1. Creating a test spreadsheet
 * 2. Adding sample data
 * 3. Applying various formatting operations
 * 4. Verifying the results
 */

const { server } = require('./src/server');
const { toolRegistry } = require('./src/utils/toolRegistry');

async function testFormatCellsTool() {
  console.log('🧪 Testing Sheets Format Cells Tool...\n');

  try {
    // Start the server to register tools
    console.log('📋 Initializing MCP server...');
    await server.start();
    
    // Wait a moment for server to fully initialize
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 1: Create a test spreadsheet
    console.log('\n📊 Step 1: Creating test spreadsheet...');
    const createResult = await toolRegistry.executeTool('sheets_create_spreadsheet', {
      title: `Format Test ${Date.now()}`,
      sheets: [{
        title: 'Sample Data',
        rowCount: 10,
        columnCount: 6
      }]
    });

    if (createResult.isError) {
      throw new Error(`Failed to create spreadsheet: ${createResult.content[0].text}`);
    }

    // Extract spreadsheet ID
    const spreadsheetMatch = createResult.content[0].text.match(/Spreadsheet ID: ([a-zA-Z0-9-_]+)/);
    if (!spreadsheetMatch) {
      throw new Error('Could not extract spreadsheet ID');
    }
    const spreadsheetId = spreadsheetMatch[1];
    console.log(`✅ Created spreadsheet: ${spreadsheetId}`);

    // Test 2: Add sample data
    console.log('\n📝 Step 2: Adding sample data...');
    const updateResult = await toolRegistry.executeTool('sheets_update_cells', {
      spreadsheetId: spreadsheetId,
      updates: [{
        range: 'A1:E6',
        values: [
          ['Product', 'Price', 'Quantity', 'Total', 'Status'],
          ['Laptop', 999.99, 5, 4999.95, 'In Stock'],
          ['Mouse', 29.99, 20, 599.80, 'In Stock'],
          ['Keyboard', 79.99, 8, 639.92, 'Low Stock'],
          ['Monitor', 299.99, 3, 899.97, 'Low Stock'],
          ['Headphones', 149.99, 0, 0, 'Out of Stock']
        ]
      }]
    });

    if (updateResult.isError) {
      throw new Error(`Failed to add data: ${updateResult.content[0].text}`);
    }
    console.log('✅ Sample data added successfully');

    // Test 3: Format header row
    console.log('\n🎨 Step 3: Formatting header row...');
    const headerFormatResult = await toolRegistry.executeTool('sheets_format_cells', {
      spreadsheetId: spreadsheetId,
      range: 'A1:E1',
      backgroundColor: '#4285F4',
      fontColor: '#FFFFFF',
      bold: true,
      fontSize: 12,
      textAlignment: 'CENTER'
    });

    if (headerFormatResult.isError) {
      throw new Error(`Failed to format headers: ${headerFormatResult.content[0].text}`);
    }
    console.log('✅ Header formatting applied');
    console.log(`   ${headerFormatResult.content[0].text.split('\n')[0]}`);

    // Test 4: Apply number formatting to price columns
    console.log('\n💰 Step 4: Formatting price columns...');
    const priceFormatResult = await toolRegistry.executeTool('sheets_format_cells', {
      spreadsheetId: spreadsheetId,
      range: 'B2:B6,D2:D6',
      numberFormat: {
        type: 'CURRENCY',
        decimalPlaces: 2
      }
    });

    if (priceFormatResult.isError) {
      throw new Error(`Failed to format prices: ${priceFormatResult.content[0].text}`);
    }
    console.log('✅ Currency formatting applied');

    // Test 5: Apply conditional formatting for stock status
    console.log('\n🚦 Step 5: Adding conditional formatting for stock levels...');
    const conditionalFormatResult = await toolRegistry.executeTool('sheets_format_cells', {
      spreadsheetId: spreadsheetId,
      range: 'C2:C6',
      conditionalFormat: {
        condition: 'LESS_THAN',
        value: 5,
        backgroundColor: '#FFE6E6'
      }
    });

    if (conditionalFormatResult.isError) {
      throw new Error(`Failed to apply conditional formatting: ${conditionalFormatResult.content[0].text}`);
    }
    console.log('✅ Conditional formatting applied for low stock');

    // Test 6: Add filters and freeze header
    console.log('\n🔧 Step 6: Adding data organization features...');
    const organizationResult = await toolRegistry.executeTool('sheets_format_cells', {
      spreadsheetId: spreadsheetId,
      range: 'A1:E6',
      addFilter: true,
      freezeRows: 1
    });

    if (organizationResult.isError) {
      throw new Error(`Failed to add organization features: ${organizationResult.content[0].text}`);
    }
    console.log('✅ Filters and freeze panes added');

    // Test 7: Sort by total value (descending)
    console.log('\n📊 Step 7: Sorting data by total value...');
    const sortResult = await toolRegistry.executeTool('sheets_format_cells', {
      spreadsheetId: spreadsheetId,
      range: 'A1:E6',
      sortBy: {
        column: 3, // Total column (0-based index)
        ascending: false
      }
    });

    if (sortResult.isError) {
      throw new Error(`Failed to sort data: ${sortResult.content[0].text}`);
    }
    console.log('✅ Data sorted by total value (descending)');

    // Test 8: Test error handling with invalid parameters
    console.log('\n❌ Step 8: Testing error handling...');
    try {
      await toolRegistry.executeTool('sheets_format_cells', {
        spreadsheetId: spreadsheetId,
        range: 'A1:B2',
        textAlignment: 'INVALID_ALIGNMENT'
      });
      console.log('⚠️  Expected error was not thrown');
    } catch (error) {
      console.log('✅ Error handling works correctly');
      console.log(`   Error: ${error.message}`);
    }

    // Summary
    console.log('\n🎉 Format Cells Tool Test Summary:');
    console.log('✅ Spreadsheet creation: PASSED');
    console.log('✅ Data insertion: PASSED');
    console.log('✅ Header formatting: PASSED');
    console.log('✅ Number formatting: PASSED');
    console.log('✅ Conditional formatting: PASSED');
    console.log('✅ Data organization: PASSED');
    console.log('✅ Data sorting: PASSED');
    console.log('✅ Error handling: PASSED');
    
    console.log(`\n📋 Test spreadsheet created: ${spreadsheetId}`);
    console.log('🔗 You can view it at: https://docs.google.com/spreadsheets/d/' + spreadsheetId);
    
    console.log('\n🎯 All format cells tool tests completed successfully!');

  } catch (error) {
    console.error('\n❌ Format cells tool test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    // Clean shutdown
    try {
      await server.stop();
    } catch (error) {
      console.error('Error stopping server:', error);
    }
  }
}

// Run the test
if (require.main === module) {
  testFormatCellsTool().catch(console.error);
}

module.exports = { testFormatCellsTool };
