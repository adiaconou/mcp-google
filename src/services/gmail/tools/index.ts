/**
 * Gmail Tools - Export all Gmail-related MCP tools
 * 
 * This file provides a central export point for all Gmail tools,
 * making it easy to import and register them in the MCP server.
 */

export { gmailListMessagesTool } from './listMessages';     // For browsing and searching
export { gmailGetMessageTool } from './getMessage';
export { gmailDownloadAttachmentTool } from './downloadAttachment'; // For downloading attachments
export { exportEmailScreenshotTool } from './exportEmailScreenshot'; // For capturing email screenshots

// Future Gmail tools will be exported here:
// export { gmailSendMessageTool } from './sendMessage';
// export { gmailExportEmailTool } from './exportEmail';
