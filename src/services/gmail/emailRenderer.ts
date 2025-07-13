/**
 * Email HTML Renderer - Processes Gmail HTML content for screenshot capture
 * 
 * This module handles the complex task of converting Gmail's HTML email content
 * into a clean, standalone HTML document suitable for screenshot generation.
 * It processes inline images, applies CSS normalization, and handles Gmail-specific
 * HTML structures.
 */

import { gmail_v1 } from 'googleapis';
import { gmailClient } from './gmailClient';
import { GmailError, MCPErrorCode } from '../../types/mcp';

/**
 * Configuration options for email rendering
 */
export interface EmailRenderOptions {
  includeImages?: boolean;     // Whether to embed inline images (default: true)
  maxImageSize?: number;       // Maximum size for embedded images in bytes (default: 5MB)
  cssNormalization?: boolean;  // Apply CSS normalization (default: true)
  preserveFormatting?: boolean; // Preserve original Gmail formatting (default: true)
}

/**
 * Processed email content ready for rendering
 */
export interface ProcessedEmailContent {
  html: string;               // Complete HTML document
  hasImages: boolean;         // Whether the email contains images
  imageCount: number;         // Number of images processed
  warnings: string[];         // Any processing warnings
}

/**
 * Email HTML Renderer
 * 
 * Converts Gmail message content into clean, standalone HTML suitable
 * for screenshot generation with Puppeteer.
 */
export class EmailRenderer {
  
  /**
   * Process a Gmail message into renderable HTML
   * @param messageId - Gmail message ID
   * @param options - Rendering options
   * @returns Processed email content ready for screenshot
   */
  async processEmailForScreenshot(
    messageId: string, 
    options: EmailRenderOptions = {}
  ): Promise<ProcessedEmailContent> {
    try {
      // Set default options
      const opts = {
        includeImages: options.includeImages ?? true,
        maxImageSize: options.maxImageSize ?? 5 * 1024 * 1024, // 5MB
        cssNormalization: options.cssNormalization ?? true,
        preserveFormatting: options.preserveFormatting ?? true
      };

      // Get the full Gmail message
      const message = await gmailClient.instance.getMessage(messageId);
      
      if (!message.body) {
        throw new GmailError(
          'Email message has no body content',
          MCPErrorCode.ValidationError
        );
      }

      // Get the raw Gmail message for HTML extraction
      const rawMessage = await this.getRawGmailMessage(messageId);
      
      // Extract HTML content from the message
      const htmlContent = this.extractHtmlContent(rawMessage);
      
      if (!htmlContent) {
        // Fallback to plain text if no HTML found
        const plainTextHtml = this.convertPlainTextToHtml(message.body);
        return {
          html: this.createStandaloneHtml(plainTextHtml),
          hasImages: false,
          imageCount: 0,
          warnings: ['Email contains only plain text, converted to HTML']
        };
      }

      // Process inline images if enabled
      let processedHtml = htmlContent;
      let imageCount = 0;
      const warnings: string[] = [];

      if (opts.includeImages) {
        const imageResult = await this.processInlineImages(messageId, processedHtml, opts.maxImageSize);
        processedHtml = imageResult.html;
        imageCount = imageResult.imageCount;
        warnings.push(...imageResult.warnings);
      }

      // Apply CSS normalization if enabled
      if (opts.cssNormalization) {
        processedHtml = this.applyCssNormalization(processedHtml);
      }

      // Create complete standalone HTML document
      const finalHtml = this.createStandaloneHtml(processedHtml);

      return {
        html: finalHtml,
        hasImages: imageCount > 0,
        imageCount,
        warnings
      };

    } catch (error) {
      if (error instanceof GmailError) {
        throw error;
      }
      throw new GmailError(
        `Failed to process email for screenshot: ${error instanceof Error ? error.message : 'Unknown error'}`,
        MCPErrorCode.InternalError
      );
    }
  }

