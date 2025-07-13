# Gmail Email Screenshot Tool Guide

## Overview

The Gmail Email Screenshot Tool (`gmail_export_email_screenshot`) is a powerful MCP tool that captures Gmail email content as high-quality JPEG screenshots. This tool is perfect for archiving receipts, important email content, and creating visual documentation of email communications.

## Features

- **High-Quality Screenshots**: Captures email content as JPEG images with configurable quality settings
- **Inline Image Support**: Processes and includes inline images from email content
- **CSS Normalization**: Applies proper styling to ensure emails render correctly
- **Flexible Output Options**: Customizable dimensions, quality, and file naming
- **Optimized File Sizes**: JPEG compression reduces file sizes while maintaining visual quality
- **Security**: Validates output paths and restricts file operations to safe directories
- **Error Handling**: Comprehensive error handling with detailed feedback

## Tool Parameters

### Required Parameters

- **`messageId`** (string): Gmail message ID to export as screenshot
  - Must be a valid Gmail message ID format
  - Example: `"18c8f2a1b2c3d4e5"`

### Optional Parameters

- **`outputPath`** (string): Output directory path
  - Default: Current working directory
  - Must be within the current working directory for security
  - Example: `"./screenshots"`

- **`filename`** (string): Custom filename without extension
  - Default: Auto-generated with timestamp (`email_{messageId}_{timestamp}`)
  - Example: `"receipt_amazon_2025"`

- **`width`** (number): Viewport width in pixels
  - Default: 800
  - Range: 400-2000
  - Example: `1200`

- **`height`** (number): Viewport height in pixels
  - Default: Auto (full page height)
  - Range: 300-3000
  - Example: `1000`


- **`includeImages`** (boolean): Include inline images in screenshot
  - Default: `true`
  - Set to `false` to exclude images for faster processing

- **`waitForImages`** (number): Wait time for images to load (milliseconds)
  - Default: 2000
  - Range: 0-10000
  - Example: `3000`

- **`fullPage`** (boolean): Capture full page height instead of viewport
  - Default: `true`
  - Set to `false` to capture only the viewport area

- **`deviceScaleFactor`** (number): Device scale factor for high DPI screenshots
  - Default: 2
  - Range: 1-3
  - Higher values produce sharper images but larger file sizes

- **`quality`** (number): JPEG quality setting
  - Default: 85
  - Range: 50-100
  - Higher values produce better quality but larger file sizes

## Usage Examples

### Basic Usage

```json
{
  "messageId": "18c8f2a1b2c3d4e5"
}
```

### Custom Output Location

```json
{
  "messageId": "18c8f2a1b2c3d4e5",
  "outputPath": "./email_screenshots",
  "filename": "receipt_amazon_jan2025"
}
```

### High-Quality Screenshot

```json
{
  "messageId": "18c8f2a1b2c3d4e5",
  "width": 1200,
  "deviceScaleFactor": 3,
  "waitForImages": 3000
}
```

### Fast Processing (No Images)

```json
{
  "messageId": "18c8f2a1b2c3d4e5",
  "includeImages": false,
  "waitForImages": 0
}
```

### Custom Quality Settings

```json
{
  "messageId": "18c8f2a1b2c3d4e5",
  "quality": 95,
  "filename": "high_quality_email"
}
```

### Optimized for File Size

```json
{
  "messageId": "18c8f2a1b2c3d4e5",
  "quality": 60,
  "deviceScaleFactor": 1,
  "filename": "compressed_email"
}
```

## Output Information

The tool returns detailed information about the captured screenshot:

```json
{
  "filePath": "/path/to/screenshot.jpg",
  "fileSize": 145760,
  "dimensions": {
    "width": 800,
    "height": 1200
  },
  "processingInfo": {
    "hasImages": true,
    "imageCount": 3,
    "warnings": []
  }
}
```

## Common Use Cases

### 1. Receipt Archival
Perfect for capturing purchase receipts from online stores:
```json
{
  "messageId": "receipt_message_id",
  "outputPath": "./receipts",
  "filename": "amazon_receipt_2025_01_13",
  "width": 800
}
```

### 2. Important Email Documentation
Capture important business communications:
```json
{
  "messageId": "important_email_id",
  "outputPath": "./documents",
  "filename": "contract_confirmation",
  "width": 1000,
  "deviceScaleFactor": 2
}
```

### 3. Newsletter Archival
Save newsletters or promotional emails:
```json
{
  "messageId": "newsletter_id",
  "outputPath": "./newsletters",
  "width": 800,
  "includeImages": true,
  "waitForImages": 3000
}
```

## Technical Details

### Dependencies
- **Puppeteer**: Used for browser automation and screenshot capture
- **Gmail API**: Retrieves email content and metadata
- **Email Renderer**: Processes HTML content and handles inline images

### Security Features
- Output path validation (must be within current working directory)
- File size limits for images (5MB per image)
- Input validation using Zod schemas
- Secure browser launch with sandboxing

### Performance Considerations
- Image loading can increase processing time
- Higher quality settings produce larger files
- Full page capture may take longer for very long emails
- Device scale factor affects both quality and file size

## Error Handling

The tool provides detailed error messages for common issues:

- **Invalid Message ID**: Format validation for Gmail message IDs
- **Authentication Required**: Prompts for Google OAuth authentication
- **File System Errors**: Issues with output path or file permissions
- **Network Errors**: Problems retrieving email content
- **Browser Errors**: Issues with Puppeteer screenshot capture

## Best Practices

1. **Set reasonable wait times**: 2-3 seconds for images, 0 for text-only emails
2. **Choose optimal dimensions**: 800px width for most emails, 1200px for wide content
3. **Organize output**: Use descriptive filenames and organized folder structures
4. **Consider file sizes**: Higher device scale factors increase file sizes
5. **Use full page capture**: Keep `fullPage: true` for complete email content

## Troubleshooting

### Common Issues

1. **Authentication Errors**: Ensure Google OAuth is properly configured
2. **File Permission Errors**: Check write permissions for output directory
3. **Large File Sizes**: Reduce device scale factor or image dimensions
4. **Missing Images**: Increase `waitForImages` parameter
5. **Truncated Content**: Ensure `fullPage` is set to `true`

### Performance Tips

- Use `includeImages: false` for faster processing when images aren't needed
- Set `waitForImages: 0` for text-only emails
- Use lower device scale factors for bulk processing
- Consider batch processing for multiple emails

## Integration with Other Tools

The screenshot tool works well with other Gmail tools:

1. **Search Messages**: Find emails to screenshot
2. **List Messages**: Browse available emails
3. **Get Message**: Verify email content before screenshot
4. **Download Attachments**: Save attachments separately

## Future Enhancements

Planned improvements include:
- Batch processing multiple emails
- Custom CSS injection for styling
- Watermarking options
- PDF output format
- Email thread screenshot support
