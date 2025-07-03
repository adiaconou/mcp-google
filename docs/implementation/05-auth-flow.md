# Milestone 2.2: OAuth Authentication Flow

## Objective
Implement the complete OAuth 2.0 authentication flow with temporary HTTP server for authorization code exchange.

## Prerequisites
- Completed: 01-project-setup.md through 04-oauth-setup.md
- Google Cloud project with OAuth credentials configured
- Understanding of OAuth 2.0 authorization code flow

## 🔄 COLLABORATIVE STEPS

This milestone involves both human interaction and Cline automation:

### 🧑‍💻 HUMAN REQUIRED:
- Browser interaction during OAuth flow (clicking "Allow" in Google consent screen)
- Testing the authentication flow manually
- Verifying browser opens correctly for OAuth

### 🤖 CLINE EXECUTABLE:
- Creating all authentication code files
- Setting up OAuth callback server
- Implementing token management
- Creating authentication tools

## Implementation Steps

### 1. OAuth Flow Manager
Create `src/auth/oauth.ts`:
```typescript
import { OAuth2Client } from 'google-auth-library';
import { GoogleTokens, GoogleUserInfo } from '../types/google.js';
import { oauthConfig } from './config.js';
import { credentialsManager } from './credentials.js';
import { AuthenticationError, AuthorizationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * OAuth 2.0 authentication manager
 */
export class OAuthManager {
  private oauth2Client: OAuth2Client | null = null;
  private currentTokens: GoogleTokens | null = null;

  /**
   * Initialize OAuth client
   */
  public async initialize(): Promise<void> {
    try {
      const credentials = await oauthConfig.loadCredentials();
      
      this.oauth2Client = new OAuth2Client(
        credentials.client_id,
        credentials.client_secret,
        oauthConfig.getRedirectUri()
      );

      logger.info('OAuth client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize OAuth client', error);
      throw new AuthenticationError('OAuth initialization failed', error as Error);
    }
  }

  /**
   * Get OAuth client (initialize if needed)
   */
  private async getOAuthClient(): Promise<OAuth2Client> {
    if (!this.oauth2Client) {
      await this.initialize();
    }
    
    if (!this.oauth2Client) {
      throw new AuthenticationError('OAuth client not initialized');
    }
    
    return this.oauth2Client;
  }

  /**
   * Generate authorization URL
   */
  public async generateAuthUrl(state?: string): Promise<string> {
    const client = await this.getOAuthClient();
    const scopes = oauthConfig.getScopes();
    
    const authUrl = client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state,
    });

    logger.info('Generated authorization URL', { 
      scopes: scopes.length,
      hasState: !!state 
    });
    
    return authUrl;
  }

  /**
   * Exchange authorization code for tokens
   */
  public async exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
    const client = await this.getOAuthClient();
    
    try {
      logger.info('Exchanging authorization code for tokens');
      
      const { tokens } = await client.getToken(code);
      
      if (!tokens.access_token) {
        throw new AuthenticationError('No access token received from Google');
      }

      const googleTokens: GoogleTokens = {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || undefined,
        scope: tokens.scope || '',
        token_type: tokens.token_type || 'Bearer',
        expiry_date: tokens.expiry_date || undefined,
      };

      // Set credentials on client
      client.setCredentials(tokens);
      this.currentTokens = googleTokens;

      // Save tokens securely
      await credentialsManager.saveTokens(googleTokens);

      logger.info('Tokens exchanged and saved successfully', {
        hasRefreshToken: !!googleTokens.refresh_token,
        expiryDate: googleTokens.expiry_date,
        scopes: googleTokens.scope.split(' ').length,
      });

      return googleTokens;
    } catch (error) {
      logger.error('Failed to exchange authorization code', error);
      throw new AuthenticationError('Token exchange failed', error as Error);
    }
  }

  /**
   * Load existing tokens
   */
  public async loadTokens(): Promise<GoogleTokens | null> {
    try {
      const tokens = await credentialsManager.loadTokens();
      
      if (tokens) {
        const client = await this.getOAuthClient();
        client.setCredentials({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expiry_date: tokens.expiry_date,
          token_type: tokens.token_type,
          scope: tokens.scope,
        });
        
        this.currentTokens = tokens;
        logger.info('Existing tokens loaded successfully');
      }
      
      return tokens;
    } catch (error) {
      logger.error('Failed to load existing tokens', error);
      return null;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  public async refreshTokens(): Promise<GoogleTokens> {
    const client = await this.getOAuthClient();
    
    if (!this.currentTokens?.refresh_token) {
      throw new AuthenticationError('No refresh token available. Re-authentication required.');
    }

    try {
      logger.info('Refreshing access token');
      
      client.setCredentials({
        refresh_token: this.currentTokens.refresh_token,
      });

      const { credentials } = await client.refreshAccessToken();
      
      const refreshedTokens: GoogleTokens = {
        access_token: credentials.access_token!,
        refresh_token: credentials.refresh_token || this.currentTokens.refresh_token,
        scope: credentials.scope || this.currentTokens.scope,
        token_type: credentials.token_type || this.currentTokens.token_type,
        expiry_date: credentials.expiry_date || undefined,
      };

      this.currentTokens = refreshedTokens;
      await credentialsManager.saveTokens(refreshedTokens);

      logger.info('Tokens refreshed successfully', {
        expiryDate: refreshedTokens.expiry_date,
      });

      return refreshedTokens;
    } catch (error) {
      logger.error('Failed to refresh tokens', error);
      throw new AuthenticationError('Token refresh failed', error as Error);
    }
  }

  /**
   * Get current valid access token (refresh if needed)
   */
  public async getValidAccessToken(): Promise<string> {
    if (!this.currentTokens) {
      const tokens = await this.loadTokens();
      if (!tokens) {
        throw new AuthenticationError('No authentication tokens available. Please authenticate first.');
      }
    }

    // Check if token is expired and refresh if needed
    if (this.currentTokens && credentialsManager.isTokenExpired(this.currentTokens)) {
      logger.info('Access token expired, refreshing...');
      await this.refreshTokens();
    }

    if (!this.currentTokens?.access_token) {
      throw new AuthenticationError('No valid access token available');
    }

    return this.currentTokens.access_token;
  }

  /**
   * Get user information
   */
  public async getUserInfo(): Promise<GoogleUserInfo> {
    const client = await this.getOAuthClient();
    
    try {
      const accessToken = await this.getValidAccessToken();
      
      // Use the access token to get user info
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const userInfo = await response.json() as GoogleUserInfo;
      
      logger.info('Retrieved user information', {
        email: userInfo.email,
        name: userInfo.name,
      });

      return userInfo;
    } catch (error) {
      logger.error('Failed to get user information', error);
      throw new AuthenticationError('Failed to retrieve user information', error as Error);
    }
  }

  /**
   * Revoke tokens and clear stored credentials
   */
  public async revokeTokens(): Promise<void> {
    try {
      if (this.currentTokens?.access_token) {
        // Revoke the token with Google
        const response = await fetch('https://oauth2.googleapis.com/revoke', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `token=${this.currentTokens.access_token}`,
        });

        if (!response.ok) {
          logger.warn('Failed to revoke token with Google', { status: response.status });
        } else {
          logger.info('Token revoked with Google successfully');
        }
      }

      // Clear stored tokens
      await credentialsManager.deleteTokens();
      this.currentTokens = null;

      // Clear OAuth client credentials
      if (this.oauth2Client) {
        this.oauth2Client.setCredentials({});
      }

      logger.info('All tokens cleared successfully');
    } catch (error) {
      logger.error('Failed to revoke tokens', error);
      throw new AuthenticationError('Token revocation failed', error as Error);
    }
  }

  /**
   * Check if user is authenticated
   */
  public async isAuthenticated(): Promise<boolean> {
    try {
      const tokens = this.currentTokens || await this.loadTokens();
      
      if (!tokens) {
        return false;
      }

      // If token is expired but we have a refresh token, try to refresh
      if (credentialsManager.isTokenExpired(tokens) && tokens.refresh_token) {
        try {
          await this.refreshTokens();
          return true;
        } catch {
          return false;
        }
      }

      return !credentialsManager.isTokenExpired(tokens);
    } catch {
      return false;
    }
  }

  /**
   * Get current tokens (if any)
   */
  public getCurrentTokens(): GoogleTokens | null {
    return this.currentTokens;
  }

  /**
   * Validate token scopes
   */
  public validateTokenScopes(requiredScopes: string[]): void {
    if (!this.currentTokens) {
      throw new AuthorizationError('No authentication tokens available');
    }

    const tokenScopes = this.currentTokens.scope.split(' ');
    const missingScopes = requiredScopes.filter(scope => !tokenScopes.includes(scope));

    if (missingScopes.length > 0) {
      throw new AuthorizationError(
        `Missing required scopes: ${missingScopes.join(', ')}. Please re-authenticate with the required permissions.`
      );
    }
  }
}

// Global OAuth manager instance
export const oauthManager = new OAuthManager();
```

