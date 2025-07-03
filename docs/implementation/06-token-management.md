# Milestone 2.3: Token Management and Refresh Logic

## Objective
Implement robust token management with automatic refresh, caching, and rate limiting for Google API calls.

## Prerequisites
- Completed: 01-project-setup.md through 05-auth-flow.md
- Working OAuth authentication flow
- Understanding of token lifecycle management

## 🤖 CLINE EXECUTABLE STEPS

All steps in this milestone can be executed by Cline as they involve creating code files and utilities.

## Implementation Steps

### 1. Enhanced Token Manager
Create `src/auth/token-manager.ts`:
```typescript
import { GoogleTokens } from '../types/google.js';
import { oauthManager } from './oauth.js';
import { credentialsManager } from './credentials.js';
import { AuthenticationError, RateLimitError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/settings.js';

export interface TokenInfo {
  accessToken: string;
  expiresAt: number;
  scopes: string[];
  isValid: boolean;
}

/**
 * Advanced token management with automatic refresh and caching
 */
export class TokenManager {
  private tokenCache: Map<string, TokenInfo> = new Map();
  private refreshPromises: Map<string, Promise<string>> = new Map();
  private lastRefreshTime = 0;
  private readonly minRefreshInterval = 30000; // 30 seconds

  /**
   * Get a valid access token with automatic refresh
   */
  public async getValidToken(requiredScopes?: string[]): Promise<string> {
    const cacheKey = this.getCacheKey(requiredScopes);
    
    // Check cache first
    const cachedToken = this.tokenCache.get(cacheKey);
    if (cachedToken && this.isTokenValid(cachedToken)) {
      logger.debug('Using cached access token');
      return cachedToken.accessToken;
    }

    // Check if refresh is already in progress
    const existingRefresh = this.refreshPromises.get(cacheKey);
    if (existingRefresh) {
      logger.debug('Token refresh already in progress, waiting...');
      return await existingRefresh;
    }

    // Start new refresh
    const refreshPromise = this.refreshToken(requiredScopes);
    this.refreshPromises.set(cacheKey, refreshPromise);

    try {
      const token = await refreshPromise;
      return token;
    } finally {
      this.refreshPromises.delete(cacheKey);
    }
  }

  /**
   * Refresh token with rate limiting
   */
  private async refreshToken(requiredScopes?: string[]): Promise<string> {
    const now = Date.now();
    
    // Rate limiting: prevent too frequent refreshes
    if (now - this.lastRefreshTime < this.minRefreshInterval) {
      const waitTime = this.minRefreshInterval - (now - this.lastRefreshTime);
      logger.debug(`Rate limiting token refresh, waiting ${waitTime}ms`);
      await this.sleep(waitTime);
    }

    this.lastRefreshTime = Date.now();

    try {
      // Get current tokens
      let tokens = oauthManager.getCurrentTokens();
      
      if (!tokens) {
        tokens = await oauthManager.loadTokens();
      }

      if (!tokens) {
        throw new AuthenticationError('No tokens available for refresh');
      }

      // Validate scopes if required
      if (requiredScopes) {
        this.validateScopes(tokens, requiredScopes);
      }

      // Check if token needs refresh
      if (!credentialsManager.isTokenExpired(tokens)) {
        logger.debug('Token is still valid, no refresh needed');
        const tokenInfo = this.createTokenInfo(tokens);
        this.cacheToken(requiredScopes, tokenInfo);
        return tokens.access_token;
      }

      // Refresh the token
      logger.info('Refreshing expired access token');
      const refreshedTokens = await oauthManager.refreshTokens();
      
      const tokenInfo = this.createTokenInfo(refreshedTokens);
      this.cacheToken(requiredScopes, tokenInfo);
      
      logger.info('Token refreshed successfully');
      return refreshedTokens.access_token;
    } catch (error) {
      logger.error('Token refresh failed', error);
      
      if (error instanceof AuthenticationError) {
        // Clear invalid tokens
        await this.clearTokens();
        throw new AuthenticationError('Token refresh failed. Please re-authenticate.', error);
      }
      
      throw error;
    }
  }

  /**
   * Validate token scopes
   */
  private validateScopes(tokens: GoogleTokens, requiredScopes: string[]): void {
    const tokenScopes = tokens.scope.split(' ');
    const missingScopes = requiredScopes.filter(scope => !tokenScopes.includes(scope));
    
    if (missingScopes.length > 0) {
      throw new AuthenticationError(
        `Missing required scopes: ${missingScopes.join(', ')}. Please re-authenticate with additional permissions.`
      );
    }
  }

  /**
   * Create token info object
   */
  private createTokenInfo(tokens: GoogleTokens): TokenInfo {
    return {
      accessToken: tokens.access_token,
      expiresAt: tokens.expiry_date || Date.now() + (3600 * 1000), // Default 1 hour
      scopes: tokens.scope.split(' '),
      isValid: true,
    };
  }

  /**
   * Cache token with scope-based key
   */
  private cacheToken(requiredScopes: string[] | undefined, tokenInfo: TokenInfo): void {
    const cacheKey = this.getCacheKey(requiredScopes);
    this.tokenCache.set(cacheKey, tokenInfo);
    
    // Set cleanup timer
    const ttl = tokenInfo.expiresAt - Date.now() - 60000; // 1 minute buffer
    if (ttl > 0) {
      setTimeout(() => {
        this.tokenCache.delete(cacheKey);
        logger.debug('Cached token expired and removed');
      }, ttl);
    }
  }

  /**
   * Generate cache key based on scopes
   */
  private getCacheKey(requiredScopes?: string[]): string {
    if (!requiredScopes || requiredScopes.length === 0) {
      return 'default';
    }
    return requiredScopes.sort().join(',');
  }

  /**
   * Check if cached token is valid
   */
  private isTokenValid(tokenInfo: TokenInfo): boolean {
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
    return tokenInfo.isValid && Date.now() < (tokenInfo.expiresAt - bufferTime);
  }

  /**
   * Clear all cached tokens
   */
  public clearCache(): void {
    this.tokenCache.clear();
    this.refreshPromises.clear();
    logger.info('Token cache cleared');
  }

  /**
   * Clear stored tokens and cache
   */
  public async clearTokens(): Promise<void> {
    await credentialsManager.deleteTokens();
    this.clearCache();
    logger.info('All tokens cleared');
  }

  /**
   * Get token information
   */
  public async getTokenInfo(): Promise<TokenInfo | null> {
    try {
      const tokens = oauthManager.getCurrentTokens() || await oauthManager.loadTokens();
      
      if (!tokens) {
        return null;
      }

      return this.createTokenInfo(tokens);
    } catch {
      return null;
    }
  }

  /**
   * Preemptively refresh token if close to expiry
   */
  public async preemptiveRefresh(): Promise<void> {
    try {
      const tokenInfo = await this.getTokenInfo();
      
      if (!tokenInfo) {
        return;
      }

      const timeToExpiry = tokenInfo.expiresAt - Date.now();
      const refreshThreshold = 10 * 60 * 1000; // 10 minutes

      if (timeToExpiry < refreshThreshold && timeToExpiry > 0) {
        logger.info('Performing preemptive token refresh');
        await this.getValidToken();
      }
    } catch (error) {
      logger.warn('Preemptive token refresh failed', error);
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Global token manager instance
export const tokenManager = new TokenManager();
```

