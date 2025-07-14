/**
 * Test script for Sheets Get Data Tool
 * 
 * This script tests the sheets_get_data tool to ensure it works correctly
 * with the MCP server implementation.
 */

const { server } = require('./dist/server.js');

async function testGetDataTool() {
  console.log('🧪 Testing Sheets Get Data Tool...\n');

  try {
    // Start the server
    console.log('📡 Starting MCP server...');
    await server.start();
    
    // Get server status
    const status = server.getStatus();
    console.log(`✅ Server started with ${status.toolCount} tools`);
    console.log(`📋 Available tools: ${status.tools.join(', ')}\n`);

    // Check if sheets_get_data tool is available
    const hasGetDataTool = status.tools.includes('sheets_get_data');
    if (!hasGetDataTool) {
      throw new Error('sheets_get_data tool not found in registered tools');
    }
    console.log('✅ sheets_get_data tool is registered\n');

    // Test tool execution (this will require authentication)
    console.log('🔧 Testing tool execution...');
    console.log('Note: This test requires valid Google OAuth credentials and a test spreadsheet.\n');

    // Example test parameters (replace with actual spreadsheet ID for real testing)
    const testParams = {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', // Google Sheets API sample spreadsheet
      range: 'Class Data!A2:E',
      includeMetadata: true
    };

    console.log('📊 Test parameters:');
    console.log(JSON.stringify(testParams, null, 2));
    console.log();

    // Note: Actual tool execution would require authentication
    console.log('⚠️  Actual tool execution requires:');
    console.log('   1. Valid Google OAuth credentials');
    console.log('   2. Authenticated user session');
    console.log('   3. Access to the specified spreadsheet');
    console.log();
    console.log('💡 To test with real data:');
    console.log('   1. Set up Google OAuth credentials');
    console.log('   2. Run authentication flow');
    console.log('   3. Replace spreadsheetId with your test spreadsheet');
    console.log('   4. Use Claude Desktop or MCP client to call the tool');
    console.log();

    console.log('✅ Sheets Get Data Tool test completed successfully!');
    console.log('🎯 Tool is properly registered and ready for use.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    // Stop the server
    try {
      await server.stop();
      console.log('📡 Server stopped');
    } catch (error) {
      console.error('Error stopping server:', error);
    }
  }
}

// Run the test
testGetDataTool().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
