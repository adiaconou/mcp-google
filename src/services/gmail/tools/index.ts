/**
 * Gmail Tools - Export all Gmail-related MCP tools
 * 
 * This file provides a central export point for all Gmail tools,
 * making it easy to import and register them in the MCP server.
 */

export { gmailListMessagesTool } from './listMessages';
export { gmailGetMessageTool } from './getMessage';

// Future Gmail tools will be exported here:
// export { gmailSendMessageTool } from './sendMessage';
// export { gmailSearchMessagesTool } from './searchMessages';
// export { gmailDownloadAttachmentTool } from './downloadAttachment';
// export { gmailExportEmailTool } from './exportEmail';
