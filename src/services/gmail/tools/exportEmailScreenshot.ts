/**
 * Gmail Export Email Screenshot Tool - MCP tool for capturing email content as JPEG screenshots
 * 
 * This tool processes Gmail email HTML content and captures it as a high-quality JPEG screenshot
 * using Puppeteer. It handles inline images, applies CSS normalization, and provides
 * configurable output options for different use cases.
 */

import { z } from 'zod';
import puppeteer from 'puppeteer';
import { emailRenderer } from '../emailRenderer';
import { GmailError, MCPErrorCode } from '../../../types/mcp';

/**
 * Input schema for the export email screenshot tool
 */
const ExportEmailScreenshotSchema = z.object({
  messageId: z.string().min(1, 'Message ID is required'),
  outputPath: z.string().optional().describe('Output directory path (default: current directory)'),
  filename: z.string().optional().describe('Custom filename without extension (default: auto-generated)'),
  width: z.number().int().min(400).max(2000).optional().describe('Viewport width in pixels (default: 800)'),
  height: z.number().int().min(300).max(3000).optional().describe('Viewport height in pixels (default: auto)'),
  includeImages: z.boolean().optional().describe('Include inline images (default: true)'),
  waitForImages: z.number().int().min(0).max(10000).optional().describe('Wait time for images to load in ms (default: 2000)'),
  fullPage: z.boolean().optional().describe('Capture full page height (default: true)'),
  deviceScaleFactor: z.number().min(1).max(3).optional().describe('Device scale factor for high DPI (default: 2)'),
  quality: z.number().int().min(50).max(100).optional().describe('JPEG quality (50-100, default: 85)')
});

type ExportEmailScreenshotInput = z.infer<typeof ExportEmailScreenshotSchema>;

/**
 * Screenshot capture result
 */
interface ScreenshotResult {
  filePath: string;
  fileSize: number;
  dimensions: {
    width: number;
    height: number;
  };
  processingInfo: {
    hasImages: boolean;
    imageCount: number;
    warnings: string[];
  };
}

/**
 * Export Gmail email content as a JPEG screenshot
 * 
 * This tool processes the HTML content of a Gmail message and captures it as a screenshot
 * using Puppeteer. It handles inline images, applies CSS normalization, and provides
 * high-quality JPEG output suitable for archiving email receipts and important content.
 * 
 * @param input - Screenshot parameters
 * @returns Screenshot capture result with file path and metadata
 */
export async function exportEmailScreenshot(input: ExportEmailScreenshotInput): Promise<ScreenshotResult> {
  try {
    // Validate input parameters
    const validatedInput = ExportEmailScreenshotSchema.parse(input);
    
    // Set default values
    const options = {
      outputPath: validatedInput.outputPath || process.cwd(),
      filename: validatedInput.filename,
      width: validatedInput.width || 800,
      height: validatedInput.height,
      includeImages: validatedInput.includeImages ?? true,
      waitForImages: validatedInput.waitForImages || 2000,
      fullPage: validatedInput.fullPage ?? true,
      deviceScaleFactor: validatedInput.deviceScaleFactor || 2,
      quality: validatedInput.quality || 85
    };

    // Validate message ID format (basic Gmail message ID validation)
    if (!/^[a-zA-Z0-9_-]+$/.test(validatedInput.messageId)) {
      throw new GmailError(
        'Invalid Gmail message ID format',
        MCPErrorCode.ValidationError
      );
    }

    // Process the email content for rendering
    const processedContent = await emailRenderer.instance.processEmailForScreenshot(
      validatedInput.messageId,
      {
        includeImages: options.includeImages,
        maxImageSize: 5 * 1024 * 1024, // 5MB max per image
        cssNormalization: true,
        preserveFormatting: true
      }
    );

    // Generate output filename if not provided
    const outputFilename = options.filename 
      ? `${options.filename}.jpg`
      : `email_${validatedInput.messageId}_${Date.now()}.jpg`;

    // Validate and prepare output path
    const outputPath = await validateOutputPath(options.outputPath);
    const fullOutputPath = require('path').join(outputPath, outputFilename);

    // Launch Puppeteer and capture screenshot
    const screenshotOptions = {
      width: options.width,
      waitForImages: options.waitForImages,
      fullPage: options.fullPage,
      deviceScaleFactor: options.deviceScaleFactor,
      quality: options.quality,
      ...(options.height && { height: options.height })
    };
    
    const screenshotInfo = await captureScreenshot(
      processedContent.html,
      fullOutputPath,
      screenshotOptions
    );

    // Get file size
    const fs = require('fs');
    const stats = await fs.promises.stat(fullOutputPath);

    return {
      filePath: fullOutputPath,
      fileSize: stats.size,
      dimensions: screenshotInfo.dimensions,
      processingInfo: {
        hasImages: processedContent.hasImages,
        imageCount: processedContent.imageCount,
        warnings: processedContent.warnings
      }
    };

  } catch (error) {
    if (error instanceof GmailError) {
      throw error;
    }
    if (error instanceof z.ZodError) {
      throw new GmailError(
        `Invalid input parameters: ${error.errors.map(e => e.message).join(', ')}`,
        MCPErrorCode.ValidationError
      );
    }
    throw new GmailError(
      `Failed to export email screenshot: ${error instanceof Error ? error.message : 'Unknown error'}`,
      MCPErrorCode.InternalError
    );
  }
}

