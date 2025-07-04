# Phase 3: OAuth Authentication (PLANNED)

## Overview
Implement secure Google OAuth 2.0 authentication with PKCE flow and encrypted token management. This phase enables the MCP server to access Google APIs on behalf of users while maintaining privacy and security through industry-standard authentication practices.

## Objectives
- Configure Google Cloud OAuth 2.0 credentials and development environment
- Implement OAuth manager with PKCE flow for enhanced security
- Create temporary HTTP server for OAuth callback handling
- Implement secure token storage with AES-256-GCM encryption
- Add automatic token refresh mechanism with error handling
- Implement scope validation and management system
- Create comprehensive authentication unit and integration tests
- Add OAuth flow integration with MCP tool authentication

## Implementation Steps
1. ☐ Set up Google Cloud project and OAuth 2.0 credentials
2. ☐ Configure OAuth consent screen and redirect URIs
3. ☐ Create OAuth manager class with PKCE implementation
4. ☐ Implement temporary HTTP server for callback handling
5. ☐ Add authorization URL generation with state validation
6. ☐ Implement authorization code exchange for tokens
7. ☐ Create secure token storage with AES-256-GCM encryption
8. ☐ Add token cache for in-memory performance optimization
9. ☐ Implement automatic token refresh mechanism
10. ☐ Create scope manager for validation and permissions
11. ☐ Add OAuth configuration management with Zod validation
12. ☐ Integrate OAuth manager with MCP server for tool authentication
13. ☐ Create comprehensive OAuth unit tests
14. ☐ Add OAuth integration tests with mock Google endpoints
15. ☐ Add security validation and penetration testing

## Implementation Plan

### Step 1: Google Cloud Project Setup
**Files**: Documentation and external setup
- Create or select Google Cloud project for OAuth application
- Enable required Google APIs: Gmail, Drive, Calendar, Docs, Sheets
- Configure OAuth consent screen with application details
- Set up application verification if needed for production
- Document setup process for deployment

### Step 2: OAuth Credentials Configuration
**Files**: `.env.example` (OAuth section)
- Create OAuth 2.0 Client ID credentials in Google Cloud Console
- Configure application type as "Desktop application"
- Set authorized redirect URIs: `http://localhost:8080/auth/callback`
- Download client credentials JSON file
- Add OAuth environment variables to configuration template

### Step 3: Create OAuth Manager Class
**Files**: `src/auth/oauthManager.ts`
- Implement OAuthManager class with PKCE support
- Add authenticate() method for initial user authorization
- Create ensureValidToken() method for token validation
- Add token refresh logic with automatic retry
- Implement secure token cleanup on shutdown
- Add OAuth flow state management

### Step 4: Implement Temporary HTTP Server
**Files**: `src/auth/authServer.ts`
- Create AuthServer class for OAuth callback handling
- Implement HTTP server startup on configurable port
- Add callback route handler for authorization code
- Create server shutdown with timeout handling
- Add error handling for server startup failures
- Implement security headers and CSRF protection

### Step 5: Add Authorization URL Generation
**Files**: `src/auth/oauthManager.ts` (URL generation)
- Generate PKCE code verifier and challenge
- Create authorization URL with required parameters
- Add state parameter for CSRF protection
- Include requested scopes in authorization URL
- Add optional parameters for user experience
- Implement URL validation and security checks

### Step 6: Implement Code Exchange
**Files**: `src/auth/oauthManager.ts` (token exchange)
- Handle authorization callback with code parameter
- Validate state parameter against stored value
- Exchange authorization code for access and refresh tokens
- Verify PKCE code verifier against challenge
- Handle OAuth error responses gracefully
- Add comprehensive error logging and recovery

### Step 7: Create Secure Token Storage
**Files**: `src/auth/tokenStorage.ts`
- Implement TokenStorage class with AES-256-GCM encryption
- Generate secure encryption keys from environment
- Add storeTokens() method with encryption
- Create loadTokens() method with decryption
- Implement secure token file management
- Add token cleanup and secure deletion

### Step 8: Add Token Cache
**Files**: `src/auth/tokenCache.ts`
- Create TokenCache class for in-memory token storage
- Implement cache with TTL based on token expiration
- Add cache invalidation on token refresh
- Create cache warming for frequently used tokens
- Add cache statistics and monitoring
- Implement cache cleanup on shutdown

