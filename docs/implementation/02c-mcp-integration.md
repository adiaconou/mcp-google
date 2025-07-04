# Milestone 1.2c: MCP Integration

## Objective
Wire everything together, update the main entry point, and ensure MCP protocol works with proper testing.

## Prerequisites
- Completed: 02a-mcp-basic-types.md
- Completed: 02b-mcp-server-core.md

## 🤖 CLINE EXECUTABLE STEPS

All steps in this milestone can be executed by Cline as they involve creating code files.

## Implementation Steps

### 1. Update Main Entry Point
Update `src/index.ts`:
```typescript
#!/usr/bin/env node

import { GoogleMCPServer, createToolResult } from './server.js';

/**
 * Main entry point for the Google MCP Server
 */
async function main(): Promise<void> {
  try {
    // Create and configure the server
    const server = new GoogleMCPServer();
    
    // Register a test tool to verify the server works
    server.registerTool(
      {
        name: 'test_connection',
        description: 'Test the MCP server connection',
        inputSchema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Optional test message',
            },
          },
        },
      },
      async (args) => {
        const message = args.message as string || 'Hello from Google MCP Server!';
        return createToolResult(`Test successful: ${message}`);
      }
    );

    // Start the server
    await server.start();
    
    // Keep the process running
    process.on('SIGINT', async () => {
      console.error('Received SIGINT, shutting down gracefully...');
      await server.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.error('Received SIGTERM, shutting down gracefully...');
      await server.stop();
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start Google MCP Server:', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
```

### 2. Update Tests
Update `tests/server.test.ts`:
```typescript
import { GoogleMCPServer, createToolResult } from '../src/server.js';

describe('GoogleMCPServer', () => {
  let server: GoogleMCPServer;

  beforeEach(() => {
    server = new GoogleMCPServer();
  });

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
  });

  test('should initialize successfully', () => {
    expect(server).toBeInstanceOf(GoogleMCPServer);
  });

  test('should register tools successfully', () => {
    const testTool = {
      name: 'test_tool',
      description: 'A test tool',
      inputSchema: {
        type: 'object' as const,
        properties: {},
      },
    };

    const handler = async () => createToolResult('test result');

    // Should not throw
    expect(() => {
      server.registerTool(testTool, handler);
    }).not.toThrow();
  });

  test('createToolResult should create proper result format', () => {
    const result = createToolResult('test message');
    
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: 'test message',
        },
      ],
      isError: false,
    });
  });

  test('createToolResult should handle error flag', () => {
    const result = createToolResult('error message', true);
    
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: 'error message',
        },
      ],
      isError: true,
    });
  });
});
```

### 3. Update Package.json Binary Entry
Update `package.json` to include the binary entry:
```json
{
  "bin": {
    "google-mcp-server": "./dist/index.js"
  }
}
```

## Testing Criteria
- [ ] Server compiles without TypeScript errors (`npm run build`)
- [ ] Tests pass (`npm test`)
- [ ] Server starts without errors (`npm run dev`)
- [ ] MCP protocol communication works via stdio
- [ ] Test tool is registered and available
- [ ] Server shuts down gracefully on SIGINT/SIGTERM

## Manual Testing

### 1. Basic Server Test
```bash
# Build the project
npm run build

# Start the server
npm run dev

# The server should start and log to stderr:
# "Google MCP Server started successfully"
# "Registered tools: test_connection"
```

### 2. MCP Protocol Test
Create a simple test script `test-mcp.js`:
```javascript
import { spawn } from 'child_process';

const server = spawn('npm', ['run', 'dev'], {
  stdio: ['pipe', 'pipe', 'inherit']
});

// Test initialize request
const initRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: {
      name: 'test-client',
      version: '1.0.0'
    }
  }
};

server.stdin.write(JSON.stringify(initRequest) + '\n');

// Test tools/list request
const listToolsRequest = {
  jsonrpc: '2.0',
  id: 2,
  method: 'tools/list',
  params: {}
};

setTimeout(() => {
  server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
}, 1000);

server.stdout.on('data', (data) => {
  console.log('Server response:', data.toString());
});

setTimeout(() => {
  server.kill();
}, 5000);
```

## Deliverables
- Working MCP server with stdio transport
- Test tool registration and execution
- Proper error handling and graceful shutdown
- Comprehensive test suite
- Manual testing procedures

## Next Steps
This implementation enables:
- **File 03**: Server foundation and enhanced architecture
- **File 04**: OAuth authentication setup
- Registration of actual Google service tools

## Estimated Time
30 minutes for integration and testing setup.
