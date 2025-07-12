/**
 * Drive API Client - Google Drive API wrapper with OAuth integration
 * 
 * This file implements a simple wrapper around the Google Drive API
 * with integrated OAuth authentication and basic error handling.
 */

import { google, drive_v3 } from 'googleapis';
import { oauthManager } from '../../auth/oauthManager';
import { 
  CalendarError, 
  MCPErrorCode 
} from '../../types/mcp';

/**
 * Drive file interface for our application
 */
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  modifiedTime?: string;
  createdTime?: string;
  parents?: string[];
  webViewLink?: string;
}

/**
 * Parameters for listing Drive files
 */
export interface DriveListParams {
  folderId?: string;
  query?: string;
  maxResults?: number;
  orderBy?: string;
}

/**
 * Parameters for uploading Drive files
 */
export interface DriveUploadParams {
  filePath: string;
  fileName?: string;
  folderId?: string;
  description?: string;
}

/**
 * Drive API Client
 * 
 * Provides simple access to Google Drive API with integrated OAuth
 * authentication and basic error handling.
 */
export class DriveClient {
  private drive: drive_v3.Drive | null = null;

  constructor() {
    // No initialization needed in constructor
  }

  /**
   * Initialize Drive API client with authentication
   * @throws {CalendarError} If authentication fails
   */
  private async initializeClient(): Promise<void> {
    try {
      await oauthManager.instance.ensureScopes([
        'https://www.googleapis.com/auth/drive.file'
      ]);

      const oauth2Client = await oauthManager.instance.getOAuth2Client();
      this.drive = google.drive({ version: 'v3', auth: oauth2Client });
    } catch {
      throw new CalendarError(
        'Failed to initialize Drive API client: User is not authenticated',
        MCPErrorCode.AuthenticationError
      );
    }
  }

  /**
   * Ensure the client is initialized
   * @throws {CalendarError} If initialization fails
   */
  private async ensureInitialized(): Promise<drive_v3.Drive> {
    if (!this.drive) {
      await this.initializeClient();
    }
    
    if (!this.drive) {
      throw new CalendarError(
        'Drive API client failed to initialize',
        MCPErrorCode.InternalError
      );
    }
    
    return this.drive;
  }

  /**
   * List Drive files with optional filtering
   * @param params - Parameters for listing files
   * @returns Promise resolving to array of Drive files
   * @throws {CalendarError} If the request fails
   */
  async listFiles(params: DriveListParams = {}): Promise<DriveFile[]> {
    try {
      const drive = await this.ensureInitialized();
      
      // Build query string
      let query = '';
      if (params.folderId) {
        query = `'${params.folderId}' in parents`;
      }
      if (params.query) {
        query = query ? `${query} and ${params.query}` : params.query;
      }

      // Set request parameters
      const requestParams: drive_v3.Params$Resource$Files$List = {
        pageSize: Math.min(params.maxResults || 20, 100),
        orderBy: params.orderBy || 'modifiedTime desc',
        fields: 'files(id,name,mimeType,size,modifiedTime,createdTime,parents,webViewLink)'
      };

      if (query) {
        requestParams.q = query;
      }

      // Make API request
      const response = await drive.files.list(requestParams);
      
      if (!response.data.files) {
        return [];
      }

      // Convert to our format
      return response.data.files.map(file => this.convertToDriveFile(file));

    } catch (error) {
      throw this.handleApiError(error, 'list files');
    }
  }

  /**
   * Get a specific Drive file by ID
   * @param fileId - The ID of the file to retrieve
   * @param includeContent - Whether to download file content (for small text files)
   * @param maxContentSize - Maximum content size in bytes
   * @returns Promise resolving to the Drive file
   * @throws {CalendarError} If the request fails
   */
  async getFile(fileId: string, includeContent: boolean = false, maxContentSize: number = 1048576): Promise<DriveFile & { content?: string }> {
    try {
      const drive = await this.ensureInitialized();
      
      // Get file metadata
      const response = await drive.files.get({
        fileId,
        fields: 'id,name,mimeType,size,modifiedTime,createdTime,parents,webViewLink'
      });

      if (!response.data) {
        throw new Error('No data returned from Drive API');
      }

      const file = this.convertToDriveFile(response.data);

      // Optionally get content for text files
      if (includeContent && file.mimeType.startsWith('text/') && (file.size || 0) <= maxContentSize) {
        try {
          const contentResponse = await drive.files.get({
            fileId,
            alt: 'media'
          });
          
          return {
            ...file,
            content: contentResponse.data as string
          };
        } catch (contentError) {
          // Return file without content if download fails
          console.error('Failed to download file content:', contentError);
        }
      }

      return file;

    } catch (error) {
      throw this.handleApiError(error, 'get file');
    }
  }

