/**
 * Document Parser Utility - Simple text extraction from PDF and DOCX files
 * 
 * This utility provides basic text extraction capabilities for common document formats.
 * It's designed for small files (receipts, invoices) with robust error handling and
 * timeout protection to prevent crashes in Claude Desktop.
 */

import pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import { setTimeout } from 'timers';

/**
 * Extracted document content interface
 */
export interface DocumentContent {
  text: string;
  wordCount: number;
  extractedFrom: 'pdf' | 'docx' | 'text';
}

/**
 * Document Parser Class
 * 
 * Provides robust text extraction from PDF and DOCX files with timeout protection,
 * memory safety, and comprehensive error handling to prevent Claude Desktop crashes.
 */
export class DocumentParser {
  private readonly PROCESSING_TIMEOUT = 10000; // 10 seconds
  private readonly MAX_TEXT_LENGTH = 50000; // 50KB of text (reduced for Claude Desktop stability)
  private readonly CLAUDE_DESKTOP_SAFE_LIMIT = 30000; // Even safer limit for streaming responses
  
  /**
   * Extract text from PDF buffer with timeout and memory protection
   * @param buffer - PDF file buffer
   * @returns Promise resolving to extracted content
   */
  async extractFromPDF(buffer: Buffer): Promise<DocumentContent> {
    // Pre-flight checks
    this.validateBuffer(buffer, 'PDF');
    
    try {
      // Wrap PDF parsing with timeout protection
      const data = await this.withTimeout(
        pdfParse(buffer, {
          // Limit PDF parsing options to prevent memory issues
          max: 50, // Max pages to process
          version: 'v1.10.100' // Use stable version
        }),
        this.PROCESSING_TIMEOUT,
        'PDF processing timed out - file may be too complex'
      );
      
      const text = this.sanitizeText(data.text);
      
      // Cleanup buffer reference to help GC
      buffer = null as any;
      
      return {
        text,
        wordCount: this.countWords(text),
        extractedFrom: 'pdf'
      };
    } catch (error) {
      // Cleanup on error
      buffer = null as any;
      
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          throw new Error('PDF processing timed out - file may be too large or complex for text extraction');
        }
        if (error.message.includes('memory') || error.message.includes('heap')) {
          throw new Error('PDF file too complex for text extraction - try a simpler PDF');
        }
      }
      
