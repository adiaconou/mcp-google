# Phase 3: Gmail API Integration

## Overview
Add comprehensive Gmail functionality to the MCP server, building on the patterns established in Phase 2. This phase delivers essential email management tools that enable AI agents to read, send, and organize Gmail messages while maintaining security and user privacy.

## Human Prerequisites
Before starting Phase 3 implementation, the user must complete these setup tasks:

### 1. Enable Gmail API
- Go to Google Cloud Console (same project from Phase 2)
- Navigate to "APIs & Services" > "Library"
- Search for and enable "Gmail API"
- Verify the API is enabled in the project

### 2. Update OAuth Scopes
- No additional OAuth credential changes needed
- The existing OAuth setup will be extended to request Gmail scopes
- User will need to re-authorize to grant Gmail permissions during first use

### 3. Test Gmail Account
- Ensure the Google account has Gmail access
- Send yourself a test email for testing list functionality
- Create a few labels for testing label management
- Note any important emails to avoid during testing

### 4. Optional: Create Test Labels
- Create test labels in Gmail (e.g., "MCP-Test", "AI-Processed")
- These will be useful for testing label management tools

## Objectives
- Extend OAuth manager to include Gmail scopes
- Create Gmail API client with message and label operations
- Implement core Gmail tools: list, read, send, and search messages
- Add label management capabilities
- Maintain security with minimal required scopes
- Establish patterns for additional Google API integrations

## Implementation Steps
1. ☐ Extend OAuth manager to support Gmail scopes (simple scope addition)
2. ☐ Create Gmail API client following calendar client patterns
3. ☐ Create `gmail_list_messages` tool with filtering
4. ☐ Implement `gmail_get_message` tool for reading emails
5. ☐ Create `gmail_send_message` tool for sending emails
6. ☐ Implement `gmail_search_messages` tool with query support
7. ☐ Add `gmail_download_attachment` tool for downloading attachments
8. ☐ Add `gmail_export_email` tool for exporting complete emails
9. ☐ Register Gmail tools with the MCP server
10. ☐ Extend existing error handling for Gmail operations
11. ☐ Add integration tests for Gmail functionality
12. ☐ Test Gmail tools with Claude Desktop

## Implementation Plan

### Step 1: Extend OAuth Manager for Gmail (Simple Scope Addition)
**Files**: `src/auth/oauthManager.ts` (enhancement)
- Add Gmail scopes to existing scopes array in `loadConfig()`:
  - `https://www.googleapis.com/auth/gmail.readonly` (for reading)
  - `https://www.googleapis.com/auth/gmail.send` (for sending)
  - `https://www.googleapis.com/auth/gmail.labels` (for label management)
- No complex multi-service architecture needed - just extend existing pattern

### Step 2: Create Gmail API Client Following Calendar Patterns
**Files**: `src/services/gmail/gmailClient.ts`
- Create GmailClient class following CalendarClient structure exactly
- Add authentication integration with OAuth manager (same pattern)
- Implement message listing with pagination and filtering
- Add message retrieval with content parsing (integrated in client)
- Create message sending with attachment support
- Add label listing operations
- Include error handling using existing `handleApiError` pattern

**Enhanced Gmail Client Methods for Download/Export**:
- `downloadAttachment(messageId, attachmentId, outputPath)`: Use Gmail API's `attachments.get` endpoint with base64 decoding
- `exportMessage(messageId, format, includeAttachments)`: Use Gmail API's `messages.get` with format='raw' for complete email export
- `getAttachmentMetadata(messageId)`: Extract attachment info (IDs, filenames, sizes, MIME types)
- File system security: path validation, filename sanitization, size limits, disk space checks

### Step 3: Create Gmail List Messages Tool
**Files**: `src/services/gmail/tools/listMessages.ts`
- Implement `gmail_list_messages` MCP tool
- Add filtering by labels, date range, and sender
- Support pagination for large message lists
- Return formatted message summaries
- Include thread grouping options

