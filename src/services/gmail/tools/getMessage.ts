/**
 * Gmail Get Message Tool - MCP tool for retrieving detailed Gmail message content
 * 
 * This file implements the gmail_get_message MCP tool following the
 * established calendar tool patterns with minimal complexity.
 */

import { ToolDefinition, MCPToolResult } from '../../../types/mcp';
import { gmailClient, GmailMessage } from '../gmailClient';

/**
 * Parameters for getting a Gmail message
 */
interface GmailGetMessageParams {
  messageId: string;
}

/**
 * Format a Gmail message for detailed display
 * @param message - The Gmail message to format
 * @returns Formatted string representation of the message
 */
function formatMessageDetails(message: GmailMessage): string {
  const lines: string[] = [];
  
  // Header information
  lines.push(`Message ID: ${message.id}`);
  lines.push(`Thread ID: ${message.threadId}`);
  
  if (message.subject) {
    lines.push(`Subject: ${message.subject}`);
  }
  
  if (message.from) {
    lines.push(`From: ${message.from}`);
  }
  
  if (message.to) {
    lines.push(`To: ${message.to}`);
  }
  
  if (message.date) {
    const date = new Date(message.date).toLocaleString();
    lines.push(`Date: ${date}`);
  }
  
  // Status information
  const status = message.isRead === false ? 'UNREAD' : 'READ';
  lines.push(`Status: ${status}`);
  
  if (message.labels && message.labels.length > 0) {
    lines.push(`Labels: ${message.labels.join(', ')}`);
  }
  
  // Message body
  lines.push(''); // Empty line before body
  lines.push('--- Message Body ---');
  
  if (message.body) {
    lines.push(message.body);
  } else if (message.snippet) {
    lines.push(`[Preview]: ${message.snippet}`);
  } else {
    lines.push('[No content available]');
  }
  
  return lines.join('\n');
}

/**
 * Gmail Get Message Tool Handler
 * @param params - Parameters for getting the message
 * @returns Promise resolving to formatted message details
 */
async function handleGetMessage(params: unknown): Promise<MCPToolResult> {
  try {
    const getParams = params as GmailGetMessageParams;
    
    // Validate required parameters
    if (!getParams.messageId || typeof getParams.messageId !== 'string') {
      return {
        content: [{
          type: 'text',
          text: 'Error: messageId is required and must be a string'
        }],
        isError: true
      };
    }
    
    if (!getParams.messageId.trim()) {
      return {
        content: [{
          type: 'text',
          text: 'Error: messageId cannot be empty'
        }],
        isError: true
      };
    }
    
    // Call the Gmail client (authentication handled at client level)
    const message = await gmailClient.instance.getMessage(getParams.messageId.trim());
    
    // Return formatted message details
    return {
      content: [{
        type: 'text',
        text: formatMessageDetails(message)
      }],
      isError: false
    };
    
  } catch (error) {
    // Consistent error handling pattern with other Gmail tools
    return {
      content: [{
        type: 'text',
        text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }],
      isError: true
    };
  }
}

/**
 * Gmail Get Message Tool Definition
 */
export const gmailGetMessageTool: ToolDefinition = {
  name: 'gmail_get_message',
  description: 'Get detailed Gmail message content by message ID',
  inputSchema: {
    type: 'object',
    required: ['messageId'],
    properties: {
      messageId: {
        type: 'string',
        description: 'Gmail message ID to retrieve'
      }
    }
  },
  handler: handleGetMessage
};
