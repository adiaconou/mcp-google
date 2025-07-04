# Technical Context - Technologies and Development Setup

## Core Technology Stack

### Runtime Environment
- **Node.js**: Version 18+ required for modern JavaScript features and MCP SDK compatibility
- **TypeScript**: Version 5.8+ with strict mode for compile-time safety and enhanced developer experience
- **NPM**: Package management with package-lock.json for reproducible builds

### Primary Dependencies

#### MCP Protocol
- **@modelcontextprotocol/sdk**: Version 1.13.3+ for MCP protocol implementation
  - Provides stdio transport for communication with MCP clients
  - JSON-RPC 2.0 message handling
  - Tool and resource registration capabilities
  - Type definitions for MCP protocol

#### Google APIs
- **googleapis**: Version 150.0.1+ for Google API client libraries
  - Unified client for all Google services (Gmail, Drive, Calendar, Docs, Sheets)
  - Built-in retry logic and error handling
  - TypeScript definitions included

- **google-auth-library**: Version 10.1.0+ for OAuth 2.0 authentication
  - OAuth 2.0 flow implementation with PKCE support
  - Token management and refresh capabilities
  - Secure credential handling

#### Validation and Configuration
- **zod**: Version 3.25.71+ for runtime schema validation
  - Type-safe configuration validation
  - Input parameter validation for MCP tools
  - Environment variable validation

- **dotenv**: Version 17.0.1+ for environment variable management
  - Development configuration loading
  - Secure credential management

### Development Dependencies

#### TypeScript Tooling
- **typescript**: Version 5.8+ compiler with ES2022 target
- **@types/node**: Node.js type definitions for TypeScript
- **ts-node**: TypeScript execution for development
- **nodemon**: Hot reloading during development

#### Code Quality
- **eslint**: Version 9.30.1+ for code linting
- **@typescript-eslint/parser**: TypeScript parser for ESLint
- **@typescript-eslint/eslint-plugin**: TypeScript-specific linting rules

#### Testing Framework
- **jest**: Version 30.0+ for unit and integration testing
- **ts-jest**: TypeScript preprocessor for Jest
- **@types/jest**: TypeScript definitions for Jest

## Development Environment Setup

### Prerequisites
```bash
# Node.js 18+ (recommended: use nvm for version management)
node --version  # Should be 18.0.0 or higher
npm --version   # Should be 8.0.0 or higher

# Git for version control
git --version
```

### Project Initialization
```bash
# Clone and setup
git clone <repository-url>
cd mcp-google
npm install

# Environment configuration
cp .env.example .env
# Edit .env with your configuration
```

### Development Scripts
```json
{
  "scripts": {
    "build": "tsc",                    // Compile TypeScript to JavaScript
    "build:watch": "tsc --watch",      // Watch mode compilation
    "dev": "nodemon --exec ts-node src/index.ts",  // Development server
    "start": "node dist/index.js",     // Production server
    "type-check": "tsc --noEmit",      // Type checking without compilation
    "lint": "eslint src/**/*.ts",      // Code linting
    "lint:fix": "eslint src/**/*.ts --fix",  // Auto-fix linting issues
    "test": "jest",                    // Run tests
    "test:watch": "jest --watch",      // Watch mode testing
    "clean": "rm -rf dist"             // Clean build artifacts
  }
}
```

## TypeScript Configuration

### Compiler Options
```json
{
  "compilerOptions": {
    "target": "ES2022",                    // Modern JavaScript features
    "module": "ESNext",                    // ES modules
    "moduleResolution": "node",            // Node.js module resolution
    "outDir": "./dist",                    // Compiled output directory
    "rootDir": "./src",                    // Source code directory
    "strict": true,                        // Enable all strict type checking
    "esModuleInterop": true,              // CommonJS/ES module interop
    "skipLibCheck": true,                  // Skip type checking of declaration files
    "forceConsistentCasingInFileNames": true,  // Enforce consistent file naming
    "declaration": true,                   // Generate .d.ts files
    "declarationMap": true,               // Generate declaration source maps
    "sourceMap": true,                    // Generate source maps for debugging
    "removeComments": false,              // Keep comments in output
    "noImplicitAny": true,               // Error on implicit any types
    "noImplicitReturns": true,           // Error on missing return statements
    "noImplicitThis": true,              // Error on implicit this types
    "noUnusedLocals": true,              // Error on unused local variables
    "noUnusedParameters": true,          // Error on unused parameters
    "exactOptionalPropertyTypes": true,   // Strict optional property handling
    "resolveJsonModule": true             // Allow importing JSON files
  }
}
```

