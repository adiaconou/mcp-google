/**
 * Gmail Get Message Tool - MCP tool for retrieving detailed Gmail message content
 * 
 * This file implements the gmail_get_message MCP tool following the
 * established calendar tool patterns with minimal complexity.
 */

import { ToolDefinition, MCPToolResult } from '../../../types/mcp';
import { gmailClient, GmailMessage } from '../gmailClient';

/**
 * Parameters for getting Gmail messages (batch)
 */
interface GmailGetMessageParams {
  messageIds: string[];
  maxBodyLength?: number;
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
 * Gmail Get Message Tool Handler (Batch)
 * @param params - Parameters for getting the messages
 * @returns Promise resolving to formatted message details array
 */
async function handleGetMessage(params: unknown): Promise<MCPToolResult> {
  try {
    const getParams = params as GmailGetMessageParams;
    
    // Validate required parameters
    if (!getParams.messageIds || !Array.isArray(getParams.messageIds)) {
      return {
        content: [{
          type: 'text',
          text: 'Error: messageIds is required and must be an array'
        }],
        isError: true
      };
    }
    
    if (getParams.messageIds.length === 0) {
      return {
        content: [{
          type: 'text',
          text: 'Error: messageIds array cannot be empty'
        }],
        isError: true
      };
    }
    
    if (getParams.messageIds.length > 50) {
      return {
        content: [{
          type: 'text',
          text: 'Error: Maximum 50 message IDs allowed per batch'
        }],
        isError: true
      };
    }
    
    // Validate all message IDs are strings
    for (const messageId of getParams.messageIds) {
      if (typeof messageId !== 'string' || !messageId.trim()) {
        return {
          content: [{
            type: 'text',
            text: 'Error: All message IDs must be non-empty strings'
          }],
          isError: true
        };
      }
    }
    
    // Get all messages (fail-fast approach)
    const messages: GmailMessage[] = [];
    for (const messageId of getParams.messageIds) {
      const message = await gmailClient.instance.getMessage(
        messageId.trim(), 
        getParams.maxBodyLength
      );
      messages.push(message);
    }
    
    // Format all messages
    const formattedMessages = messages.map(formatMessageDetails);
    
    // Return formatted message details array
    return {
      content: [{
        type: 'text',
        text: formattedMessages.join('\n\n=== MESSAGE SEPARATOR ===\n\n')
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
  description: 'Get Gmail message content for one or more message IDs (batch support)',
  inputSchema: {
    type: 'object',
    required: ['messageIds'],
    properties: {
      messageIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of Gmail message IDs to retrieve (1-50)'
      },
      maxBodyLength: {
        type: 'number',
        default: 50000,
        minimum: 1000,
        maximum: 500000,
        description: 'Maximum characters per message body (default 50k, max 500k)'
      }
    }
  },
  handler: handleGetMessage
};