**Tool Schema**:
```typescript
{
  name: "gmail_list_messages",
  description: "List Gmail messages with optional filtering",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Gmail search query" },
      labelIds: { type: "array", items: { type: "string" } },
      maxResults: { type: "number", default: 10, maximum: 100 },
      pageToken: { type: "string", description: "Pagination token" },
      includeSpamTrash: { type: "boolean", default: false }
    }
  }
}
```

### Step 4: Implement Gmail Get Message Tool
**Files**: `src/services/gmail/tools/getMessage.ts`
- Create `gmail_get_message` MCP tool
- Add message ID validation and retrieval
- Parse and format message content (text and HTML)
- Extract attachment information
- Include thread context when relevant
- Add privacy controls for sensitive content

**Tool Schema**:
```typescript
{
  name: "gmail_get_message",
  description: "Get detailed Gmail message content",
  inputSchema: {
    type: "object",
    required: ["messageId"],
    properties: {
      messageId: { type: "string" },
      format: { 
        type: "string", 
        enum: ["minimal", "full", "raw", "metadata"],
        default: "full"
      },
      includeAttachments: { type: "boolean", default: false }
    }
  }
}
```

### Step 5: Create Gmail Send Message Tool
**Files**: `src/services/gmail/tools/sendMessage.ts`
- Implement `gmail_send_message` MCP tool
- Add comprehensive input validation for email fields
- Support both plain text and HTML content
- Include reply and forward functionality
- Add basic attachment support (file paths)
- Implement draft saving option

**Tool Schema**:
```typescript
{
  name: "gmail_send_message",
  description: "Send a Gmail message",
  inputSchema: {
    type: "object",
    required: ["to", "subject"],
    properties: {
      to: { type: "array", items: { type: "string", format: "email" } },
      cc: { type: "array", items: { type: "string", format: "email" } },
      bcc: { type: "array", items: { type: "string", format: "email" } },
      subject: { type: "string" },
      body: { type: "string" },
      isHtml: { type: "boolean", default: false },
      replyToMessageId: { type: "string" },
      attachments: { type: "array", items: { type: "string" } }
    }
  }
}
```

### Step 6: Implement Gmail Search Messages Tool
**Files**: `src/services/gmail/tools/searchMessages.ts`
- Create `gmail_search_messages` MCP tool
- Support Gmail's advanced search syntax
- Add common search patterns (from, to, subject, date ranges)
- Include search result ranking and relevance
- Support saved search queries
- Add search history and suggestions

**Tool Schema**:
```typescript
{
  name: "gmail_search_messages",
  description: "Search Gmail messages using Gmail query syntax",
  inputSchema: {
    type: "object",
    required: ["query"],
    properties: {
      query: { 
        type: "string",
        description: "Gmail search query (e.g., 'from:example@gmail.com subject:important')"
      },
      maxResults: { type: "number", default: 20, maximum: 100 },
      sortOrder: { 
        type: "string", 
        enum: ["relevance", "date"], 
        default: "relevance" 
      }
    }
  }
}
```

### Step 7: Add Gmail Download Attachment Tool
**Files**: `src/services/gmail/tools/downloadAttachment.ts`
- Create `gmail_download_attachment` MCP tool
- Add attachment ID validation and retrieval
- Implement file download with proper MIME type handling
- Add file size limits and validation (25MB Gmail limit)
- Support saving to specified local directory
- Include progress reporting for large files
- Add filename sanitization for security

**Tool Schema**:
```typescript
{
  name: "gmail_download_attachment",
  description: "Download email attachment to local file system",
  inputSchema: {
    type: "object",
    required: ["messageId", "attachmentId"],
    properties: {
      messageId: { type: "string" },
      attachmentId: { type: "string" },
      outputPath: { type: "string", description: "Local path to save file" },
      filename: { type: "string", description: "Override filename" },
      maxSizeBytes: { type: "number", default: 25000000 } // 25MB default
    }
  }
}
```

