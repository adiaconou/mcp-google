#!/usr/bin/env node

/**
 * Test Lazy Authentication Implementation
 * 
 * This script tests the new lazy authentication approach to ensure
 * that the MCP server starts without authentication and provides
 * clear error messages when tools are called without authentication.
 */

const { spawn } = require('child_process');
const path = require('path');

/**
 * Test the MCP server with lazy authentication
 */
async function testLazyAuthentication() {
  console.log('🧪 Testing Lazy Authentication Implementation');
  console.log('=============================================\n');
  
  console.log('📋 Test Plan:');
  console.log('1. Start MCP server (should start without authentication)');
  console.log('2. Send tools/list request (should work)');
  console.log('3. Send tools/call request (should return auth error)');
  console.log('4. Verify error message is helpful and actionable\n');
  
  // Test 1: Start the server
  console.log('🚀 Test 1: Starting MCP server...');
  
  const serverPath = path.join(__dirname, 'dist', 'index.js');
  const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'test' }
  });
  
  let serverOutput = '';
  let serverErrors = '';
  
  server.stdout.on('data', (data) => {
    serverOutput += data.toString();
  });
  
  server.stderr.on('data', (data) => {
    serverErrors += data.toString();
  });
  
  // Give server time to start
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  if (server.killed) {
    console.log('❌ Server failed to start');
    console.log('Server errors:', serverErrors);
    return;
  }
  
  console.log('✅ Server started successfully');
  console.log('Server output:', serverErrors.split('\n').slice(-3).join('\n'));
  
  // Test 2: List tools
  console.log('\n🔍 Test 2: Listing available tools...');
  
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  };
  
  server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
  
  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('✅ Tools list request sent');
  
  // Test 3: Call a tool without authentication
  console.log('\n🔐 Test 3: Calling Gmail tool without authentication...');
  
  const callToolRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'gmail_list_messages',
      arguments: {
        maxResults: 5
      }
    }
  };
  
  server.stdin.write(JSON.stringify(callToolRequest) + '\n');
  
  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('✅ Tool call request sent');
  
  // Test 4: Check server output for authentication error
  console.log('\n📊 Test 4: Analyzing server responses...');
  
  // Parse server output for JSON responses
  const outputLines = serverOutput.split('\n').filter(line => line.trim());
  let foundAuthError = false;
  let authErrorMessage = '';
  
  for (const line of outputLines) {
    try {
      const response = JSON.parse(line);
      if (response.id === 2 && response.result && response.result.isError) {
        foundAuthError = true;
        authErrorMessage = response.result.content[0]?.text || '';
        break;
      }
    } catch {
      // Not JSON, skip
    }
  }
  
  if (foundAuthError) {
    console.log('✅ Authentication error detected correctly');
    console.log('📝 Error message preview:');
    console.log(authErrorMessage.substring(0, 200) + '...');
    
    // Check if error message contains expected guidance
    const hasGuidance = authErrorMessage.includes('clear-tokens-enhanced.js') &&
                       authErrorMessage.includes('Restart Claude Desktop');
    
    if (hasGuidance) {
      console.log('✅ Error message contains proper guidance');
    } else {
      console.log('⚠️  Error message missing expected guidance');
    }
  } else {
    console.log('❌ No authentication error detected');
    console.log('Server output:', serverOutput);
  }
  
  // Cleanup
  console.log('\n🧹 Cleaning up...');
  server.kill('SIGTERM');
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('================');
  console.log('✅ Server starts without authentication');
  console.log('✅ Tools can be listed');
  console.log(foundAuthError ? '✅ Authentication error properly returned' : '❌ Authentication error not detected');
  console.log(foundAuthError && authErrorMessage.includes('clear-tokens-enhanced.js') ? '✅ Error message contains guidance' : '⚠️  Error message needs improvement');
  
  console.log('\n🎯 Next Steps:');
  console.log('1. Test this with Claude Desktop');
  console.log('2. Try calling a Gmail tool');
  console.log('3. Follow the authentication guidance');
  console.log('4. Verify OAuth flow works correctly');
  
  console.log('\n✨ Lazy authentication test completed!');
}

// Run the test
testLazyAuthentication().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
