/**
 * Gmail API Client - Google Gmail API wrapper with OAuth integration
 * 
 * This file implements a type-safe wrapper around the Google Gmail API
 * with integrated OAuth authentication and error handling.
 */

import { google, gmail_v1 } from 'googleapis';
import { oauthManager } from '../../auth/oauthManager';
import { 
  CalendarError, 
  MCPErrorCode 
} from '../../types/mcp';

/**
 * Gmail message interface for our application
 */
export interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  subject?: string;
  from?: string;
  to?: string;
  date?: string;
  body?: string;
  isRead?: boolean;
  labels?: string[];
}

/**
 * Parameters for listing Gmail messages
 */
export interface GmailListMessagesParams {
  query?: string;
  labelIds?: string[];
  maxResults?: number;
  pageToken?: string;
  includeSpamTrash?: boolean;
}

/**
 * Parameters for sending Gmail messages
 */
export interface GmailSendMessageParams {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  isHtml?: boolean;
  replyToMessageId?: string;
}

/**
 * Gmail API Client
 * 
 * Provides type-safe access to Google Gmail API with integrated OAuth
 * authentication and comprehensive error handling.
 */
export class GmailClient {
  private gmail: gmail_v1.Gmail | null = null;

  constructor() {
    // No initialization needed in constructor
  }

  /**
   * Initialize Gmail API client with authentication and scope validation
   * @throws {CalendarError} If authentication fails
   */
  private async initializeClient(): Promise<void> {
    try {
      // Ensure we have all required Gmail scopes before initializing
      await oauthManager.instance.ensureScopes([
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.labels'
      ]);

      const oauth2Client = await oauthManager.instance.getOAuth2Client();
      this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      console.error('Gmail API client initialized successfully');
    } catch (error) {
      // Handle scope-related errors specifically
      if (error instanceof CalendarError && error.message.includes('Missing required scopes')) {
        throw new CalendarError(
          'Gmail access requires additional permissions. Please reauthenticate to grant Gmail access.',
          MCPErrorCode.AuthenticationError
        );
      }
      throw new CalendarError(
        'Failed to initialize Gmail API client: User is not authenticated',
        MCPErrorCode.AuthenticationError
      );
    }
  }

  /**
   * Ensure the client is initialized
   * @throws {CalendarError} If initialization fails
   */
  private async ensureInitialized(): Promise<gmail_v1.Gmail> {
    if (!this.gmail) {
      await this.initializeClient();
    }
    
    if (!this.gmail) {
      throw new CalendarError(
        'Gmail API client failed to initialize',
        MCPErrorCode.InternalError
      );
    }
    
    return this.gmail;
  }

  /**
   * List Gmail messages with optional filtering
   * @param params - Parameters for listing messages
   * @returns Promise resolving to array of Gmail messages
   * @throws {CalendarError} If the request fails
   */
  async listMessages(params: GmailListMessagesParams = {}): Promise<GmailMessage[]> {
    try {
      const gmail = await this.ensureInitialized();
      
      // Set default parameters
      const requestParams: gmail_v1.Params$Resource$Users$Messages$List = {
        userId: 'me',
        maxResults: Math.min(params.maxResults || 10, 100), // Cap at 100
        includeSpamTrash: params.includeSpamTrash || false
      };

      // Add optional parameters only if they have values
      if (params.query) {
        requestParams.q = params.query;
      }
      if (params.labelIds && params.labelIds.length > 0) {
        requestParams.labelIds = params.labelIds;
      }
      if (params.pageToken) {
        requestParams.pageToken = params.pageToken;
      }

      console.error(`Listing Gmail messages with query: ${params.query || 'none'}`);
      
      // Make API request to list messages
      const response = await gmail.users.messages.list(requestParams);
      
      if (!response.data.messages || response.data.messages.length === 0) {
        return [];
      }

      // Get detailed information for each message
      const messages: GmailMessage[] = [];
      for (const messageRef of response.data.messages) {
        if (messageRef.id) {
          try {
            const messageDetail = await this.getMessage(messageRef.id);
            messages.push(messageDetail);
          } catch (error) {
            console.error(`Failed to get details for message ${messageRef.id}:`, error);
            // Continue with other messages
          }
        }
      }

      console.error(`Retrieved ${messages.length} messages`);
      return messages;

    } catch (error) {
      throw this.handleApiError(error, 'list messages');
    }
  }

