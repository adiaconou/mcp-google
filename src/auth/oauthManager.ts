/**
 * OAuth Manager - Multi-Service OAuth 2.0 implementation for Google APIs
 * 
 * This file implements OAuth 2.0 with PKCE for secure authentication with
 * multiple Google APIs (Calendar, Gmail, Drive, Docs, Sheets). It handles 
 * the complete OAuth flow, token management, and automatic token refresh.
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { createHash, randomBytes } from 'crypto';
import { createServer, Server } from 'http';
import { URL } from 'url';
import { promises as fs } from 'fs';
import { join } from 'path';
import { setTimeout, clearTimeout } from 'timers';
import { CalendarError, MCPErrorCode } from '../types/mcp';
import { templateLoader } from './templates';

/**
 * OAuth configuration interface
 */
interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

/**
 * Enhanced token data interface for storage with metadata
 */
interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
  scope: string;
  tokenType: string;
  createdAt: number;
  version: string;
}

/**
 * PKCE data for OAuth flow
 */
interface PKCEData {
  codeVerifier: string;
  codeChallenge: string;
  state: string;
}

/**
 * Enhanced authentication status interface
 */
interface AuthStatus {
  isAuthenticated: boolean;
  hasTokens: boolean;
  tokenExpiry?: number;
  scopes?: string;
  timeUntilExpiry?: number;
  needsRefresh?: boolean;
  createdAt?: number;
  version?: string;
}

/**
 * Port availability check result
 */
interface PortCheckResult {
  port: number;
  available: boolean;
}

/**
 * OAuth Manager for Google APIs authentication
 * 
 * Implements OAuth 2.0 with PKCE for secure authentication and token management.
 * Handles the complete OAuth flow including authorization, token exchange, and refresh.
 * Supports multiple Google services: Calendar, Gmail, Drive, Docs, and Sheets.
 */
export class OAuthManager {
  private oauth2Client: OAuth2Client;
  private config: OAuthConfig;
  private tokenPath: string;
  private currentPKCE: PKCEData | null = null;
  private callbackServer: Server | null = null;

  constructor() {
    // Load configuration from environment variables
    this.config = this.loadConfig();
    
    // Initialize OAuth2 client
    this.oauth2Client = new google.auth.OAuth2(
      this.config.clientId,
      this.config.clientSecret,
      this.config.redirectUri
    );

    // Set token storage path
    this.tokenPath = join(process.cwd(), '.tokens', 'calendar-tokens.json');
  }

