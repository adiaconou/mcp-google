/**
 * Gmail Download Attachment Tool - MCP tool for downloading email attachments
 * 
 * This tool allows downloading Gmail attachments to the local file system
 * with security validation and file handling.
 */

import { ToolDefinition, MCPToolResult, CalendarError, MCPErrorCode } from '../../../types/mcp';
import { gmailClient } from '../gmailClient';
import { oauthManager } from '../../../auth/oauthManager';

/**
 * Gmail Download Attachment Tool Handler
 * @param params - Parameters for downloading attachment
 * @returns Promise resolving to download result
 */
async function handleDownloadAttachment(params: unknown): Promise<MCPToolResult> {
  try {
    const { messageId, attachmentId, outputPath, filename, maxSizeBytes } = params as {
      messageId: string;
      attachmentId: string;
      outputPath?: string;
      filename?: string;
      maxSizeBytes?: number;
    };

    // Validate required parameters
    if (!messageId?.trim()) {
      return {
        content: [{
          type: 'text',
          text: 'Error: Message ID is required. Get this from gmail_list_messages or gmail_search_messages.'
        }],
        isError: true
      };
    }

    if (!attachmentId?.trim()) {
      return {
        content: [{
          type: 'text',
          text: 'Error: Attachment ID is required. Get this from attachment metadata.'
        }],
        isError: true
      };
    }

    // Download the attachment
    const downloadParams: any = {
      messageId: messageId.trim(),
      attachmentId: attachmentId.trim()
    };

    // Add optional parameters only if they are provided
    if (outputPath !== undefined) {
      downloadParams.outputPath = outputPath;
    }
    if (filename !== undefined) {
      downloadParams.filename = filename;
    }
    if (maxSizeBytes !== undefined) {
      downloadParams.maxSizeBytes = maxSizeBytes;
    }

    const filePath = await gmailClient.instance.downloadAttachment(downloadParams);

    return {
      content: [{
        type: 'text',
        text: `Attachment downloaded successfully!\n\nFile saved to: ${filePath}\n\nDetails:\n- Message ID: ${messageId}\n- Attachment ID: ${attachmentId}\n- Local path: ${filePath}`
      }],
      isError: false
    };

  } catch (error) {
    // Enhanced error handling with automatic scope management
    if (error instanceof CalendarError && error.code === MCPErrorCode.AuthenticationError) {
      // Check if this is a scope-related error
      if (error.message.includes('Missing required scopes') || error.message.includes('Gmail access requires additional permissions')) {
        try {
          // Attempt to handle the scope error automatically
          await oauthManager.instance.handleInsufficientScopeError(error);
        } catch {
          // Return helpful error message for scope issues
          return {
            content: [{
              type: 'text',
              text: `Gmail access requires additional permissions. Please run "node clear-tokens.js" and restart the MCP server to reauthenticate with Gmail permissions.`
            }],
            isError: true
          };
        }
      }
    }

    // Consistent error handling pattern with other Gmail tools
    return {
      content: [{
        type: 'text',
        text: `Error downloading attachment: ${error instanceof Error ? error.message : 'Unknown error'}`
      }],
      isError: true
    };
  }
}

/**
 * Gmail Download Attachment Tool Definition
 */
export const gmailDownloadAttachmentTool: ToolDefinition = {
  name: 'gmail_download_attachment',
  description: 'Download email attachment to local file system. Use this tool to save Gmail attachments locally for further processing or analysis.',
  inputSchema: {
    type: 'object',
    required: ['messageId', 'attachmentId'],
    properties: {
      messageId: {
        type: 'string',
        description: 'Gmail message ID containing the attachment (get this from gmail_list_messages or gmail_search_messages)'
      },
      attachmentId: {
        type: 'string', 
        description: 'Gmail attachment ID to download (get this from attachment metadata)'
      },
      outputPath: {
        type: 'string',
        description: 'Local directory path to save file (default: current directory). Must be within current working directory for security.'
      },
      filename: {
        type: 'string',
        description: 'Override filename (default: use original attachment filename). Will be sanitized for security.'
      },
      maxSizeBytes: {
        type: 'number',
        default: 25000000,
        minimum: 1,
        maximum: 100000000,
        description: 'Maximum file size in bytes (default: 25MB, max: 100MB)'
      }
    }
  },
  handler: handleDownloadAttachment
};