### Step 8: Add Gmail Export Email Tool
**Files**: `src/services/gmail/tools/exportEmail.ts`
- Create `gmail_export_email` MCP tool
- Export complete email as .eml or .mbox format
- Include all headers, body content, and embedded attachments
- Support batch export of multiple emails
- Add compression options for large exports
- Handle MIME multipart messages properly

**Tool Schema**:
```typescript
{
  name: "gmail_export_email",
  description: "Export complete email with attachments to local file",
  inputSchema: {
    type: "object",
    required: ["messageId"],
    properties: {
      messageId: { type: "string" },
      outputPath: { type: "string" },
      format: { type: "string", enum: ["eml", "mbox"], default: "eml" },
      includeAttachments: { type: "boolean", default: true },
      compress: { type: "boolean", default: false }
    }
  }
}
```

### Step 9: Register Gmail Tools with MCP Server
**Files**: `src/server.ts` (Gmail integration)
- Import and register all Gmail tools (same pattern as calendar)
- Add Gmail service initialization
- Update tool discovery to include Gmail tools
- Follow existing server registration pattern

### Step 10: Extend Existing Error Handling for Gmail
**Files**: Extend existing error handling patterns
- Add Gmail error codes to existing `handleApiError` method in Gmail client
- Use same CalendarError class (rename to GoogleAPIError if needed)
- Follow calendar client error handling patterns exactly
- Add file system error handling for download/export operations
- No separate Gmail error classes needed

### Step 11: Add Gmail Integration Tests
**Files**: `tests/integration/gmail.test.ts`
- Test Gmail OAuth scope authorization
- Validate message listing and filtering
- Test message reading and content parsing
- Verify message sending functionality
- Test search functionality with various queries
- Add error scenario testing

### Step 12: Test Gmail Tools with MCP Client
**Manual Testing**:
- Connect with Claude Desktop
- Test Gmail tool discovery
- Execute gmail_list_messages with various filters
- Test gmail_get_message with different message types
- Send test emails using gmail_send_message
- Test search functionality with complex queries
- Validate label management operations

## Success Criteria

### Functional Requirements
- ☐ OAuth flow includes Gmail scopes and completes successfully
- ☐ `gmail_list_messages` returns user's Gmail messages with proper filtering
- ☐ `gmail_get_message` retrieves and formats message content correctly
- ☐ `gmail_send_message` successfully sends emails and handles replies
- ☐ `gmail_search_messages` finds relevant messages using Gmail query syntax
- ☐ Label management tools create, apply, and manage labels correctly

### Technical Requirements
- ☐ Gmail API integration follows established patterns from Calendar
- ☐ Error handling provides clear guidance for Gmail-specific issues
- ☐ Message parsing handles various content types and encodings
- ☐ Performance meets targets for email operations
- ☐ Security maintains minimal required scopes

### User Experience Requirements
- ☐ Email content displays in readable, formatted text
- ☐ Search results are relevant and properly ranked
- ☐ Sent emails appear correctly in Gmail interface
- ☐ Error messages guide users to solutions
- ☐ Tools respond within reasonable time limits

## Key Files Created

### Gmail Service Implementation
```
src/services/gmail/
├── gmailClient.ts            # Gmail API wrapper (with integrated message parsing)
└── tools/
    ├── listMessages.ts       # List messages tool
    ├── getMessage.ts         # Get message content tool
    ├── sendMessage.ts        # Send message tool
    ├── searchMessages.ts     # Search messages tool
    ├── downloadAttachment.ts # Download attachment tool
    └── exportEmail.ts        # Export email tool
```

### Enhanced Core Files
```
src/auth/
└── oauthManager.ts           # Extended with Gmail scopes

tests/integration/
└── gmail.test.ts             # Gmail integration tests
```

## Gmail Tools Summary