### Step 9: Implement Token Refresh
**Files**: `src/auth/tokenRefresh.ts`
- Create TokenRefresh class for automatic refresh logic
- Add refresh token validation and exchange
- Implement exponential backoff for refresh failures
- Add refresh scheduling based on token expiration
- Create refresh error handling and fallback
- Add refresh monitoring and alerting

### Step 10: Create Scope Manager
**Files**: `src/auth/scopeManager.ts`
- Implement ScopeManager class for permission validation
- Define Google API scope constants and descriptions
- Add scope validation against requested permissions
- Create scope intersection and union operations
- Implement minimal scope principle enforcement
- Add scope documentation and user guidance

### Step 11: Add OAuth Configuration
**Files**: `src/auth/config.ts`
- Create OAuth configuration schema with Zod validation
- Add environment variable parsing for OAuth settings
- Implement configuration validation on startup
- Create default values for development environment
- Add configuration error handling and guidance
- Implement configuration change detection

### Step 12: Integrate with MCP Server
**Files**: `src/server.ts` (OAuth integration)
- Add OAuth manager initialization to server startup
- Create tool authentication wrapper using OAuth
- Implement scope-based tool access control
- Add authentication error handling for tools
- Create user authentication status reporting
- Add OAuth flow initiation tools for MCP clients

### Step 13: Create OAuth Unit Tests
**Files**: `tests/unit/oauth/`
- Test OAuth manager initialization and configuration
- Validate PKCE code generation and verification
- Test authorization URL generation and validation
- Verify token storage encryption and decryption
- Test token refresh logic and error handling
- Add scope validation and management tests

### Step 14: Add OAuth Integration Tests
**Files**: `tests/integration/oauth/`
- Test complete OAuth flow with mock Google endpoints
- Validate token exchange and refresh workflows
- Test error scenarios and recovery mechanisms
- Verify security measures and CSRF protection
- Test integration with MCP tool authentication
- Add performance tests for OAuth operations

### Step 15: Add Security Validation
**Files**: `tests/security/oauth/`
- Test encryption key security and rotation
- Validate PKCE implementation against security standards
- Test state parameter CSRF protection
- Verify token storage security measures
- Add penetration testing for OAuth endpoints
- Create security audit checklist and validation

## Success Criteria

### Functional Requirements
- ☐ OAuth flow completes successfully with user authorization
- ☐ Tokens are stored securely with AES-256-GCM encryption
- ☐ Token refresh works automatically without user intervention
- ☐ Scope validation prevents over-privileged requests
- ☐ Error handling provides clear guidance for authentication issues

### Security Requirements
- ☐ PKCE implemented correctly for OAuth flow security
- ☐ State parameter prevents CSRF attacks effectively
- ☐ Tokens encrypted at rest using industry-standard encryption
- ☐ Minimal scope requests following principle of least privilege
- ☐ Secure cleanup of sensitive data on shutdown

### Integration Requirements
- ☐ MCP tools can authenticate Google API calls seamlessly
- ☐ Multiple scopes handled correctly across different services
- ☐ Token refresh is transparent to API clients
- ☐ Configuration validation prevents setup errors
- ☐ Error messages guide users through authentication issues

## Key Files Created

### Authentication Module Structure
```
src/auth/
├── oauthManager.ts           # Main OAuth flow coordinator
├── authServer.ts             # Temporary HTTP server for callbacks
├── tokenStorage.ts           # Encrypted token storage
├── tokenCache.ts             # In-memory token caching
├── tokenRefresh.ts           # Automatic token refresh logic
├── scopeManager.ts           # Scope validation and management
├── config.ts                 # OAuth configuration management
└── types.ts                  # Authentication type definitions
```

### Test Structure
```
tests/
├── unit/oauth/
│   ├── oauthManager.test.ts  # OAuth manager unit tests
│   ├── tokenStorage.test.ts  # Token storage tests
│   ├── scopeManager.test.ts  # Scope management tests
│   └── authServer.test.ts    # Auth server tests
├── integration/oauth/
│   ├── oauthFlow.test.ts     # Complete OAuth flow tests
│   └── tokenRefresh.test.ts  # Token refresh integration
└── security/oauth/
    ├── encryption.test.ts    # Encryption security tests
    └── pkce.test.ts          # PKCE security validation
```

