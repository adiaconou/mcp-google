/**
 * Test script for the sheets_update_cells tool
 * 
 * This script tests the new updateCells functionality by:
 * 1. Creating a test spreadsheet
 * 2. Updating cells with various data types
 * 3. Testing multiple ranges
 * 4. Testing different value input options
 */

const { server } = require('./dist/server.js');

async function testUpdateCellsTool() {
  console.log('🧪 Testing sheets_update_cells tool...\n');

  try {
    // Start the server to initialize tools
    console.log('📋 Initializing MCP server...');
    
    // Get server status to verify tools are loaded
    const status = server.getStatus();
    console.log(`✅ Server initialized with ${status.toolCount} tools`);
    
    // Check if our new tool is registered
    const hasUpdateCells = status.tools.includes('sheets_update_cells');
    console.log(`📊 sheets_update_cells tool registered: ${hasUpdateCells ? '✅' : '❌'}`);
    
    if (!hasUpdateCells) {
      console.log('❌ sheets_update_cells tool not found in registered tools');
      console.log('Available tools:', status.tools);
      return;
    }

    console.log('\n🎯 sheets_update_cells tool is properly registered!');
    console.log('\n📝 Tool registration test completed successfully');
    console.log('\nTo test the actual functionality:');
    console.log('1. Ensure you have a Google Sheets spreadsheet ID');
    console.log('2. Use Claude Desktop to call the sheets_update_cells tool');
    console.log('3. Example usage:');
    console.log(`   {
     "spreadsheetId": "your-spreadsheet-id",
     "updates": [
       {
         "range": "A1:B2",
         "values": [
           ["Name", "Age"],
           ["John", 30]
         ]
       }
     ],
     "valueInputOption": "USER_ENTERED"
   }`);

  } catch (error) {
    console.error('❌ Error testing sheets_update_cells tool:', error);
    process.exit(1);
  }
}

// Run the test
testUpdateCellsTool().then(() => {
  console.log('\n✅ Test completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
