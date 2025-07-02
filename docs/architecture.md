# Google MCP Server Architecture

## System Architecture

```
[ Personal Assistant / Agent ]
            |
      (MCP via stdio)
            |
     [ Google MCP Server ]
            |
     (OAuth + API Wrappers)
            |
[ Google Drive | Gmail | Calendar | Docs | Sheets ]
```

## Component Overview

### MCP Stdio Interface Layer
- Communicates via stdin/stdout using MCP protocol
- Handles JSON-RPC message formatting and error handling
- Provides consistent API surface regardless of underlying Google API differences
- No HTTP server or network endpoints required

### Authentication & Security Layer
- Manages OAuth 2.0 flows with temporary local server for initial setup
- Enforces scope-based access control
- Handles token refresh and expiration
- Secure local token storage with encryption

### Google API Wrapper Layer
- Abstracts Google API complexity into simplified operations
- Provides unified error handling and retry logic
- Normalizes data formats across different Google services
- Implements rate limiting and quota management

### Service Modules
- **Drive Module**: File and folder operations
- **Gmail Module**: Email search, retrieval, and attachment handling
- **Calendar Module**: Event management and scheduling
- **Docs Module**: Document creation and content manipulation
- **Sheets Module**: Spreadsheet data operations

## TypeScript Architecture

### Type Safety & API Contracts

**Strongly-Typed Google API Interfaces**:
```typescript
interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime: string;
  modifiedTime: string;
  parents?: string[];
}

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: GmailPayload;
  internalDate: string;
}

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: EventDateTime;
  end: EventDateTime;
  attendees?: EventAttendee[];
}
```

**MCP Protocol Type Definitions**:
```typescript
interface MCPToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}
```

### Configuration Schema Validation

**Type-Safe Configuration**:
```typescript
interface ServerConfig {
  auth: AuthConfig;
  features: FeaturesConfig;
  security: SecurityConfig;
  cache: CacheConfig;
}

interface AuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: GoogleScope[];
}

type GoogleScope = 
  | 'https://www.googleapis.com/auth/gmail.readonly'
  | 'https://www.googleapis.com/auth/calendar'
  | 'https://www.googleapis.com/auth/drive'
  | 'https://www.googleapis.com/auth/documents'
  | 'https://www.googleapis.com/auth/spreadsheets';
```

### Module Architecture

**Service Interface Pattern**:
```typescript
interface GoogleService<T> {
  authenticate(): Promise<void>;
  validateToken(): Promise<boolean>;
  refreshToken(): Promise<void>;
  executeRequest<R>(request: T): Promise<R>;
}

interface DriveService extends GoogleService<DriveRequest> {
  listFiles(query?: string): Promise<GoogleDriveFile[]>;
  getFile(fileId: string): Promise<GoogleDriveFile>;
  uploadFile(file: FileUpload): Promise<GoogleDriveFile>;
  createFolder(name: string, parentId?: string): Promise<GoogleDriveFile>;
}
```

**Error Handling with Types**:
```typescript
class GoogleAPIError extends Error {
  constructor(
    public code: number,
    public service: 'gmail' | 'drive' | 'calendar' | 'docs' | 'sheets',
    message: string,
    public retryable: boolean = false
  ) {
    super(message);
  }
}

type ServiceResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: GoogleAPIError;
};
```

## Security & Authentication

### OAuth 2.0 Implementation
- Uses **OAuth 2.0** with precise scopes for each Google service:
  - Gmail: `https://www.googleapis.com/auth/gmail.readonly`
  - Drive: `https://www.googleapis.com/auth/drive`
  - Calendar: `https://www.googleapis.com/auth/calendar`
  - Docs: `https://www.googleapis.com/auth/documents`
  - Sheets: `https://www.googleapis.com/auth/spreadsheets`

### Token Management
- Tokens are stored only locally (in-memory or encrypted local storage)
- Never shared externally or transmitted to third parties
- Automatic refresh token handling with secure storage
- Token revocation support for security incidents

### Access Control
- Only accessible via local port or authenticated tunnel
- Not intended for public hosting or external access
- All tools exposed via MCP are scoped to user-granted permissions
- Fine-grained permission validation before API calls

