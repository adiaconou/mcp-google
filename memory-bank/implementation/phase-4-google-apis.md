# Phase 4: Google API Integration (PLANNED)

## Overview
This phase implements comprehensive Google API integrations, creating MCP tools for Calendar, Gmail, Drive, Docs, and Sheets services. Each service is implemented as an independent module with consistent patterns and error handling.

## Objectives
1. [ ] Implement Calendar API service and MCP tools
2. [ ] Implement Gmail API service and MCP tools
3. [ ] Implement Drive API service and MCP tools
4. [ ] Implement Docs API service and MCP tools
5. [ ] Implement Sheets API service and MCP tools
6. [ ] Add service registry and management system
7. [ ] Implement comprehensive error handling and retry logic
8. [ ] Add caching and performance optimization
9. [ ] Create comprehensive service tests
10. [ ] Add end-to-end integration tests

## Implementation Priority

### Priority 1: Calendar API
**Business Value**: High - Essential for scheduling and time management
**Complexity**: Medium - Well-defined API with clear use cases
**Dependencies**: OAuth authentication (Phase 3)

### Priority 2: Gmail API
**Business Value**: High - Critical for email management and communication
**Complexity**: High - Complex message structure and attachment handling
**Dependencies**: OAuth authentication, potentially Drive API for attachments

### Priority 3: Drive API
**Business Value**: Medium - Important for file management and storage
**Complexity**: Medium - File operations with metadata and permissions
**Dependencies**: OAuth authentication

### Priority 4: Docs & Sheets APIs
**Business Value**: Medium - Useful for document creation and data manipulation
**Complexity**: High - Complex document structure and formatting
**Dependencies**: OAuth authentication, potentially Drive API

## Calendar API Implementation

### Calendar Service Architecture
```typescript
class CalendarService implements GoogleService<CalendarConfig> {
  readonly name = 'calendar';
  readonly requiredScopes = ['https://www.googleapis.com/auth/calendar'];

  async initialize(auth: AuthManager, config: CalendarConfig): Promise<void> {
    this.auth = auth;
    this.config = config;
    this.client = await this.createCalendarClient();
  }

  getTools(): MCPTool[] {
    return [
      this.createListEventsTools(),
      this.createCreateEventTool(),
      this.createUpdateEventTool(),
      this.createDeleteEventTool(),
      this.createFindFreeSlotsTools(),
    ];
  }
}
```

### Calendar MCP Tools
1. **`calendar_list_events`** - List calendar events with filtering
2. **`calendar_create_event`** - Create new calendar events
3. **`calendar_update_event`** - Update existing events
4. **`calendar_delete_event`** - Delete calendar events
5. **`calendar_find_free_slots`** - Find available time slots

### Calendar Implementation Files
```
src/services/calendar/
├── calendarService.ts        # Main service implementation
├── calendarClient.ts         # Google Calendar API client wrapper
├── calendarTypes.ts          # Calendar-specific type definitions
├── tools/
│   ├── listEvents.ts         # List events tool
│   ├── createEvent.ts        # Create event tool
│   ├── updateEvent.ts        # Update event tool
│   ├── deleteEvent.ts        # Delete event tool
│   └── findFreeSlots.ts      # Find free slots tool
└── __tests__/
    ├── calendarService.test.ts
    └── tools/
        └── *.test.ts
```

## Gmail API Implementation

### Gmail Service Architecture
```typescript
class GmailService implements GoogleService<GmailConfig> {
  readonly name = 'gmail';
  readonly requiredScopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send'
  ];

  getTools(): MCPTool[] {
    return [
      this.createListMessagesTools(),
      this.createGetMessageTool(),
      this.createSendMessageTool(),
      this.createSearchMessagesTool(),
      this.createManageLabelsTool(),
    ];
  }
}
```

### Gmail MCP Tools
1. **`gmail_list_messages`** - List email messages with filters
2. **`gmail_get_message`** - Get specific email message content
3. **`gmail_send_message`** - Send new email messages
4. **`gmail_search_messages`** - Search emails with complex queries
5. **`gmail_manage_labels`** - Manage email labels and organization

### Gmail Implementation Files
```
src/services/gmail/
├── gmailService.ts           # Main service implementation
├── gmailClient.ts            # Gmail API client wrapper
├── gmailTypes.ts             # Gmail-specific type definitions
├── messageParser.ts          # Email message parsing utilities
├── attachmentHandler.ts      # Email attachment processing
├── tools/
│   ├── listMessages.ts       # List messages tool
│   ├── getMessage.ts         # Get message tool
│   ├── sendMessage.ts        # Send message tool
│   ├── searchMessages.ts     # Search messages tool
│   └── manageLabels.ts       # Manage labels tool
└── __tests__/
    └── ...
```