### 2. Temporary HTTP Server for OAuth Callback
Create `src/auth/server.ts`:
```typescript
import http from 'http';
import url from 'url';
import { logger } from '../utils/logger.js';
import { AuthenticationError } from '../utils/errors.js';

export interface AuthCallbackResult {
  code: string;
  state?: string;
  error?: string;
}

/**
 * Temporary HTTP server for OAuth callback handling
 */
export class OAuthCallbackServer {
  private server: http.Server | null = null;
  private port: number;
  private timeout: number;

  constructor(port: number = 8080, timeout: number = 300000) { // 5 minutes default
    this.port = port;
    this.timeout = timeout;
  }

  /**
   * Start the callback server and wait for OAuth response
   */
  public async waitForCallback(): Promise<AuthCallbackResult> {
    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout;

      // Create HTTP server
      this.server = http.createServer((req, res) => {
        try {
          const parsedUrl = url.parse(req.url || '', true);
          
          if (parsedUrl.pathname === '/auth/callback') {
            const query = parsedUrl.query;
            
            // Send response to browser
            this.sendCallbackResponse(res, query.error ? 'error' : 'success');
            
            // Clear timeout
            if (timeoutId) {
              clearTimeout(timeoutId);
            }
            
            // Close server
            this.stop();
            
            // Resolve with callback data
            if (query.error) {
              resolve({
                code: '',
                error: query.error as string,
              });
            } else if (query.code) {
              resolve({
                code: query.code as string,
                state: query.state as string,
              });
            } else {
              reject(new AuthenticationError('Invalid callback: missing authorization code'));
            }
          } else {
            // Handle other paths
            this.sendNotFoundResponse(res);
          }
        } catch (error) {
          logger.error('Error handling OAuth callback', error);
          this.sendErrorResponse(res);
          reject(new AuthenticationError('Callback handling failed', error as Error));
        }
      });

      // Handle server errors
      this.server.on('error', (error) => {
        logger.error('OAuth callback server error', error);
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        reject(new AuthenticationError('OAuth callback server failed', error));
      });

      // Start server
      this.server.listen(this.port, 'localhost', () => {
        logger.info(`OAuth callback server started on http://localhost:${this.port}`);
      });

      // Set timeout
      timeoutId = setTimeout(() => {
        logger.warn('OAuth callback timeout reached');
        this.stop();
        reject(new AuthenticationError('OAuth callback timeout - no response received within time limit'));
      }, this.timeout);
    });
  }

  /**
   * Stop the callback server
   */
  public stop(): void {
    if (this.server) {
      this.server.close(() => {
        logger.info('OAuth callback server stopped');
      });
      this.server = null;
    }
  }

  /**
   * Send success/error response to browser
   */
  private sendCallbackResponse(res: http.ServerResponse, status: 'success' | 'error'): void {
    const html = status === 'success' 
      ? this.getSuccessHtml()
      : this.getErrorHtml();

    res.writeHead(200, {
      'Content-Type': 'text/html',
      'Content-Length': Buffer.byteLength(html),
    });
    res.end(html);
  }

  /**
   * Send 404 response
   */
  private sendNotFoundResponse(res: http.ServerResponse): void {
    const html = this.getNotFoundHtml();
    res.writeHead(404, {
      'Content-Type': 'text/html',
      'Content-Length': Buffer.byteLength(html),
    });
    res.end(html);
  }

  /**
   * Send 500 error response
   */
  private sendErrorResponse(res: http.ServerResponse): void {
    const html = this.getErrorHtml();
    res.writeHead(500, {
      'Content-Type': 'text/html',
      'Content-Length': Buffer.byteLength(html),
    });
    res.end(html);
  }

  /**
   * Success page HTML
   */
  private getSuccessHtml(): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Google MCP Server - Authentication Successful</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px; 
            background-color: #f5f5f5; 
        }
        .container { 
            max-width: 500px; 
            margin: 0 auto; 
            background: white; 
            padding: 40px; 
            border-radius: 10px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
        }
        .success { color: #4CAF50; }
        .icon { font-size: 48px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">✅</div>
        <h1 class="success">Authentication Successful!</h1>
        <p>You have successfully authenticated with Google.</p>
        <p>You can now close this window and return to your application.</p>
        <p><small>Google MCP Server is now authorized to access your Google services.</small></p>
    </div>
    <script>
        // Auto-close window after 3 seconds
        setTimeout(() => {
            window.close();
        }, 3000);
    </script>
</body>
</html>`;
  }

  /**
   * Error page HTML
   */
  private getErrorHtml(): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Google MCP Server - Authentication Error</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px; 
            background-color: #f5f5f5; 
        }
        .container { 
            max-width: 500px; 
            margin: 0 auto; 
            background: white; 
            padding: 40px; 
            border-radius: 10px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
        }
        .error { color: #f44336; }
        .icon { font-size: 48px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">❌</div>
        <h1 class="error">Authentication Failed</h1>
        <p>There was an error during the authentication process.</p>
        <p>Please try again or check your configuration.</p>
        <p><small>You can close this window and retry the authentication.</small></p>
    </div>
</body>
</html>`;
  }

  /**
   * 404 page HTML
   */
  private getNotFoundHtml(): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Google MCP Server - Page Not Found</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px; 
            background-color: #f5f5f5; 
        }
        .container { 
            max-width: 500px; 
            margin: 0 auto; 
            background: white; 
            padding: 40px; 
            border-radius: 10px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Page Not Found</h1>
        <p>This is the Google MCP Server OAuth callback endpoint.</p>
        <p>Please use the proper authentication flow.</p>
    </div>
</body>
</html>`;
  }
}
```

### 3. Complete Authentication Flow
Create `src/auth/flow.ts`:
```typescript
import { oauthManager } from './oauth.js';
import { OAuthCallbackServer } from './server.js';
import { oauthConfig } from './config.js';
import { GoogleTokens, GoogleUserInfo } from '../types/google.js';
import { AuthenticationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { spawn } from 'child_process';
import { platform } from 'os';

/**
 * Complete OAuth authentication flow manager
 */
export class AuthenticationFlow {
  private callbackServer: OAuthCallbackServer | null = null;

  /**
   * Perform complete authentication flow
   */
  public async authenticate(): Promise<{ tokens: GoogleTokens; userInfo: GoogleUserInfo }> {
    try {
      logger.info('Starting OAuth authentication flow');

      // Check if already authenticated
      if (await oauthManager.isAuthenticated()) {
        logger.info('User already authenticated, retrieving existing tokens');
        const tokens = await oauthManager.loadTokens();
        const userInfo = await oauthManager.getUserInfo();
        
        if (tokens) {
          return { tokens, userInfo };
        }
      }

      // Start callback server
      this.callbackServer = new OAuthCallbackServer();
      const callbackPromise = this.callbackServer.waitForCallback();

      // Generate authorization URL
      const state = this.generateState();
      const authUrl = await oauthManager.generateAuthUrl(state);

      // Open browser
      await this.openBrowser(authUrl);
      logger.info('Browser opened for authentication. Waiting for user consent...');

      // Wait for callback
      const callbackResult = await callbackPromise;

      // Handle callback result
      if (callbackResult.error) {
        throw new AuthenticationError(`OAuth error: ${callbackResult.error}`);
      }

      if (!callbackResult.code) {
        throw new AuthenticationError('No authorization code received');
      }

      // Validate state (if provided)
      if (state && callbackResult.state !== state) {
        throw new AuthenticationError('Invalid state parameter - possible CSRF attack');
      }

      // Exchange code for tokens
      const tokens = await oauthManager.exchangeCodeForTokens(callbackResult.code);

      // Get user information
      const userInfo = await oauthManager.getUserInfo();

      logger.info('Authentication flow completed successfully', {
        email: userInfo.email,
        name: userInfo.name,
      });

      return { tokens, userInfo };
    } catch (error) {
      logger.error('Authentication flow failed', error);
      throw error;
    } finally {
      // Ensure callback server is stopped
      if (this.callbackServer) {
        this.callbackServer.stop();
        this.callbackServer = null;
      }
    }
  }

  /**
   * Check authentication status
   */
  public async checkAuthStatus(): Promise<{
    isAuthenticated: boolean;
    userInfo?: GoogleUserInfo;
    tokenExpiry?: number;
  }> {
    try {
      const isAuthenticated = await oauthManager.isAuthenticated();
      
      if (!isAuthenticated) {
        return { isAuthenticated: false };
      }

      const userInfo = await oauthManager.getUserInfo();
      const tokens = oauthManager.getCurrentTokens();

      return {
        isAuthenticated: true,
        userInfo,
        tokenExpiry: tokens?.expiry_date,
      };
    } catch (error) {
      logger.error('Failed to check authentication status', error);
      return { isAuthenticated: false };
    }
  }

  /**
   * Refresh authentication tokens
   */
  public async refreshAuthentication(): Promise<GoogleTokens> {
    try {
      logger.info('Refreshing authentication tokens');
      return await oauthManager.refreshTokens();
    } catch (error) {
      logger.error('Failed to refresh authentication', error);
      throw new AuthenticationError('Token refresh failed. Re-authentication may be required.', error as Error);
    }
  }

  /**
   * Revoke authentication and clear tokens
   */
  public async revokeAuthentication(): Promise<void> {
    try {
      logger.info('Revoking authentication');
      await oauthManager.revokeTokens();
      logger.info('Authentication revoked successfully');
    } catch (error) {
      logger.error('Failed to revoke authentication', error);
      throw error;
    }
  }

  /**
   * Generate random state for CSRF protection
   */
  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * Open browser to authorization URL
   */
  private async openBrowser(url: string): Promise<void> {
    const os = platform();
    let command: string;
    let args: string[];

    switch (os) {
      case 'darwin': // macOS
        command = 'open';
        args = [url];
        break;
      case 'win32': // Windows
        command = 'start';
        args = ['', url];
        break;
      default: // Linux and others
        command = 'xdg-open';
        args = [url];
        break;
    }

    try {
      const child = spawn(command, args, {
        detached: true,
        stdio: 'ignore',
      });
      
      child.unref();
      logger.info('Browser opened successfully');
    } catch (error) {
      logger.warn('Failed to open browser automatically', error);
      logger.info(`Please manually open this URL in your browser: ${url}`);
    }
  }
}

// Global authentication flow instance
export const authFlow = new AuthenticationFlow();
```

### 4. Authentication Tools
Create `src/tools/auth.ts`:
```typescript
import { MCPTool, MCPToolResult } from '../types/mcp.js';
import { ToolModule } from '../server/foundation.js';
import { authFlow } from '../auth/flow.js';
import { oauthManager } from '../auth/oauth.js';
import { logger } from '../utils/logger.js';
import { createStructuredToolResult, createToolResult } from '../server.js';

/**
 * Authentication tool module
 */
export class AuthToolModule implements ToolModule {
  public readonly name = 'auth';
  public readonly description = 'Authentication and authorization tools';

  public readonly tools: MCPTool[] = [
    {
      name: 'auth_status',
      description: 'Check current authentication status',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'auth_login',
      description: 'Authenticate with Google OAuth 2.0',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'auth_refresh',
      description: 'Refresh authentication tokens',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'auth_logout',
      description: 'Revoke authentication and clear tokens',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
  ];

  public readonly handlers = new Map<string, (args: Record<string, unknown>) => Promise<MCPToolResult>>([
    ['auth_status', this.handleAuthStatus.bind(this)],
    ['auth_login', this.handleAuthLogin.bind(this)],
    ['auth_refresh', this.handleAuthRefresh.bind(this)],
    ['auth_logout', this.handleAuthLogout.bind(this)],
  ]);

  /**
   * Initialize the auth module
   */
  public async initialize(): Promise<void> {
    logger.info('Initializing authentication module');
    await oauthManager.initialize();
  }

  /**
   * Check authentication status
   */
  private async handleAuthStatus(): Promise<MCPToolResult> {
    const status = await authFlow.checkAuthStatus();
    
    const statusInfo = {
      authenticated: status.isAuthenticated,
      user: status.userInfo ? {
        email: status.userInfo.email,
        name: status.userInfo.name,
        picture: status.userInfo.picture,
      } : null,
      tokenExpiry: status.tokenExpiry ? new Date(status.tokenExpiry).toISOString() : null,
      expiresIn: status.tokenExpiry ? Math.max(0, status.tokenExpiry - Date.now()) : null,
    };

    return createStructuredToolResult(
      statusInfo,
      status.isAuthenticated 
        ? `Authenticated as ${status.userInfo?.email}`
        : 'Not authenticated'
    );
  }

  /**
   * Perform OAuth authentication
   */
  private async handleAuthLogin(): Promise<MCPToolResult> {
    try {
      const result = await authFlow.authenticate();
      
      const authInfo = {
        success: true,
        user: {
          email: result.userInfo.email,
          name: result.userInfo.name,
          picture: result.userInfo.picture,
        },
        tokenExpiry: result.tokens.expiry_date ? new Date(result.tokens.expiry_date).toISOString() : null,
        scopes: result.tokens.scope.split(' '),
      };

      return createStructuredToolResult(
        authInfo,
        `Successfully authenticated as ${result.userInfo.email}`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      return createToolResult(`Authentication failed: ${errorMessage}`, true);
    }
  }

  /**
   * Refresh authentication tokens
   */
  private async handleAuthRefresh(): Promise<MCPToolResult> {
    try {
      const tokens = await authFlow.refreshAuthentication();
      
      const refreshInfo = {
        success: true,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        expiresIn: tokens.expiry_date ? Math.max(0, tokens.expiry_date - Date.now()) : null,
      };

      return createStructuredToolResult(
        refreshInfo,
        'Authentication tokens refreshed successfully'
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Token refresh failed';
      return createToolResult(`Token refresh failed: ${errorMessage}`, true);
    }
  }

  /**
   * Revoke authentication
   */
  private async handleAuthLogout(): Promise<MCPToolResult> {
    try {
      await authFlow.revokeAuthentication();
      
      return createToolResult('Successfully logged out and revoked authentication');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Logout failed';
      return createToolResult(`Logout failed: ${errorMessage}`, true);
    }
  }
}
```

### 5. Update Server Foundation
Update `src/server/foundation.ts` to register auth module:
```typescript
// Add this import at the top
import { AuthToolModule } from '../tools/auth.js';
import { isFeatureEnabled } from '../config/settings.js';

// Update the initializeToolModules method
private async initializeToolModules(): Promise<void> {
  // Register authentication module (always enabled)
  const authModule = new AuthToolModule();
  await this.registerToolModule(authModule);

  // Additional modules will be registered in subsequent implementation files
  logger.info('Core tool modules initialized');
}
```

## Testing Criteria
- [ ] OAuth flow completes successfully with browser redirect
- [ ] Tokens are saved and loaded correctly
- [ ] Token refresh works when tokens expire
- [ ] Authentication status can be checked
- [ ] Logout/revoke functionality works
- [ ] Callback server handles success and error cases

## Testing the Implementation

### 1. Authentication Flow Test
```bash
# Start the server
npm run dev

# In another terminal, test authentication tools
# (These would be called via MCP client)
```

### 2. Manual Browser Test
```bash
# Test the callback server directly
node -e "
import('./dist/auth/server.js').then(({ OAuthCallbackServer }) => {
  const server = new OAuthCallbackServer();
  console.log('Visit: http://localhost:8080/auth/callback?code=test_code');
  server.waitForCallback().then(result => {
    console.log('Callback result:', result);
  });
});
"
```

### 3. Token Management Test
```bash
# Test token operations
node -e "
import('./dist/auth/oauth.js').then(({ oauthManager }) => {
  oauthManager.initialize().then(() => {
    console.log('OAuth manager initialized');
    return oauthManager.isAuthenticated();
  }).then(isAuth => {
    console.log('Is authenticated:', isAuth);
  });
});
"
```

## Deliverables
- Complete OAuth 2.0 authentication flow
- Temporary HTTP server for callback handling
- Token management with refresh capability
- Authentication status checking
- User information retrieval
- Token revocation functionality
- Authentication tools for MCP interface

## Next Steps
This implementation enables:
- **File 06**: Token management and refresh logic
- **File 07**: Calendar API client setup
- **File 08**: List calendar events tool
- **File 09**: Create calendar event tool

## Estimated Time
4-5 hours for complete OAuth flow implementation and testing.
