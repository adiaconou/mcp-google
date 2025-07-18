/**
 * Simple MCP Server Test Script
 * 
 * This script tests the MCP server by sending basic MCP protocol messages
 * and verifying the responses.
 */

const { spawn } = require('child_process');

async function testMCPServer() {
  console.log('Testing MCP Server...');
  
  // Start the MCP server
  const server = spawn('node', ['dist/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let responseData = '';
  
  // Collect server output
  server.stdout.on('data', (data) => {
    responseData += data.toString();
  });

  server.stderr.on('data', (data) => {
    console.log('Server stderr:', data.toString());
  });

  // Send initialize request
  const initRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {
        roots: {
          listChanged: true
        },
        sampling: {}
      },
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    }
  };

  console.log('Sending initialize request...');
  server.stdin.write(JSON.stringify(initRequest) + '\n');

  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Send tools/list request
  const toolsRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  };

  console.log('Sending tools/list request...');
  server.stdin.write(JSON.stringify(toolsRequest) + '\n');

  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test calendar_list_events tool
  const callToolRequest = {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'calendar_list_events',
      arguments: {
        maxResults: 5
      }
    }
  };

  console.log('Sending calendar_list_events tool call...');
  server.stdin.write(JSON.stringify(callToolRequest) + '\n');

  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Close the server
  server.kill();

  console.log('\nServer responses:');
  console.log(responseData);
}

// Run the test
testMCPServer().catch(console.error);
