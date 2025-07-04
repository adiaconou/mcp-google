# Milestone 1.2b: MCP Server Core

## Objective
Implement the minimal MCP server with stdio transport and basic tool registration.

## Prerequisites
- Completed: 02a-mcp-basic-types.md
- @modelcontextprotocol/sdk installed

## 🤖 CLINE EXECUTABLE STEPS

All steps in this milestone can be executed by Cline as they involve creating code files.

## Implementation Steps

### 1. Create Core MCP Server
Create `src/server.ts`:
```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  MCPTool,
  MCPToolResult,
  MCPServerCapabilities,
} from './types/mcp.js';

export class GoogleMCPServer {
  private server: Server;
  private tools: Map<string, MCPTool> = new Map();
  private toolHandlers: Map<string, (args: Record<string, unknown>) => Promise<MCPToolResult>> = new Map();

  constructor() {
    this.server = new Server(
      {
        name: 'google-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: this.getServerCapabilities(),
      }
    );

    this.setupHandlers();
  }

  private getServerCapabilities(): MCPServerCapabilities {
    return {
      tools: {
        listChanged: true,
      },
    };
  }

  private setupHandlers(): void {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: Array.from(this.tools.values()),
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      const handler = this.toolHandlers.get(name);
      if (!handler) {
        throw new Error(`Unknown tool: ${name}`);
      }

      try {
        const result = await handler(args || {});
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [
            {
              type: 'text',
              text: `Error executing tool ${name}: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Register a new tool with the server
   */
  public registerTool(
    tool: MCPTool,
    handler: (args: Record<string, unknown>) => Promise<MCPToolResult>
  ): void {
    this.tools.set(tool.name, tool);
    this.toolHandlers.set(tool.name, handler);
  }

  /**
   * Start the server with stdio transport
   */
  public async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    // Log server start to stderr (stdout is used for MCP communication)
    console.error('Google MCP Server started successfully');
    console.error(`Registered tools: ${Array.from(this.tools.keys()).join(', ')}`);
  }

  /**
   * Stop the server
   */
  public async stop(): Promise<void> {
    await this.server.close();
  }
}

// Utility function to create simple tool results
export function createToolResult(
  content: string,
  isError: boolean = false
): MCPToolResult {
  return {
    content: [
      {
        type: 'text',
        text: content,
      },
    ],
    isError,
  };
}
```

## Testing Criteria
- [ ] Server compiles without errors
- [ ] Can register tools successfully
- [ ] Server starts with stdio transport
- [ ] Basic error handling works

## Deliverables
- Working MCP server class
- Tool registration system
- Stdio transport integration
- Basic error handling

## Next Steps
This enables:
- **File 02c**: Integration and testing
- Tool registration for Google APIs

## Estimated Time
30 minutes for core server implementation.