### Key TypeScript Features Used
- **Strict Mode**: Full type safety with all strict checks enabled
- **Discriminated Unions**: Type-safe error handling patterns
- **Generic Types**: Reusable components with type parameters
- **Interface Inheritance**: Clean abstraction hierarchies
- **Conditional Types**: Advanced type manipulation
- **Template Literal Types**: Type-safe string manipulation

## Google API Integration

### Required Google Cloud Setup
1. **Google Cloud Project**: Create or select existing project
2. **API Enablement**: Enable required Google APIs
   - Gmail API: `gmail.googleapis.com`
   - Drive API: `drive.googleapis.com`
   - Calendar API: `calendar-json.googleapis.com`
   - Docs API: `docs.googleapis.com`
   - Sheets API: `sheets.googleapis.com`

3. **OAuth 2.0 Credentials**: Create OAuth 2.0 Client ID
   - Application type: Desktop application
   - Authorized redirect URIs: `http://localhost:8080/auth/callback`

### OAuth Scopes
```typescript
const GOOGLE_SCOPES = {
  GMAIL_READONLY: 'https://www.googleapis.com/auth/gmail.readonly',
  GMAIL_SEND: 'https://www.googleapis.com/auth/gmail.send',
  DRIVE: 'https://www.googleapis.com/auth/drive',
  CALENDAR: 'https://www.googleapis.com/auth/calendar',
  DOCS: 'https://www.googleapis.com/auth/documents',
  SHEETS: 'https://www.googleapis.com/auth/spreadsheets',
} as const;
```

### API Rate Limits
- **Gmail API**: 1 billion quota units per day, 250 quota units per user per second
- **Drive API**: 1,000 requests per 100 seconds per user
- **Calendar API**: 1,000,000 requests per day
- **Docs API**: 300 requests per minute per project
- **Sheets API**: 300 requests per minute per project

## MCP Protocol Implementation

### Communication Architecture
```typescript
// Stdio-based communication
process.stdin  -> MCP Server -> Google APIs
process.stdout <- MCP Server <- Google APIs
```

### Message Flow
1. **Client Request**: MCP client sends JSON-RPC message via stdin
2. **Server Processing**: MCP server parses message and routes to appropriate handler
3. **API Call**: Server makes authenticated call to Google API
4. **Response**: Server formats response and sends via stdout

### Tool Registration Pattern
```typescript
interface MCPTool {
  name: string;                    // Tool identifier (e.g., "calendar_list_events")
  description: string;             // Human-readable description
  inputSchema: JSONSchema7;        // JSON Schema for input validation
  handler: (args: unknown) => Promise<MCPToolResult>;  // Implementation
}
```

## Error Handling Strategy

### Error Types
```typescript
// Base error class for all Google MCP Server errors
class GoogleMCPError extends Error {
  constructor(
    public readonly code: string,
    public readonly service: string,
    message: string,
    public readonly retryable: boolean = false
  ) {
    super(message);
  }
}

// Specific error types
class AuthenticationError extends GoogleMCPError { /* ... */ }
class AuthorizationError extends GoogleMCPError { /* ... */ }
class ValidationError extends GoogleMCPError { /* ... */ }
class RateLimitError extends GoogleMCPError { /* ... */ }
```

### Retry Logic
- **Exponential Backoff**: 2^attempt * 1000ms delay
- **Maximum Retries**: 3 attempts for retryable errors
- **Retryable Conditions**: HTTP 429 (rate limit), HTTP 5xx (server errors)
- **Circuit Breaker**: Prevent cascading failures

