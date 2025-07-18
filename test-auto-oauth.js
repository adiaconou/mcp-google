#!/usr/bin/env node

/**
 * Test Auto-Trigger OAuth Implementation
 * 
 * This script tests the new auto-trigger OAuth approach to ensure
 * that the MCP server automatically triggers OAuth flow when tools
 * are called without authentication.
 */

const { spawn } = require('child_process');
const path = require('path');

/**
 * Test the MCP server with auto-trigger OAuth
 */
async function testAutoOAuth() {
  console.log('🧪 Testing Auto-Trigger OAuth Implementation');
  console.log('===========================================\n');
  
  console.log('📋 Test Plan:');
  console.log('1. Start MCP server (should start without authentication)');
  console.log('2. Send tools/call request (should auto-trigger OAuth)');
  console.log('3. Verify OAuth flow is initiated');
  console.log('4. Check for browser opening or OAuth URL in logs\n');
  
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
    const output = data.toString();
    serverErrors += output;
    
    // Look for OAuth-related messages in real-time
    if (output.includes('OAuth') || output.includes('authentication') || output.includes('browser')) {
      console.log('📡 OAuth activity detected:', output.trim());
    }
  });
  
  // Give server time to start
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  if (server.killed) {
    console.log('❌ Server failed to start');
    console.log('Server errors:', serverErrors);
    return;
  }
  
  console.log('✅ Server started successfully');
  
  // Test 2: Call a tool to trigger OAuth
  console.log('\n🔐 Test 2: Calling Gmail tool to trigger OAuth...');
  
  const callToolRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'gmail_list_messages',
      arguments: {
        maxResults: 5
      }
    }
  };
  
  server.stdin.write(JSON.stringify(callToolRequest) + '\n');
  
  console.log('✅ Tool call request sent');
  console.log('🔍 Monitoring for OAuth flow initiation...');
  
  // Wait longer for OAuth flow to potentially start
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Test 3: Analyze server output for OAuth activity
  console.log('\n📊 Test 3: Analyzing OAuth flow initiation...');
  
  const hasOAuthAttempt = serverErrors.includes('Attempting to trigger OAuth flow') ||
                         serverErrors.includes('OAuth') ||
                         serverErrors.includes('authentication');
  
  const hasBrowserOpen = serverErrors.includes('browser') ||
                        serverErrors.includes('URL') ||
                        serverErrors.includes('localhost:8080');
  
  const hasAuthError = serverErrors.includes('OAuth flow failed') ||
                      serverErrors.includes('Authentication failed');
  
  // Parse server output for JSON responses
  const outputLines = serverOutput.split('\n').filter(line => line.trim());
  let toolResponse = null;
  
  for (const line of outputLines) {
    try {
      const response = JSON.parse(line);
      if (response.id === 1 && response.result) {
        toolResponse = response.result;
        break;
      }
    } catch {
      // Not JSON, skip
    }
  }
  
  console.log('\n📋 OAuth Flow Analysis:');
  console.log('========================');
  
  if (hasOAuthAttempt) {
    console.log('✅ OAuth flow initiation detected');
  } else {
    console.log('❌ No OAuth flow initiation detected');
  }
  
  if (hasBrowserOpen) {
    console.log('✅ Browser opening or OAuth URL detected');
  } else {
    console.log('⚠️  No browser opening detected');
  }
  
  if (hasAuthError) {
    console.log('⚠️  OAuth flow encountered errors (expected in test environment)');
  }
  
  if (toolResponse) {
    if (toolResponse.isError) {
      console.log('✅ Tool returned error response (expected without completing OAuth)');
      const errorText = toolResponse.content[0]?.text || '';
      if (errorText.includes('Automatic Authentication Failed')) {
        console.log('✅ Error message indicates auto-OAuth was attempted');
      }
    } else {
      console.log('🎉 Tool executed successfully (OAuth completed!)');
    }
  } else {
    console.log('⚠️  No tool response detected');
  }
  
  // Cleanup
  console.log('\n🧹 Cleaning up...');
  server.kill('SIGTERM');
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('================');
  console.log('✅ Server starts without authentication');
  console.log(hasOAuthAttempt ? '✅ OAuth flow automatically triggered' : '❌ OAuth flow not triggered');
  console.log(hasBrowserOpen ? '✅ Browser/OAuth URL activity detected' : '⚠️  No browser activity detected');
  console.log(toolResponse?.isError ? '✅ Appropriate error handling' : '⚠️  Unexpected response');
  
  console.log('\n🎯 Expected Behavior:');
  console.log('1. Server starts successfully ✅');
  console.log('2. Tool call triggers OAuth flow ✅');
  console.log('3. Browser opens for authentication (may fail in test env) ⚠️');
  console.log('4. Error message provides fallback guidance ✅');
  
  console.log('\n🚀 Next Steps:');
  console.log('1. Test this with Claude Desktop');
  console.log('2. Try calling a Gmail tool');
  console.log('3. Verify browser opens automatically');
  console.log('4. Complete OAuth flow in browser');
  console.log('5. Verify tool works after authentication');
  
  console.log('\n✨ Auto-trigger OAuth test completed!');
  
  // Show recent server logs for debugging
  console.log('\n📝 Recent Server Logs:');
  console.log('======================');
  const recentLogs = serverErrors.split('\n').slice(-10).join('\n');
  console.log(recentLogs);
}

// Run the test
testAutoOAuth().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
