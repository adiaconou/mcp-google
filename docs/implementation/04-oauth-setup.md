# Milestone 2.1: OAuth Setup

## Objective
Set up Google Cloud project configuration and OAuth 2.0 credentials for secure authentication with Google APIs.

## Prerequisites
- Completed: 01-project-setup.md, 02-mcp-protocol.md, 03-server-foundation.md
- Google Cloud account
- Understanding of OAuth 2.0 flow

## 🧑‍💻 HUMAN REQUIRED STEPS

### 1. Google Cloud Project Setup

#### Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: `google-mcp-server`
4. Select organization (if applicable)
5. Click "Create"

#### Enable Required APIs
Navigate to "APIs & Services" → "Library" and enable:
- **Google Calendar API**
- **Gmail API** 
- **Google Drive API**
- **Google Docs API**
- **Google Sheets API**

*Alternative: If you have gcloud CLI installed, you can run these commands instead:*
```bash
gcloud services enable calendar-json.googleapis.com
gcloud services enable gmail.googleapis.com
gcloud services enable drive.googleapis.com
gcloud services enable docs.googleapis.com
gcloud services enable sheets.googleapis.com
```

### 2. OAuth 2.0 Credentials Setup

#### Create OAuth 2.0 Client ID
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client ID"
3. Configure OAuth consent screen (if not done):
   - User Type: External (for personal use)
   - App name: "Google MCP Server"
   - User support email: Your email
   - Developer contact: Your email
4. Application type: "Desktop application"
5. Name: "Google MCP Server Desktop Client"
6. Authorized redirect URIs: `http://localhost:8080/auth/callback`
7. Click "Create"
8. **IMPORTANT**: Download the JSON file and save it as `credentials.json` in your project root directory

### 3. OAuth Consent Screen Configuration

#### Configure Consent Screen
1. Go to "APIs & Services" → "OAuth consent screen"
2. Fill required fields:
   - App name: "Google MCP Server"
   - User support email: Your email
   - App logo: (optional)
   - App domain: (leave blank for local use)
   - Developer contact: Your email
3. Add scopes:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/drive.file`
   - `https://www.googleapis.com/auth/documents`
   - `https://www.googleapis.com/auth/spreadsheets`
4. Add test users (your email address)
5. Save and continue

### 4. Environment Variables Configuration
After Cline creates the code files, you'll need to:
1. Update your `.env` file with the OAuth credentials from the downloaded JSON file
2. Set the `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` values
3. Verify the `GOOGLE_REDIRECT_URI` matches what you configured in Google Cloud Console

## 🤖 CLINE EXECUTABLE STEPS

