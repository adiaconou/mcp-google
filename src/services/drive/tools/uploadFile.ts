/**
 * Drive Upload File Tool - MCP tool for uploading files to Google Drive
 * 
 * This tool allows uploading files from the local file system to Google Drive
 * with optional folder organization and metadata.
 */

import { ToolDefinition, MCPToolResult } from '../../../types/mcp';
import { driveClient } from '../driveClient';

/**
 * Input parameters for the drive_upload_file tool
 */
export interface DriveUploadFileParams {
  filePath: string;
  fileName?: string;
  folderId?: string;
  description?: string;
}

/**
 * Drive Upload File Tool Handler
 * @param params - Upload parameters
 * @returns Promise resolving to tool result with uploaded file information
 */
async function handleUploadFile(params: unknown): Promise<MCPToolResult> {
  try {
    const uploadParams = params as DriveUploadFileParams;
    
    // Validate required parameters
    if (!uploadParams.filePath || typeof uploadParams.filePath !== 'string' || uploadParams.filePath.trim().length === 0) {
      return {
        content: [{
          type: 'text',
          text: '❌ **Upload Error**\n\nFile path must be a non-empty string.'
        }],
        isError: true
      };
    }

    // Build upload parameters, only including defined values
    const driveParams: any = {
      filePath: uploadParams.filePath.trim()
    };

    if (uploadParams.fileName && uploadParams.fileName.trim()) {
      driveParams.fileName = uploadParams.fileName.trim();
    }

    if (uploadParams.folderId && uploadParams.folderId.trim()) {
      driveParams.folderId = uploadParams.folderId.trim();
    }

    if (uploadParams.description && uploadParams.description.trim()) {
      driveParams.description = uploadParams.description.trim();
    }

    // Upload the file
    const uploadedFile = await driveClient.instance.uploadFile(driveParams);

    // Format the response
    let fileInfo = `📤 **File Uploaded Successfully**\n\n`;
    fileInfo += `📄 **${uploadedFile.name}**\n`;
    fileInfo += `   ID: ${uploadedFile.id}\n`;
    fileInfo += `   Type: ${uploadedFile.mimeType}\n`;
    
    if (uploadedFile.size) {
      const sizeKB = Math.round(uploadedFile.size / 1024);
      fileInfo += `   Size: ${sizeKB > 0 ? sizeKB + ' KB' : '< 1 KB'}\n`;
    }
    
    if (uploadedFile.createdTime) {
      fileInfo += `   Created: ${new Date(uploadedFile.createdTime).toLocaleString()}\n`;
    }
    
    if (uploadedFile.webViewLink) {
      fileInfo += `   Link: ${uploadedFile.webViewLink}\n`;
    }

    if (uploadedFile.parents && uploadedFile.parents.length > 0) {
      fileInfo += `   Parent Folder: ${uploadedFile.parents[0]}\n`;
    }

    return {
      content: [{
        type: 'text',
        text: fileInfo
      }],
      isError: false
    };

  } catch (error) {
    console.error('Drive upload file error:', error);

    // Enhanced error handling
    let errorMessage = 'Unknown error occurred';
    
    if (error instanceof Error) {
      if (error.message.includes('File not found')) {
        errorMessage = `File not found at the specified path. Please check the file path.`;
      } else if (error.message.includes('Insufficient permissions')) {
        errorMessage = 'Insufficient permissions to upload to Google Drive. Please check your OAuth scopes.';
      } else if (error.message.includes('Folder not found')) {
        errorMessage = `Parent folder not found. Please check the folder ID.`;
      } else if (error.message.includes('Storage quota exceeded')) {
        errorMessage = 'Google Drive storage quota exceeded. Please free up space.';
      } else {
        errorMessage = error.message;
      }
    }

    return {
      content: [{
        type: 'text',
        text: `❌ **Drive Upload Error**\n\n${errorMessage}`
      }],
      isError: true
    };
  }
}

/**
 * Drive Upload File Tool Definition
 */
export const driveUploadFileTool: ToolDefinition = {
  name: 'drive_upload_file',
  description: 'Upload a file to Google Drive',
  inputSchema: {
    type: 'object',
    required: ['filePath'],
    properties: {
      filePath: {
        type: 'string',
        description: 'Local file path to upload'
      },
      fileName: {
        type: 'string',
        description: 'Name for uploaded file (optional, defaults to original filename)'
      },
      folderId: {
        type: 'string',
        description: 'Parent folder ID (optional, uploads to root if not specified)'
      },
      description: {
        type: 'string',
        description: 'File description (optional)'
      }
    }
  },
  handler: handleUploadFile
};
