/**
 * Gmail List Messages Tool - MCP tool for listing Gmail messages
 * 
 * This file implements the gmail_list_messages MCP tool following the
 * established calendar tool patterns with minimal complexity.
 */

import { ToolDefinition, MCPToolResult, CalendarError, MCPErrorCode } from '../../../types/mcp';
import { gmailClient, GmailListMessagesParams, GmailMessage } from '../gmailClient';
import { oauthManager } from '../../../auth/oauthManager';

/**
 * Format a Gmail message for display (simplified)
 * @param message - The Gmail message to format
 * @returns Formatted string representation of the message
 */
function formatMessage(message: GmailMessage): string {
  const date = message.date ? new Date(message.date).toLocaleString() : 'No date';
  const from = message.from || 'Unknown sender';
  const subject = message.subject || 'No subject';
  const snippet = message.snippet || 'No preview available';
  
  let result = `Message ID: ${message.id}\nSubject: ${subject}\nFrom: ${from}\nDate: ${date}`;
  
  if (snippet) {
    result += `\nPreview: ${snippet}`;
  }
  
  if (message.isRead === false) {
    result += '\n[UNREAD]';
  }
  
  return result;
}

/**
 * Gmail List Messages Tool Handler
 * @param params - Parameters for listing messages
 * @returns Promise resolving to formatted message list
 */
async function handleListMessages(params: unknown): Promise<MCPToolResult> {
  try {
    const listParams = params as GmailListMessagesParams;
    
    // Call the Gmail client (authentication handled at client level)
    const messages = await gmailClient.instance.listMessages(listParams);
    
    // Return results
    if (messages.length === 0) {
      return {
        content: [{
          type: 'text',
          text: 'No messages found.'
        }],
        isError: false
      };
    }
    
    return {
      content: [{
        type: 'text',
        text: messages.map(formatMessage).join('\n\n---\n\n')
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

    // Consistent error handling pattern with calendar tools
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
 * Gmail List Messages Tool Definition
 */
export const gmailListMessagesTool: ToolDefinition = {
  name: 'gmail_list_messages',
  description: 'List and search Gmail messages with optional filtering and pagination. Use "query" parameter for Gmail search syntax (from:, to:, subject:, date ranges, etc.). Supports automatic pagination for large result sets.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Gmail search query using Gmail syntax. Examples: "from:john@example.com", "subject:meeting", "from:boss@company.com subject:urgent", "is:unread after:2024/01/01", "has:attachment larger:10M"'
      },
      maxResults: {
        type: 'number',
        default: 10,
        minimum: 1,
        maximum: 10000,
        description: 'Maximum messages to return. Values over 100 will use automatic pagination.'
      },
      includeSpamTrash: {
        type: 'boolean',
        default: false,
        description: 'Include messages from spam and trash folders'
      },
      fetchAll: {
        type: 'boolean',
        default: false,
        description: 'Automatically fetch all available results (up to maxTotalResults limit). Ignores maxResults when true.'
      },
      pageSize: {
        type: 'number',
        default: 100,
        minimum: 1,
        maximum: 100,
        description: 'Number of messages to fetch per API request when using pagination (default 100, max 100 - Gmail API limit)'
      },
      maxTotalResults: {
        type: 'number',
        default: 1000,
        minimum: 1,
        maximum: 10000,
        description: 'Safety limit for total messages when using fetchAll or large maxResults (default 1000)'
      },
      pageToken: {
        type: 'string',
        description: 'Token for manual pagination - continue from a specific page'
      }
    }
  },
  handler: handleListMessages
};
