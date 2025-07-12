/**
 * Gmail API Client - Google Gmail API wrapper with OAuth integration
 * 
 * This file implements a type-safe wrapper around the Google Gmail API
 * with integrated OAuth authentication and error handling.
 */

import { google, gmail_v1 } from 'googleapis';
import { oauthManager } from '../../auth/oauthManager';
import { 
  GmailError, 
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
 * Gmail attachment metadata interface
 */
export interface GmailAttachment {
  partId: string;
  filename: string;
  mimeType: string;
  size: number;
}

/**
 * Parameters for downloading Gmail attachments
 */
export interface GmailDownloadParams {
  messageId: string;
  attachmentId: string;
  outputPath?: string;
  filename?: string;
  maxSizeBytes?: number;
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
   * @throws {GmailError} If authentication fails
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
    } catch (error) {
      // Handle scope-related errors specifically
      if (error instanceof GmailError && error.message.includes('Missing required scopes')) {
        throw new GmailError(
          'Gmail access requires additional permissions. Please reauthenticate to grant Gmail access.',
          MCPErrorCode.AuthenticationError
        );
      }
      throw new GmailError(
        'Failed to initialize Gmail API client: User is not authenticated',
        MCPErrorCode.AuthenticationError
      );
    }
  }

  /**
   * Ensure the client is initialized
   * @throws {GmailError} If initialization fails
   */
  private async ensureInitialized(): Promise<gmail_v1.Gmail> {
    if (!this.gmail) {
      await this.initializeClient();
    }
    
    if (!this.gmail) {
      throw new GmailError(
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
   * @throws {GmailError} If the request fails
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
      return messages;

    } catch (error) {
      throw this.handleApiError(error, 'list messages');
    }
  }

  /**
   * Get a specific Gmail message by ID
   * @param messageId - The ID of the message to retrieve
   * @param maxBodyLength - Maximum length of message body in characters (default: no limit)
   * @returns Promise resolving to the Gmail message
   * @throws {GmailError} If the request fails
   */
  async getMessage(messageId: string, maxBodyLength?: number): Promise<GmailMessage> {
    try {
      const gmail = await this.ensureInitialized();
      
      // Make API request to get message - using 'full' format to get complete message body
      const response = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      if (!response.data) {
        throw new Error('No data returned from Gmail API');
      }

      const message = this.convertToGmailMessage(response.data, maxBodyLength);
      
      return message;

    } catch (error) {
      throw this.handleApiError(error, 'get message');
    }
  }

  /**
   * Send a Gmail message
   * @param params - Parameters for sending the message
   * @returns Promise resolving to the sent message
   * @throws {GmailError} If the request fails
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
   * @throws {GmailError} If the request fails
   */
  async searchMessages(query: string, maxResults: number = 20): Promise<GmailMessage[]> {
    try {
      if (!query.trim()) {
        throw new GmailError('Search query is required', MCPErrorCode.ValidationError);
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
   * Get attachment metadata from a Gmail message
   * @param messageId - The ID of the message to get attachments from
   * @returns Promise resolving to array of attachment metadata
   * @throws {GmailError} If the request fails
   */
  async getAttachmentMetadata(messageId: string): Promise<GmailAttachment[]> {
    try {
      const gmail = await this.ensureInitialized();
      
      // Get the message with full format to access attachments
      const response = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      if (!response.data || !response.data.payload) {
        return [];
      }

      const attachments: GmailAttachment[] = [];
      this.extractAttachmentsFromPayload(response.data.payload, attachments);
      
      return attachments;

    } catch (error) {
      throw this.handleApiError(error, 'get attachment metadata');
    }
  }

  /**
   * Download a Gmail attachment to the local file system
   * @param params - Parameters for downloading the attachment
   * @returns Promise resolving to the file path where attachment was saved
   * @throws {GmailError} If the request fails
   */
  async downloadAttachment(params: GmailDownloadParams): Promise<string> {
    try {
      const gmail = await this.ensureInitialized();
      
      // Validate input parameters
      this.validateDownloadParams(params);

      // Get the full message details to find the attachment
      const messageResponse = await gmail.users.messages.get({
        userId: 'me',
        id: params.messageId,
        format: 'full'
      });

      if (!messageResponse.data || !messageResponse.data.payload) {
        throw new GmailError(
          `Message with ID ${params.messageId} not found or has no payload`,
          MCPErrorCode.ValidationError
        );
      }

      // Find the specific attachment part in the message payload using the partId
      const attachmentPart = this.findAttachmentPart(messageResponse.data.payload, params.attachmentId);

      if (!attachmentPart) {
        throw new GmailError(
          `Attachment with Part ID ${params.attachmentId} not found in message ${params.messageId}`,
          MCPErrorCode.ValidationError
        );
      }

      // Check size limit
      const attachmentSize = attachmentPart.body?.size || 0;
      const maxSize = params.maxSizeBytes || 25000000; // 25MB default
      if (attachmentSize > maxSize) {
        throw new GmailError(
          `Attachment size (${attachmentSize} bytes) exceeds maximum allowed size (${maxSize} bytes)`,
          MCPErrorCode.ValidationError
        );
      }

      // The actual attachmentId needed for the API call is in the body of the part
      const realAttachmentId = attachmentPart.body?.attachmentId;

      if (!realAttachmentId) {
        throw new GmailError(
          `Attachment part found, but it does not contain a downloadable attachmentId. It may be an inline attachment.`,
          MCPErrorCode.ValidationError
        );
      }

      // This is a regular attachment with a real ID. Use the attachments API.
      const attachmentResponse = await gmail.users.messages.attachments.get({
        userId: 'me',
        messageId: params.messageId,
        id: realAttachmentId
      });

      if (!attachmentResponse.data || !attachmentResponse.data.data) {
        throw new Error('No attachment data returned from Gmail API');
      }

      // Decode the base64url encoded data
      const base64Data = attachmentResponse.data.data;
      const normalizedBase64 = base64Data
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      
      // Add padding if needed
      let paddedBase64 = normalizedBase64;
      while (paddedBase64.length % 4) {
        paddedBase64 += '=';
      }

      const attachmentBuffer = Buffer.from(paddedBase64, 'base64');

      // Determine output path and filename
      const outputPath = this.validateOutputPath(params.outputPath || process.cwd());
      const filename = this.sanitizeFilename(params.filename || attachmentPart.filename || 'attachment');
      const fullPath = require('path').join(outputPath, filename);

      // Write file to disk
      const fs = require('fs');
      await fs.promises.writeFile(fullPath, attachmentBuffer);

      return fullPath;

    } catch (error) {
      throw this.handleApiError(error, 'download attachment');
    }
  }

  /**
   * Convert Gmail API message to our GmailMessage format
   * @param gmailMessage - Gmail API message object
   * @param maxBodyLength - Maximum length of message body in characters
   * @returns GmailMessage in our format
   */
  private convertToGmailMessage(gmailMessage: gmail_v1.Schema$Message, maxBodyLength?: number): GmailMessage {
    const headers = gmailMessage.payload?.headers || [];
    
    // Extract common headers
    const getHeader = (name: string): string | undefined => {
      const header = headers.find(h => h.name?.toLowerCase() === name.toLowerCase());
      return header?.value || undefined;
    };

    // Extract message body
    let body = this.extractMessageBody(gmailMessage.payload);
    
    // Apply body length limit if specified
    if (maxBodyLength && body.length > maxBodyLength) {
      body = body.substring(0, maxBodyLength) + '...[truncated]';
    }

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
        const base64Data = payload.body.data;
        
        // Gmail API uses base64url encoding, handle both standard and url-safe base64
        let normalizedBase64 = base64Data
          .replace(/-/g, '+')
          .replace(/_/g, '/');
        
        // Add padding if needed
        while (normalizedBase64.length % 4) {
          normalizedBase64 += '=';
        }
        
        const decoded = Buffer.from(normalizedBase64, 'base64').toString('utf-8');
        
        // Clean up HTML if this is an HTML part
        if (payload.mimeType === 'text/html') {
          return this.stripHtmlTags(decoded);
        }
        
        return decoded;
      } catch (error) {
        console.error('Failed to decode message body:', error);
        return '';
      }
    }

    // If this is a multipart message, recursively extract from parts
    if (payload.parts && payload.parts.length > 0) {
      // First, try to find text/plain parts (preferred)
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain') {
          const bodyText = this.extractMessageBody(part);
          if (bodyText.trim()) {
            return bodyText;
          }
        }
      }
      
      // If no text/plain found, try text/html parts
      for (const part of payload.parts) {
        if (part.mimeType === 'text/html') {
          const bodyText = this.extractMessageBody(part);
          if (bodyText.trim()) {
            return bodyText;
          }
        }
      }
      
      // Try multipart/alternative or multipart/related parts
      for (const part of payload.parts) {
        if (part.mimeType?.startsWith('multipart/')) {
          const bodyText = this.extractMessageBody(part);
          if (bodyText.trim()) {
            return bodyText;
          }
        }
      }
      
      // As a last resort, try all parts recursively
      for (const part of payload.parts) {
        const bodyText = this.extractMessageBody(part);
        if (bodyText.trim()) {
          return bodyText;
        }
      }
    }

    return '';
  }

  /**
   * Strip HTML tags and decode HTML entities from text
   * @param html - HTML content to clean
   * @returns Plain text content
   */
  private stripHtmlTags(html: string): string {
    // Remove HTML tags
    let text = html.replace(/<[^>]*>/g, '');
    
    // Decode common HTML entities
    text = text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&hellip;/g, '...');
    
    // Clean up whitespace
    text = text
      .replace(/\s+/g, ' ')
      .trim();
    
    return text;
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
   * @throws {GmailError} If validation fails
   */
  private validateSendMessageParams(params: GmailSendMessageParams): void {
    if (!params.to || params.to.length === 0) {
      throw new GmailError('At least one recipient is required', MCPErrorCode.ValidationError);
    }

    if (!params.subject?.trim()) {
      throw new GmailError('Message subject is required', MCPErrorCode.ValidationError);
    }

    if (!params.body?.trim()) {
      throw new GmailError('Message body is required', MCPErrorCode.ValidationError);
    }

    // Validate all email addresses
    const allEmails = [
      ...params.to,
      ...(params.cc || []),
      ...(params.bcc || [])
    ];

    for (const email of allEmails) {
      if (!this.isValidEmail(email)) {
        throw new GmailError(
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
   * Extract attachments from Gmail message payload recursively
   * @param payload - Gmail message payload
   * @param attachments - Array to collect attachment metadata
   */
  private extractAttachmentsFromPayload(payload: gmail_v1.Schema$MessagePart, attachments: GmailAttachment[]): void {
    if (!payload) {
      return;
    }

    const headers = payload.headers || [];
    const contentDispositionHeader = headers.find(h => h.name?.toLowerCase() === 'content-disposition');
    const isAttachment = contentDispositionHeader?.value?.toLowerCase().startsWith('attachment');

    if (isAttachment && payload.partId && payload.filename && payload.mimeType) {
      attachments.push({
        partId: payload.partId,
        filename: payload.filename,
        mimeType: payload.mimeType,
        size: payload.body?.size || 0,
      });
    }

    // Recursively check parts for nested attachments
    if (payload.parts && payload.parts.length > 0) {
      for (const part of payload.parts) {
        this.extractAttachmentsFromPayload(part, attachments);
      }
    }
  }

  /**
   * Find a specific attachment part in the message payload
   * @param payload - The message payload to search
   * @param attachmentId - The ID of the attachment to find
   * @returns The message part for the attachment, or null if not found
   */
  private findAttachmentPart(payload: gmail_v1.Schema$MessagePart, partId: string): gmail_v1.Schema$MessagePart | null {
    if (payload.partId === partId) {
      return payload;
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        const foundPart = this.findAttachmentPart(part, partId);
        if (foundPart) {
          return foundPart;
        }
      }
    }

    return null;
  }

  /**
   * Validate parameters for downloading attachments
   * @param params - Parameters to validate
   * @throws {GmailError} If validation fails
   */
  private validateDownloadParams(params: GmailDownloadParams): void {
    if (!params.messageId?.trim()) {
      throw new GmailError('Message ID is required', MCPErrorCode.ValidationError);
    }

    if (!params.attachmentId?.trim()) {
      throw new GmailError('Attachment ID is required', MCPErrorCode.ValidationError);
    }

    if (params.maxSizeBytes && (params.maxSizeBytes < 1 || params.maxSizeBytes > 100000000)) {
      throw new GmailError('Max size must be between 1 byte and 100MB', MCPErrorCode.ValidationError);
    }

    if (params.filename && params.filename.length > 255) {
      throw new GmailError('Filename cannot exceed 255 characters', MCPErrorCode.ValidationError);
    }
  }

  /**
   * Validate and resolve output path
   * @param outputPath - Path to validate
   * @returns Resolved and validated path
   * @throws {GmailError} If path is invalid
   */
  private validateOutputPath(outputPath: string): string {
    const path = require('path');
    
    try {
      const resolved = path.resolve(outputPath);
      const cwd = process.cwd();
      
      // Ensure path is within current working directory for security
      if (!resolved.startsWith(cwd)) {
        throw new GmailError(
          'Output path must be within current working directory for security',
          MCPErrorCode.ValidationError
        );
      }
      
      // Check if directory exists, create if it doesn't
      const fs = require('fs');
      if (!fs.existsSync(resolved)) {
        fs.mkdirSync(resolved, { recursive: true });
      }
      
      return resolved;
    } catch (error) {
      if (error instanceof GmailError) {
        throw error;
      }
      throw new GmailError(
        `Invalid output path: ${error instanceof Error ? error.message : 'Unknown error'}`,
        MCPErrorCode.ValidationError
      );
    }
  }

  /**
   * Sanitize filename to prevent security issues
   * @param filename - Original filename
   * @returns Sanitized filename
   */
  private sanitizeFilename(filename: string): string {
    if (!filename) {
      return 'attachment';
    }

    // Remove dangerous characters and patterns
    let sanitized = filename
      .replace(/[<>:"/\\|?*]/g, '_')  // Replace dangerous chars
      .replace(/\.\./g, '_')          // Prevent directory traversal
      .replace(/^\.+/, '')            // Remove leading dots
      .trim();

    // Ensure filename is not empty after sanitization
    if (!sanitized) {
      sanitized = 'attachment';
    }

    // Limit length
    if (sanitized.length > 255) {
      const ext = sanitized.substring(sanitized.lastIndexOf('.'));
      const name = sanitized.substring(0, 255 - ext.length);
      sanitized = name + ext;
    }

    return sanitized;
  }

  /**
   * Handle Gmail API errors and convert to GmailError
   * @param error - The error from the API call
   * @param operation - Description of the operation that failed
   * @returns GmailError with appropriate error code and message
   */
  private handleApiError(error: unknown, operation: string): GmailError {
    console.error(`Gmail API error during ${operation}:`, error);

    if (error instanceof GmailError) {
      return error;
    }

    const err = error as { code?: number | string; message?: string };

    switch (err.code) {
      case 401:
        return new GmailError('Authentication failed. Please re-authenticate.', MCPErrorCode.AuthenticationError);
      case 403:
        return new GmailError('Insufficient permissions for Gmail access.', MCPErrorCode.AuthorizationError);
      case 429:
        return new GmailError('Rate limit exceeded. Please try again later.', MCPErrorCode.RateLimitError);
      case 404:
        return new GmailError(`Gmail resource not found during ${operation}.`, MCPErrorCode.APIError);
      case 400:
        return new GmailError(`Invalid Gmail request for ${operation}: ${err.message}`, MCPErrorCode.ValidationError);
      default:
        return new GmailError(`Failed to ${operation}: ${err.message || 'Unknown error'}`, MCPErrorCode.APIError, { originalError: error });
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
