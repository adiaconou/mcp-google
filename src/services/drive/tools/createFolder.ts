/**
 * Drive Create Folder Tool - MCP tool for creating folders in Google Drive
 * 
 * This tool allows creating new folders in Google Drive with optional
 * parent folder organization and descriptions.
 */

import { ToolDefinition, MCPToolResult } from '../../../types/mcp';
import { driveClient } from '../driveClient';

/**
 * Input parameters for the drive_create_folder tool
 */
export interface DriveCreateFolderParams {
  name: string;
  parentFolderId?: string;
  description?: string;
}

/**
 * Drive Create Folder Tool Handler
 * @param params - Folder creation parameters
 * @returns Promise resolving to tool result with created folder information
 */
async function handleCreateFolder(params: unknown): Promise<MCPToolResult> {
  try {
    const folderParams = params as DriveCreateFolderParams;
    
    // Validate required parameters
    if (!folderParams.name || typeof folderParams.name !== 'string' || folderParams.name.trim().length === 0) {
      return {
        content: [{
          type: 'text',
          text: '❌ **Create Folder Error**\n\nFolder name must be a non-empty string.'
        }],
        isError: true
      };
    }

    // Create the folder
    const createdFolder = await driveClient.instance.createFolder(
      folderParams.name.trim(),
      folderParams.parentFolderId?.trim(),
      folderParams.description?.trim()
    );

    // Format the response
    let folderInfo = `📁 **Folder Created Successfully**\n\n`;
    folderInfo += `📂 **${createdFolder.name}**\n`;
    folderInfo += `   ID: ${createdFolder.id}\n`;
    folderInfo += `   Type: ${createdFolder.mimeType}\n`;
    
    if (createdFolder.createdTime) {
      folderInfo += `   Created: ${new Date(createdFolder.createdTime).toLocaleString()}\n`;
    }
    
    if (createdFolder.webViewLink) {
      folderInfo += `   Link: ${createdFolder.webViewLink}\n`;
    }

    if (createdFolder.parents && createdFolder.parents.length > 0) {
      folderInfo += `   Parent Folder: ${createdFolder.parents[0]}\n`;
    }

    return {
      content: [{
        type: 'text',
        text: folderInfo
      }],
      isError: false
    };

  } catch (error) {
    console.error('Drive create folder error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return {
      content: [{
        type: 'text',
        text: `❌ **Drive Create Folder Error**\n\n${errorMessage}`
      }],
      isError: true
    };
  }
}

/**
 * Drive Create Folder Tool Definition
 */
export const driveCreateFolderTool: ToolDefinition = {
  name: 'drive_create_folder',
  description: 'Create a new folder in Google Drive',
  inputSchema: {
    type: 'object',
    required: ['name'],
    properties: {
      name: {
        type: 'string',
        description: 'Name of the folder to create'
      },
      parentFolderId: {
        type: 'string',
        description: 'Parent folder ID (optional, creates in root if not specified)'
      },
      description: {
        type: 'string',
        description: 'Folder description (optional)'
      }
    }
  },
  handler: handleCreateFolder
};
