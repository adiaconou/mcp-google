/**
 * Gmail Search Messages Tool - MCP tool for searching Gmail messages
 * 
 * This file implements the gmail_search_messages MCP tool for advanced
 * Gmail searching using Gmail's query syntax.
 */

import { ToolDefinition, MCPToolResult, CalendarError, MCPErrorCode } from '../../../types/mcp';
import { gmailClient, GmailMessage } from '../gmailClient';
import { oauthManager } from '../../../auth/oauthManager';

/**
 * TOOL USAGE GUIDANCE FOR AI AGENTS:
 * 
 * Use gmail_search_messages when:
 * - Looking for specific emails ("find emails from John about the project")
 * - Using Gmail search operators (from:, to:, subject:, date ranges)
 * - Complex search criteria ("unread emails with attachments from last week")
 * - Need relevance-ranked results
 * 
 * Use gmail_list_messages when:
 * - Browsing recent emails ("show me my latest emails")
 * - Listing messages in inbox/folders
 * - Simple filtering needs
 * - Getting a general overview of messages
 * 
 * Examples:
 * - "Show recent emails" → use gmail_list_messages
 * - "Find emails from boss about budget" → use gmail_search_messages with query "from:boss@company.com subject:budget"
 */

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
 * Gmail Search Messages Tool Handler
 * @param params - Parameters for searching messages
 * @returns Promise resolving to formatted search results
 */
async function handleSearchMessages(params: unknown): Promise<MCPToolResult> {
  try {
    const { query, maxResults = 20 } = params as { query: string; maxResults?: number };
    
    // Validate required query parameter
    if (!query?.trim()) {
      return {
        content: [{
          type: 'text',
          text: 'Error: Search query is required. Examples:\n' +
                '- "from:john@example.com" (emails from specific sender)\n' +
                '- "subject:meeting" (emails with subject containing "meeting")\n' +
                '- "is:unread after:2024/01/01" (unread emails after date)\n' +
                '- "has:attachment larger:10M" (emails with large attachments)\n' +
                '- "from:boss@company.com subject:urgent" (combine multiple criteria)'
        }],
        isError: true
      };
    }
    
    // Call the Gmail client search method
    const messages = await gmailClient.instance.searchMessages(query.trim(), maxResults);
    
    // Return results
    if (messages.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No messages found for search query: "${query}"`
        }],
        isError: false
      };
    }
    
    return {
      content: [{
        type: 'text',
        text: `Found ${messages.length} message(s) for query: "${query}"\n\n` +
              messages.map(formatMessage).join('\n\n---\n\n')
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
        text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }],
      isError: true
    };
  }
}

/**
 * Gmail Search Messages Tool Definition
 */
export const gmailSearchMessagesTool: ToolDefinition = {
  name: 'gmail_search_messages',
  description: 'Search Gmail using advanced query syntax. Use for: finding specific emails, complex searches with operators (from:, to:, subject:, date ranges), or when you need to locate particular messages. Requires search query.',
  inputSchema: {
    type: 'object',
    required: ['query'],
    properties: {
      query: {
        type: 'string',
        description: 'Gmail search query using Gmail syntax. Examples: "from:john@example.com", "subject:meeting", "from:boss@company.com subject:urgent", "is:unread after:2024/01/01", "has:attachment larger:10M"'
      },
      maxResults: {
        type: 'number',
        default: 20,
        minimum: 1,
        maximum: 100,
        description: 'Maximum search results to return (1-100, default 20)'
      }
    }
  },
  handler: handleSearchMessages
};
