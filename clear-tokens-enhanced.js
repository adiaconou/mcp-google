#!/usr/bin/env node

/**
 * Enhanced Token Clearing Utility - Phase 1: Comprehensive Token Clearing
 * 
 * This script provides comprehensive token clearing that checks all possible
 * storage locations where OAuth tokens might be cached, including system-level
 * caches that could interfere with reauthentication.
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

/**
 * Potential token storage locations to check and clear
 */
const TOKEN_LOCATIONS = [
  // Primary MCP server token location
  {
    name: 'MCP Server Tokens',
    path: path.join(process.cwd(), '.tokens', 'calendar-tokens.json'),
    required: true
  },
  
  // Backup/alternative token locations
  {
    name: 'Alternative Token Directory',
    path: path.join(process.cwd(), 'tokens', 'calendar-tokens.json'),
    required: false
  },
  
  // User home directory token storage
  {
    name: 'User Home Tokens',
    path: path.join(os.homedir(), '.google-mcp-tokens.json'),
    required: false
  },
  
  // Temporary directory tokens
  {
    name: 'Temp Directory Tokens',
    path: path.join(os.tmpdir(), 'google-mcp-tokens.json'),
    required: false
  },
  
  // Node.js cache directory
  {
    name: 'Node Cache Tokens',
    path: path.join(os.homedir(), '.cache', 'google-mcp', 'tokens.json'),
    required: false
  }
];

/**
 * Google OAuth cache locations that might interfere
 */
const GOOGLE_CACHE_LOCATIONS = [
  // Google OAuth cache in user directory
  {
    name: 'Google OAuth Cache',
    path: path.join(os.homedir(), '.google-oauth-cache'),
    isDirectory: true
  },
  
  // Chrome/Chromium OAuth cache
  {
    name: 'Chrome OAuth Cache',
    path: path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Local Storage'),
    isDirectory: true,
    platform: 'win32'
  },
  
  // Firefox OAuth cache
  {
    name: 'Firefox OAuth Cache',
    path: path.join(os.homedir(), 'AppData', 'Roaming', 'Mozilla', 'Firefox', 'Profiles'),
    isDirectory: true,
    platform: 'win32'
  }
];

/**
 * Claude Desktop specific locations
 */
const CLAUDE_DESKTOP_LOCATIONS = [
  // Claude Desktop app data
  {
    name: 'Claude Desktop App Data',
    path: path.join(os.homedir(), 'AppData', 'Roaming', 'Claude'),
    isDirectory: true,
    platform: 'win32'
  },
  
  // Claude Desktop local data
  {
    name: 'Claude Desktop Local Data',
    path: path.join(os.homedir(), 'AppData', 'Local', 'Claude'),
    isDirectory: true,
    platform: 'win32'
  }
];

/**
 * Check if a file or directory exists
 */
async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file/directory stats safely
 */
async function getSafeStats(filePath) {
  try {
    return await fs.stat(filePath);
  } catch {
    return null;
  }
}

/**
 * Clear a single token file
 */
