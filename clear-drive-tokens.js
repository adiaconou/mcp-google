#!/usr/bin/env node

/**
 * Clear Drive Authentication Tokens
 * 
 * This script clears stored OAuth tokens to force re-authentication
 * with the updated Drive scope (drive instead of drive.file).
 */

const fs = require('fs');
const path = require('path');

async function clearTokens() {
  console.log('🔧 Clearing Drive Authentication Tokens...\n');
  
  const tokenPath = path.join(process.cwd(), '.tokens', 'calendar-tokens.json');
  
  try {
    // Check if tokens exist
    if (fs.existsSync(tokenPath)) {
      // Read current tokens to show what scopes they had
      try {
        const tokenData = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));
        console.log('📋 Current token scopes:', tokenData.scope || 'Unknown');
        console.log('🗑️  Removing tokens...');
        
        // Delete the token file
        fs.unlinkSync(tokenPath);
        console.log('✅ Tokens cleared successfully!');
      } catch (error) {
        // If we can't read the tokens, just delete the file
        fs.unlinkSync(tokenPath);
        console.log('✅ Tokens cleared successfully!');
      }
    } else {
      console.log('ℹ️  No tokens found to clear.');
    }
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Restart Claude Desktop completely');
    console.log('2. Try using a Drive tool (like drive_list_files)');
    console.log('3. Complete the OAuth flow when prompted');
    console.log('4. The new tokens will include the full "drive" scope');
    
    console.log('\n📝 Scope Change Summary:');
    console.log('   Old scope: https://www.googleapis.com/auth/drive.file');
    console.log('   New scope: https://www.googleapis.com/auth/drive');
    console.log('   Benefit:   Access to all your Drive files, not just app-created ones');
    
  } catch (error) {
    console.error('❌ Error clearing tokens:', error.message);
    process.exit(1);
  }
}

// Run the script
clearTokens().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