### 4. Google API Types
Create `src/types/google.ts`:
```typescript
/**
 * Google OAuth 2.0 Types
 */
export interface GoogleCredentials {
  client_id: string;
  client_secret: string;
  redirect_uris: string[];
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
}

export interface GoogleCredentialsFile {
  installed: GoogleCredentials;
}

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
  expiry_date?: number;
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
}

/**
 * Google API Scopes
 */
export const GOOGLE_SCOPES = {
  CALENDAR: 'https://www.googleapis.com/auth/calendar',
  CALENDAR_READONLY: 'https://www.googleapis.com/auth/calendar.readonly',
  GMAIL_READONLY: 'https://www.googleapis.com/auth/gmail.readonly',
  GMAIL_METADATA: 'https://www.googleapis.com/auth/gmail.metadata',
  DRIVE_FILE: 'https://www.googleapis.com/auth/drive.file',
  DRIVE_READONLY: 'https://www.googleapis.com/auth/drive.readonly',
  DOCUMENTS: 'https://www.googleapis.com/auth/documents',
  DOCUMENTS_READONLY: 'https://www.googleapis.com/auth/documents.readonly',
  SPREADSHEETS: 'https://www.googleapis.com/auth/spreadsheets',
  SPREADSHEETS_READONLY: 'https://www.googleapis.com/auth/spreadsheets.readonly',
} as const;

export type GoogleScope = typeof GOOGLE_SCOPES[keyof typeof GOOGLE_SCOPES];

/**
 * Calendar API Types
 */
export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  }>;
  location?: string;
  recurrence?: string[];
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
  status?: 'confirmed' | 'tentative' | 'cancelled';
  visibility?: 'default' | 'public' | 'private' | 'confidential';
}

export interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  timeZone: string;
  primary?: boolean;
  accessRole: 'freeBusyReader' | 'reader' | 'writer' | 'owner';
}

/**
 * Gmail API Types
 */
export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  historyId: string;
  internalDate: string;
  payload: GmailPayload;
  sizeEstimate: number;
}

export interface GmailPayload {
  partId: string;
  mimeType: string;
  filename: string;
  headers: GmailHeader[];
  body: GmailBody;
  parts?: GmailPayload[];
}

export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailBody {
  attachmentId?: string;
  size: number;
  data?: string;
}

export interface GmailAttachment {
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
  data: string;
}

/**
 * Drive API Types
 */
export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
  size?: string;
  createdTime: string;
  modifiedTime: string;
  webViewLink?: string;
  webContentLink?: string;
  description?: string;
  starred?: boolean;
  trashed?: boolean;
}

export interface GoogleDriveFolder extends GoogleDriveFile {
  mimeType: 'application/vnd.google-apps.folder';
}

/**
 * Docs API Types
 */
export interface GoogleDocument {
  documentId: string;
  title: string;
  body: {
    content: GoogleDocumentElement[];
  };
  revisionId: string;
  suggestionsViewMode: 'SUGGESTIONS_INLINE' | 'PREVIEW_SUGGESTIONS_ACCEPTED' | 'PREVIEW_WITHOUT_SUGGESTIONS';
}

export interface GoogleDocumentElement {
  startIndex: number;
  endIndex: number;
  paragraph?: {
    elements: Array<{
      startIndex: number;
      endIndex: number;
      textRun?: {
        content: string;
        textStyle?: Record<string, unknown>;
      };
    }>;
  };
}

/**
 * Sheets API Types
 */
export interface GoogleSpreadsheet {
  spreadsheetId: string;
  properties: {
    title: string;
    locale: string;
    autoRecalc: 'ON_CHANGE' | 'MINUTE' | 'HOUR';
    timeZone: string;
  };
  sheets: GoogleSheet[];
}

export interface GoogleSheet {
  properties: {
    sheetId: number;
    title: string;
    index: number;
    sheetType: 'GRID' | 'OBJECT';
    gridProperties?: {
      rowCount: number;
      columnCount: number;
    };
  };
  data?: GoogleSheetData[];
}

export interface GoogleSheetData {
  range: string;
  majorDimension: 'ROWS' | 'COLUMNS';
  values: string[][];
}

/**
 * API Error Types
 */
export interface GoogleAPIErrorDetails {
  domain: string;
  reason: string;
  message: string;
  locationType?: string;
  location?: string;
}

export interface GoogleAPIError {
  code: number;
  message: string;
  errors: GoogleAPIErrorDetails[];
  status: string;
}

export interface GoogleAPIErrorResponse {
  error: GoogleAPIError;
}
```