### 2. Rate Limiting System
Create `src/utils/rate-limiter.ts`:
```typescript
import { RateLimitError } from './errors.js';
import { logger } from './logger.js';
import { config } from '../config/settings.js';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  enabled: boolean;
}

export interface RequestInfo {
  timestamp: number;
  endpoint: string;
  method: string;
}

/**
 * Rate limiter for Google API calls
 */
export class RateLimiter {
  private requests: Map<string, RequestInfo[]> = new Map();
  private readonly config: RateLimitConfig;

  constructor(rateLimitConfig?: Partial<RateLimitConfig>) {
    this.config = {
      maxRequests: config.rateLimit.maxRequests,
      windowMs: config.rateLimit.windowMs,
      enabled: config.rateLimit.enabled,
      ...rateLimitConfig,
    };
  }

  /**
   * Check if request is allowed and track it
   */
  public async checkLimit(key: string, endpoint: string, method: string = 'GET'): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Get existing requests for this key
    let keyRequests = this.requests.get(key) || [];

    // Remove old requests outside the window
    keyRequests = keyRequests.filter(req => req.timestamp > windowStart);

    // Check if limit exceeded
    if (keyRequests.length >= this.config.maxRequests) {
      const oldestRequest = keyRequests[0];
      const retryAfter = Math.ceil((oldestRequest.timestamp + this.config.windowMs - now) / 1000);
      
      logger.warn('Rate limit exceeded', {
        key,
        endpoint,
        requestCount: keyRequests.length,
        maxRequests: this.config.maxRequests,
        retryAfter,
      });

      throw new RateLimitError(
        `Rate limit exceeded for ${endpoint}. Try again in ${retryAfter} seconds.`,
        retryAfter
      );
    }

    // Add current request
    keyRequests.push({
      timestamp: now,
      endpoint,
      method,
    });

    // Update the map
    this.requests.set(key, keyRequests);

    logger.debug('Rate limit check passed', {
      key,
      endpoint,
      requestCount: keyRequests.length,
      maxRequests: this.config.maxRequests,
    });
  }

  /**
   * Get current usage for a key
   */
  public getUsage(key: string): { current: number; max: number; resetTime: number } {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    
    const keyRequests = (this.requests.get(key) || [])
      .filter(req => req.timestamp > windowStart);

    const resetTime = keyRequests.length > 0 
      ? keyRequests[0].timestamp + this.config.windowMs
      : now;

    return {
      current: keyRequests.length,
      max: this.config.maxRequests,
      resetTime,
    };
  }

  /**
   * Clear rate limit data for a key
   */
  public clearKey(key: string): void {
    this.requests.delete(key);
    logger.debug('Rate limit data cleared for key', { key });
  }

  /**
   * Clear all rate limit data
   */
  public clearAll(): void {
    this.requests.clear();
    logger.info('All rate limit data cleared');
  }

  /**
   * Get rate limit statistics
   */
  public getStats(): Record<string, { current: number; max: number; resetTime: number }> {
    const stats: Record<string, { current: number; max: number; resetTime: number }> = {};
    
    for (const key of this.requests.keys()) {
      stats[key] = this.getUsage(key);
    }
    
    return stats;
  }
}

// Global rate limiter instance
export const rateLimiter = new RateLimiter();
```