## Drive API Implementation

### Drive Service Architecture
```typescript
class DriveService implements GoogleService<DriveConfig> {
  readonly name = 'drive';
  readonly requiredScopes = ['https://www.googleapis.com/auth/drive'];

  getTools(): MCPTool[] {
    return [
      this.createListFilesTool(),
      this.createGetFileTool(),
      this.createUploadFileTool(),
      this.createCreateFolderTool(),
      this.createManagePermissionsTool(),
    ];
  }
}
```

### Drive MCP Tools
1. **`drive_list_files`** - List Drive files and folders
2. **`drive_get_file`** - Get file metadata and content
3. **`drive_upload_file`** - Upload files to Drive
4. **`drive_create_folder`** - Create new folders
5. **`drive_manage_permissions`** - Manage file sharing permissions

### Drive Implementation Files
```
src/services/drive/
├── driveService.ts           # Main service implementation
├── driveClient.ts            # Drive API client wrapper
├── driveTypes.ts             # Drive-specific type definitions
├── fileHandler.ts            # File upload/download utilities
├── permissionManager.ts      # Permission management utilities
├── tools/
│   ├── listFiles.ts          # List files tool
│   ├── getFile.ts            # Get file tool
│   ├── uploadFile.ts         # Upload file tool
│   ├── createFolder.ts       # Create folder tool
│   └── managePermissions.ts  # Manage permissions tool
└── __tests__/
    └── ...
```

## Docs & Sheets API Implementation

### Docs Service Architecture
```typescript
class DocsService implements GoogleService<DocsConfig> {
  readonly name = 'docs';
  readonly requiredScopes = ['https://www.googleapis.com/auth/documents'];

  getTools(): MCPTool[] {
    return [
      this.createCreateDocumentTool(),
      this.createGetDocumentTool(),
      this.createUpdateDocumentTool(),
      this.createFormatDocumentTool(),
    ];
  }
}
```

### Sheets Service Architecture
```typescript
class SheetsService implements GoogleService<SheetsConfig> {
  readonly name = 'sheets';
  readonly requiredScopes = ['https://www.googleapis.com/auth/spreadsheets'];

  getTools(): MCPTool[] {
    return [
      this.createCreateSpreadsheetTool(),
      this.createGetSpreadsheetTool(),
      this.createUpdateCellsTool(),
      this.createCreateChartTool(),
    ];
  }
}
```

## Common Patterns and Utilities

### Base Google API Client
```typescript
abstract class GoogleAPIClient<TClient> {
  protected client: TClient | null = null;
  
  constructor(
    protected auth: AuthManager,
    protected config: any
  ) {}

  protected async getClient(): Promise<TClient> {
    if (!this.client) {
      await this.auth.ensureValidToken(this.requiredScopes);
      this.client = await this.createClient();
    }
    return this.client;
  }

  protected abstract get requiredScopes(): string[];
  protected abstract createClient(): Promise<TClient>;

  async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    // Exponential backoff retry logic
    // Rate limiting handling
    // Error classification and recovery
  }
}
```

### Service Registry
```typescript
class ServiceRegistry {
  private services = new Map<string, GoogleService>();

  register(service: GoogleService): void {
    this.services.set(service.name, service);
  }

  async initializeServices(auth: AuthManager, config: ServerConfig): Promise<void> {
    for (const [name, service] of this.services) {
      if (config.features[name]) {
        await service.initialize(auth, config[name]);
      }
    }
  }

  getAllTools(): MCPTool[] {
    const tools: MCPTool[] = [];
    for (const service of this.services.values()) {
      tools.push(...service.getTools());
    }
    return tools;
  }
}
```

## Error Handling and Resilience

### Google API Error Handling
```typescript
class GoogleAPIError extends Error {
  constructor(
    public readonly code: number,
    public readonly service: string,
    message: string,
    public readonly retryable: boolean = false
  ) {
    super(message);
  }

  static fromGoogleError(error: any, service: string): GoogleAPIError {
    const code = error.code || error.status || 500;
    const message = error.message || 'Unknown Google API error';
    const retryable = code === 429 || code >= 500;
    
    return new GoogleAPIError(code, service, message, retryable);
  }
}
```

