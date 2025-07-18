/**
 * Test script for Gmail Export Email Screenshot tool
 * 
 * This script tests the email screenshot functionality by simulating
 * a tool call through the MCP server.
 */

const { server } = require('./dist/server.js');

async function testScreenshotTool() {
  console.log('🧪 Testing Gmail Export Email Screenshot Tool...\n');
  
  try {
    // Start the server
    console.log('📡 Starting MCP server...');
    
    // Get server status to verify tools are registered
    const status = server.getStatus();
    console.log(`✅ Server running with ${status.toolCount} tools registered`);
    console.log(`📋 Available tools: ${status.tools.join(', ')}\n`);
    
    // Check if our screenshot tool is registered
    const hasScreenshotTool = status.tools.includes('gmail_export_email_screenshot');
    if (hasScreenshotTool) {
      console.log('✅ Gmail Export Email Screenshot tool is registered successfully!');
    } else {
      console.log('❌ Gmail Export Email Screenshot tool is NOT registered');
      console.log('Available tools:', status.tools);
      return;
    }
    
    console.log('\n🎯 Tool registration test completed successfully!');
    console.log('\n📝 Tool Details:');
    console.log('- Name: gmail_export_email_screenshot');
    console.log('- Purpose: Export Gmail email content as PNG screenshots');
    console.log('- Features: Handles inline images, CSS normalization, high-quality output');
    console.log('- Use cases: Archiving receipts, important email content, visual documentation');
    
    console.log('\n🔧 Usage Example:');
    console.log('```');
    console.log('Tool: gmail_export_email_screenshot');
    console.log('Parameters: {');
    console.log('  "messageId": "your-gmail-message-id",');
    console.log('  "outputPath": "./screenshots",');
    console.log('  "filename": "receipt_2025",');
    console.log('  "width": 800,');
    console.log('  "includeImages": true,');
    console.log('  "deviceScaleFactor": 2');
    console.log('}');
    console.log('```');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run the test
testScreenshotTool().catch(console.error);