### 5. OAuth Configuration Utilities
Create `src/auth/config.ts`:
```typescript
import fs from 'fs/promises';
import path from 'path';
import { GoogleCredentials, GoogleCredentialsFile, GoogleScope, GOOGLE_SCOPES } from '../types/google.js';
import { config } from '../config/settings.js';
import { ConfigurationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * OAuth configuration manager
 */
export class OAuthConfig {
  private credentials: GoogleCredentials | null = null;
  private readonly credentialsPath: string;

  constructor(credentialsPath?: string) {
    this.credentialsPath = credentialsPath || path.join(process.cwd(), 'credentials.json');
  }

  /**
   * Load OAuth credentials from file or environment
   */
  public async loadCredentials(): Promise<GoogleCredentials> {
    if (this.credentials) {
      return this.credentials;
    }

    // Try to load from environment variables first
    if (config.google.clientId && config.google.clientSecret) {
      this.credentials = {
        client_id: config.google.clientId,
        client_secret: config.google.clientSecret,
        redirect_uris: [config.google.redirectUri],
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      };

      logger.info('Loaded OAuth credentials from environment variables');
      return this.credentials;
    }

    // Try to load from credentials file
    try {
      const credentialsData = await fs.readFile(this.credentialsPath, 'utf-8');
      const credentialsFile: GoogleCredentialsFile = JSON.parse(credentialsData);
      
      if (!credentialsFile.installed) {
        throw new ConfigurationError('Invalid credentials file format. Expected "installed" client type.');
      }

      this.credentials = credentialsFile.installed;
      logger.info('Loaded OAuth credentials from file', { path: this.credentialsPath });
      return this.credentials;
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error;
      }
      
      throw new ConfigurationError(
        `Failed to load OAuth credentials. Please ensure either:\n` +
        `1. GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables are set, or\n` +
        `2. A valid credentials.json file exists at: ${this.credentialsPath}\n` +
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get OAuth credentials
   */
  public getCredentials(): GoogleCredentials {
    if (!this.credentials) {
      throw new ConfigurationError('OAuth credentials not loaded. Call loadCredentials() first.');
    }
    return this.credentials;
  }

  /**
   * Get configured scopes
   */
  public getScopes(): GoogleScope[] {
    return config.google.scopes as GoogleScope[];
  }

  /**
   * Get redirect URI
   */
  public getRedirectUri(): string {
    return config.google.redirectUri;
  }

  /**
   * Validate that all required scopes are included
   */
  public validateScopes(requiredScopes: GoogleScope[]): void {
    const configuredScopes = this.getScopes();
    const missingScopes = requiredScopes.filter(scope => !configuredScopes.includes(scope));
    
    if (missingScopes.length > 0) {
      throw new ConfigurationError(
        `Missing required OAuth scopes: ${missingScopes.join(', ')}\n` +
        `Please add these scopes to your GOOGLE_SCOPES environment variable or configuration.`
      );
    }
  }

  /**
   * Get scope description for user consent
   */
  public getScopeDescriptions(): Record<GoogleScope, string> {
    return {
      [GOOGLE_SCOPES.CALENDAR]: 'Manage your calendar events and settings',
      [GOOGLE_SCOPES.CALENDAR_READONLY]: 'View your calendar events',
      [GOOGLE_SCOPES.GMAIL_READONLY]: 'Read your email messages and settings',
      [GOOGLE_SCOPES.GMAIL_METADATA]: 'View your email message metadata',
      [GOOGLE_SCOPES.DRIVE_FILE]: 'Manage files created by this application',
      [GOOGLE_SCOPES.DRIVE_READONLY]: 'View your Google Drive files',
      [GOOGLE_SCOPES.DOCUMENTS]: 'Manage your Google Docs documents',
      [GOOGLE_SCOPES.DOCUMENTS_READONLY]: 'View your Google Docs documents',
      [GOOGLE_SCOPES.SPREADSHEETS]: 'Manage your Google Sheets spreadsheets',
      [GOOGLE_SCOPES.SPREADSHEETS_READONLY]: 'View your Google Sheets spreadsheets',
    };
  }

  /**
   * Generate OAuth authorization URL
   */
  public generateAuthUrl(state?: string): string {
    const credentials = this.getCredentials();
    const scopes = this.getScopes();
    
    const params = new URLSearchParams({
      client_id: credentials.client_id,
      redirect_uri: this.getRedirectUri(),
      scope: scopes.join(' '),
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
    });

    if (state) {
      params.set('state', state);
    }

    return `${credentials.auth_uri}?${params.toString()}`;
  }

  /**
   * Validate OAuth configuration
   */
  public async validate(): Promise<void> {
    try {
      const credentials = await this.loadCredentials();
      
      // Validate required fields
      if (!credentials.client_id || !credentials.client_secret) {
        throw new ConfigurationError('OAuth credentials missing client_id or client_secret');
      }

      // Validate redirect URI format
      const redirectUri = this.getRedirectUri();
      try {
        new URL(redirectUri);
      } catch {
        throw new ConfigurationError(`Invalid redirect URI format: ${redirectUri}`);
      }

      // Validate scopes
      const scopes = this.getScopes();
      if (scopes.length === 0) {
        throw new ConfigurationError('No OAuth scopes configured');
      }

      logger.info('OAuth configuration validated successfully', {
        clientId: credentials.client_id.substring(0, 10) + '...',
        redirectUri,
        scopeCount: scopes.length,
      });
    } catch (error) {
      logger.error('OAuth configuration validation failed', error);
      throw error;
    }
  }
}

// Global OAuth configuration instance
export const oauthConfig = new OAuthConfig();
```