/**
 * Capture screenshot using Puppeteer
 */
async function captureScreenshot(
  html: string,
  outputPath: string,
  options: {
    width: number;
    height?: number;
    waitForImages: number;
    fullPage: boolean;
    deviceScaleFactor: number;
    quality: number;
  }
): Promise<{ dimensions: { width: number; height: number } }> {
  let browser;
  
  try {
    // Launch Puppeteer browser
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();

    // Set viewport
    await page.setViewport({
      width: options.width,
      height: options.height || 600,
      deviceScaleFactor: options.deviceScaleFactor
    });

    // Set content and wait for it to load
    await page.setContent(html, {
      waitUntil: ['networkidle0', 'domcontentloaded']
    });

    // Wait for images to load if specified
    if (options.waitForImages > 0) {
      // eslint-disable-next-line no-undef
      await new Promise(resolve => setTimeout(resolve, options.waitForImages));
      
      // Wait for all images to load
      await page.evaluate(() => {
        // eslint-disable-next-line no-undef
        const images = Array.from(document.images) as HTMLImageElement[];
        return Promise.all(
          images
            .filter(img => !img.complete)
            .map(img => new Promise<void>(resolve => {
              img.onload = img.onerror = () => resolve();
            }))
        );
      });
    }

    // Get page dimensions for full page capture
    let screenshotOptions: any = {
      path: outputPath,
      type: 'jpeg',
      quality: options.quality
    };

    if (options.fullPage) {
      screenshotOptions.fullPage = true;
    } else {
      screenshotOptions.clip = {
        x: 0,
        y: 0,
        width: options.width,
        height: options.height || 600
      };
    }

    // Capture screenshot
    await page.screenshot(screenshotOptions);

    // Get actual dimensions
    const dimensions = await page.evaluate(() => {
      return {
        // eslint-disable-next-line no-undef
        width: document.documentElement.scrollWidth,
        // eslint-disable-next-line no-undef
        height: document.documentElement.scrollHeight
      };
    });

    return { dimensions };

  } catch (error) {
    throw new GmailError(
      `Failed to capture screenshot: ${error instanceof Error ? error.message : 'Unknown error'}`,
      MCPErrorCode.InternalError
    );
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Validate and prepare output path
 */
async function validateOutputPath(outputPath: string): Promise<string> {
  const path = require('path');
  const fs = require('fs');
  
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
    if (!fs.existsSync(resolved)) {
      await fs.promises.mkdir(resolved, { recursive: true });
    }
    
    // Check if path is writable
    await fs.promises.access(resolved, fs.constants.W_OK);
    
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
 * MCP Tool Definition for Gmail Export Email Screenshot
 */
export const exportEmailScreenshotTool = {
  name: 'gmail_export_email_screenshot',
  description: 'Export Gmail email content as a JPEG screenshot. Processes email HTML content including inline images and captures it as a high-quality, compressed screenshot suitable for archiving receipts and important email content.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      messageId: {
        type: 'string',
        description: 'Gmail message ID to export as screenshot'
      },
      outputPath: {
        type: 'string',
        description: 'Output directory path (default: current directory)'
      },
      filename: {
        type: 'string',
        description: 'Custom filename without extension (default: auto-generated with timestamp)'
      },
      width: {
        type: 'number',
        description: 'Viewport width in pixels (default: 800, range: 400-2000)',
        minimum: 400,
        maximum: 2000
      },
      height: {
        type: 'number',
        description: 'Viewport height in pixels (default: auto, range: 300-3000)',
        minimum: 300,
        maximum: 3000
      },
      includeImages: {
        type: 'boolean',
        description: 'Include inline images in screenshot (default: true)'
      },
      waitForImages: {
        type: 'number',
        description: 'Wait time for images to load in milliseconds (default: 2000, range: 0-10000)',
        minimum: 0,
        maximum: 10000
      },
      fullPage: {
        type: 'boolean',
        description: 'Capture full page height instead of viewport (default: true)'
      },
      deviceScaleFactor: {
        type: 'number',
        description: 'Device scale factor for high DPI screenshots (default: 2, range: 1-3)',
        minimum: 1,
        maximum: 3
      },
      quality: {
        type: 'number',
        description: 'JPEG quality (default: 85, range: 50-100)',
        minimum: 50,
        maximum: 100
      }
    },
    required: ['messageId']
  },
  handler: async (args: any) => {
    const result = await exportEmailScreenshot(args);
    return {
      content: [
        {
          type: 'text' as const,
          text: `📸 Email Screenshot Captured Successfully!

**File Details:**
- 📁 Path: ${result.filePath}
- 📏 Size: ${Math.round(result.fileSize / 1024)} KB
- 🖼️ Dimensions: ${result.dimensions.width} × ${result.dimensions.height} pixels

**Processing Info:**
- 🖼️ Images: ${result.processingInfo.hasImages ? `${result.processingInfo.imageCount} images included` : 'No images'}
${result.processingInfo.warnings.length > 0 ? `- ⚠️ Warnings: ${result.processingInfo.warnings.join(', ')}` : ''}

The email content has been captured as a high-quality JPEG screenshot and saved to your specified location.`
        }
      ],
      isError: false
    };
  }
};
