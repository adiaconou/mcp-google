/**
 * Drive Move File Tool - MCP tool for moving files between folders in Google Drive
 * 
 * This tool allows moving files from one folder to another in Google Drive
 * with optional renaming during the move operation.
 */

import { ToolDefinition, MCPToolResult } from '../../../types/mcp';
import { driveClient } from '../driveClient';

/**
 * Input parameters for the drive_move_file tool
 */
export interface DriveMoveFileParams {
  fileId: string;
  targetFolderId: string;
  newName?: string;
}

/**
 * Drive Move File Tool Handler
 * @param params - Move parameters
 * @returns Promise resolving to tool result with moved file information
 */
async function handleMoveFile(params: unknown): Promise<MCPToolResult> {
  try {
    const moveParams = params as DriveMoveFileParams;
    
    // Validate required parameters
    if (!moveParams.fileId || typeof moveParams.fileId !== 'string' || moveParams.fileId.trim().length === 0) {
      return {
        content: [{
          type: 'text',
          text: '❌ **Move Error**\n\nFile ID must be a non-empty string.'
        }],
        isError: true
      };
    }

    if (!moveParams.targetFolderId || typeof moveParams.targetFolderId !== 'string' || moveParams.targetFolderId.trim().length === 0) {
      return {
        content: [{
          type: 'text',
          text: '❌ **Move Error**\n\nTarget folder ID must be a non-empty string.'
        }],
        isError: true
      };
    }

    // Build move parameters
    const fileId = moveParams.fileId.trim();
    const targetFolderId = moveParams.targetFolderId.trim();
    const newName = moveParams.newName?.trim();

    // Move the file
    const movedFile = await driveClient.instance.moveFile(fileId, targetFolderId, newName);

    // Format the response
    let fileInfo = `📁 **File Moved Successfully**\n\n`;
    fileInfo += `📄 **${movedFile.name}**\n`;
    fileInfo += `   ID: ${movedFile.id}\n`;
    fileInfo += `   Type: ${movedFile.mimeType}\n`;
    
    if (movedFile.size) {
      const sizeKB = Math.round(movedFile.size / 1024);
      fileInfo += `   Size: ${sizeKB > 0 ? sizeKB + ' KB' : '< 1 KB'}\n`;
    }
    
    if (movedFile.modifiedTime) {
      fileInfo += `   Modified: ${new Date(movedFile.modifiedTime).toLocaleString()}\n`;
    }
    
    if (movedFile.webViewLink) {
      fileInfo += `   Link: ${movedFile.webViewLink}\n`;
    }

    if (movedFile.parents && movedFile.parents.length > 0) {
      fileInfo += `   New Location: ${movedFile.parents[0]}\n`;
    }

    if (newName) {
      fileInfo += `   Renamed to: ${movedFile.name}\n`;
    }

    return {
      content: [{
        type: 'text',
        text: fileInfo
      }],
      isError: false
    };

  } catch (error) {
    console.error('Drive move file error:', error);

    // Enhanced error handling
    let errorMessage = 'Unknown error occurred';
    
    if (error instanceof Error) {
      if (error.message.includes('File not found')) {
        errorMessage = `File not found. Please check the file ID.`;
      } else if (error.message.includes('Folder not found') || error.message.includes('resource not found')) {
        errorMessage = `Target folder not found. Please check the folder ID.`;
      } else if (error.message.includes('Insufficient permissions')) {
        errorMessage = 'Insufficient permissions to move files in Google Drive. Please check your OAuth scopes.';
      } else if (error.message.includes('Invalid request')) {
        errorMessage = 'Invalid move request. Please check the file and folder IDs.';
      } else {
        errorMessage = error.message;
      }
    }

    return {
      content: [{
        type: 'text',
        text: `❌ **Drive Move Error**\n\n${errorMessage}`
      }],
      isError: true
    };
  }
}

/**
 * Drive Move File Tool Definition
 */
export const driveMoveFileTool: ToolDefinition = {
  name: 'drive_move_file',
  description: 'Move a file to a different folder in Google Drive',
  inputSchema: {
    type: 'object',
    required: ['fileId', 'targetFolderId'],
    properties: {
      fileId: {
        type: 'string',
        description: 'ID of the file to move'
      },
      targetFolderId: {
        type: 'string',
        description: 'ID of the target folder to move the file to'
      },
      newName: {
        type: 'string',
        description: 'Optional new name for the file (renames during move)'
      }
    }
  },
  handler: handleMoveFile
};