### 6. Credentials Management
Create `src/auth/credentials.ts`:
```typescript
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { GoogleTokens } from '../types/google.js';
import { config } from '../config/settings.js';
import { AuthenticationError, ConfigurationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Secure token storage manager
 */
export class CredentialsManager {
  private readonly tokenPath: string;
  private readonly encryptionKey: Buffer | null;

  constructor() {
    // Store tokens in user's home directory
    const configDir = path.join(os.homedir(), '.config', 'google-mcp-server');
    this.tokenPath = path.join(configDir, 'tokens.json');
    
    // Initialize encryption key if enabled
    this.encryptionKey = config.security.tokenEncryption 
      ? this.getOrCreateEncryptionKey()
      : null;
  }

  /**
   * Save tokens securely
   */
  public async saveTokens(tokens: GoogleTokens): Promise<void> {
    try {
      // Ensure config directory exists
      await fs.mkdir(path.dirname(this.tokenPath), { recursive: true });

      // Prepare token data
      const tokenData = {
        ...tokens,
        saved_at: new Date().toISOString(),
      };

      let dataToSave: string;
      
      if (this.encryptionKey) {
        // Encrypt tokens
        dataToSave = this.encryptData(JSON.stringify(tokenData));
        logger.debug('Tokens encrypted before saving');
      } else {
        dataToSave = JSON.stringify(tokenData, null, 2);
        logger.warn('Tokens saved without encryption - consider enabling TOKEN_ENCRYPTION');
      }

      await fs.writeFile(this.tokenPath, dataToSave, { mode: 0o600 });
      logger.info('Tokens saved successfully', { path: this.tokenPath });
    } catch (error) {
      logger.error('Failed to save tokens', error);
      throw new AuthenticationError('Failed to save authentication tokens', error as Error);
    }
  }

  /**
   * Load tokens securely
   */
  public async loadTokens(): Promise<GoogleTokens | null> {
    try {
      const data = await fs.readFile(this.tokenPath, 'utf-8');
      
      let tokenData: string;
      
      if (this.encryptionKey) {
        // Decrypt tokens
        tokenData = this.decryptData(data);
        logger.debug('Tokens decrypted successfully');
      } else {
        tokenData = data;
      }

      const tokens = JSON.parse(tokenData);
      
      // Remove metadata
      delete tokens.saved_at;
      
      logger.info('Tokens loaded successfully');
      return tokens as GoogleTokens;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        logger.info('No saved tokens found');
        return null;
      }
      
      logger.error('Failed to load tokens', error);
      throw new AuthenticationError('Failed to load authentication tokens', error as Error);
    }
  }

  /**
   * Delete saved tokens
   */
  public async deleteTokens(): Promise<void> {
    try {
      await fs.unlink(this.tokenPath);
      logger.info('Tokens deleted successfully');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        logger.info('No tokens to delete');
        return;
      }
      
      logger.error('Failed to delete tokens', error);
      throw new AuthenticationError('Failed to delete authentication tokens', error as Error);
    }
  }

  /**
   * Check if tokens exist
   */
  public async hasTokens(): Promise<boolean> {
    try {
      await fs.access(this.tokenPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if tokens are expired
   */
  public isTokenExpired(tokens: GoogleTokens): boolean {
    if (!tokens.expiry_date) {
      return false; // No expiry date means token doesn't expire
    }
    
    // Add 5 minute buffer for token refresh
    const bufferMs = 5 * 60 * 1000;
    return Date.now() > (tokens.expiry_date - bufferMs);
  }

  /**
   * Get or create encryption key
   */
  private getOrCreateEncryptionKey(): Buffer {
    if (config.security.encryptionKey) {
      return Buffer.from(config.security.encryptionKey, 'hex');
    }

    // Generate a new key and warn user
    const key = crypto.randomBytes(32);
    logger.warn(
      'No encryption key provided. Generated temporary key. ' +
      'Set MCP_ENCRYPTION_KEY environment variable for persistent encryption.',
      { generatedKey: key.toString('hex') }
    );
    
    return key;
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  private encryptData(data: string): string {
    if (!this.encryptionKey) {
      throw new ConfigurationError('Encryption key not available');
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', this.encryptionKey);
    cipher.setAAD(Buffer.from('google-mcp-server'));

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return JSON.stringify({
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      data: encrypted,
    });
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  private decryptData(encryptedData: string): string {
    if (!this.encryptionKey) {
      throw new ConfigurationError('Encryption key not available');
    }

    const { iv, authTag, data } = JSON.parse(encryptedData);
    
    const decipher = crypto.createDecipher('aes-256-gcm', this.encryptionKey);
    decipher.setAAD(Buffer.from('google-mcp-server'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

// Global credentials manager instance
export const credentialsManager = new CredentialsManager();
```

