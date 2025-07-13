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
  private readonly MAX_TEXT_LENGTH = 500000; // 500KB of text
  
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
   * Sanitize and limit extracted text
   * @param text - Raw extracted text
   * @returns Cleaned and limited text
   */
  private sanitizeText(text: string): string {
    if (!text) return '';
    
    // Clean up the text
    let cleaned = text
      .trim()
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines
      .replace(/[ \t]{2,}/g, ' '); // Limit consecutive spaces/tabs but preserve newlines
    
    // Limit text length to prevent memory issues
    if (cleaned.length > this.MAX_TEXT_LENGTH) {
      cleaned = cleaned.substring(0, this.MAX_TEXT_LENGTH) + '\n\n[Text truncated - file too large for complete extraction]';
    }
    
    return cleaned;
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