### Retry Logic with Circuit Breaker
```typescript
class RetryManager {
  private circuitBreakers = new Map<string, CircuitBreaker>();

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    service: string,
    maxRetries: number = 3
  ): Promise<T> {
    const circuitBreaker = this.getCircuitBreaker(service);
    
    return circuitBreaker.execute(async () => {
      let lastError: Error;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await operation();
        } catch (error) {
          lastError = error;
          
          if (!this.isRetryable(error) || attempt === maxRetries) {
            throw error;
          }
          
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
      
      throw lastError!;
    });
  }
}
```

## Performance Optimization

### Caching Strategy
```typescript
class APIResponseCache {
  private cache = new Map<string, CacheEntry>();
  
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (entry && !this.isExpired(entry)) {
      return entry.data as T;
    }
    return null;
  }
  
  set<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl,
    });
  }
}
```

### Batch Operations
```typescript
class BatchOperationManager {
  async batchCalendarEvents(
    operations: CalendarOperation[]
  ): Promise<CalendarOperationResult[]> {
    // Group operations by type
    // Execute in optimal batches
    // Handle partial failures
    // Return comprehensive results
  }
}
```

## Testing Strategy

### Service Testing Pattern
```typescript
describe('CalendarService', () => {
  let service: CalendarService;
  let mockAuth: jest.Mocked<AuthManager>;
  let mockClient: jest.Mocked<calendar_v3.Calendar>;

  beforeEach(() => {
    mockAuth = createMockAuthManager();
    mockClient = createMockCalendarClient();
    service = new CalendarService();
  });

  describe('listEvents', () => {
    it('should return events successfully', async () => {
      // Arrange
      const mockEvents = [createMockEvent()];
      mockClient.events.list.mockResolvedValue({ data: { items: mockEvents } });

      // Act
      const result = await service.listEvents({ maxResults: 10 });

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockEvents);
      }
    });

    it('should handle API errors gracefully', async () => {
      // Test error scenarios
      // Validate error handling
      // Check retry logic
    });
  });
});
```

### Integration Testing
```typescript
describe('Google API Integration', () => {
  it('should complete end-to-end calendar workflow', async () => {
    // Create event
    // List events
    // Update event
    // Delete event
    // Verify all operations
  });

  it('should handle authentication across services', async () => {
    // Test multi-service authentication
    // Verify scope management
    // Test token refresh
  });
});
```

## Configuration and Feature Flags

### Service Configuration
```typescript
const ServiceConfigSchema = z.object({
  calendar: z.object({
    enabled: z.boolean().default(true),
    defaultCalendar: z.string().optional(),
    maxResults: z.number().default(50),
  }),
  gmail: z.object({
    enabled: z.boolean().default(true),
    maxResults: z.number().default(20),
    includeSpam: z.boolean().default(false),
  }),
  drive: z.object({
    enabled: z.boolean().default(true),
    uploadSizeLimit: z.number().default(100 * 1024 * 1024), // 100MB
  }),
  docs: z.object({
    enabled: z.boolean().default(false),
  }),
  sheets: z.object({
    enabled: z.boolean().default(false),
  }),
});
```

## Success Criteria

### Functional Requirements
- [ ] All Google services integrate successfully with MCP
- [ ] Tools provide comprehensive functionality for each service
- [ ] Error handling provides clear, actionable messages
- [ ] Performance meets target response times
- [ ] Caching reduces API call overhead

### Quality Requirements
- [ ] 90%+ test coverage for all service implementations
- [ ] Zero critical security vulnerabilities
- [ ] Comprehensive error handling for all failure modes
- [ ] Clean, maintainable code following established patterns

### Integration Requirements
- [ ] Seamless integration with MCP protocol layer
- [ ] Consistent authentication across all services
- [ ] Unified error handling and logging
- [ ] Feature flags allow selective service enablement

## Deployment and Monitoring

### Service Health Checks
```typescript
class ServiceHealthMonitor {
  async checkServiceHealth(service: GoogleService): Promise<HealthStatus> {
    try {
      await service.validateToken();
      return { status: 'healthy', service: service.name };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        service: service.name, 
        error: error.message 
      };
    }
  }
}
```

### Performance Monitoring
- API call latency tracking
- Error rate monitoring
- Token refresh frequency
- Cache hit/miss ratios
- Rate limit utilization

This phase delivers comprehensive Google API integration, providing users with powerful tools for managing their Google services through AI agents while maintaining security, performance, and reliability standards.