  /**
   * Load OAuth configuration from environment variables
   * @returns OAuth configuration object
   * @throws {CalendarError} If required environment variables are missing
   */
  private loadConfig(): OAuthConfig {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8080/auth/callback';

    if (!clientId || !clientSecret) {
      throw new CalendarError(
        'Missing required OAuth credentials. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.',
        MCPErrorCode.AuthenticationError
      );
    }

    return {
      clientId,
      clientSecret,
      redirectUri,
      scopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.labels',
        'https://www.googleapis.com/auth/drive.readonly'
      ]
    };
  }

  /**
   * Generate PKCE parameters for OAuth flow
   * @returns PKCE data object
   */
  private generatePKCE(): PKCEData {
    // Generate code verifier (43-128 characters, URL-safe)
    const codeVerifier = randomBytes(32).toString('base64url');
    
    // Generate code challenge (SHA256 hash of verifier, base64url encoded)
    const codeChallenge = createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    
    // Generate state parameter for CSRF protection
    const state = randomBytes(16).toString('hex');

    return {
      codeVerifier,
      codeChallenge,
      state
    };
  }

  /**
   * Get authorization URL for OAuth flow
   * @returns Promise resolving to authorization URL
   */
  async getAuthorizationUrl(): Promise<string> {
    try {
      // Generate PKCE parameters
      this.currentPKCE = this.generatePKCE();

      // Generate authorization URL
      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: this.config.scopes,
        state: this.currentPKCE.state,
        code_challenge: this.currentPKCE.codeChallenge,
        code_challenge_method: 'S256' as any,
        prompt: 'consent' // Force consent to ensure refresh token
      });

      console.error('Generated OAuth authorization URL');
      return authUrl;

    } catch (error) {
      throw new CalendarError(
        `Failed to generate authorization URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        MCPErrorCode.AuthenticationError
      );
    }
  }

  /**
   * Start callback server and initiate OAuth flow
   * @returns Promise resolving when authentication is complete
   */
  async authenticate(): Promise<void> {
    try {
      // Start callback server first
      const serverPromise = this.startCallbackServer();
      
      // Get authorization URL after server is ready
      const authUrl = await this.getAuthorizationUrl();
      
      console.error('\n=== Google Calendar OAuth Authentication ===');
      console.error('Please open the following URL in your browser to authenticate:');
      console.error(authUrl);
      console.error('\nWaiting for authentication callback...');

      // Open browser automatically if possible
      try {
        const { exec } = await import('child_process');
        exec(`start "" "${authUrl}"`, (error) => {
          if (error) {
            console.error('Could not open browser automatically. Please open the URL manually.');
          }
        });
      } catch {
        console.error('Could not open browser automatically. Please open the URL manually.');
      }

      // Wait for callback server to complete
      await serverPromise;

    } catch (error) {
      throw new CalendarError(
        `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        MCPErrorCode.AuthenticationError
      );
    }
  }

  /**
   * Check if a port is available for use
   * @param port - Port number to check
   * @returns Promise resolving to port availability result
   */
  private async checkPortAvailability(port: number): Promise<PortCheckResult> {
    return new Promise((resolve) => {
      const testServer = createServer();
      
      testServer.listen(port, () => {
        testServer.close(() => {
          resolve({ port, available: true });
        });
      });
      
      testServer.on('error', () => {
        resolve({ port, available: false });
      });
    });
  }

  /**
   * Find an available port in the specified range
   * @param startPort - Starting port number (default: 8080)
   * @param endPort - Ending port number (default: 8090)
   * @returns Promise resolving to available port number
   * @throws {CalendarError} If no ports are available
   */
  private async findAvailablePort(startPort: number = 8080, endPort: number = 8090): Promise<number> {
    for (let port = startPort; port <= endPort; port++) {
      const result = await this.checkPortAvailability(port);
      if (result.available) {
        return port;
      }
    }
    
    throw new CalendarError(
      `No available ports found in range ${startPort}-${endPort}. Please ensure some ports are free or set OAUTH_CALLBACK_PORT to a specific available port.`,
      MCPErrorCode.InternalError
    );
  }

  /**
   * Start HTTP server to handle OAuth callback with port conflict detection
   * @returns Promise resolving when callback is received
   */
  private async startCallbackServer(): Promise<void> {
    // Phase 1.4: Port Conflict Detection - Find available port
    const preferredPort = parseInt(process.env.OAUTH_CALLBACK_PORT || '8080');
    let port: number;
    
    if (process.env.OAUTH_CALLBACK_PORT) {
      // If specific port is requested, check if it's available
      const result = await this.checkPortAvailability(preferredPort);
      if (!result.available) {
        throw new CalendarError(
          `Requested port ${preferredPort} is not available. Please choose a different port or remove OAUTH_CALLBACK_PORT to use automatic port selection.`,
          MCPErrorCode.InternalError
        );
      }
      port = preferredPort;
    } else {
      // Find any available port in range
      port = await this.findAvailablePort();
    }

    // Update redirect URI if port changed
    if (port !== 8080) {
      const newRedirectUri = `http://localhost:${port}/auth/callback`;
      this.oauth2Client = new google.auth.OAuth2(
        this.config.clientId,
        this.config.clientSecret,
        newRedirectUri
      );
      console.error(`Using port ${port} for OAuth callback`);
    }

    return new Promise((resolve, reject) => {
      try {
        const timeout = parseInt(process.env.OAUTH_CALLBACK_TIMEOUT || '300000'); // 5 minutes

        this.callbackServer = createServer(async (req, res) => {
        try {
          if (!req.url) {
            throw new Error('No URL in request');
          }

          const url = new URL(req.url, `http://localhost:${port}`);
          
          if (url.pathname === '/auth/callback') {
            const code = url.searchParams.get('code');
            const state = url.searchParams.get('state');
            const error = url.searchParams.get('error');

            // Handle OAuth error
            if (error) {
              res.writeHead(400, { 'Content-Type': 'text/html' });
              res.end(await this.generateErrorPage(`OAuth Error: ${error}`, 'The authentication request was denied or failed. Please try again.'));
              reject(new CalendarError(`OAuth error: ${error}`, MCPErrorCode.AuthenticationError));
              return;
            }

            // Validate state parameter
            if (!state || !this.currentPKCE || state !== this.currentPKCE.state) {
              res.writeHead(400, { 'Content-Type': 'text/html' });
              res.end(await this.generateErrorPage('Invalid State Parameter', 'The authentication request appears to be invalid. Please try again.'));
              reject(new CalendarError('Invalid state parameter', MCPErrorCode.AuthenticationError));
              return;
            }

            // Handle authorization code
            if (code) {
              await this.handleCallback(code);
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(await this.generateSuccessPage());
              this.stopCallbackServer();
              resolve();
            } else {
              res.writeHead(400, { 'Content-Type': 'text/html' });
              res.end(await this.generateErrorPage('No Authorization Code', 'No authorization code was received from Google. Please try again.'));
              reject(new CalendarError('No authorization code received', MCPErrorCode.AuthenticationError));
            }
          } else {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>Not Found</h1>');
          }
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end('<h1>Server Error</h1>');
          reject(error);
        }
      });

      // Set timeout with unref() to prevent hanging tests
      const timeoutId = setTimeout(() => {
        this.stopCallbackServer();
        reject(new CalendarError('Authentication timeout', MCPErrorCode.AuthenticationError));
      }, timeout);
      timeoutId.unref(); // Allow process to exit even if timeout is pending

      this.callbackServer.listen(port, () => {
        console.error(`Callback server listening on port ${port}`);
      });

      this.callbackServer.on('close', () => {
        clearTimeout(timeoutId);
      });

      this.callbackServer.on('error', (error: any) => {
        clearTimeout(timeoutId);
        if (error.code === 'EADDRINUSE') {
          reject(new CalendarError(
            `Port ${port} is already in use. This should not happen with port detection enabled.`,
            MCPErrorCode.InternalError
          ));
        } else {
          reject(new CalendarError(`Callback server error: ${error.message}`, MCPErrorCode.AuthenticationError));
        }
      });
      } catch (error) {
        reject(error instanceof CalendarError ? error : new CalendarError(
          `Failed to start callback server: ${error instanceof Error ? error.message : 'Unknown error'}`,
          MCPErrorCode.InternalError
        ));
      }
    });
  }

  /**
   * Generate enhanced HTML success page with auto-close functionality (Phase 2.2 & 2.3)
   * @returns Promise resolving to HTML string for success page
   */
  private async generateSuccessPage(): Promise<string> {
    try {
      const autoCloseDelay = parseInt(process.env.OAUTH_AUTO_CLOSE_DELAY || '3000'); // 3 seconds default
      return await templateLoader.loadSuccessTemplate(autoCloseDelay);
    } catch (error) {
      // Fallback to inline HTML if template loading fails
      console.warn('Failed to load success template, using fallback:', error);
      return templateLoader.getFallbackSuccessHtml();
    }
  }

  /**
   * Generate enhanced HTML error page (Phase 2.3)
   * @param title - Error title
   * @param message - Error message
   * @returns Promise resolving to HTML string for error page
   */
  private async generateErrorPage(title: string, message: string): Promise<string> {
    try {
      return await templateLoader.loadErrorTemplate(title, message);
    } catch (error) {
      // Fallback to inline HTML if template loading fails
      console.warn('Failed to load error template, using fallback:', error);
      return templateLoader.getFallbackErrorHtml(title, message);
    }
  }

  /**
   * Stop the callback server
   */
  private stopCallbackServer(): void {
    if (this.callbackServer) {
      this.callbackServer.close();
      this.callbackServer = null;
          console.error('Callback server stopped');
    }
  }

  /**
   * Handle OAuth callback with authorization code
   * @param code - Authorization code from OAuth callback
   */
  private async handleCallback(code: string): Promise<void> {
    try {
      if (!this.currentPKCE) {
        throw new Error('No PKCE data available');
      }

      // Exchange authorization code for tokens
      const { tokens } = await this.oauth2Client.getToken({
        code,
        codeVerifier: this.currentPKCE.codeVerifier
      });

      if (!tokens.access_token || !tokens.refresh_token) {
        throw new Error('Invalid token response');
      }

      // Store tokens with metadata
      await this.storeTokens({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date || Date.now() + 3600000, // 1 hour default
        scope: tokens.scope || this.config.scopes.join(' '),
        tokenType: tokens.token_type || 'Bearer',
        createdAt: Date.now(),
        version: '1.0.0'
      });

      // Set tokens in OAuth client
      this.oauth2Client.setCredentials(tokens);

      console.error('OAuth authentication successful');
      this.currentPKCE = null;

    } catch (error) {
      throw new CalendarError(
        `Failed to handle OAuth callback: ${error instanceof Error ? error.message : 'Unknown error'}`,
        MCPErrorCode.AuthenticationError
      );
    }
  }

  /**
   * Store tokens securely to file system
   * @param tokenData - Token data to store
   */
  private async storeTokens(tokenData: TokenData): Promise<void> {
    try {
      // Ensure tokens directory exists
      const tokensDir = join(process.cwd(), '.tokens');
      await fs.mkdir(tokensDir, { recursive: true });

      // Write tokens to file with restricted permissions
      await fs.writeFile(this.tokenPath, JSON.stringify(tokenData, null, 2), { mode: 0o600 });
      
      console.error('Tokens stored successfully');

    } catch (error) {
      throw new CalendarError(
        `Failed to store tokens: ${error instanceof Error ? error.message : 'Unknown error'}`,
        MCPErrorCode.InternalError
      );
    }
  }

  /**
   * Load tokens from file system
   * @returns Promise resolving to token data or null if not found
   */
  private async loadTokens(): Promise<TokenData | null> {
    try {
      const tokenJson = await fs.readFile(this.tokenPath, 'utf-8');
      return JSON.parse(tokenJson) as TokenData;
    } catch {
      // File not found or invalid JSON
      return null;
    }
  }

  /**
   * Check if current tokens have all required scopes
   * @param tokens - Token data to check
   * @returns True if all required scopes are present
   */
  private hasRequiredScopes(tokens: TokenData): boolean {
    if (!tokens.scope) {
      return false;
    }

    const tokenScopes = tokens.scope.split(' ');
    const requiredScopes = this.config.scopes;

    // Check if all required scopes are present in token scopes
    return requiredScopes.every(scope => tokenScopes.includes(scope));
  }

  /**
   * Check if user is authenticated with all required scopes
   * @returns True if authenticated with all scopes, false otherwise
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const tokens = await this.loadTokens();
      if (!tokens) {
        return false;
      }

      // Check if tokens have all required scopes
      if (!this.hasRequiredScopes(tokens)) {
        console.error('Stored tokens missing required scopes. Re-authentication needed.');
        console.error(`Required scopes: ${this.config.scopes.join(', ')}`);
        console.error(`Token scopes: ${tokens.scope}`);
        
        // Clear invalid tokens to force re-authentication
        await this.clearTokens();
        return false;
      }

      // Check if tokens are still valid or can be refreshed
      if (tokens.expiryDate > Date.now()) {
        // Tokens are still valid
        try {
          this.oauth2Client.setCredentials({
            access_token: tokens.accessToken,
            refresh_token: tokens.refreshToken,
            expiry_date: tokens.expiryDate
          });
          
          // Verify credentials were set properly
          const creds = this.oauth2Client.credentials;
          if (creds.access_token) {
            return true;
          } else {
            return false;
          }
        } catch {
          return false;
        }
      }

      // Try to refresh tokens
      return await this.refreshTokens();

    } catch {
      return false;
    }
  }

  /**
   * Get valid access token (refresh if needed)
   * @returns Promise resolving to access token
   * @throws {CalendarError} If authentication is required
   */
  async getAccessToken(): Promise<string> {
    try {
      const tokens = await this.loadTokens();
      if (!tokens) {
        throw new CalendarError(
          'No authentication tokens found. Please authenticate first.',
          MCPErrorCode.AuthenticationError
        );
      }

      // Check if token is still valid with 5-minute buffer (Phase 1.3: Token Refresh Buffer)
      if (tokens.expiryDate > Date.now() + 300000) { // 5 minute buffer
        return tokens.accessToken;
      }

      // Refresh tokens
      await this.refreshTokens();
      
      // Get updated tokens
      const updatedTokens = await this.loadTokens();
      if (!updatedTokens) {
        throw new Error('Failed to refresh tokens');
      }

      return updatedTokens.accessToken;

    } catch (error) {
      if (error instanceof CalendarError) {
        throw error;
      }
      throw new CalendarError(
        `Failed to get access token: ${error instanceof Error ? error.message : 'Unknown error'}`,
        MCPErrorCode.AuthenticationError
      );
    }
  }

  /**
   * Refresh access tokens using refresh token
   * @returns Promise resolving to true if successful
   */
  private async refreshTokens(): Promise<boolean> {
    try {
      const tokens = await this.loadTokens();
      if (!tokens || !tokens.refreshToken) {
        return false;
      }

      // Set refresh token in OAuth client
      this.oauth2Client.setCredentials({
        refresh_token: tokens.refreshToken
      });

      // Refresh tokens
      const { credentials } = await this.oauth2Client.refreshAccessToken();

      if (!credentials.access_token) {
        return false;
      }

      // Update stored tokens
      const updatedTokens: TokenData = {
        ...tokens,
        accessToken: credentials.access_token,
        expiryDate: credentials.expiry_date || Date.now() + 3600000,
        refreshToken: credentials.refresh_token || tokens.refreshToken
      };

      await this.storeTokens(updatedTokens);
      
      console.error('Tokens refreshed successfully');
      return true;

    } catch (error) {
      console.error('Failed to refresh tokens:', error);
      return false;
    }
  }

  /**
   * Get configured OAuth2 client with current tokens
   * @returns Promise resolving to configured OAuth2Client
   * @throws {CalendarError} If not authenticated
   */
  async getOAuth2Client(): Promise<OAuth2Client> {
    const isAuth = await this.isAuthenticated();
    if (!isAuth) {
      throw new CalendarError(
        'Not authenticated. Please authenticate first.',
        MCPErrorCode.AuthenticationError
      );
    }

    return this.oauth2Client;
  }

  /**
   * Clear stored tokens (logout)
   */
  async clearTokens(): Promise<void> {
    try {
      await fs.unlink(this.tokenPath);
      this.oauth2Client.setCredentials({});
      console.error('Tokens cleared successfully');
    } catch {
      // File might not exist, which is fine
      console.error('No tokens to clear');
    }
  }

  /**
   * Force clear stored tokens and trigger reauthentication (Phase 1: Immediate Fix)
   * This method provides a manual way to reset authentication when scope issues occur
   */
  async forceReauthentication(): Promise<void> {
    console.error('Forcing reauthentication - clearing stored tokens');
    await this.clearTokens();
    console.error('Tokens cleared. Next authentication request will trigger fresh OAuth flow.');
  }

  /**
   * Get current scopes from stored tokens
   * @returns Array of current scopes or empty array if no tokens
   */
  getCurrentScopes(): string[] {
    try {
      const tokens = this.loadTokens();
      if (!tokens) {
        return [];
      }
      // Note: loadTokens is async, but we need sync access for utility methods
      // This is a limitation we'll address in the async version below
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Get current scopes from stored tokens (async version)
   * @returns Promise resolving to array of current scopes
   */
  async getCurrentScopesAsync(): Promise<string[]> {
    try {
      const tokens = await this.loadTokens();
      if (!tokens || !tokens.scope) {
        return [];
      }
      return tokens.scope.split(' ').filter(scope => scope.trim().length > 0);
    } catch {
      return [];
    }
  }

  /**
   * Get required scopes for all configured services
   * @returns Array of required scopes
   */
  getRequiredScopes(): string[] {
    return [...this.config.scopes];
  }

  /**
   * Compare current scopes with required scopes
   * @param current - Current scopes array
   * @param required - Required scopes array
   * @returns Object with missing and extra scopes
   */
  compareScopes(current: string[], required: string[]): { missing: string[], extra: string[] } {
    const missing = required.filter(scope => !current.includes(scope));
    const extra = current.filter(scope => !required.includes(scope));
    return { missing, extra };
  }

  /**
   * Validate that current tokens have all required scopes (Phase 2: Enhanced Detection)
   * @returns Promise resolving to true if all scopes present, false if missing
   */
  async validateTokenScopes(): Promise<boolean> {
    try {
      const tokens = await this.loadTokens();
      if (!tokens) {
        console.error('No tokens found for scope validation');
        return false;
      }

      const hasScopes = this.hasRequiredScopes(tokens);
      if (!hasScopes) {
        const currentScopes = await this.getCurrentScopesAsync();
        const requiredScopes = this.getRequiredScopes();
        const comparison = this.compareScopes(currentScopes, requiredScopes);
        
        console.error('Scope validation failed:');
        console.error(`Required scopes: ${requiredScopes.join(', ')}`);
        console.error(`Current scopes: ${currentScopes.join(', ')}`);
        console.error(`Missing scopes: ${comparison.missing.join(', ')}`);
        
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating token scopes:', error);
      return false;
    }
  }

  /**
   * Ensure current authentication includes all required scopes (Phase 2: Enhanced Detection)
   * Automatically triggers reauthentication if scopes are missing
   * @param additionalScopes - Optional additional scopes to require
   * @returns Promise resolving when scopes are ensured
   */
  async ensureScopes(additionalScopes: string[] = []): Promise<void> {
    try {
      // Combine required scopes with any additional scopes
      const allRequiredScopes = [...this.config.scopes, ...additionalScopes];
      
      const tokens = await this.loadTokens();
      if (!tokens) {
        console.error('No tokens found - authentication required');
        throw new CalendarError(
          'Authentication required. No tokens found.',
          MCPErrorCode.AuthenticationError
        );
      }

      // Check if current tokens have all required scopes
      const currentScopes = tokens.scope ? tokens.scope.split(' ') : [];
      const comparison = this.compareScopes(currentScopes, allRequiredScopes);
      
      if (comparison.missing.length > 0) {
        console.error(`Missing required scopes: ${comparison.missing.join(', ')}`);
        console.error('Triggering automatic reauthentication...');
        
        // Clear current tokens and force reauthentication
        await this.forceReauthentication();
        
        throw new CalendarError(
          `Missing required scopes: ${comparison.missing.join(', ')}. Please reauthenticate to grant additional permissions.`,
          MCPErrorCode.AuthenticationError
        );
      }

      console.error('All required scopes are present');
    } catch (error) {
      if (error instanceof CalendarError) {
        throw error;
      }
      throw new CalendarError(
        `Failed to ensure scopes: ${error instanceof Error ? error.message : 'Unknown error'}`,
        MCPErrorCode.AuthenticationError
      );
    }
  }

  /**
   * Handle insufficient scope errors from Google APIs (Phase 2: Enhanced Detection)
   * Automatically detects and handles 403 "insufficient scope" errors
   * @param error - Error from Google API call
   * @returns Promise resolving when error is handled
   */
  async handleInsufficientScopeError(error: any): Promise<void> {
    try {
      // Check if this is an insufficient scope error
      const isInsufficientScope = 
        error?.code === 403 ||
        error?.status === 403 ||
        (error?.message && error.message.toLowerCase().includes('insufficient')) ||
        (error?.message && error.message.toLowerCase().includes('scope'));

      if (isInsufficientScope) {
        console.error('Detected insufficient scope error from Google API');
        console.error('Error details:', error.message || error);
        
        // Force reauthentication to get proper scopes
        await this.forceReauthentication();
        
        throw new CalendarError(
          'Insufficient permissions for this operation. Authentication has been reset. Please try again to grant the required permissions.',
          MCPErrorCode.AuthenticationError
        );
      }

      // If not a scope error, re-throw the original error
      throw error;
    } catch (error) {
      if (error instanceof CalendarError) {
        throw error;
      }
      throw new CalendarError(
        `Failed to handle API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        MCPErrorCode.InternalError
      );
    }
  }

  /**
   * Request additional scopes through incremental authorization (Phase 2: Enhanced Detection)
   * @param newScopes - Array of new scopes to request
   * @returns Promise resolving when additional scopes are granted
   */
  async requestAdditionalScopes(newScopes: string[]): Promise<void> {
    try {
      console.error(`Requesting additional scopes: ${newScopes.join(', ')}`);
      
      // Add new scopes to the configuration
      const currentScopes = this.getRequiredScopes();
      const uniqueNewScopes = newScopes.filter(scope => !currentScopes.includes(scope));
      
      if (uniqueNewScopes.length === 0) {
        console.error('All requested scopes are already configured');
        return;
      }

      // Update configuration with new scopes
      this.config.scopes.push(...uniqueNewScopes);
      
      console.error(`Added ${uniqueNewScopes.length} new scopes to configuration`);
      console.error('Triggering reauthentication to grant new permissions...');
      
      // Force reauthentication with updated scopes
      await this.forceReauthentication();
      
    } catch (error) {
      throw new CalendarError(
        `Failed to request additional scopes: ${error instanceof Error ? error.message : 'Unknown error'}`,
        MCPErrorCode.AuthenticationError
      );
    }
  }

  /**
   * Enhanced authentication status reporting (Phase 2.4)
   * @returns Comprehensive authentication status object
   */
  async getAuthStatus(): Promise<AuthStatus> {
    const tokens = await this.loadTokens();
    const isAuth = await this.isAuthenticated();
    const now = Date.now();

    const result: AuthStatus = {
      isAuthenticated: isAuth,
      hasTokens: tokens !== null
    };

    if (tokens) {
      result.tokenExpiry = tokens.expiryDate;
      result.scopes = tokens.scope;
      result.createdAt = tokens.createdAt;
      result.version = tokens.version;
      
      // Calculate time until expiry
      if (tokens.expiryDate > now) {
        result.timeUntilExpiry = tokens.expiryDate - now;
        // Check if token needs refresh (within 5-minute buffer)
        result.needsRefresh = tokens.expiryDate <= now + 300000;
      } else {
        result.timeUntilExpiry = 0;
        result.needsRefresh = true;
      }
    }

    return result;
  }
  /**
   * Check if user is already authenticated with valid tokens (Phase 2.1)
   * @param requiredScopes - Optional array of required scopes to validate
   * @returns True if authenticated with valid tokens, false otherwise
   */
  async isAlreadyAuthenticated(requiredScopes?: string[]): Promise<boolean> {
    try {
      const tokens = await this.loadTokens();
      if (!tokens) {
        return false;
      }

      // Check if tokens are still valid (with 5-minute buffer)
      if (tokens.expiryDate <= Date.now() + 300000) {
        // Try to refresh tokens
        const refreshed = await this.refreshTokens();
        if (!refreshed) {
          return false;
        }
        // Reload tokens after refresh
        const refreshedTokens = await this.loadTokens();
        if (!refreshedTokens) {
          return false;
        }
      }

      // Validate scopes if provided
      if (requiredScopes && requiredScopes.length > 0) {
        const tokenScopes = tokens.scope.split(' ');
        const hasAllScopes = requiredScopes.every(scope => tokenScopes.includes(scope));
        if (!hasAllScopes) {
          return false;
        }
      }

      // Set credentials in OAuth client
      this.oauth2Client.setCredentials({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expiry_date: tokens.expiryDate
      });

      return true;
    } catch (error) {
      console.error('Error checking if already authenticated:', error);
      return false;
    }
  }

  /**
   * Check if authentication should be triggered and provide reason
   * @returns Object with authentication status and reason
   */
  async shouldTriggerAuth(): Promise<{ needed: boolean; reason: string; action: string }> {
    try {
      const tokens = await this.loadTokens();
      
      // No tokens exist
      if (!tokens) {
        return {
          needed: true,
          reason: 'No authentication tokens found',
          action: 'Initial authentication required'
        };
      }
      
      // Check if tokens have required scopes
      if (!this.hasRequiredScopes(tokens)) {
        const currentScopes = await this.getCurrentScopesAsync();
        const requiredScopes = this.getRequiredScopes();
        const comparison = this.compareScopes(currentScopes, requiredScopes);
        
        return {
          needed: true,
          reason: `Missing required scopes: ${comparison.missing.join(', ')}`,
          action: 'Reauthentication required for additional permissions'
        };
      }
      
      // Check if tokens are expired and can't be refreshed
      if (tokens.expiryDate <= Date.now()) {
        const canRefresh = await this.refreshTokens();
        if (!canRefresh) {
          return {
            needed: true,
            reason: 'Authentication tokens have expired and cannot be refreshed',
            action: 'Reauthentication required due to expired tokens'
          };
        }
      }
      
      // Authentication is valid
      return {
        needed: false,
        reason: 'Authentication is valid and current',
        action: 'No action needed'
      };
      
    } catch (error) {
      return {
        needed: true,
        reason: `Authentication check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        action: 'Reauthentication recommended due to error'
      };
    }
  }

  /**
   * Get detailed authentication guidance for users
   * @returns Formatted guidance text for authentication issues
   */
  async getAuthenticationGuidance(): Promise<string> {
    const authCheck = await this.shouldTriggerAuth();
    
    if (!authCheck.needed) {
      return '✅ Authentication is working correctly.';
    }
    
    const guidance = [
      '🔐 Google Authentication Required',
      '',
      `📋 Issue: ${authCheck.reason}`,
      `🎯 Action: ${authCheck.action}`,
      '',
      '🚀 Steps to authenticate:',
      '1. Run: node clear-tokens-enhanced.js',
      '2. Restart Claude Desktop completely',
      '3. Try your Google tool again',
      '4. Complete the OAuth flow in the browser that opens',
      '',
      '🔧 If you continue having issues:',
      '- Ensure the MCP server is properly configured in Claude Desktop',
      '- Check that no other processes are using port 8080',
      '- Verify your Google OAuth credentials are correct',
      '- Check Claude Desktop logs for error messages'
    ];
    
    return guidance.join('\n');
  }

  /**
   * Cleanup method for tests and graceful shutdown
   * Ensures all resources are properly released
   */
  cleanup(): void {
    this.stopCallbackServer();
    this.currentPKCE = null;
    this.oauth2Client.setCredentials({});
  }
}

/**
 * Global OAuth manager instance
 * This singleton pattern ensures consistent authentication across the application
 */
let _oauthManager: OAuthManager | null = null;

export const oauthManager = {
  get instance(): OAuthManager {
    if (!_oauthManager) {
      _oauthManager = new OAuthManager();
    }
    return _oauthManager;
  },
  
  reset(): void {
    _oauthManager = null;
  }
};