## Testing Criteria
- [ ] Google Cloud project created with required APIs enabled
- [ ] OAuth 2.0 credentials configured correctly
- [ ] OAuth consent screen configured with appropriate scopes
- [ ] Credentials can be loaded from file or environment variables
- [ ] Token encryption/decryption works correctly
- [ ] Configuration validation catches invalid setups

## Testing the Implementation

### 1. Credentials File Test
```bash
# Place your downloaded credentials.json in project root
# Test loading credentials
node -e "
import('./dist/auth/config.js').then(({ oauthConfig }) => {
  oauthConfig.loadCredentials().then(creds => {
    console.log('Client ID:', creds.client_id.substring(0, 10) + '...');
    console.log('Redirect URI:', creds.redirect_uris[0]);
  });
});
"
```

### 2. Environment Variables Test
```bash
# Test with environment variables
export GOOGLE_CLIENT_ID=your_client_id
export GOOGLE_CLIENT_SECRET=your_client_secret
npm run dev
# Should load credentials from environment
```

### 3. Token Storage Test
```bash
# Test token encryption/decryption
node -e "
import('./dist/auth/credentials.js').then(({ credentialsManager }) => {
  const testTokens = {
    access_token: 'test_token',
    refresh_token: 'test_refresh',
    scope: 'test_scope',
    token_type: 'Bearer'
  };
  
  credentialsManager.saveTokens(testTokens)
    .then(() => credentialsManager.loadTokens())
    .then(loaded => console.log('Token test:', loaded.access_token === 'test_token'));
});
"
```

## Deliverables
- Google Cloud project with enabled APIs
- OAuth 2.0 credentials configuration
- Secure token storage system
- Configuration validation
- Comprehensive Google API type definitions

## Next Steps
This setup enables:
- **File 05**: OAuth authentication flow implementation
- **File 06**: Token management and refresh logic
- **File 07**: Calendar API client setup

## Estimated Time
2-3 hours including Google Cloud setup and testing.