### Privacy Guarantees
- **No telemetry, logging, or cloud-based persistence**
- **Privacy-first by design**
- All data processing happens locally
- No external dependencies for core functionality
- User maintains full control over data and credentials

## Deployment

### Installation Options
- **NPM Package**: `npm install -g google-mcp-server`
- **NPX Execution**: `npx google-mcp-server`
- **Source Build**: Clone and build from source for customization

### Initial Setup Process
1. **Google Cloud Configuration**
   - User creates Google Cloud OAuth 2.0 Client ID
   - Downloads client credentials JSON file
   - Configures authorized redirect URIs (temporary local server for auth)

2. **First Launch Authentication**
   - Server starts temporary HTTP server for OAuth callback
   - Initiates browser-based OAuth flow
   - User consents to required scopes
   - Refresh tokens stored securely locally
   - Temporary server shuts down after authentication

3. **MCP Integration**
   - Configure with Claude Desktop, Smithery, or custom MCP clients
   - Server communicates via stdin/stdout using MCP protocol
   - No persistent HTTP server or network ports required

### Runtime Requirements
- **Node.js**: Version 18+ for NPM installation
- **TypeScript**: Version 5.0+ for development and compilation
- **Network Access**: HTTPS access to Google APIs (outbound only)
- **Local Storage**: For secure token persistence
- **File System**: Read/write access for configuration and cache

### Development Stack
- **Language**: TypeScript with strict type checking
- **Build Tool**: TypeScript Compiler (tsc) with ES2022 target
- **Module System**: ES modules with Node.js compatibility
- **Package Manager**: npm with package-lock.json for reproducible builds
- **Runtime**: Compiled JavaScript executed on Node.js 18+

### Configuration
- Environment variables for Google Client ID/Secret
- Configuration file for service settings
- Optional encryption key for token storage
- Logging configuration for debugging

## Error Handling & Resilience

### TypeScript Error Handling Patterns

**Compile-Time Error Prevention**:
```typescript
// Type-safe API request validation
function validateGmailQuery(query: GmailSearchQuery): asserts query is ValidGmailQuery {
  if (!query.q && !query.labelIds && !query.maxResults) {
    throw new ValidationError('Gmail query must specify at least one search parameter');
  }
}

// Exhaustive error handling with discriminated unions
type APIResponse<T> = 
  | { status: 'success'; data: T }
  | { status: 'error'; error: GoogleAPIError }
  | { status: 'rate_limited'; retryAfter: number }
  | { status: 'unauthorized'; requiresReauth: boolean };
```

**Runtime Error Handling**:
```typescript
class RetryableError extends GoogleAPIError {
  constructor(
    service: GoogleService,
    message: string,
    public retryAfter?: number
  ) {
    super(429, service, message, true);
  }
}

async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<ServiceResult<T>> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      return { success: true, data: result };
    } catch (error) {
      if (error instanceof RetryableError && attempt < maxRetries) {
        await delay(error.retryAfter || Math.pow(2, attempt) * 1000);
        continue;
      }
      return { 
        success: false, 
        error: error instanceof GoogleAPIError ? error : new GoogleAPIError(500, 'unknown', error.message)
      };
    }
  }
}
```

### Retry Logic
- Exponential backoff for rate-limited requests
- Automatic retry for transient network failures
- Circuit breaker pattern for persistent failures
- Type-safe retry configuration with compile-time validation

### Error States
- Clear error messages for authentication failures
- Graceful degradation when services are unavailable
- Detailed logging for debugging (when enabled)
- Strongly-typed error responses with discriminated unions

### Monitoring
- Token expiration monitoring and alerts
- API quota usage tracking
- Local logging for debugging and audit trails

## Performance Characteristics

### Response Times
- **Target**: Local response times under 300ms for single operations
- **Caching**: Intelligent caching of metadata and frequently accessed data
- **Batching**: Support for batch operations where possible

### Resource Usage
- **Minimal footprint**: Lightweight runtime requirements
- **Memory efficient**: Streaming for large file operations
- **Self-contained**: No external database dependencies

## Extensibility

### Adding New Google Services

