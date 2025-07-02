# Google Drive API Reference

## Overview

The Drive API module provides comprehensive file and folder management capabilities for Google Drive, enabling AI agents to read, create, organize, and search through user's Drive content.

## File Operations

### Read File Metadata

**Function**: `drive.get_file_metadata(file_id)`

**Description**: Retrieve metadata for a specific file including name, MIME type, size, and timestamps.

**Parameters**:
- `file_id` (string, required): The unique identifier of the file

**Returns**:
```json
{
  "id": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
  "name": "Example Document",
  "mimeType": "application/vnd.google-apps.document",
  "size": "1024",
  "createdTime": "2023-01-15T10:30:00.000Z",
  "modifiedTime": "2023-01-16T14:45:00.000Z",
  "owners": ["user@example.com"],
  "parents": ["1DriveFolder123"]
}
```

### Download File Content

**Function**: `drive.download_file(file_id)`

**Description**: Download the actual content of a file from Google Drive.

**Parameters**:
- `file_id` (string, required): The unique identifier of the file

**Returns**: File content as binary data or text depending on file type

**Notes**: 
- For Google Workspace files (Docs, Sheets, Slides), content is exported in appropriate format
- Binary files are returned as base64-encoded data

### Search Files

**Function**: `drive.search_files(query)`

**Description**: Search for files using Google Drive's query syntax.

**Parameters**:
- `query` (string, required): Search query using Drive API query format

**Query Examples**:
- `name contains 'report'` - Files with "report" in the name
- `mimeType = 'application/pdf'` - All PDF files
- `modifiedTime > '2023-01-01T00:00:00'` - Files modified after Jan 1, 2023
- `parents in '1DriveFolder123'` - Files in specific folder

**Returns**: Array of file metadata objects

## File Creation

### Upload File

**Function**: `drive.upload_file(name, folder_id, content)`

**Description**: Upload a new file to Google Drive with specified content.

**Parameters**:
- `name` (string, required): Name for the new file
- `folder_id` (string, optional): Parent folder ID (defaults to root)
- `content` (string/binary, required): File content to upload

**Returns**: Metadata of the created file

### Create Empty File

**Function**: `drive.create_empty_file(name, folder_id, mime_type)`

**Description**: Create an empty file of a specific type (useful for Google Workspace documents).

**Parameters**:
- `name` (string, required): Name for the new file
- `folder_id` (string, optional): Parent folder ID (defaults to root)
- `mime_type` (string, required): MIME type of the file to create

**Common MIME Types**:
- `application/vnd.google-apps.document` - Google Doc
- `application/vnd.google-apps.spreadsheet` - Google Sheet
- `application/vnd.google-apps.presentation` - Google Slides
- `text/plain` - Text file

**Returns**: Metadata of the created file

## Folder Operations

### List Folder Contents

**Function**: `drive.list_folder_contents(folder_id)`

**Description**: List all files and subfolders within a specific folder.

**Parameters**:
- `folder_id` (string, required): The unique identifier of the folder

**Returns**: Array containing both files and folders with their metadata

### Get Folder Metadata

**Function**: `drive.get_folder_metadata(folder_id)`

**Description**: Retrieve metadata for a specific folder.

**Parameters**:
- `folder_id` (string, required): The unique identifier of the folder

**Returns**: Folder metadata object similar to file metadata

### Search Folders

**Function**: `drive.search_folders(query)`

**Description**: Search for folders using Google Drive's query syntax.

**Parameters**:
- `query` (string, required): Search query (automatically filtered for folders)

**Returns**: Array of folder metadata objects

### Create Folder

**Function**: `drive.create_folder(name, parent_folder_id)`

**Description**: Create a new folder in Google Drive.

**Parameters**:
- `name` (string, required): Name for the new folder
- `parent_folder_id` (string, optional): Parent folder ID (defaults to root)

**Returns**: Metadata of the created folder

## Error Handling

### Common Error Codes
- `404`: File or folder not found
- `403`: Insufficient permissions
- `401`: Authentication required
- `429`: Rate limit exceeded
- `500`: Internal server error

### Error Response Format
```json
{
  "error": {
    "code": 404,
    "message": "File not found",
    "details": "The requested file ID does not exist or is not accessible"
  }
}
```

## Usage Examples

### Organizing Email Attachments
```javascript
// Search for recent PDF files
const pdfs = await drive.search_files("mimeType = 'application/pdf' and modifiedTime > '2023-01-01T00:00:00'");

// Create organized folder structure
const reportsFolder = await drive.create_folder("Reports 2023", "root");

// Move files to organized location (implementation depends on specific use case)
```

### Document Management Workflow
```javascript
// Create a new document for meeting notes
const meetingDoc = await drive.create_empty_file(
  "Team Meeting Notes - " + new Date().toISOString().split('T')[0],
  "1MeetingNotesFolder",
  "application/vnd.google-apps.document"
);

// Search for related documents
const relatedDocs = await drive.search_files("name contains 'meeting' and mimeType = 'application/vnd.google-apps.document'");
```

## Rate Limits and Quotas

- **Queries per 100 seconds**: 1,000
- **Queries per day**: 1,000,000,000
- **File upload size limit**: 5TB per file
- **Batch request limit**: 100 requests per batch

## Best Practices

1. **Use specific queries**: Include MIME type and date filters to reduce result sets
2. **Cache metadata**: Store frequently accessed file metadata locally
3. **Handle rate limits**: Implement exponential backoff for retry logic
4. **Validate permissions**: Check file permissions before attempting operations
5. **Use batch operations**: Group multiple requests when possible
