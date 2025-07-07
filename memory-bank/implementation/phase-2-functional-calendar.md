# Phase 2: Functional Calendar MCP Server (CURRENT)

## Overview
Transform the foundation into a working MCP server that provides two essential calendar tools: `calendar_list_events` and `calendar_create_event`. This phase implements only the minimal components needed to deliver immediate value while establishing extensible patterns for future API integrations.

## Human Prerequisites
Before starting Phase 2 implementation, the user must complete these setup tasks:

### 1. Google Cloud Project Setup
- Create or select a Google Cloud project at https://console.cloud.google.com
- Enable the Google Calendar API for the project
- Note the project ID for configuration

### 2. OAuth 2.0 Credentials Configuration
- Go to "Credentials" in Google Cloud Console
- Create OAuth 2.0 Client ID credentials
- Select "Desktop application" as application type
- Add `http://localhost:8080/auth/callback` to authorized redirect URIs
- Download the client credentials JSON file
- Extract `client_id` and `client_secret` values

### 3. Environment Configuration
- Copy `.env.example` to `.env`
- Add the Google OAuth credentials to `.env`:
  ```
  GOOGLE_CLIENT_ID=your_client_id_here
  GOOGLE_CLIENT_SECRET=your_client_secret_here
  GOOGLE_REDIRECT_URI=http://localhost:8080/auth/callback
  ```

### 4. Test Google Account Setup
- Ensure you have a Google account with Calendar access
- Create at least one test calendar event for testing
- Note your primary calendar ID (usually your email address)

## Objectives
- Implement minimal MCP protocol (stdio transport, tool execution)
- Add basic OAuth 2.0 flow for Calendar API access only
- Create Calendar API client focused on event operations
- Deliver two working tools: list events and create events
- Establish extensible patterns for future API integrations
- Enable immediate testing and user feedback

## Implementation Steps
1. ☑ Create minimal MCP type definitions for protocol basics
2. ☑ Implement basic tool registry for calendar tools only
3. ☑ Add simple OAuth manager for Calendar API scope
4. ☑ Create Calendar API client with event operations
5. ☑ Implement `calendar_list_events` tool with filtering
6. ☐ Implement `calendar_create_event` tool with validation
7. ☐ Implement functional MCP server with stdio transport
8. ☐ Add tool registration and execution pipeline
9. ☐ Create basic error handling for calendar operations
10. ☐ Add integration tests for calendar tools
11. ☐ Test with Claude Desktop or other MCP client

## Implementation Plan

### Step 1: Create Minimal MCP Type Definitions
**Files**: `src/types/mcp.ts` (enhanced)
- Define core MCP protocol message types (MCPRequest, MCPResponse)
- Create tool definition interfaces with input/output schemas
- Add basic error type definitions
- Focus only on types needed for calendar tools

**Key Types**:
```typescript
interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: unknown;
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema: JSONSchema7;
  handler: (args: unknown) => Promise<MCPToolResult>;
}

interface CalendarEvent {
  id?: string;
  summary: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  description?: string;
}
```

### Step 2: Implement Basic Tool Registry
**Files**: `src/utils/toolRegistry.ts`
- Create simple ToolRegistry class with Map-based storage
- Add register() method for calendar tools
- Implement getTool() and listTools() methods
- Add basic tool validation
- Keep it minimal but extensible

### Step 3: Add Simple OAuth Manager
**Files**: `src/auth/oauthManager.ts`
- Create OAuthManager class focused on Calendar API
- Implement basic OAuth 2.0 flow with PKCE
- Add token storage (simple file-based for now)
- Include only Calendar API scope: `https://www.googleapis.com/auth/calendar`
- Add automatic token refresh

### Step 4: Create Calendar API Client
**Files**: `src/services/calendar/calendarClient.ts`
- Create CalendarClient wrapper for Google Calendar API
- Add authentication integration with OAuth manager
- Implement event listing with basic filtering
- Add event creation with validation
- Include basic error handling

### Step 5: Implement Calendar List Events Tool
**Files**: `src/services/calendar/tools/listEvents.ts`
- Create `calendar_list_events` MCP tool
- Add input schema for date range and calendar filtering
- Implement event listing with time-based filtering
- Return formatted event data
- Add error handling for common scenarios