  /**
   * Upload a file to Drive
   * @param params - Parameters for uploading the file
   * @returns Promise resolving to the uploaded file
   * @throws {CalendarError} If the request fails
   */
  async uploadFile(params: DriveUploadParams): Promise<DriveFile> {
    try {
      const drive = await this.ensureInitialized();
      const fs = require('fs');
      const path = require('path');

      // Validate file exists
      if (!fs.existsSync(params.filePath)) {
        throw new CalendarError(
          `File not found: ${params.filePath}`,
          MCPErrorCode.ValidationError
        );
      }

      // Prepare file metadata
      const fileName = params.fileName || path.basename(params.filePath);
      const fileMetadata: drive_v3.Schema$File = {
        name: fileName
      };

      if (params.folderId) {
        fileMetadata.parents = [params.folderId];
      }

      if (params.description) {
        fileMetadata.description = params.description;
      }

      // Create file stream
      const media = {
        body: fs.createReadStream(params.filePath)
      };

      // Upload file
      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id,name,mimeType,size,modifiedTime,createdTime,parents,webViewLink'
      });

      if (!response.data) {
        throw new Error('No data returned from Drive API');
      }

      return this.convertToDriveFile(response.data);

    } catch (error) {
      throw this.handleApiError(error, 'upload file');
    }
  }

  /**
   * Create a folder in Drive
   * @param name - Name of the folder
   * @param parentFolderId - Parent folder ID (optional)
   * @param description - Folder description (optional)
   * @returns Promise resolving to the created folder
   * @throws {CalendarError} If the request fails
   */
  async createFolder(name: string, parentFolderId?: string, description?: string): Promise<DriveFile> {
    try {
      const drive = await this.ensureInitialized();

      // Prepare folder metadata
      const folderMetadata: drive_v3.Schema$File = {
        name,
        mimeType: 'application/vnd.google-apps.folder'
      };

      if (parentFolderId) {
        folderMetadata.parents = [parentFolderId];
      }

      if (description) {
        folderMetadata.description = description;
      }

      // Create folder
      const response = await drive.files.create({
        requestBody: folderMetadata,
        fields: 'id,name,mimeType,size,modifiedTime,createdTime,parents,webViewLink'
      });

      if (!response.data) {
        throw new Error('No data returned from Drive API');
      }

      return this.convertToDriveFile(response.data);

    } catch (error) {
      throw this.handleApiError(error, 'create folder');
    }
  }

  /**
   * Convert Drive API file to our DriveFile format
   * @param driveFile - Drive API file object
   * @returns DriveFile in our format
   */
  private convertToDriveFile(driveFile: drive_v3.Schema$File): DriveFile {
    const result: DriveFile = {
      id: driveFile.id || '',
      name: driveFile.name || '',
      mimeType: driveFile.mimeType || ''
    };

    if (driveFile.size) {
      result.size = parseInt(driveFile.size);
    }

    if (driveFile.modifiedTime) {
      result.modifiedTime = driveFile.modifiedTime;
    }

    if (driveFile.createdTime) {
      result.createdTime = driveFile.createdTime;
    }

    if (driveFile.parents) {
      result.parents = driveFile.parents;
    }

    if (driveFile.webViewLink) {
      result.webViewLink = driveFile.webViewLink;
    }

    return result;
  }

  /**
   * Handle Drive API errors and convert to CalendarError
   * @param error - The error from the API call
   * @param operation - Description of the operation that failed
   * @returns CalendarError with appropriate error code and message
   */
  private handleApiError(error: unknown, operation: string): CalendarError {
    console.error(`Drive API error during ${operation}:`, error);

    if (error instanceof CalendarError) {
      return error;
    }

    const err = error as { code?: number | string; message?: string };

    switch (err.code) {
      case 401:
        return new CalendarError('Authentication failed. Please re-authenticate.', MCPErrorCode.AuthenticationError);
      case 403:
        return new CalendarError('Insufficient permissions for Drive access.', MCPErrorCode.AuthorizationError);
      case 429:
        return new CalendarError('Rate limit exceeded. Please try again later.', MCPErrorCode.RateLimitError);
      case 404:
        return new CalendarError(`Drive resource not found during ${operation}.`, MCPErrorCode.APIError);
      case 400:
        return new CalendarError(`Invalid Drive request for ${operation}: ${err.message}`, MCPErrorCode.ValidationError);
      default:
        return new CalendarError(`Failed to ${operation}: ${err.message || 'Unknown error'}`, MCPErrorCode.APIError);
    }
  }
}

/**
 * Global Drive client instance
 * This singleton pattern ensures consistent API access across the application
 */
let _driveClient: DriveClient | null = null;

export const driveClient = {
  get instance(): DriveClient {
    if (!_driveClient) {
      _driveClient = new DriveClient();
    }
    return _driveClient;
  },
  
  reset(): void {
    _driveClient = null;
  }
};