## Configuration Management

### Environment Variables
```env
# Required - Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:8080/auth/callback

# Optional - Server Configuration
NODE_ENV=development
MCP_LOG_LEVEL=INFO

# Optional - Feature Flags
FEATURE_CALENDAR=true
FEATURE_GMAIL=true
FEATURE_DRIVE=true
FEATURE_DOCS=false
FEATURE_SHEETS=false

# Optional - Performance Tuning
MCP_CACHE_ENABLED=true
MCP_RATE_LIMIT_REQUESTS=100
MCP_RATE_LIMIT_WINDOW_MS=60000
```

### Configuration Validation
```typescript
const ConfigSchema = z.object({
  auth: z.object({
    clientId: z.string().min(1),
    clientSecret: z.string().min(1),
    redirectUri: z.string().url(),
  }),
  server: z.object({
    logLevel: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR']).default('INFO'),
    nodeEnv: z.enum(['development', 'production']).default('development'),
  }),
  features: z.object({
    calendar: z.boolean().default(true),
    gmail: z.boolean().default(true),
    drive: z.boolean().default(true),
    docs: z.boolean().default(false),
    sheets: z.boolean().default(false),
  }),
});
```

## Testing Infrastructure

### Test Categories
1. **Unit Tests**: Individual component testing
2. **Integration Tests**: MCP protocol compliance testing
3. **API Tests**: Google API integration testing (with mocks)
4. **End-to-End Tests**: Full workflow testing

### Jest Configuration
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

### Mock Strategies
- **Google API Mocks**: Jest mocks for googleapis library
- **MCP Client Mocks**: Test MCP protocol communication
- **OAuth Mocks**: Mock authentication flows for testing

## Performance Considerations

### Optimization Strategies
1. **Token Caching**: In-memory token storage to reduce auth overhead
2. **API Response Caching**: Cache frequently accessed data
3. **Batch Operations**: Group multiple API calls when possible
4. **Lazy Loading**: Initialize services only when needed
5. **Connection Pooling**: Reuse HTTP connections for API calls

### Monitoring Metrics
- **Response Times**: Track API call latency
- **Error Rates**: Monitor failure rates by service
- **Token Refresh**: Track authentication overhead
- **Memory Usage**: Monitor for memory leaks
- **Rate Limit Usage**: Track API quota consumption

## Security Considerations

### Token Security
- **Encrypted Storage**: AES-256-GCM encryption for stored tokens
- **Memory Protection**: Clear sensitive data from memory after use
- **Scope Minimization**: Request only necessary OAuth scopes
- **Token Rotation**: Automatic refresh token rotation

### Data Protection
- **No Persistent Storage**: No user data stored permanently
- **Local Processing**: All data processing happens locally
- **Secure Transmission**: HTTPS for all API communications
- **Input Validation**: Comprehensive input sanitization

## Deployment Considerations

### Local Development
```bash
# Development mode with hot reloading
npm run dev

# Type checking
npm run type-check

# Testing
npm run test:watch
```

### Production Build
```bash
# Clean build
npm run clean
npm run build

# Production start
npm run start
```

### MCP Client Integration
```json
// Claude Desktop configuration
{
  "mcpServers": {
    "google-mcp-server": {
      "command": "node",
      "args": ["/path/to/mcp-google/dist/index.js"],
      "env": {
        "GOOGLE_CLIENT_ID": "your_client_id",
        "GOOGLE_CLIENT_SECRET": "your_client_secret"
      }
    }
  }
}
```

## Development Workflow

### Code Quality Checks
```bash
# Before committing
npm run lint          # Check code style
npm run type-check    # Verify TypeScript types
npm run test          # Run test suite
npm run build         # Ensure clean compilation
```

### Debugging
- **VS Code Integration**: Full TypeScript debugging support
- **Source Maps**: Debug compiled JavaScript with TypeScript sources
- **Logging**: Structured logging with configurable levels
- **Error Stack Traces**: Detailed error information with source locations

This technical context provides the foundation for understanding and working with the Google MCP Server codebase, ensuring consistent development practices and reliable operation.