**Tool Schema**:
```typescript
{
  name: "calendar_list_events",
  description: "List calendar events with optional filtering",
  inputSchema: {
    type: "object",
    properties: {
      calendarId: { type: "string", default: "primary" },
      timeMin: { type: "string", format: "date-time" },
      timeMax: { type: "string", format: "date-time" },
      maxResults: { type: "number", default: 10, maximum: 100 }
    }
  }
}
```

### Step 6: Implement Calendar Create Event Tool
**Files**: `src/services/calendar/tools/createEvent.ts`
- Create `calendar_create_event` MCP tool
- Add comprehensive input schema for event creation
- Implement event creation with validation
- Return created event details
- Add error handling for validation and API errors

**Tool Schema**:
```typescript
{
  name: "calendar_create_event",
  description: "Create a new calendar event",
  inputSchema: {
    type: "object",
    required: ["summary", "start", "end"],
    properties: {
      calendarId: { type: "string", default: "primary" },
      summary: { type: "string" },
      description: { type: "string" },
      start: {
        type: "object",
        required: ["dateTime"],
        properties: {
          dateTime: { type: "string", format: "date-time" },
          timeZone: { type: "string" }
        }
      },
      end: {
        type: "object",
        required: ["dateTime"],
        properties: {
          dateTime: { type: "string", format: "date-time" },
          timeZone: { type: "string" }
        }
      }
    }
  }
}
```

### Step 7: Implement Functional MCP Server with Stdio Transport
**Files**: `src/server.ts` (complete rewrite from skeleton)
- Replace skeleton GoogleMCPServer with functional MCP SDK integration
- Import and configure MCP SDK Server class with stdio transport
- Implement MCP protocol message handling (initialize, tools/list, tools/call)
- Add MCP server lifecycle management (start, stop, error handling)
- Create server capabilities declaration for calendar tools
- Implement request/response pipeline with proper error handling
- Add graceful shutdown with cleanup and resource management
- Transform from placeholder into working MCP server that can communicate with clients

**Key Implementation Details**:
```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

class GoogleMCPServer {
  private server: Server;
  private transport: StdioServerTransport;
  
  constructor() {
    this.server = new Server({
      name: 'google-mcp-server',
      version: '1.0.0'
    }, {
      capabilities: {
        tools: {}
      }
    });
    
    this.transport = new StdioServerTransport();
  }
  
  async start(): Promise<void> {
    await this.server.connect(this.transport);
    console.error('Google MCP Server started'); // Use stderr for logging
  }
}
```

**Critical Success Criteria**:
- Server accepts MCP protocol messages via stdin
- Server sends proper MCP responses via stdout
- Server handles initialize, tools/list, and tools/call methods
- Error handling prevents server crashes
- Logging goes to stderr (not stdout which is reserved for MCP protocol)

### Step 8: Add Tool Registration and Execution
**Files**: `src/server.ts` (tool integration)
- Register calendar tools with tool registry
- Implement tools/list request handler
- Add tools/call request handler with validation
- Create tool execution pipeline
- Add request/response logging

### Step 9: Create Basic Error Handling
**Files**: `src/utils/errors.ts`
- Define CalendarError class for calendar-specific errors
- Add OAuth error handling
- Create API error mapping
- Implement user-friendly error messages
- Add error logging

### Step 10: Add Integration Tests
**Files**: `tests/integration/calendar.test.ts`
- Test complete OAuth flow
- Validate calendar tool execution
- Test error scenarios
- Add MCP protocol compliance tests
- Create mock calendar API for testing

### Step 11: Test with MCP Client
**Manual Testing**:
- Connect with Claude Desktop
- Test tool discovery
- Execute calendar_list_events
- Execute calendar_create_event
- Validate error handling

## Success Criteria

### Functional Requirements
- ☐ MCP server starts and communicates via stdio without errors
- ☐ OAuth flow completes successfully and stores tokens securely
- ☐ `calendar_list_events` returns user's calendar events correctly
- ☐ `calendar_create_event` successfully creates new events
- ☐ Error handling provides clear, actionable error messages
- ☐ Integration with Claude Desktop works end-to-end

