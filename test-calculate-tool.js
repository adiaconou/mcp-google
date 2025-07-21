/**
 * Test script for the sheets_calculate tool
 * 
 * This script tests the calculate tool functionality including:
 * - Formula operations
 * - Aggregate functions (SUM, AVERAGE, COUNT, MAX, MIN)
 * - Error handling
 */

/* eslint-env node */
/* eslint-disable no-console */

const { calculate } = require('./src/services/sheets/tools/calculate');

async function testCalculateTool() {
  console.log('🧮 Testing Sheets Calculate Tool...\n');

  try {
    // Test 1: Formula operation
    console.log('📝 Test 1: Formula Operation');
    const formulaResult = await calculate({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', // Example public sheet
      operation: 'formula',
      formula: '=A1+B1',
      outputRange: 'C1'
    });
    console.log('Formula result:', formulaResult);
    console.log('✅ Formula operation completed\n');

    // Test 2: SUM aggregate
    console.log('📊 Test 2: SUM Aggregate');
    const sumResult = await calculate({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      operation: 'aggregate',
      range: 'A1:A10',
      aggregateFunction: 'SUM'
    });
    console.log('SUM result:', sumResult);
    console.log('✅ SUM aggregate completed\n');

    // Test 3: AVERAGE aggregate
    console.log('📈 Test 3: AVERAGE Aggregate');
    const avgResult = await calculate({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      operation: 'aggregate',
      range: 'A1:A10',
      aggregateFunction: 'AVERAGE'
    });
    console.log('AVERAGE result:', avgResult);
    console.log('✅ AVERAGE aggregate completed\n');

    // Test 4: COUNT aggregate
    console.log('🔢 Test 4: COUNT Aggregate');
    const countResult = await calculate({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      operation: 'aggregate',
      range: 'A1:A10',
      aggregateFunction: 'COUNT'
    });
    console.log('COUNT result:', countResult);
    console.log('✅ COUNT aggregate completed\n');

    // Test 5: MAX aggregate
    console.log('⬆️ Test 5: MAX Aggregate');
    const maxResult = await calculate({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      operation: 'aggregate',
      range: 'A1:A10',
      aggregateFunction: 'MAX'
    });
    console.log('MAX result:', maxResult);
    console.log('✅ MAX aggregate completed\n');

    // Test 6: MIN aggregate
    console.log('⬇️ Test 6: MIN Aggregate');
    const minResult = await calculate({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      operation: 'aggregate',
      range: 'A1:A10',
      aggregateFunction: 'MIN'
    });
    console.log('MIN result:', minResult);
    console.log('✅ MIN aggregate completed\n');

    // Test 7: Aggregate with output range
    console.log('💾 Test 7: Aggregate with Output Range');
    const outputResult = await calculate({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      operation: 'aggregate',
      range: 'A1:A5',
      aggregateFunction: 'SUM',
      outputRange: 'B1'
    });
    console.log('Output result:', outputResult);
    console.log('✅ Aggregate with output range completed\n');

    console.log('🎉 All calculate tool tests completed successfully!');

  } catch (error) {
    console.error('❌ Calculate tool test failed:', error.message);
    
    if (error.message.includes('Authentication')) {
      console.log('\n💡 Tip: Make sure you have authenticated with Google Sheets API');
      console.log('Run the MCP server and authenticate first, then try again.');
    }
    
    if (error.message.includes('permission')) {
      console.log('\n💡 Tip: Make sure the spreadsheet is accessible');
      console.log('You may need to use a different spreadsheet ID or check permissions.');
    }
    
    process.exit(1);
  }
}

// Run the test
testCalculateTool();