  /**
   * Get raw Gmail message with full format for HTML extraction
   */
  private async getRawGmailMessage(messageId: string): Promise<gmail_v1.Schema$Message> {
    try {
      // We need to access the Gmail API directly to get the raw message
      // This is a bit of a hack since we need to access the private gmail instance
      const gmail = (gmailClient.instance as any).gmail;
      
      if (!gmail) {
        throw new Error('Gmail client not initialized');
      }

      const response = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      return response.data;
    } catch (error) {
      throw new GmailError(
        `Failed to get raw Gmail message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        MCPErrorCode.APIError
      );
    }
  }

  /**
   * Extract HTML content from Gmail message payload
   */
  private extractHtmlContent(message: gmail_v1.Schema$Message): string | null {
    if (!message.payload) {
      return null;
    }

    return this.extractHtmlFromPayload(message.payload);
  }

  /**
   * Recursively extract HTML content from message payload
   */
  private extractHtmlFromPayload(payload: gmail_v1.Schema$MessagePart): string | null {
    // Check if this part is HTML content
    if (payload.mimeType === 'text/html' && payload.body?.data) {
      return this.decodeBase64Content(payload.body.data);
    }

    // Check multipart content
    if (payload.parts && payload.parts.length > 0) {
      // First, look for text/html parts
      for (const part of payload.parts) {
        if (part.mimeType === 'text/html') {
          const html = this.extractHtmlFromPayload(part);
          if (html) {
            return html;
          }
        }
      }

      // Then check multipart/alternative or multipart/related
      for (const part of payload.parts) {
        if (part.mimeType?.startsWith('multipart/')) {
          const html = this.extractHtmlFromPayload(part);
          if (html) {
            return html;
          }
        }
      }
    }

    return null;
  }

  /**
   * Decode base64url content from Gmail API
   */
  private decodeBase64Content(base64Data: string): string {
    try {
      // Gmail API uses base64url encoding
      let normalizedBase64 = base64Data
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      
      // Add padding if needed
      while (normalizedBase64.length % 4) {
        normalizedBase64 += '=';
      }
      
      return Buffer.from(normalizedBase64, 'base64').toString('utf-8');
    } catch {
      throw new GmailError(
        'Failed to decode email content',
        MCPErrorCode.InternalError
      );
    }
  }

  /**
   * Convert plain text to HTML for rendering
   */
  private convertPlainTextToHtml(plainText: string): string {
    return plainText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')
      .replace(/ {2}/g, '&nbsp;&nbsp;');
  }

  /**
   * Process inline images in HTML content
   */
  private async processInlineImages(
    messageId: string, 
    html: string, 
    maxImageSize: number
  ): Promise<{ html: string; imageCount: number; warnings: string[] }> {
    const warnings: string[] = [];
    let imageCount = 0;
    let processedHtml = html;

    try {
      // Get attachment metadata to find inline images
      const attachments = await gmailClient.instance.getAttachmentMetadata(messageId);
      
      // Find image attachments
      const imageAttachments = attachments.filter(att => 
        att.mimeType.startsWith('image/') && att.size <= maxImageSize
      );

      // Process each image attachment
      for (const attachment of imageAttachments) {
        try {
          // Check if this image is referenced in the HTML (cid: references)
          const cidPattern = new RegExp(`cid:${attachment.partId}`, 'gi');
          const srcPattern = new RegExp(`src=["']cid:${attachment.partId}["']`, 'gi');
          
          if (cidPattern.test(processedHtml) || srcPattern.test(processedHtml)) {
            // Download the attachment
            const tempPath = await gmailClient.instance.downloadAttachment({
              messageId,
              attachmentId: attachment.partId,
              outputPath: process.cwd(),
              filename: `temp_${attachment.partId}_${attachment.filename}`
            });

            // Convert to base64 data URL
            const fs = require('fs');
            const imageBuffer = await fs.promises.readFile(tempPath);
            const base64Data = imageBuffer.toString('base64');
            const dataUrl = `data:${attachment.mimeType};base64,${base64Data}`;

            // Replace CID references with data URL
            processedHtml = processedHtml.replace(
              new RegExp(`cid:${attachment.partId}`, 'gi'),
              dataUrl
            );

            imageCount++;

            // Clean up temp file
            await fs.promises.unlink(tempPath).catch(() => {
              // Ignore cleanup errors
            });
          }
        } catch (error) {
          warnings.push(`Failed to process image ${attachment.filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Also handle any remaining img tags with src attributes that might be external
      const imgTagPattern = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
      const matches = processedHtml.match(imgTagPattern);
      
      if (matches) {
        for (const match of matches) {
          const srcMatch = match.match(/src=["']([^"']+)["']/);
          if (srcMatch && srcMatch[1] && !srcMatch[1].startsWith('data:') && !srcMatch[1].startsWith('cid:')) {
            // This is an external image - we'll leave it as is but add a warning
            warnings.push(`External image found: ${srcMatch[1]} - may not load in screenshot`);
          }
        }
      }

    } catch (error) {
      warnings.push(`Failed to process inline images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { html: processedHtml, imageCount, warnings };
  }

  /**
   * Apply CSS normalization for consistent rendering
   */
  private applyCssNormalization(html: string): string {
    // Add CSS reset and normalization styles
    const normalizationCss = `
      <style>
        /* CSS Reset and Normalization for Email Rendering */
        * {
          box-sizing: border-box;
        }
        
        body {
          margin: 0;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          font-size: 14px;
          line-height: 1.6;
          color: #333;
          background-color: #fff;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        
        /* Ensure images are responsive */
        img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 10px 0;
        }
        
        /* Table styling for email layouts */
        table {
          border-collapse: collapse;
          width: 100%;
          margin: 10px 0;
        }
        
        td, th {
          padding: 8px;
          text-align: left;
          vertical-align: top;
        }
        
        /* Link styling */
        a {
          color: #1a73e8;
          text-decoration: none;
        }
        
        a:hover {
          text-decoration: underline;
        }
        
        /* Preserve Gmail-specific formatting */
        .gmail_quote {
          margin: 20px 0;
          padding-left: 20px;
          border-left: 3px solid #ccc;
          color: #666;
        }
        
        /* Handle quoted text */
        blockquote {
          margin: 20px 0;
          padding-left: 20px;
          border-left: 3px solid #ccc;
          color: #666;
        }
        
        /* Ensure proper spacing */
        p {
          margin: 10px 0;
        }
        
        /* Handle pre-formatted text */
        pre {
          white-space: pre-wrap;
          font-family: monospace;
          background-color: #f5f5f5;
          padding: 10px;
          border-radius: 4px;
          overflow-x: auto;
        }
      </style>
    `;

    // Insert the CSS into the HTML head, or create a head if it doesn't exist
    if (html.includes('<head>')) {
      return html.replace('<head>', `<head>${normalizationCss}`);
    } else if (html.includes('<html>')) {
      return html.replace('<html>', `<html><head>${normalizationCss}</head>`);
    } else {
      // No proper HTML structure, wrap the content
      return `<html><head>${normalizationCss}</head><body>${html}</body></html>`;
    }
  }

  /**
   * Create a complete standalone HTML document
   */
  private createStandaloneHtml(content: string): string {
    // Check if we already have a complete HTML document
    if (content.includes('<!DOCTYPE') || content.includes('<html>')) {
      return content;
    }

    // Create a complete HTML document
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Content</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #333;
      background-color: #fff;
      max-width: 800px;
      margin: 0 auto;
    }
    
    img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 10px 0;
    }
    
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 10px 0;
    }
    
    td, th {
      padding: 8px;
      text-align: left;
      vertical-align: top;
    }
    
    a {
      color: #1a73e8;
      text-decoration: none;
    }
    
    a:hover {
      text-decoration: underline;
    }
    
    .gmail_quote {
      margin: 20px 0;
      padding-left: 20px;
      border-left: 3px solid #ccc;
      color: #666;
    }
    
    blockquote {
      margin: 20px 0;
      padding-left: 20px;
      border-left: 3px solid #ccc;
      color: #666;
    }
    
    p {
      margin: 10px 0;
    }
    
    pre {
      white-space: pre-wrap;
      font-family: monospace;
      background-color: #f5f5f5;
      padding: 10px;
      border-radius: 4px;
      overflow-x: auto;
    }
  </style>
</head>
<body>
  ${content}
</body>
</html>`;
  }
}

/**
 * Global email renderer instance
 */
let _emailRenderer: EmailRenderer | null = null;

export const emailRenderer = {
  get instance(): EmailRenderer {
    if (!_emailRenderer) {
      _emailRenderer = new EmailRenderer();
    }
    return _emailRenderer;
  },
  
  reset(): void {
    _emailRenderer = null;
  }
};