### Core Email Tools
- **`gmail_list_messages`**: List emails with filtering by date, sender, labels
- **`gmail_get_message`**: Read full email content with formatting
- **`gmail_send_message`**: Send emails with reply/forward support
- **`gmail_search_messages`**: Advanced search using Gmail query syntax

### File Management Tools
- **`gmail_download_attachment`**: Download email attachments to local file system
- **`gmail_export_email`**: Export complete emails with attachments as .eml/.mbox files


## Performance Targets

### Response Time Requirements
- Message listing: < 2 seconds
- Message retrieval: < 1 second
- Message sending: < 3 seconds
- Search operations: < 2 seconds
- Label operations: < 1 second

### Resource Usage Limits
- Memory usage: < 150MB including Calendar and Gmail
- Concurrent operations: Support 10+ simultaneous Gmail operations
- API rate limiting: Respect Gmail API quotas with intelligent backoff

## Security Considerations

### Minimal Scope Principle
- Request only necessary Gmail scopes
- Separate read and write permissions
- User can grant incremental permissions
- Clear scope explanations in documentation

### Privacy Protection
- No persistent storage of email content
- Secure token management for Gmail access
- User control over email access and operations
- Clear audit trail of email operations

## Additional Dependencies

### Required npm Packages for Download/Export Features
Consider adding these packages for enhanced file handling:
- `fs-extra`: Enhanced file system operations with better error handling
- `mime-types`: Proper MIME type detection and handling for attachments
- `sanitize-filename`: Safe filename sanitization to prevent security issues
- `archiver`: For compression support in email export functionality

### Installation Command
```bash
npm install fs-extra mime-types sanitize-filename archiver
npm install --save-dev @types/fs-extra @types/mime-types @types/archiver
```

## Testing Strategy

### Integration Testing Focus
- Complete Gmail OAuth flow with scope validation
- Message operations with various email types
- Search functionality with complex queries
- Label management across different scenarios
- Error handling and recovery scenarios
- Download and export functionality with various file types

### Manual Testing Checklist
- [ ] Gmail OAuth authorization completes successfully
- [ ] List messages shows actual Gmail inbox
- [ ] Get message displays email content correctly
- [ ] Send message creates email in Gmail sent folder
- [ ] Search finds relevant messages
- [ ] Label operations work in Gmail interface
- [ ] Error scenarios provide helpful guidance

## Risk Mitigation

### Technical Risks
- **Gmail API Complexity**: Use proven Gmail API patterns and libraries
- **Message Parsing**: Handle various email formats and encodings
- **Rate Limits**: Implement intelligent rate limiting and user guidance
- **Large Attachments**: Set reasonable limits and clear error messages

### User Experience Risks
- **Email Privacy**: Clear documentation about data handling
- **Accidental Operations**: Confirmation for destructive operations
- **Performance**: Set expectations for large mailbox operations

## Next Phase Preparation

### Drive Integration Readiness (Phase 4)
- OAuth manager ready for Drive scopes
- Tool registry patterns established for file operations
- Error handling framework extensible to Drive errors
- Service architecture supports file management operations

### Multi-Service Patterns
- Cross-service authentication working smoothly
- Tool naming conventions established
- Error handling patterns consistent across services
- Performance monitoring ready for additional services

## Value Delivered

### User Benefits
- **Email Management**: AI-powered email reading, sending, and organization
- **Advanced Search**: Leverage Gmail's powerful search capabilities through AI
- **Label Organization**: Automated email labeling and organization
- **Productivity**: Streamlined email workflows through AI assistance

### Development Benefits
- **Proven Multi-Service Architecture**: Validates patterns for additional APIs
- **Comprehensive Error Handling**: Robust error management across services
- **Performance Optimization**: Efficient handling of multiple Google APIs
- **Security Framework**: Secure multi-scope OAuth implementation

This phase significantly expands the MCP server's capabilities while maintaining the security and performance standards established in Phase 2, providing users with comprehensive Gmail management through AI agents.