## Environment Configuration

### Required Environment Variables
```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:8080/auth/callback

# Token Security
MCP_ENCRYPTION_KEY=your_32_byte_encryption_key_here

# OAuth Settings
OAUTH_CALLBACK_PORT=8080
OAUTH_CALLBACK_TIMEOUT=300000  # 5 minutes
OAUTH_TOKEN_REFRESH_THRESHOLD=300  # 5 minutes before expiry
```

### Configuration Schema
```typescript
const AuthConfigSchema = z.object({
  google: z.object({
    clientId: z.string().min(1),
    clientSecret: z.string().min(1),
    redirectUri: z.string().url(),
  }),
  security: z.object({
    encryptionKey: z.string().length(64), // 32 bytes hex
  }),
  oauth: z.object({
    callbackPort: z.number().default(8080),
    callbackTimeout: z.number().default(300000),
    refreshThreshold: z.number().default(300),
  }),
});
```

## Error Handling Framework

### Authentication Error Types
```typescript
class AuthenticationError extends GoogleMCPError {
  constructor(message: string, cause?: Error) {
    super('AUTHENTICATION_FAILED', 'auth', message, false);
    this.cause = cause;
  }
}

class TokenExpiredError extends GoogleMCPError {
  constructor() {
    super('TOKEN_EXPIRED', 'auth', 'Access token has expired', true);
  }
}

class ScopeError extends GoogleMCPError {
  constructor(requested: string[], available: string[]) {
    super('INSUFFICIENT_SCOPE', 'auth', 
      `Requested scopes ${requested} not available in ${available}`, false);
  }
}
```

### Recovery Strategies
- **Token Expiration**: Automatic refresh with fallback to re-authorization
- **Network Errors**: Retry with exponential backoff and circuit breaker
- **User Denial**: Clear error message with re-authorization guidance
- **Invalid Credentials**: Configuration validation and setup instructions

## Performance Considerations

### Token Caching Strategy
- In-memory cache for frequently accessed tokens
- Configurable TTL based on token expiration times
- Automatic cache invalidation on token refresh
- Cache warming for predictable access patterns

### OAuth Flow Optimization
- Temporary server startup/shutdown optimization
- Browser launch optimization for user experience
- Callback handling efficiency and timeout management
- Minimal resource usage during authentication

### Security vs Performance Balance
- Encryption/decryption optimization for token storage
- Efficient scope validation without compromising security
- Minimal I/O operations for token management
- Performance monitoring for authentication operations

## Testing Strategy

### Unit Testing Focus
- OAuth manager component isolation and mocking
- Token storage encryption/decryption validation
- Scope validation logic and edge cases
- Error handling scenarios and recovery

### Integration Testing Focus
- Complete OAuth flow with mock Google endpoints
- Token refresh workflows and error scenarios
- MCP tool authentication integration
- Performance and reliability under load

### Security Testing Focus
- Encryption key security and rotation
- PKCE implementation validation
- CSRF protection effectiveness
- Token storage security measures

## Risk Mitigation

### Security Risks
- **Token Storage**: Use proven encryption libraries and secure key management
- **OAuth Flow**: Follow OAuth 2.0 and PKCE security best practices
- **Scope Management**: Implement strict validation and minimal permissions
- **Credential Exposure**: Secure environment variable handling and validation

### Operational Risks
- **User Experience**: Clear setup instructions and helpful error messages
- **Browser Compatibility**: Test OAuth flow with multiple browsers
- **Network Issues**: Robust error handling and retry mechanisms
- **Configuration Errors**: Comprehensive validation and setup guidance

## Next Phase Preparation

### Google API Integration Readiness
- OAuth manager interface ready for service authentication
- Token management transparent to Google API clients
- Error handling integrated with API error scenarios
- Scope management supports service-specific requirements

### MCP Tool Authentication
- Tools can request authentication for specific scopes
- Automatic token refresh during tool execution
- Error handling provides user-actionable messages
- Configuration validation prevents runtime authentication failures

This phase establishes secure, reliable authentication that enables all Google API integrations while maintaining user privacy and security through industry-standard OAuth 2.0 practices with PKCE enhancement.
