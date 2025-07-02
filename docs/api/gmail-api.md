# Gmail API Reference

## Overview

The Gmail API module provides comprehensive email management capabilities, enabling AI agents to search, read, and download emails and attachments from a user's Gmail account.

## Email Metadata Operations

### Get Email Metadata

**Function**: `gmail.get_email_metadata(message_id)`

**Description**: Retrieve metadata for a specific email including sender, recipient, subject, and timestamp information.

**Parameters**:
- `message_id` (string, required): The unique identifier of the email message

**Returns**:
```json
{
  "id": "17f1c2e4a1b2c3d4",
  "threadId": "17f1c2e4a1b2c3d4",
  "subject": "Project Update - Q4 2023",
  "from": "colleague@company.com",
  "to": ["user@example.com"],
  "cc": ["manager@company.com"],
  "bcc": [],
  "date": "2023-12-15T14:30:00.000Z",
  "labels": ["INBOX", "IMPORTANT"],
  "snippet": "Here's the latest update on our Q4 project progress...",
  "hasAttachments": true,
  "attachmentCount": 2,
  "size": 15420
}
```

### Get Email Body Content

**Function**: `gmail.get_email_body(message_id)`

**Description**: Retrieve the full content of an email message in both plain text and HTML formats.

**Parameters**:
- `message_id` (string, required): The unique identifier of the email message

**Returns**:
```json
{
  "messageId": "17f1c2e4a1b2c3d4",
  "plainText": "Here's the latest update on our Q4 project progress...",
  "htmlContent": "<html><body><p>Here's the latest update on our Q4 project progress...</p></body></html>",
  "attachments": [
    {
      "attachmentId": "ANGjdJ8w...",
      "filename": "Q4_Report.pdf",
      "mimeType": "application/pdf",
      "size": 245760
    }
  ]
}
```

## Email Search Operations

### Search Emails

**Function**: `gmail.search_emails(query)`

**Description**: Search for emails using Gmail's advanced search syntax.

**Parameters**:
- `query` (string, required): Search query using Gmail search operators

**Query Examples**:
- `from:colleague@company.com` - Emails from specific sender
- `subject:"Project Update"` - Emails with specific subject
- `has:attachment` - Emails with attachments
- `after:2023/12/01 before:2023/12/31` - Emails within date range
- `label:important` - Emails with specific label
- `is:unread` - Unread emails only
- `filename:pdf` - Emails with PDF attachments

**Advanced Query Combinations**:
- `from:hr@company.com has:attachment filename:pdf` - HR emails with PDF attachments
- `subject:(invoice OR receipt) after:2023/11/01` - Financial documents from November
- `is:unread label:important` - Unread important emails

**Returns**: Array of email metadata objects

**Response Example**:
```json
{
  "messages": [
    {
      "id": "17f1c2e4a1b2c3d4",
      "threadId": "17f1c2e4a1b2c3d4",
      "subject": "Project Update - Q4 2023",
      "from": "colleague@company.com",
      "date": "2023-12-15T14:30:00.000Z",
      "snippet": "Here's the latest update...",
      "labels": ["INBOX", "IMPORTANT"]
    }
  ],
  "resultSizeEstimate": 1,
  "nextPageToken": null
}
```

## Email Download Operations

### Download Email as EML

**Function**: `gmail.download_eml(message_id)`

**Description**: Download the complete email message in standard EML format for archival or processing.

**Parameters**:
- `message_id` (string, required): The unique identifier of the email message

**Returns**: Email content in RFC 2822 EML format as string

**Use Cases**:
- Email archival and backup
- Forensic analysis
- Migration to other email systems
- Offline email processing

### Download Email Attachment

**Function**: `gmail.download_attachment(message_id, attachment_id)`

**Description**: Download a specific attachment from an email message.

**Parameters**:
- `message_id` (string, required): The unique identifier of the email message
- `attachment_id` (string, required): The unique identifier of the attachment

**Returns**: Attachment content as binary data with metadata

**Response Format**:
```json
{
  "filename": "Q4_Report.pdf",
  "mimeType": "application/pdf",
  "size": 245760,
  "data": "base64-encoded-content...",
  "encoding": "base64"
}
```

## Batch Operations

### Batch Email Metadata

**Function**: `gmail.get_batch_metadata(message_ids)`

**Description**: Retrieve metadata for multiple emails in a single request.

**Parameters**:
- `message_ids` (array, required): Array of email message IDs

**Returns**: Array of email metadata objects

**Benefits**:
- Reduced API calls for bulk operations
- Improved performance for large datasets
- Consistent data retrieval

## Error Handling

### Common Error Codes
- `404`: Message not found or deleted
- `403`: Insufficient permissions or message access denied
- `401`: Authentication required or token expired
- `429`: Rate limit exceeded
- `400`: Invalid query syntax
- `500`: Internal server error

### Error Response Format
```json
{
  "error": {
    "code": 404,
    "message": "Requested entity was not found",
    "details": "Message ID 17f1c2e4a1b2c3d4 does not exist or is not accessible"
  }
}
```

## Usage Examples

### Email Triage Workflow
```javascript
// Find unread important emails
const urgentEmails = await gmail.search_emails("is:unread label:important");

// Get full content for processing
for (const email of urgentEmails.messages) {
  const content = await gmail.get_email_body(email.id);
  // Process email content with AI for task extraction
}
```

### Attachment Processing
```javascript
// Find emails with PDF attachments from last week
const emailsWithPDFs = await gmail.search_emails("has:attachment filename:pdf after:2023/12/08");

// Download and organize attachments
for (const email of emailsWithPDFs.messages) {
  const body = await gmail.get_email_body(email.id);
  
  for (const attachment of body.attachments) {
    if (attachment.mimeType === 'application/pdf') {
      const file = await gmail.download_attachment(email.id, attachment.attachmentId);
      // Save to organized Drive folder
    }
  }
}
```

### Email Summarization
```javascript
// Get recent emails for daily summary
const recentEmails = await gmail.search_emails("after:2023/12/15 in:inbox");

// Extract key information
const summaryData = [];
for (const email of recentEmails.messages.slice(0, 10)) {
  const content = await gmail.get_email_body(email.id);
  summaryData.push({
    from: email.from,
    subject: email.subject,
    content: content.plainText,
    hasAttachments: email.hasAttachments
  });
}
```

## Rate Limits and Quotas

- **Queries per day**: 1,000,000,000
- **Queries per 100 seconds per user**: 250
- **Batch request limit**: 100 requests per batch
- **Attachment download limit**: 25MB per request

## Best Practices

1. **Use specific search queries**: Narrow down results with precise filters
2. **Batch metadata requests**: Group multiple email metadata calls
3. **Cache frequently accessed data**: Store email metadata locally when appropriate
4. **Handle pagination**: Use nextPageToken for large result sets
5. **Respect rate limits**: Implement exponential backoff for retries
6. **Validate message existence**: Check for 404 errors before processing
7. **Use appropriate scopes**: Request minimal necessary permissions

## Security Considerations

- **Read-only access**: Current implementation provides read-only Gmail access
- **No email modification**: Cannot send, delete, or modify emails
- **Attachment scanning**: Consider virus scanning for downloaded attachments
- **Data retention**: Implement appropriate data retention policies for downloaded content
- **Access logging**: Log access patterns for security auditing
