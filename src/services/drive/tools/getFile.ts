/**
 * Drive Get File Tool - MCP tool for retrieving Google Drive file metadata and content
 * 
 * This file implements the drive_get_file MCP tool following the
 * established Drive tool patterns with minimal complexity.
 * Now supports text extraction from PDF and DOCX files.
 */

import { ToolDefinition, MCPToolResult } from '../../../types/mcp';
import { driveClient } from '../driveClient';
import { documentParser } from '../../../utils/documentParser';

export interface DriveGetFileParams {
  fileId: string;
  includeContent?: boolean;
  maxContentSize?: number;
}

/**
 * Drive Get File Tool Handler
 * @param params - Parameters for getting file
 * @returns Promise resolving to formatted file information
 */
async function handleGetFile(params: unknown): Promise<MCPToolResult> {
  try {
    const getParams = params as DriveGetFileParams;
    
    // Validate required parameters
    if (!getParams.fileId || typeof getParams.fileId !== 'string') {
      return {
        content: [{
          type: 'text',
          text: '❌ **Drive Get File Error**\n\nFile ID is required and must be a string.'
        }],
        isError: true
      };
    }

    // Set defaults and validate optional parameters
    const includeContent = getParams.includeContent ?? false;
    const maxContentSize = Math.min(Math.max(getParams.maxContentSize ?? 1048576, 1024), 10485760); // 1KB to 10MB

    // Call Drive API using the client
    const file = await driveClient.instance.getFile(getParams.fileId, includeContent, maxContentSize);

    // Format the response for MCP
    let fileInfo = `📄 **${file.name}**\n\n`;
    fileInfo += `**File Details:**\n`;
    fileInfo += `• ID: ${file.id}\n`;
    fileInfo += `• Type: ${file.mimeType}\n`;
    
    if (file.size !== undefined) {
      const sizeKB = Math.round(file.size / 1024);
      const sizeMB = Math.round(file.size / (1024 * 1024));
      if (sizeMB > 0) {
        fileInfo += `• Size: ${sizeMB} MB (${file.size.toLocaleString()} bytes)\n`;
      } else if (sizeKB > 0) {
        fileInfo += `• Size: ${sizeKB} KB (${file.size.toLocaleString()} bytes)\n`;
      } else {
        fileInfo += `• Size: ${file.size.toLocaleString()} bytes\n`;
      }
    }
    
    if (file.createdTime) {
      fileInfo += `• Created: ${new Date(file.createdTime).toLocaleString()}\n`;
    }
    
    if (file.modifiedTime) {
      fileInfo += `• Modified: ${new Date(file.modifiedTime).toLocaleString()}\n`;
    }
    
    if (file.parents && file.parents.length > 0) {
      fileInfo += `• Parent Folder ID: ${file.parents[0]}\n`;
    }
    
    if (file.webViewLink) {
      fileInfo += `• View Link: ${file.webViewLink}\n`;
    }

    // Add content if requested and available
    if (includeContent) {
      if ('content' in file && file.content) {
        // Text file content already downloaded
        fileInfo += `\n**File Content:**\n`;
        fileInfo += `\`\`\`\n${file.content}\n\`\`\``;
      } else if (documentParser.instance.isSupported(file.mimeType)) {
        // Try to extract text from PDF or DOCX with improved feedback
        try {
          // Provide user feedback that processing is starting
          const sizeMB = file.size ? Math.round(file.size / 1024 / 1024) : 0;
          if (sizeMB > 0) {
            fileInfo += `\n*Processing ${file.mimeType === 'application/pdf' ? 'PDF' : 'DOCX'} file (${sizeMB}MB) for text extraction...*\n`;
          }
          
          const buffer = await driveClient.instance.downloadFileBuffer(getParams.fileId, 2097152); // 2MB max (reduced for stability)
          const extracted = await documentParser.instance.extractFromFile(buffer, file.mimeType);
          
          fileInfo += `\n**Extracted Text Content:**\n`;
          fileInfo += `*Extracted from ${extracted.extractedFrom.toUpperCase()} (${extracted.wordCount} words)*\n\n`;
          fileInfo += `\`\`\`\n${extracted.text}\n\`\`\``;
        } catch (extractError) {
          const errorMsg = extractError instanceof Error ? extractError.message : 'Unknown extraction error';
          
          // Provide more helpful error messages
          if (errorMsg.includes('too large')) {
            fileInfo += `\n*Note: File too large for text extraction (max 2MB for PDFs, 2MB for DOCX). Try a smaller file or use the web link to view: ${file.webViewLink}*`;
          } else if (errorMsg.includes('timeout')) {
            fileInfo += `\n*Note: File processing timed out - the document may be too complex for text extraction. Try a simpler document or use the web link: ${file.webViewLink}*`;
          } else if (errorMsg.includes('complex')) {
            fileInfo += `\n*Note: Document too complex for text extraction. Try a simpler document or use the web link: ${file.webViewLink}*`;
          } else {
            fileInfo += `\n*Note: Could not extract text from document: ${errorMsg}*`;
          }
        }
      } else if (file.mimeType.startsWith('text/')) {
        fileInfo += `\n*Note: Content was requested but could not be retrieved (file may be too large or inaccessible)*`;
      } else if (file.mimeType.startsWith('application/vnd.google-apps.')) {
        fileInfo += `\n*Note: Cannot extract content from Google Workspace files (${file.mimeType}). Use the web link to access: ${file.webViewLink}*`;
      } else {
        fileInfo += `\n*Note: Content extraction is only supported for text files, PDFs, and DOCX documents*`;
      }
    }

    return {
      content: [{
        type: 'text',
        text: fileInfo
      }],
      isError: false
    };

  } catch (error) {
    // Enhanced error handling
    let errorMessage = 'Unknown error occurred';
    
    if (error instanceof Error) {
      if (error.message.includes('File not found') || error.message.includes('404')) {
        errorMessage = `File not found. Please check the file ID: ${(params as DriveGetFileParams)?.fileId}`;
      } else if (error.message.includes('Insufficient permissions') || error.message.includes('403')) {
        errorMessage = 'Insufficient permissions to access this file. Please check your OAuth scopes or file sharing settings.';
      } else if (error.message.includes('Authentication failed') || error.message.includes('401')) {
        errorMessage = 'Authentication failed. Please re-authenticate with Google Drive.';
      } else if (error.message.includes('Rate limit') || error.message.includes('429')) {
        errorMessage = 'Rate limit exceeded. Please try again in a few moments.';
      } else {
        errorMessage = error.message;
      }
    }

    return {
      content: [{
        type: 'text',
        text: `❌ **Drive Get File Error**\n\n${errorMessage}`
      }],
      isError: true
    };
  }
}

/**
 * Drive Get File Tool Definition
 */
export const driveGetFileTool: ToolDefinition = {
  name: 'drive_get_file',
  description: 'Get Google Drive file metadata and optionally extract text content from text files, PDFs, and DOCX documents',
  inputSchema: {
    type: 'object',
    required: ['fileId'],
    properties: {
      fileId: {
        type: 'string',
        description: 'The ID of the Google Drive file to retrieve'
      },
      includeContent: {
        type: 'boolean',
        description: 'Whether to download and extract file content (supports text files, PDFs, and DOCX documents)',
        default: false
      },
      maxContentSize: {
        type: 'number',
        description: 'Maximum content size in bytes (1KB to 10MB for documents, 5MB max for PDFs/DOCX)',
        minimum: 1024,
        maximum: 10485760,
        default: 1048576
      }
    }
  },
  handler: handleGetFile
};
