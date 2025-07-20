/**
 * Document Parser Unit Tests
 * 
 * Tests for the document parser utility that extracts text from PDF and DOCX files
 * with timeout protection and memory safety features.
 */

// Mock the external libraries at the module level BEFORE any imports
jest.mock('pdf-parse', () => jest.fn());
jest.mock('mammoth', () => ({
  extractRawText: jest.fn()
}));

import { DocumentParser, documentParser } from '../../../src/utils/documentParser';
import pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';

// Create typed mocks
const mockPdfParse = pdfParse as jest.MockedFunction<typeof pdfParse>;
const mockMammoth = mammoth as jest.Mocked<typeof mammoth>;

describe('DocumentParser', () => {
  let parser: DocumentParser;

  beforeEach(() => {
    parser = new DocumentParser();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('PDF extraction with safety features', () => {
    it('should extract text from a simple PDF buffer', async () => {
      // Create a small valid buffer for testing
      const mockPdfBuffer = Buffer.from('test pdf content');
      
      // Mock pdf-parse to return test data
      mockPdfParse.mockResolvedValue({
        text: 'Test PDF content\nWith multiple lines',
        numpages: 1,
        numrender: 1,
        info: {},
        metadata: {},
        version: '1.10.100' as any
      });
      
      const result = await parser.extractFromPDF(mockPdfBuffer);
      
      expect(result.text).toBe('Test PDF content\nWith multiple lines');
      expect(result.wordCount).toBe(6);
      expect(result.extractedFrom).toBe('pdf');
      expect(mockPdfParse).toHaveBeenCalledWith(mockPdfBuffer, {
        max: 50,
        version: 'v1.10.100'
      });
    });

    it('should reject files that are too large', async () => {
      // Create a buffer larger than 1MB
      const largePdfBuffer = Buffer.alloc(1048577); // 1MB + 1 byte
      
      await expect(parser.extractFromPDF(largePdfBuffer)).rejects.toThrow('PDF file too large (1MB, max 1MB) for text extraction');
      
      // Should not call pdf-parse for oversized files
      expect(mockPdfParse).not.toHaveBeenCalled();
    });

    it('should handle timeout errors gracefully', async () => {
      const mockPdfBuffer = Buffer.from('valid pdf content');
      
      // Mock pdf-parse to simulate a timeout
      mockPdfParse.mockRejectedValue(new Error('PDF processing timed out - file may be too complex'));
      
      await expect(parser.extractFromPDF(mockPdfBuffer)).rejects.toThrow('Could not extract text from PDF file: PDF processing timed out - file may be too complex');
    });

    it('should handle memory errors gracefully', async () => {
      const mockPdfBuffer = Buffer.from('valid pdf content');
      
      // Mock pdf-parse to throw a memory error
      mockPdfParse.mockRejectedValue(new Error('JavaScript heap out of memory'));
      
      await expect(parser.extractFromPDF(mockPdfBuffer)).rejects.toThrow('PDF file too complex for text extraction - try a simpler PDF');
    });

    it('should handle general PDF extraction errors', async () => {
      const mockPdfBuffer = Buffer.from('invalid pdf content');
      
      // Mock pdf-parse to throw an error
      mockPdfParse.mockRejectedValue(new Error('Invalid PDF'));
      
      await expect(parser.extractFromPDF(mockPdfBuffer)).rejects.toThrow('Could not extract text from PDF file: Invalid PDF');
    });
  });

  describe('DOCX extraction with safety features', () => {
    it('should extract text from a DOCX buffer', async () => {
      const mockDocxBuffer = Buffer.from('mock docx content');
      
      // Mock mammoth to return test data
      mockMammoth.extractRawText.mockResolvedValue({
        value: 'Test DOCX content\nWith formatting',
        messages: []
      });
      
      const result = await parser.extractFromDOCX(mockDocxBuffer);
      
      expect(result.text).toBe('Test DOCX content\nWith formatting');
      expect(result.wordCount).toBe(5);
      expect(result.extractedFrom).toBe('docx');
      expect(mockMammoth.extractRawText).toHaveBeenCalledWith({ buffer: mockDocxBuffer });
    });

    it('should reject DOCX files that are too large', async () => {
      // Create a buffer larger than 2MB
      const largeDocxBuffer = Buffer.alloc(2097153); // 2MB + 1 byte
      
      await expect(parser.extractFromDOCX(largeDocxBuffer)).rejects.toThrow('DOCX file too large (2MB, max 2MB) for text extraction');
      
      // Should not call mammoth for oversized files
      expect(mockMammoth.extractRawText).not.toHaveBeenCalled();
    });

    it('should handle DOCX timeout errors gracefully', async () => {
      const mockDocxBuffer = Buffer.from('valid docx content');
      
      // Mock mammoth to simulate a timeout
      mockMammoth.extractRawText.mockRejectedValue(new Error('DOCX processing timed out - file may be too complex'));
      
      await expect(parser.extractFromDOCX(mockDocxBuffer)).rejects.toThrow('Could not extract text from DOCX file: DOCX processing timed out - file may be too complex');
    });

    it('should handle DOCX extraction errors gracefully', async () => {
      const mockDocxBuffer = Buffer.from('invalid docx content');
      
      // Mock mammoth to throw an error
      mockMammoth.extractRawText.mockRejectedValue(new Error('Invalid DOCX'));
      
      await expect(parser.extractFromDOCX(mockDocxBuffer)).rejects.toThrow('Could not extract text from DOCX file: Invalid DOCX');
    });
  });

  describe('text sanitization', () => {
    it('should sanitize and limit text properly', () => {
      // Access private method for testing
      const sanitizeText = (parser as any).sanitizeText.bind(parser);
      
      // Test basic cleaning
      expect(sanitizeText('  hello\r\nworld  ')).toBe('hello\nworld');
      expect(sanitizeText('hello\n\n\n\nworld')).toBe('hello\n\nworld');
      expect(sanitizeText('hello    world')).toBe('hello world');
      expect(sanitizeText('hello\t\t\tworld')).toBe('hello world');
      
      // Test text truncation at Claude Desktop safe limit
      const longText = 'a'.repeat(30001);
      const result = sanitizeText(longText);
      expect(result).toContain('[Document truncated for stability'); // Should be truncated
      expect(result).not.toBe(longText); // Should be different from original
      
      // Test fallback truncation at MAX_TEXT_LENGTH (bypassing first limit)
      // We need to test the fallback path directly, so let's create a string between the limits
      const mediumText = 'a'.repeat(40000); // Between 30K and 50K
      const result2 = sanitizeText(mediumText);
      expect(result2).toContain('[Document truncated for stability'); // Should still hit first condition
    });

    it('should remove problematic characters that crash Claude Desktop', () => {
      // Access private method for testing
      const removeProblematicCharacters = (parser as any).removeProblematicCharacters.bind(parser);
      
      // Test null byte removal (primary crash cause)
      expect(removeProblematicCharacters('hello\x00world')).toBe('helloworld');
      
      // Test control character removal
      expect(removeProblematicCharacters('hello\x01\x08world')).toBe('helloworld');
      
      // Test zero-width character removal
      expect(removeProblematicCharacters('hello\u200Bworld')).toBe('helloworld');
      
      // Test Unicode space normalization
      expect(removeProblematicCharacters('hello\u00A0world')).toBe('hello world');
      
      // Test that normal text passes through
      expect(removeProblematicCharacters('Hello, world!')).toBe('Hello, world!');
    });

    it('should ensure JSON safety of text', () => {
      // Access private method for testing
      const ensureJsonSafety = (parser as any).ensureJsonSafety.bind(parser);
      
      // Test that normal text passes JSON safety
      const normalText = 'Hello, world!';
      expect(ensureJsonSafety(normalText)).toBe(normalText);
      
      // Test that the method doesn't crash on edge cases
      expect(() => ensureJsonSafety('normal text')).not.toThrow();
      expect(() => ensureJsonSafety('')).not.toThrow();
      expect(() => ensureJsonSafety('text with "quotes"')).not.toThrow();
    });
  });

  describe('buffer validation', () => {
    it('should validate buffer size and content', () => {
      // Access private method for testing
      const validateBuffer = (parser as any).validateBuffer.bind(parser);
      
      // Test empty buffer
      expect(() => validateBuffer(Buffer.alloc(0), 'PDF')).toThrow('PDF buffer is empty or invalid');
      expect(() => validateBuffer(null, 'PDF')).toThrow('PDF buffer is empty or invalid');
      
      // Test size limits
      const largePdfBuffer = Buffer.alloc(1048577); // 1MB + 1 byte
      expect(() => validateBuffer(largePdfBuffer, 'PDF')).toThrow('PDF file too large (1MB, max 1MB) for text extraction');
      
      const largeDocxBuffer = Buffer.alloc(2097153); // 2MB + 1 byte
      expect(() => validateBuffer(largeDocxBuffer, 'DOCX')).toThrow('DOCX file too large (2MB, max 2MB) for text extraction');
    });
  });

  describe('extractFromFile', () => {
    it('should route to PDF extraction for PDF mime type', async () => {
      const mockBuffer = Buffer.from('test');
      const mockResult = { text: 'test', wordCount: 1, extractedFrom: 'pdf' as const };
      
      const extractFromPDFSpy = jest.spyOn(parser, 'extractFromPDF').mockResolvedValue(mockResult);
      
      const result = await parser.extractFromFile(mockBuffer, 'application/pdf');
      
      expect(extractFromPDFSpy).toHaveBeenCalledWith(mockBuffer);
      expect(result).toBe(mockResult);
      
      extractFromPDFSpy.mockRestore();
    });

    it('should route to DOCX extraction for DOCX mime type', async () => {
      const mockBuffer = Buffer.from('test');
      const mockResult = { text: 'test', wordCount: 1, extractedFrom: 'docx' as const };
      
      const extractFromDOCXSpy = jest.spyOn(parser, 'extractFromDOCX').mockResolvedValue(mockResult);
      
      const result = await parser.extractFromFile(mockBuffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      
      expect(extractFromDOCXSpy).toHaveBeenCalledWith(mockBuffer);
      expect(result).toBe(mockResult);
      
      extractFromDOCXSpy.mockRestore();
    });

    it('should throw error for unsupported mime types', async () => {
      const mockBuffer = Buffer.from('test');
      
      await expect(parser.extractFromFile(mockBuffer, 'application/unsupported')).rejects.toThrow('Unsupported document type: application/unsupported');
    });
  });

  describe('isSupported', () => {
    it('should return true for supported mime types', () => {
      expect(parser.isSupported('application/pdf')).toBe(true);
      expect(parser.isSupported('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(true);
    });

    it('should return false for unsupported mime types', () => {
      expect(parser.isSupported('text/plain')).toBe(false);
      expect(parser.isSupported('application/json')).toBe(false);
      expect(parser.isSupported('image/jpeg')).toBe(false);
    });
  });

  describe('word counting', () => {
    it('should count words correctly', () => {
      // Access private method for testing
      const countWords = (parser as any).countWords.bind(parser);
      
      expect(countWords('')).toBe(0);
      expect(countWords('   ')).toBe(0);
      expect(countWords('hello')).toBe(1);
      expect(countWords('hello world')).toBe(2);
      expect(countWords('  hello   world  ')).toBe(2);
      expect(countWords('hello\nworld\ttest')).toBe(3);
    });
  });

  describe('documentParser singleton', () => {
    it('should return the same instance', () => {
      const instance1 = documentParser.instance;
      const instance2 = documentParser.instance;
      
      expect(instance1).toBe(instance2);
    });

    it('should reset the instance', () => {
      const instance1 = documentParser.instance;
      documentParser.reset();
      const instance2 = documentParser.instance;
      
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('timeout protection', () => {
    it('should handle timeout in withTimeout method', async () => {
      // Access private method for testing
      const withTimeout = (parser as any).withTimeout.bind(parser);
      
      // Create a promise that takes longer than the timeout
      const slowPromise = new Promise(resolve => setTimeout(resolve, 100));
      
      await expect(withTimeout(slowPromise, 50, 'Test timeout')).rejects.toThrow('Test timeout');
    });

    it('should resolve normally when promise completes within timeout', async () => {
      // Access private method for testing
      const withTimeout = (parser as any).withTimeout.bind(parser);
      
      // Create a promise that completes quickly
      const fastPromise = Promise.resolve('success');
      
      const result = await withTimeout(fastPromise, 100, 'Test timeout');
      expect(result).toBe('success');
    });
  });
});