  /**
   * Get a specific Gmail message by ID
   * @param messageId - The ID of the message to retrieve
   * @returns Promise resolving to the Gmail message
   * @throws {CalendarError} If the request fails
   */
  async getMessage(messageId: string): Promise<GmailMessage> {
    try {
      const gmail = await this.ensureInitialized();
      
      console.error(`Getting Gmail message: ${messageId}`);
      console.error(`Making API call with userId: 'me', id: '${messageId}', format: 'metadata'`);
      
      // Make API request to get message - using 'metadata' format for better compatibility
      const response = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'metadata'
      });

      if (!response.data) {
        throw new Error('No data returned from Gmail API');
      }

      const message = this.convertToGmailMessage(response.data);
      console.error(`Retrieved message: ${message.subject || 'No subject'}`);
      
      return message;

    } catch (error) {
      throw this.handleApiError(error, 'get message');
    }
  }

  /**
   * Send a Gmail message
   * @param params - Parameters for sending the message
   * @returns Promise resolving to the sent message
   * @throws {CalendarError} If the request fails
   */
  async sendMessage(params: GmailSendMessageParams): Promise<GmailMessage> {
    try {
      const gmail = await this.ensureInitialized();
      
      // Validate required parameters
      this.validateSendMessageParams(params);

      console.error(`Sending Gmail message to: ${params.to.join(', ')}`);

      // Create the email message
      const emailMessage = this.createEmailMessage(params);
      
      // Make API request to send message
      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: emailMessage
        }
      });

      if (!response.data || !response.data.id) {
        throw new Error('No data returned from Gmail API');
      }

      // Get the sent message details
      const sentMessage = await this.getMessage(response.data.id);
      console.error(`Message sent successfully with ID: ${sentMessage.id}`);
      
      return sentMessage;

    } catch (error) {
      throw this.handleApiError(error, 'send message');
    }
  }

  /**
   * Search Gmail messages using Gmail query syntax
   * @param query - Gmail search query
   * @param maxResults - Maximum number of results to return
   * @returns Promise resolving to array of matching Gmail messages
   * @throws {CalendarError} If the request fails
   */
  async searchMessages(query: string, maxResults: number = 20): Promise<GmailMessage[]> {
    try {
      if (!query.trim()) {
        throw new CalendarError('Search query is required', MCPErrorCode.ValidationError);
      }

      return await this.listMessages({
        query: query.trim(),
        maxResults: Math.min(maxResults, 100)
      });

    } catch (error) {
      throw this.handleApiError(error, 'search messages');
    }
  }

  /**
   * Convert Gmail API message to our GmailMessage format
   * @param gmailMessage - Gmail API message object
   * @returns GmailMessage in our format
   */
  private convertToGmailMessage(gmailMessage: gmail_v1.Schema$Message): GmailMessage {
    const headers = gmailMessage.payload?.headers || [];
    
    // Extract common headers
    const getHeader = (name: string): string | undefined => {
      const header = headers.find(h => h.name?.toLowerCase() === name.toLowerCase());
      return header?.value || undefined;
    };

    // Extract message body
    const body = this.extractMessageBody(gmailMessage.payload);

    const message: GmailMessage = {
      id: gmailMessage.id || '',
      threadId: gmailMessage.threadId || '',
      snippet: gmailMessage.snippet || '',
      body: body,
      isRead: !gmailMessage.labelIds?.includes('UNREAD'),
      labels: gmailMessage.labelIds || []
    };

    // Add optional properties only if they exist
    const subject = getHeader('Subject');
    if (subject) {
      message.subject = subject;
    }

    const from = getHeader('From');
    if (from) {
      message.from = from;
    }

    const to = getHeader('To');
    if (to) {
      message.to = to;
    }

    const date = getHeader('Date');
    if (date) {
      message.date = date;
    }

    return message;
  }

  /**
   * Extract message body from Gmail message payload
   * @param payload - Gmail message payload
   * @returns Extracted message body text
   */
  private extractMessageBody(payload?: gmail_v1.Schema$MessagePart): string {
    if (!payload) {
      return '';
    }

    // If this part has body data, decode it
    if (payload.body?.data) {
      try {
        // Validate base64 format before attempting to decode
        const base64Data = payload.body.data;
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Data)) {
          console.error('Invalid base64 format detected');
          return '';
        }
        return Buffer.from(base64Data, 'base64').toString('utf-8');
      } catch (error) {
        console.error('Failed to decode message body:', error);
        return '';
      }
    }

    // If this is a multipart message, recursively extract from parts
    if (payload.parts && payload.parts.length > 0) {
      for (const part of payload.parts) {
        // Look for text/plain or text/html parts
        if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
          const bodyText = this.extractMessageBody(part);
          if (bodyText) {
            return bodyText;
          }
        }
      }
      
      // If no text parts found, try the first part
      const firstPartBody = this.extractMessageBody(payload.parts[0]);
      if (firstPartBody) {
        return firstPartBody;
      }
    }

    return '';
  }

  /**
   * Create email message in RFC 2822 format for Gmail API
   * @param params - Parameters for creating the message
   * @returns Base64url encoded email message
   */
  private createEmailMessage(params: GmailSendMessageParams): string {
    const lines: string[] = [];
    
    // Add headers
    lines.push(`To: ${params.to.join(', ')}`);
    
    if (params.cc && params.cc.length > 0) {
      lines.push(`Cc: ${params.cc.join(', ')}`);
    }
    
    if (params.bcc && params.bcc.length > 0) {
      lines.push(`Bcc: ${params.bcc.join(', ')}`);
    }
    
    lines.push(`Subject: ${params.subject}`);
    
    if (params.replyToMessageId) {
      lines.push(`In-Reply-To: ${params.replyToMessageId}`);
    }
    
    lines.push(`Content-Type: ${params.isHtml ? 'text/html' : 'text/plain'}; charset=utf-8`);
    lines.push(''); // Empty line between headers and body
    
    // Add body
    lines.push(params.body);
    
    const emailContent = lines.join('\r\n');
    
    // Encode to base64url (Gmail API requirement)
    return Buffer.from(emailContent)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Validate parameters for sending a message
   * @param params - Parameters to validate
   * @throws {CalendarError} If validation fails
   */
  private validateSendMessageParams(params: GmailSendMessageParams): void {
    if (!params.to || params.to.length === 0) {
      throw new CalendarError('At least one recipient is required', MCPErrorCode.ValidationError);
    }

    if (!params.subject?.trim()) {
      throw new CalendarError('Message subject is required', MCPErrorCode.ValidationError);
    }

    if (!params.body?.trim()) {
      throw new CalendarError('Message body is required', MCPErrorCode.ValidationError);
    }

    // Validate all email addresses
    const allEmails = [
      ...params.to,
      ...(params.cc || []),
      ...(params.bcc || [])
    ];

    for (const email of allEmails) {
      if (!this.isValidEmail(email)) {
        throw new CalendarError(
          `Invalid email address: ${email}`,
          MCPErrorCode.ValidationError
        );
      }
    }
  }

  /**
   * Basic email validation
   * @param email - Email address to validate
   * @returns True if email format is valid
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Handle Gmail API errors and convert to CalendarError
   * @param error - The error from the API call
   * @param operation - Description of the operation that failed
   * @returns CalendarError with appropriate error code and message
   */
  private handleApiError(error: unknown, operation: string): CalendarError {
    console.error(`Gmail API error during ${operation}:`, error);

    if (error instanceof CalendarError) {
      return error;
    }

    const err = error as { code?: number | string; message?: string };

    switch (err.code) {
      case 401:
        return new CalendarError('Authentication failed. Please re-authenticate.', MCPErrorCode.AuthenticationError);
      case 403:
        return new CalendarError('Insufficient permissions for Gmail access.', MCPErrorCode.AuthorizationError);
      case 429:
        return new CalendarError('Rate limit exceeded. Please try again later.', MCPErrorCode.RateLimitError);
      case 404:
        return new CalendarError(`Gmail resource not found during ${operation}.`, MCPErrorCode.APIError);
      case 400:
        return new CalendarError(`Invalid Gmail request for ${operation}: ${err.message}`, MCPErrorCode.ValidationError);
      default:
        return new CalendarError(`Failed to ${operation}: ${err.message || 'Unknown error'}`, MCPErrorCode.APIError, { originalError: error });
    }
  }
}

/**
 * Global Gmail client instance
 * This singleton pattern ensures consistent API access across the application
 */
let _gmailClient: GmailClient | null = null;

export const gmailClient = {
  get instance(): GmailClient {
    if (!_gmailClient) {
      _gmailClient = new GmailClient();
    }
    return _gmailClient;
  },
  
  reset(): void {
    _gmailClient = null;
  }
};