### 3. API Client Base Class
Create `src/services/base-client.ts`:
```typescript
import { tokenManager } from '../auth/token-manager.js';
import { rateLimiter } from '../utils/rate-limiter.js';
import { GoogleAPIError, GoogleAPIErrorResponse } from '../types/google.js';
import { GoogleAPIError as GoogleAPIErrorClass, AuthenticationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export interface APIRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: string | FormData;
  params?: Record<string, string>;
  requiredScopes?: string[];
  retries?: number;
}

/**
 * Base class for Google API clients
 */
export abstract class BaseGoogleAPIClient {
  protected readonly baseUrl: string;
  protected readonly serviceName: string;

  constructor(baseUrl: string, serviceName: string) {
    this.baseUrl = baseUrl;
    this.serviceName = serviceName;
  }

  /**
   * Make authenticated API request
   */
  protected async makeRequest<T>(
    endpoint: string,
    options: APIRequestOptions = {}
  ): Promise<T> {
    const {
      method = 'GET',
      headers = {},
      body,
      params,
      requiredScopes,
      retries = 3,
    } = options;

    const url = this.buildUrl(endpoint, params);
    const rateLimitKey = `${this.serviceName}:${endpoint}`;

    // Check rate limits
    await rateLimiter.checkLimit(rateLimitKey, endpoint, method);

    // Get valid access token
    const accessToken = await tokenManager.getValidToken(requiredScopes);

    // Prepare request headers
    const requestHeaders = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Google-MCP-Server/1.0.0',
      ...headers,
    };

    const startTime = Date.now();

    try {
      logger.debug('Making API request', {
        service: this.serviceName,
        method,
        endpoint,
        url: url.toString(),
      });

      const response = await fetch(url.toString(), {
        method,
        headers: requestHeaders,
        body,
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        await this.handleErrorResponse(response, endpoint, method, retries);
      }

      const data = await response.json() as T;

      logger.apiCall(this.serviceName, endpoint, duration);

      return data;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.apiCall(this.serviceName, endpoint, duration, error as Error);

      if (error instanceof GoogleAPIErrorClass) {
        throw error;
      }

      throw new GoogleAPIErrorClass(
        `API request failed: ${error instanceof Error ? error.message : String(error)}`,
        500,
        this.serviceName,
        error as Error
      );
    }
  }

  /**
   * Handle error responses with retry logic
   */
  private async handleErrorResponse(
    response: Response,
    endpoint: string,
    method: string,
    retries: number
  ): Promise<never> {
    let errorData: GoogleAPIErrorResponse | null = null;

    try {
      errorData = await response.json() as GoogleAPIErrorResponse;
    } catch {
      // Response is not JSON, create generic error
    }

    const error = errorData?.error;
    const statusCode = response.status;
    const statusText = response.statusText;

    // Handle specific error cases
    if (statusCode === 401) {
      // Unauthorized - token might be invalid
      logger.warn('Received 401 Unauthorized, clearing token cache');
      tokenManager.clearCache();
      throw new AuthenticationError('Authentication failed. Please re-authenticate.');
    }

    if (statusCode === 403) {
      // Forbidden - might be scope or quota issue
      const message = error?.message || 'Access forbidden';
      throw new GoogleAPIErrorClass(message, statusCode, this.serviceName);
    }

    if (statusCode === 429) {
      // Rate limited by Google
      const retryAfter = response.headers.get('Retry-After');
      const retrySeconds = retryAfter ? parseInt(retryAfter) : 60;
      
      throw new GoogleAPIErrorClass(
        `Rate limited by Google API. Retry after ${retrySeconds} seconds.`,
        statusCode,
        this.serviceName
      );
    }

    if (statusCode >= 500 && retries > 0) {
      // Server error - retry with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, 3 - retries), 10000);
      logger.warn(`Server error ${statusCode}, retrying in ${delay}ms`, {
        endpoint,
        method,
        retriesLeft: retries - 1,
      });

      await this.sleep(delay);
      return this.makeRequest(endpoint, { method, retries: retries - 1 });
    }

    // Create error message
    const errorMessage = error?.message || `HTTP ${statusCode}: ${statusText}`;
    throw new GoogleAPIErrorClass(errorMessage, statusCode, this.serviceName);
  }

  /**
   * Build URL with query parameters
   */
  private buildUrl(endpoint: string, params?: Record<string, string>): URL {
    const url = new URL(endpoint, this.baseUrl);
    
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }
    
    return url;
  }

  /**
   * Sleep utility for retries
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get service name
   */
  public getServiceName(): string {
    return this.serviceName;
  }

  /**
   * Health check for the service
   */
  public async healthCheck(): Promise<boolean> {
    try {
      // Most Google APIs have a simple endpoint we can test
      await this.makeRequest('', { method: 'GET' });
      return true;
    } catch {
      return false;
    }
  }
}
```