### Technical Requirements
- ☐ TypeScript compilation passes without errors
- ☐ ESLint validation passes without violations
- ☐ Integration tests validate complete workflows
- ☐ OAuth token refresh works automatically
- ☐ Tool schemas validate input correctly

### User Experience Requirements
- ☐ Setup process is clear and well-documented
- ☐ Error messages guide users to solutions
- ☐ Tools respond within reasonable time limits (<2 seconds)
- ☐ Calendar events display in readable format
- ☐ Event creation provides confirmation of success

## Key Files Created

### Core Implementation Files
```
src/
├── types/
│   └── mcp.ts                # Minimal MCP protocol types
├── utils/
│   ├── toolRegistry.ts       # Basic tool registration
│   └── errors.ts             # Calendar error handling
├── auth/
│   └── oauthManager.ts       # Simple OAuth for Calendar API
├── services/calendar/
│   ├── calendarClient.ts     # Calendar API wrapper
│   └── tools/
│       ├── listEvents.ts     # List events tool
│       └── createEvent.ts    # Create event tool
└── server.ts                 # Enhanced with MCP integration
```

### Test Files
```
tests/
├── integration/
│   └── calendar.test.ts      # Calendar tools integration tests
└── unit/
    ├── toolRegistry.test.ts  # Tool registry tests
    └── oauthManager.test.ts  # OAuth manager tests
```

## Environment Configuration

### Required Environment Variables
```env
# Google OAuth Configuration (User must provide)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:8080/auth/callback

# OAuth Settings
OAUTH_CALLBACK_PORT=8080
OAUTH_CALLBACK_TIMEOUT=300000  # 5 minutes

# Development Settings
LOG_LEVEL=info
NODE_ENV=development
```

## Performance Targets

### Response Time Requirements
- Tool discovery (tools/list): < 100ms
- Calendar list events: < 1 second
- Calendar create event: < 2 seconds
- OAuth flow completion: < 30 seconds
- Server startup: < 2 seconds

### Resource Usage Limits
- Memory usage: < 100MB for calendar operations
- CPU usage: < 5% for idle operations
- Token refresh: < 500ms

## Testing Strategy

### Integration Testing Focus
- Complete OAuth flow with real Google Calendar API
- Tool execution with various input parameters
- Error scenarios and recovery
- MCP protocol compliance
- Performance under normal load

### Manual Testing Checklist
- [ ] Connect with Claude Desktop successfully
- [ ] OAuth flow completes without errors
- [ ] List events shows actual calendar data
- [ ] Create event appears in Google Calendar
- [ ] Error scenarios provide helpful messages
- [ ] Server shutdown is clean and responsive

## Risk Mitigation

### Technical Risks
- **OAuth Complexity**: Use proven OAuth libraries and clear documentation
- **API Rate Limits**: Implement basic rate limiting and user guidance
- **Token Security**: Use secure file permissions for token storage
- **MCP Compatibility**: Test with multiple MCP clients

### User Experience Risks
- **Setup Complexity**: Provide step-by-step setup instructions
- **Error Messages**: Create clear, actionable error messages
- **Performance**: Set realistic expectations for API response times

## Next Phase Preparation

### Gmail Integration Readiness (Phase 3)
- OAuth manager ready to add Gmail scopes
- Tool registry ready for Gmail tools
- Error handling framework extensible to Gmail errors
- Server architecture supports additional services

### Extensibility Patterns Established
- Service-specific directory structure (`src/services/{service}/`)
- Tool registration pattern for new APIs
- OAuth scope management for multiple services
- Error handling framework for API-specific errors

## Value Delivered

### Immediate User Benefits
- **Working Calendar Tools**: Users can list and create calendar events through AI
- **MCP Integration**: Compatible with Claude Desktop and other MCP clients
- **Secure Authentication**: OAuth 2.0 with proper token management
- **Extensible Foundation**: Ready for additional Google API integrations

### Development Benefits
- **Proven Patterns**: Establishes patterns for future API integrations
- **Early Feedback**: Users can test and provide feedback on core architecture
- **Risk Reduction**: Core MCP and OAuth functionality validated
- **Incremental Progress**: Clear milestone with tangible functionality

This phase transforms the project from a foundation into a working tool that users can immediately test and benefit from, while establishing the patterns needed for rapid expansion to other Google APIs.
