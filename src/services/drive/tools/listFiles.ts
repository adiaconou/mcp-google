/**
 * Drive List Files Tool - MCP tool for listing Google Drive files
 * 
 * This file implements the drive_list_files MCP tool following the
 * established Gmail tool patterns with minimal complexity.
 */

import { ToolDefinition, MCPToolResult } from '../../../types/mcp';
import { driveClient } from '../driveClient';

export interface DriveListFilesParams {
  folderId?: string;
  query?: string;
  maxResults?: number;
  orderBy?: string;
}

/**
 * Drive List Files Tool Handler
 * @param params - Parameters for listing files
 * @returns Promise resolving to formatted file list
 */
async function handleListFiles(params: unknown): Promise<MCPToolResult> {
  try {
    const listParams = params as DriveListFilesParams;
    
    // Validate parameters
    const maxResults = Math.min(Math.max(listParams.maxResults ?? 20, 1), 100);
    const orderBy = listParams.orderBy || 'modifiedTime desc';

    // Build parameters object with only defined values
    const driveParams: any = {
      maxResults: maxResults,
      orderBy: orderBy
    };

    if (listParams.folderId) {
      driveParams.folderId = listParams.folderId;
    }

    if (listParams.query) {
      driveParams.query = listParams.query;
    }

    // Call Drive API using the client
    const files = await driveClient.instance.listFiles(driveParams);

    // Return results
    if (files.length === 0) {
      return {
        content: [{
          type: 'text',
          text: 'No files found.'
        }],
        isError: false
      };
    }

    // Format the response for MCP
    const fileList = files.map(file => {
      let fileInfo = `📄 **${file.name}**\n`;
      fileInfo += `   ID: ${file.id}\n`;
      fileInfo += `   Type: ${file.mimeType}\n`;
      
      if (file.size) {
        const sizeKB = Math.round(file.size / 1024);
        fileInfo += `   Size: ${sizeKB > 0 ? sizeKB + ' KB' : '< 1 KB'}\n`;
      }
      
      if (file.modifiedTime) {
        fileInfo += `   Modified: ${new Date(file.modifiedTime).toLocaleString()}\n`;
      }
      
      if (file.webViewLink) {
        fileInfo += `   Link: ${file.webViewLink}\n`;
      }
      
      return fileInfo;
    }).join('\n');

    const summary = `📁 **Drive Files** (${files.length} found)\n\n${fileList}`;

    return {
      content: [{
        type: 'text',
        text: summary
      }],
      isError: false
    };

  } catch (error) {
    // Enhanced error handling
    let errorMessage = 'Unknown error occurred';
    
    if (error instanceof Error) {
      if (error.message.includes('Folder not found')) {
        errorMessage = `Folder not found. Please check the folder ID.`;
      } else if (error.message.includes('Insufficient permissions')) {
        errorMessage = 'Insufficient permissions to access Google Drive. Please check your OAuth scopes.';
      } else if (error.message.includes('Invalid query')) {
        errorMessage = `Invalid search query. Please check the Drive API query syntax.`;
      } else {
        errorMessage = error.message;
      }
    }

    return {
      content: [{
        type: 'text',
        text: `❌ **Drive List Files Error**\n\n${errorMessage}`
      }],
      isError: true
    };
  }
}

/**
 * Drive List Files Tool Definition
 */
export const driveListFilesTool: ToolDefinition = {
  name: 'drive_list_files',
  description: 'List Google Drive files with optional filtering and search',
  inputSchema: {
    type: 'object',
    properties: {
      folderId: {
        type: 'string',
        description: 'Parent folder ID to list files from (optional). If not provided, lists files from root or all accessible files.'
      },
      query: {
        type: 'string',
        description: 'Google Drive search query (optional). Examples: "name contains \'report\'", "mimeType = \'application/pdf\'", "modifiedTime > \'2024-01-01\'"'
      },
      maxResults: {
        type: 'number',
        description: 'Maximum number of files to return (1-100)',
        minimum: 1,
        maximum: 100,
        default: 20
      },
      orderBy: {
        type: 'string',
        description: 'Sort order for results',
        enum: ['name', 'name desc', 'modifiedTime', 'modifiedTime desc', 'createdTime', 'createdTime desc'],
        default: 'modifiedTime desc'
      }
    }
  },
  handler: handleListFiles
};