## Testing Criteria
- [ ] Token refresh works automatically when tokens expire
- [ ] Rate limiting prevents excessive API calls
- [ ] Token caching improves performance
- [ ] Error handling works for various HTTP status codes
- [ ] Retry logic handles temporary failures
- [ ] Preemptive refresh prevents token expiration

## Testing the Implementation

### 1. Token Management Test
```bash
# Test token refresh and caching
node -e "
import('./dist/auth/token-manager.js').then(({ tokenManager }) => {
  // Test getting valid token
  tokenManager.getValidToken().then(token => {
    console.log('Got token:', token.substring(0, 20) + '...');
    
    // Test cache hit
    return tokenManager.getValidToken();
  }).then(cachedToken => {
    console.log('Got cached token:', cachedToken.substring(0, 20) + '...');
  });
});
"
```

### 2. Rate Limiting Test
```bash
# Test rate limiting
node -e "
import('./dist/utils/rate-limiter.js').then(({ rateLimiter }) => {
  const testKey = 'test-service';
  const endpoint = '/test';
  
  // Make multiple requests quickly
  const promises = Array.from({ length: 10 }, (_, i) => 
    rateLimiter.checkLimit(testKey, endpoint).catch(err => 
      console.log('Rate limited at request', i + 1, ':', err.message)
    )
  );
  
  Promise.all(promises).then(() => {
    console.log('Rate limit test completed');
    console.log('Usage:', rateLimiter.getUsage(testKey));
  });
});
"
```

### 3. API Client Test
```bash
# Test base API client (mock)
node -e "
class TestClient extends BaseGoogleAPIClient {
  constructor() {
    super('https://www.googleapis.com/test/v1/', 'test');
  }
  
  async testRequest() {
    return this.makeRequest('test');
  }
}

const client = new TestClient();
console.log('Service name:', client.getServiceName());
"
```

## Deliverables
- Advanced token management with automatic refresh
- Rate limiting system for API calls
- Base API client class with error handling
- Token caching for improved performance
- Retry logic for handling temporary failures
- Comprehensive error handling for various scenarios

## Next Steps
This implementation enables:
- **File 07**: Calendar API client setup
- **File 08**: List calendar events tool
- **File 09**: Create calendar event tool
- **File 10**: Gmail API client setup

## Estimated Time
3-4 hours for complete token management implementation.