async function clearTokenFile(location) {
  try {
    if (await exists(location.path)) {
      await fs.unlink(location.path);
      console.log(`✅ Cleared: ${location.name}`);
      console.log(`   Path: ${location.path}`);
      return true;
    } else {
      console.log(`ℹ️  Not found: ${location.name}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error clearing ${location.name}: ${error.message}`);
    return false;
  }
}

/**
 * Clear a directory (with caution)
 */
async function clearCacheDirectory(location) {
  try {
    if (await exists(location.path)) {
      const stats = await getSafeStats(location.path);
      if (stats && stats.isDirectory()) {
        console.log(`⚠️  Found cache directory: ${location.name}`);
        console.log(`   Path: ${location.path}`);
        console.log(`   Note: Manual review recommended for cache directories`);
        return true;
      }
    } else {
      console.log(`ℹ️  Cache not found: ${location.name}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error checking ${location.name}: ${error.message}`);
    return false;
  }
}

/**
 * Check for running Claude Desktop processes
 */
async function checkClaudeDesktopProcesses() {
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    console.log('🔍 Checking for running Claude Desktop processes...');
    
    if (process.platform === 'win32') {
      try {
        const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq Claude.exe" /FO CSV');
        if (stdout.includes('Claude.exe')) {
          console.log('⚠️  Claude Desktop is currently running!');
          console.log('   Recommendation: Close Claude Desktop and restart it after clearing tokens');
          return true;
        } else {
          console.log('✅ Claude Desktop is not currently running');
          return false;
        }
      } catch {
        console.log('ℹ️  Could not check Claude Desktop process status');
        return false;
      }
    } else {
      console.log('ℹ️  Process checking only supported on Windows');
      return false;
    }
  } catch (error) {
    console.log(`ℹ️  Could not check processes: ${error.message}`);
    return false;
  }
}

/**
 * Clear all MCP server related directories
 */
async function clearMCPDirectories() {
  console.log('\n📁 Clearing MCP server directories...');
  
  const mcpDirectories = [
    path.join(process.cwd(), '.tokens'),
    path.join(process.cwd(), 'tokens'),
    path.join(process.cwd(), '.cache'),
    path.join(process.cwd(), 'cache')
  ];
  
  for (const dir of mcpDirectories) {
    try {
      if (await exists(dir)) {
        const files = await fs.readdir(dir);
        console.log(`📂 Found directory: ${dir}`);
        console.log(`   Contains ${files.length} files: ${files.join(', ')}`);
        
        // Clear all files in the directory
        for (const file of files) {
          const filePath = path.join(dir, file);
          try {
            await fs.unlink(filePath);
            console.log(`   ✅ Deleted: ${file}`);
          } catch (error) {
            console.log(`   ❌ Could not delete ${file}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      console.log(`❌ Error processing directory ${dir}: ${error.message}`);
    }
  }
}

/**
 * Main token clearing function
 */
async function clearAllTokens() {
  console.log('🧹 Enhanced Token Clearing Utility');
  console.log('=====================================\n');
  
  let clearedCount = 0;
  let foundCaches = 0;
  
  // Check for running Claude Desktop
  const claudeRunning = await checkClaudeDesktopProcesses();
  
  // Clear primary token files
  console.log('🎯 Clearing OAuth token files...');
  for (const location of TOKEN_LOCATIONS) {
    const cleared = await clearTokenFile(location);
    if (cleared) clearedCount++;
  }
  
  // Clear MCP directories
  await clearMCPDirectories();
  
  // Check Google OAuth caches
  console.log('\n🔍 Checking Google OAuth caches...');
  for (const location of GOOGLE_CACHE_LOCATIONS) {
    // Skip platform-specific locations
    if (location.platform && location.platform !== process.platform) {
      continue;
    }
    
    const found = await clearCacheDirectory(location);
    if (found) foundCaches++;
  }
  
  // Check Claude Desktop caches
  console.log('\n🔍 Checking Claude Desktop caches...');
  for (const location of CLAUDE_DESKTOP_LOCATIONS) {
    // Skip platform-specific locations
    if (location.platform && location.platform !== process.platform) {
      continue;
    }
    
    const found = await clearCacheDirectory(location);
    if (found) foundCaches++;
  }
  
  // Summary
  console.log('\n📊 Summary');
  console.log('===========');
  console.log(`✅ Token files cleared: ${clearedCount}`);
  console.log(`🔍 Cache directories found: ${foundCaches}`);
  
  if (claudeRunning) {
    console.log('\n⚠️  IMPORTANT: Claude Desktop is running!');
    console.log('   Please close Claude Desktop and restart it for changes to take effect.');
  }
  
  console.log('\n🚀 Next Steps:');
  console.log('1. If Claude Desktop is running, close it completely');
  console.log('2. Restart Claude Desktop');
  console.log('3. Try using a Gmail tool (e.g., "list my recent emails")');
  console.log('4. You should be prompted to authenticate with Gmail permissions');
  console.log('5. Complete the OAuth flow in the browser that opens');
  
  console.log('\n🔧 If authentication still doesn\'t work:');
  console.log('1. Check that the MCP server is properly configured in Claude Desktop');
  console.log('2. Verify the server starts without errors');
  console.log('3. Check the Claude Desktop logs for any error messages');
  
  console.log('\n✨ Enhanced token clearing completed!');
}

// Run the enhanced clearing
clearAllTokens().catch(error => {
  console.error('❌ Fatal error during token clearing:', error);
  process.exit(1);
});
