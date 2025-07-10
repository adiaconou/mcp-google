#!/usr/bin/env node

/**
 * Token Clearing Utility - Phase 1: Immediate Fix
 * 
 * This script provides a quick way to clear stored OAuth tokens
 * and force reauthentication when scope issues occur.
 */

const fs = require('fs').promises;
const path = require('path');

async function clearTokens() {
  try {
    const tokenPath = path.join(process.cwd(), '.tokens', 'calendar-tokens.json');
    
    console.log('🔄 Clearing stored OAuth tokens...');
    
    try {
      await fs.unlink(tokenPath);
      console.log('✅ Tokens cleared successfully!');
      console.log('📝 Next MCP server start will trigger fresh OAuth authentication.');
      console.log('🔐 You will need to grant Gmail permissions when prompted.');
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('ℹ️  No tokens found to clear (this is fine).');
      } else {
        throw error;
      }
    }
    
    console.log('\n🚀 Next steps:');
    console.log('1. Restart your MCP server');
    console.log('2. Try using a Gmail tool in Claude Desktop');
    console.log('3. Complete the OAuth flow when prompted');
    console.log('4. Gmail tools should now work with proper permissions');
    
  } catch (error) {
    console.error('❌ Error clearing tokens:', error.message);
    process.exit(1);
  }
}

// Run the script
clearTokens();