**TypeScript Service Template**:
```typescript
// Define service-specific types
interface GooglePhotosAlbum {
  id: string;
  title: string;
  productUrl: string;
  mediaItemsCount: string;
  coverPhotoBaseUrl?: string;
}

interface PhotosRequest {
  albumId?: string;
  pageSize?: number;
  pageToken?: string;
}

// Implement service interface
class GooglePhotosService implements GoogleService<PhotosRequest> {
  constructor(
    private auth: AuthManager,
    private config: PhotosConfig
  ) {}

  async authenticate(): Promise<void> {
    await this.auth.ensureValidToken(['https://www.googleapis.com/auth/photoslibrary.readonly']);
  }

  async listAlbums(): Promise<ServiceResult<GooglePhotosAlbum[]>> {
    return withRetry(async () => {
      const response = await this.executeRequest({
        endpoint: '/v1/albums',
        method: 'GET'
      });
      return response.albums || [];
    });
  }
}

// Register MCP tools with type safety
const photosTools: MCPTool[] = [
  {
    name: 'photos_list_albums',
    description: 'List Google Photos albums',
    inputSchema: {
      type: 'object',
      properties: {
        maxResults: { type: 'number', minimum: 1, maximum: 50 }
      }
    },
    handler: async (args: { maxResults?: number }) => {
      const service = new GooglePhotosService(auth, config);
      const result = await service.listAlbums();
      
      if (!result.success) {
        throw result.error;
      }
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result.data, null, 2)
        }]
      };
    }
  }
];
```

**Service Registration Pattern**:
```typescript
interface ServiceRegistry {
  register<T extends GoogleService<any>>(
    name: string,
    serviceClass: new (auth: AuthManager, config: any) => T,
    tools: MCPTool[]
  ): void;
}

// Type-safe service registration
registry.register('photos', GooglePhotosService, photosTools);
```

### Custom Integrations

**Plugin Architecture with TypeScript**:
```typescript
interface MCPPlugin {
  name: string;
  version: string;
  tools: MCPTool[];
  resources?: MCPResource[];
  initialize(context: PluginContext): Promise<void>;
  cleanup(): Promise<void>;
}

abstract class BaseGooglePlugin implements MCPPlugin {
  abstract name: string;
  abstract version: string;
  abstract tools: MCPTool[];

  constructor(protected auth: AuthManager) {}

  async initialize(context: PluginContext): Promise<void> {
    await this.auth.ensureValidToken(this.requiredScopes);
  }

  abstract get requiredScopes(): GoogleScope[];
  async cleanup(): Promise<void> {}
}
```

**Type-Safe Tool Development Framework**:
```typescript
function createMCPTool<T extends Record<string, any>>(
  definition: {
    name: string;
    description: string;
    inputSchema: JSONSchema7;
    handler: (args: T) => Promise<MCPToolResult>;
  }
): MCPTool {
  return {
    ...definition,
    handler: async (args: unknown) => {
      // Runtime validation against schema
      const validatedArgs = validateArgs<T>(args, definition.inputSchema);
      return definition.handler(validatedArgs);
    }
  };
}

// Usage with full type safety
const createEventTool = createMCPTool<{
  summary: string;
  startTime: string;
  endTime: string;
  attendees?: string[];
}>({
  name: 'calendar_create_event',
  description: 'Create a new calendar event',
  inputSchema: {
    type: 'object',
    required: ['summary', 'startTime', 'endTime'],
    properties: {
      summary: { type: 'string' },
      startTime: { type: 'string', format: 'date-time' },
      endTime: { type: 'string', format: 'date-time' },
      attendees: { type: 'array', items: { type: 'string', format: 'email' } }
    }
  },
  handler: async (args) => {
    // args is fully typed as the interface above
    const event = await calendarService.createEvent(args);
    return {
      content: [{
        type: 'text',
        text: `Created event: ${event.summary}`
      }]
    };
  }
});
```

### Development Benefits
- **Compile-time validation**: Catch integration errors before runtime
- **IntelliSense support**: Full autocomplete for Google API responses
- **Refactoring safety**: TypeScript ensures consistency across service changes
- **Self-documenting code**: Interface definitions serve as living documentation
- **Testing support**: Mock services with type-safe interfaces
