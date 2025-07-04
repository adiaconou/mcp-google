# Milestone 1.2a: Basic MCP Types

## Objective
Create only the essential MCP types needed for basic protocol functionality.

## Prerequisites
- Completed: 01-project-setup.md
- Understanding of MCP protocol basics

## 🤖 CLINE EXECUTABLE STEPS

All steps in this milestone can be executed by Cline as they involve creating code files.

## Implementation Steps

### 1. Create Basic MCP Types
Create `src/types/mcp.ts`:
```typescript
// Basic MCP Protocol Types - Minimal Implementation

export interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: MCPError;
}

export interface MCPError {
  code: number;
  message: string;
  data?: unknown;
}

// Tool Definition Types
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

// Server Info Types
export interface MCPServerCapabilities {
  tools?: {
    listChanged?: boolean;
  };
}

export interface MCPServerInfo {
  name: string;
  version: string;
  capabilities: MCPServerCapabilities;
}
```

## Testing Criteria
- [ ] Types file compiles without errors
- [ ] TypeScript can import and use the types
- [ ] No runtime dependencies required

## Deliverables
- Basic MCP type definitions for protocol communication
- Tool definition interfaces
- Server capability types

## Next Steps
This enables:
- **File 02b**: Core MCP server implementation
- Basic type safety for MCP protocol

## Estimated Time
15 minutes for basic type definitions.