      throw new Error(`Could not extract text from PDF file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text from DOCX buffer with timeout and memory protection
   * @param buffer - DOCX file buffer
   * @returns Promise resolving to extracted content
   */
  async extractFromDOCX(buffer: Buffer): Promise<DocumentContent> {
    // Pre-flight checks
    this.validateBuffer(buffer, 'DOCX');
    
    try {
      // Wrap DOCX parsing with timeout protection
      const result = await this.withTimeout(
        mammoth.extractRawText({ buffer }),
        this.PROCESSING_TIMEOUT,
        'DOCX processing timed out - file may be too complex'
      );
      
      const text = this.sanitizeText(result.value);
      
      // Cleanup buffer reference to help GC
      buffer = null as any;
      
      return {
        text,
        wordCount: this.countWords(text),
        extractedFrom: 'docx'
      };
    } catch (error) {
      // Cleanup on error
      buffer = null as any;
      
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          throw new Error('DOCX processing timed out - file may be too large or complex for text extraction');
        }
        if (error.message.includes('memory') || error.message.includes('heap')) {
          throw new Error('DOCX file too complex for text extraction - try a simpler document');
        }
      }
      
      throw new Error(`Could not extract text from DOCX file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text from any supported document format
   * @param buffer - File buffer
   * @param mimeType - MIME type of the file
   * @returns Promise resolving to extracted content
   */
  async extractFromFile(buffer: Buffer, mimeType: string): Promise<DocumentContent> {
    switch (mimeType) {
      case 'application/pdf':
        return this.extractFromPDF(buffer);
      
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return this.extractFromDOCX(buffer);
      
      default:
        throw new Error(`Unsupported document type: ${mimeType}`);
    }
  }

  /**
   * Check if a MIME type is supported for text extraction
   * @param mimeType - MIME type to check
   * @returns True if supported, false otherwise
   */
  isSupported(mimeType: string): boolean {
    return [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ].includes(mimeType);
  }

  /**
   * Count words in text (simple implementation)
   * @param text - Text to count words in
   * @returns Number of words
   */
  private countWords(text: string): number {
    if (!text.trim()) return 0;
    return text.trim().split(/\s+/).length;
  }

  /**
   * Validate buffer before processing
   * @param buffer - Buffer to validate
   * @param type - File type for error messages
   */
  private validateBuffer(buffer: Buffer, type: string): void {
    if (!buffer || buffer.length === 0) {
      throw new Error(`${type} buffer is empty or invalid`);
    }
    
    // Check for reasonable size limits (1MB for PDFs, 2MB for DOCX)
    const maxSize = type === 'PDF' ? 1048576 : 2097152; // 1MB for PDF, 2MB for DOCX
    if (buffer.length > maxSize) {
      const sizeMB = Math.round(buffer.length / 1024 / 1024);
      const maxMB = Math.round(maxSize / 1024 / 1024);
      throw new Error(`${type} file too large (${sizeMB}MB, max ${maxMB}MB) for text extraction`);
    }
  }

  /**
   * Wrap a promise with timeout protection
   * @param promise - Promise to wrap
   * @param timeoutMs - Timeout in milliseconds
   * @param timeoutMessage - Message for timeout error
   * @returns Promise that rejects on timeout
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Sanitize and limit extracted text with character cleaning for Claude Desktop stability
   * @param text - Raw extracted text
   * @returns Cleaned and limited text safe for JSON streaming
   */
  private sanitizeText(text: string): string {
    if (!text) return '';
    
    try {
      // Step 1: Remove problematic characters that crash Claude Desktop JSON parser
      let cleaned = this.removeProblematicCharacters(text);
      
      // Step 2: Normalize and clean text structure
      cleaned = cleaned
        .trim()
        .replace(/\r\n/g, '\n') // Normalize line endings
        .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines
        .replace(/[ \t]{2,}/g, ' '); // Limit consecutive spaces/tabs but preserve newlines
      
      // Step 3: Validate JSON safety
      cleaned = this.ensureJsonSafety(cleaned);
      
      // Step 4: Apply smart truncation for Claude Desktop stability
      if (cleaned.length > this.CLAUDE_DESKTOP_SAFE_LIMIT) {
        // Try to find a good break point (sentence boundary)
        const truncateAt = this.findSmartBreakpoint(cleaned, this.CLAUDE_DESKTOP_SAFE_LIMIT);
        const truncated = cleaned.substring(0, truncateAt);
        const remainingChars = cleaned.length - truncateAt;
        const remainingWords = Math.round(remainingChars / 5); // Rough word estimate
        
        cleaned = truncated + 
          `\n\n📄 [Document truncated for stability - ${remainingChars} more characters (~${remainingWords} words) available]\n` +
          `💡 For the complete document, try using the web link to view in Google Drive.`;
      } else if (cleaned.length > this.MAX_TEXT_LENGTH) {
        // Fallback truncation
        cleaned = cleaned.substring(0, this.MAX_TEXT_LENGTH) + 
          '\n\n[Text truncated - file too large for complete extraction]';
      }
      
      return cleaned;
      
    } catch (error) {
      // If character cleaning fails, return safe fallback
      console.error('[DocumentParser] Character sanitization failed:', error);
      return '[Document text could not be safely processed for display. Please use the web link to view the document.]';
    }
  }

  /**
   * Remove problematic characters that can crash Claude Desktop's JSON parser
   * @param text - Input text with potential problematic characters
   * @returns Text with problematic characters removed or replaced
   */
  private removeProblematicCharacters(text: string): string {
    return text
      // Remove null bytes (primary cause of Claude Desktop crashes)
      // eslint-disable-next-line no-control-regex
      .replace(/\x00/g, '')
      
      // Remove other control characters that can break JSON
      // eslint-disable-next-line no-control-regex
      .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      
      // Remove zero-width and invisible characters
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-width spaces
      .replace(/[\u2060\u2061\u2062\u2063]/g, '') // Word joiner and invisible operators
      
      // Replace problematic Unicode spaces with regular spaces
      .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
      
      // Remove byte order marks and other problematic Unicode
      .replace(/[\uFFFE\uFFFF]/g, '')
      
      // Normalize Unicode to composed form (NFC) to prevent encoding issues
      .normalize('NFC')
      
      // Handle malformed escape sequences that might appear in PDF text
      .replace(/\\u[0-9a-fA-F]{0,3}(?![0-9a-fA-F])/g, '') // Incomplete unicode escapes
      
      // Remove vertical tabs and form feeds
      .replace(/[\v\f]/g, '\n');
  }

  /**
   * Ensure the text is safe for JSON encoding and Claude Desktop streaming
   * @param text - Pre-cleaned text
   * @returns JSON-safe text
   */
  private ensureJsonSafety(text: string): string {
    try {
      // Test if the text can be safely JSON encoded
      JSON.stringify(text);
      return text;
    } catch {
      // If JSON encoding fails, apply aggressive cleaning
      console.warn('[DocumentParser] Text failed JSON safety check, applying aggressive cleaning');
      
      return text
        // Keep only printable ASCII characters, newlines, and common Unicode
        .replace(/[^\x20-\x7E\n\u00A1-\u00FF\u0100-\u017F\u0180-\u024F]/g, '?')
        
        // Ensure no problematic escape sequences remain
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        
        // Final cleanup
        .trim();
    }
  }

  /**
   * Find a smart breakpoint for text truncation (sentence or paragraph boundary)
   * @param text - Text to analyze
   * @param maxLength - Maximum length to find breakpoint within
   * @returns Position of smart breakpoint
   */
  private findSmartBreakpoint(text: string, maxLength: number): number {
    if (text.length <= maxLength) return text.length;
    
    // Look for sentence endings within the last 500 characters of the limit
    const searchStart = Math.max(0, maxLength - 500);
    const searchText = text.substring(searchStart, maxLength);
    
    // Try to find sentence boundaries (., !, ?)
    const sentenceEnd = searchText.match(/[.!?]\s+/g);
    if (sentenceEnd) {
      const lastSentenceEnd = searchText.lastIndexOf(sentenceEnd[sentenceEnd.length - 1]);
      if (lastSentenceEnd > 0) {
        return searchStart + lastSentenceEnd + sentenceEnd[sentenceEnd.length - 1].length;
      }
    }
    
    // Try to find paragraph boundaries
    const paragraphEnd = searchText.lastIndexOf('\n\n');
    if (paragraphEnd > 0) {
      return searchStart + paragraphEnd + 2;
    }
    
    // Try to find line boundaries
    const lineEnd = searchText.lastIndexOf('\n');
    if (lineEnd > 0) {
      return searchStart + lineEnd + 1;
    }
    
    // Try to find word boundaries
    const wordEnd = searchText.lastIndexOf(' ');
    if (wordEnd > 0) {
      return searchStart + wordEnd + 1;
    }
    
    // Fallback to hard limit
    return maxLength;
  }
}

/**
 * Global document parser instance
 */
let _documentParser: DocumentParser | null = null;

export const documentParser = {
  get instance(): DocumentParser {
    if (!_documentParser) {
      _documentParser = new DocumentParser();
    }
    return _documentParser;
  },
  
  reset(): void {
    _documentParser = null;
  }
};
