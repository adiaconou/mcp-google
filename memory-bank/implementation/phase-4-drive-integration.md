# Phase 4: Drive API Integration

## Overview
Add comprehensive Google Drive functionality to the MCP server, building on the multi-service patterns established in previous phases. This phase delivers essential file management tools that enable AI agents to browse, upload, download, and organize files in Google Drive while maintaining security and performance.

## Human Prerequisites
Before starting Phase 4 implementation, the user must complete these setup tasks:

### 1. Enable Google Drive API
- Go to Google Cloud Console (same project from previous phases)
- Navigate to "APIs & Services" > "Library"
- Search for and enable "Google Drive API"
- Verify the API is enabled in the project

### 2. Update OAuth Scopes
- No additional OAuth credential changes needed
- The existing OAuth setup will be extended to request Drive scopes
- User will need to re-authorize to grant Drive permissions during first use

### 3. Test Google Drive Account
- Ensure the Google account has Google Drive access
- Create a test folder structure for testing (e.g., "MCP-Test" folder)
- Upload a few test files of different types (text, images, documents)
- Note any important files to avoid during testing

### 4. Optional: Prepare Test Files
- Create test files on local system for upload testing
- Prepare various file types: .txt, .pdf, .jpg, .docx
- Keep file sizes reasonable for testing (< 10MB each)

## Objectives
- Extend OAuth manager to include Google Drive scopes
- Create Drive API client with file and folder operations
- Implement core Drive tools: list, upload, download, and organize files
- Add folder management and file sharing capabilities
- Support various file types and metadata operations
- Establish patterns for file-based Google API integrations

## Implementation Steps
1. ☐ Extend OAuth manager to support Drive scopes
2. ☐ Create Drive API client with authentication integration
3. ☐ Implement file metadata parsing and formatting utilities
4. ☐ Create `drive_list_files` tool with filtering and search
5. ☐ Implement `drive_get_file` tool for file metadata and content
6. ☐ Create `drive_upload_file` tool for file uploads
7. ☐ Implement `drive_create_folder` tool for folder management
8. ☐ Add `drive_move_file` and `drive_copy_file` tools
9. ☐ Create `drive_manage_permissions` tool for sharing
10. ☐ Register Drive tools with the MCP server
11. ☐ Create comprehensive error handling for Drive operations
12. ☐ Add integration tests for Drive functionality
13. ☐ Test Drive tools with Claude Desktop

## Implementation Plan

### Step 1: Extend OAuth Manager for Drive
**Files**: `src/auth/oauthManager.ts` (enhancement)
- Add Drive scopes to OAuth configuration:
  - `https://www.googleapis.com/auth/drive.file` (for created/opened files)
  - `https://www.googleapis.com/auth/drive.readonly` (for reading files)
  - `https://www.googleapis.com/auth/drive` (for full access when needed)
- Update scope management for Drive-specific operations
- Add scope validation for file access permissions
- Implement incremental authorization for Drive scopes

### Step 2: Create Drive API Client
**Files**: `src/services/drive/driveClient.ts`
- Create DriveClient class extending base API patterns
- Add authentication integration with OAuth manager
- Implement file listing with metadata and filtering
- Add file upload with progress tracking and resumable uploads
- Create file download with content streaming
- Add folder operations and file organization
- Include comprehensive error handling and retry logic

### Step 3: Implement File Metadata Utilities
**Files**: `src/services/drive/fileUtils.ts`
- Create utilities for parsing Drive file metadata
- Add file type detection and MIME type handling
- Implement file size formatting and validation
- Create file permission and sharing utilities
- Add file version and revision handling
- Handle various file encoding and format conversions

### Step 4: Create Drive List Files Tool
**Files**: `src/services/drive/tools/listFiles.ts`
- Implement `drive_list_files` MCP tool
- Add filtering by file type, folder, and modification date
- Support search queries using Drive's search syntax
- Return formatted file metadata with permissions
- Include pagination for large file lists

**Tool Schema**:
```typescript
{
  name: "drive_list_files",
  description: "List Google Drive files with optional filtering",
  inputSchema: {
    type: "object",
    properties: {
      folderId: { type: "string", description: "Parent folder ID" },
      query: { type: "string", description: "Drive search query" },
      mimeType: { type: "string", description: "Filter by MIME type" },
      maxResults: { type: "number", default: 20, maximum: 100 },
      pageToken: { type: "string", description: "Pagination token" },
      orderBy: { 
        type: "string", 
        enum: ["name", "modifiedTime", "createdTime", "folder"],
        default: "modifiedTime desc"
      },
      includeShared: { type: "boolean", default: true }
    }
  }
}
```

### Step 5: Implement Drive Get File Tool
**Files**: `src/services/drive/tools/getFile.ts`
- Create `drive_get_file` MCP tool
- Add file ID validation and metadata retrieval
- Support content download for text-based files
- Extract file permissions and sharing information
- Include file revision history when relevant
- Add content preview for supported file types

**Tool Schema**:
```typescript
{
  name: "drive_get_file",
  description: "Get Google Drive file metadata and content",
  inputSchema: {
    type: "object",
    required: ["fileId"],
    properties: {
      fileId: { type: "string" },
      includeContent: { type: "boolean", default: false },
      contentFormat: { 
        type: "string", 
        enum: ["original", "text", "html", "pdf"],
        default: "original"
      },
      includePermissions: { type: "boolean", default: true },
      includeRevisions: { type: "boolean", default: false }
    }
  }
}
```

### Step 6: Create Drive Upload File Tool
**Files**: `src/services/drive/tools/uploadFile.ts`
- Implement `drive_upload_file` MCP tool
- Add file path validation and content reading
- Support various file types and MIME type detection
- Include metadata setting during upload
- Add folder destination and file naming options
- Implement progress tracking for large files

**Tool Schema**:
```typescript
{
  name: "drive_upload_file",
  description: "Upload a file to Google Drive",
  inputSchema: {
    type: "object",
    required: ["filePath"],
    properties: {
      filePath: { type: "string", description: "Local file path to upload" },
      fileName: { type: "string", description: "Name for uploaded file" },
      folderId: { type: "string", description: "Parent folder ID" },
      description: { type: "string", description: "File description" },
      mimeType: { type: "string", description: "Override MIME type" },
      convert: { type: "boolean", default: false, description: "Convert to Google format" }
    }
  }
}
```

### Step 7: Implement Drive Create Folder Tool
**Files**: `src/services/drive/tools/createFolder.ts`
- Create `drive_create_folder` MCP tool
- Add folder name validation and creation
- Support nested folder creation
- Include folder metadata and description setting
- Add folder sharing and permission configuration
- Return created folder information

**Tool Schema**:
```typescript
{
  name: "drive_create_folder",
  description: "Create a new folder in Google Drive",
  inputSchema: {
    type: "object",
    required: ["name"],
    properties: {
      name: { type: "string" },
      parentFolderId: { type: "string", description: "Parent folder ID" },
      description: { type: "string" },
      createPath: { type: "boolean", default: false, description: "Create parent folders if needed" }
    }
  }
}
```

### Step 8: Add File Organization Tools
**Files**: `src/services/drive/tools/fileOperations.ts`
- Create `drive_move_file` tool for moving files between folders
- Implement `drive_copy_file` tool for file duplication
- Add `drive_rename_file` tool for file renaming
- Create `drive_delete_file` tool with trash/permanent options
- Include batch operations for multiple files

**File Operations Schema**:
```typescript
{
  name: "drive_move_file",
  description: "Move a file to a different folder in Google Drive",
  inputSchema: {
    type: "object",
    required: ["fileId", "newParentId"],
    properties: {
      fileId: { type: "string" },
      newParentId: { type: "string" },
      removeFromParents: { type: "array", items: { type: "string" } }
    }
  }
}
```

### Step 9: Create Drive Permissions Management Tool
**Files**: `src/services/drive/tools/managePermissions.ts`
- Implement `drive_manage_permissions` tool for sharing
- Add permission creation, modification, and deletion
- Support various permission types (view, edit, comment)
- Include email-based and link-based sharing
- Add permission inheritance and folder-level permissions

**Permissions Schema**:
```typescript
{
  name: "drive_manage_permissions",
  description: "Manage Google Drive file and folder permissions",
  inputSchema: {
    type: "object",
    required: ["fileId", "action"],
    properties: {
      fileId: { type: "string" },
      action: { 
        type: "string", 
        enum: ["create", "update", "delete", "list"] 
      },
      role: { 
        type: "string", 
        enum: ["reader", "writer", "commenter", "owner"] 
      },
      type: { 
        type: "string", 
        enum: ["user", "group", "domain", "anyone"] 
      },
      emailAddress: { type: "string", format: "email" },
      domain: { type: "string" },
      allowFileDiscovery: { type: "boolean", default: false }
    }
  }
}
```

### Step 10: Register Drive Tools with MCP Server
**Files**: `src/server.ts` (Drive integration)
- Import and register all Drive tools
- Add Drive service initialization
- Update tool discovery to include Drive tools
- Add Drive-specific error handling
- Include Drive tools in server capabilities

### Step 11: Create Drive Error Handling
**Files**: `src/utils/errors.ts` (Drive errors)
- Add DriveError class for Drive-specific errors
- Map Drive API error codes to user-friendly messages
- Handle quota exceeded and storage limit errors
- Add file access and permission error handling
- Create recovery suggestions for common file issues

### Step 12: Add Drive Integration Tests
**Files**: `tests/integration/drive.test.ts`
- Test Drive OAuth scope authorization
- Validate file listing and search functionality
- Test file upload and download operations
- Verify folder creation and organization
- Test permission management and sharing
- Validate file operations (move, copy, delete)
- Add error scenario testing

### Step 13: Test Drive Tools with MCP Client
**Manual Testing**:
- Connect with Claude Desktop
- Test Drive tool discovery
- Execute drive_list_files with various filters
- Test drive_upload_file with different file types
- Create folders using drive_create_folder
- Test file operations and permission management
- Validate error handling and recovery

## Success Criteria

### Functional Requirements
- ☐ OAuth flow includes Drive scopes and completes successfully
- ☐ `drive_list_files` returns user's Drive files with proper filtering
- ☐ `drive_upload_file` successfully uploads files to Drive
- ☐ `drive_get_file` retrieves file metadata and content correctly
- ☐ Folder operations create and organize files properly
- ☐ Permission management tools control file access correctly

### Technical Requirements
- ☐ Drive API integration follows established multi-service patterns
- ☐ File operations handle various file types and sizes
- ☐ Error handling provides clear guidance for Drive-specific issues
- ☐ Performance meets targets for file operations
- ☐ Security maintains minimal required scopes

### User Experience Requirements
- ☐ File listings display in organized, readable format
- ☐ Upload operations provide progress feedback
- ☐ File operations complete within reasonable time limits
- ☐ Error messages guide users to solutions
- ☐ Permission changes reflect correctly in Drive interface

## Key Files Created

### Drive Service Implementation
```
src/services/drive/
├── driveClient.ts            # Drive API wrapper
├── fileUtils.ts              # File metadata and utilities
└── tools/
    ├── listFiles.ts          # List files tool
    ├── getFile.ts            # Get file metadata/content tool
    ├── uploadFile.ts         # Upload file tool
    ├── createFolder.ts       # Create folder tool
    ├── fileOperations.ts     # Move, copy, rename, delete tools
    └── managePermissions.ts  # Permission management tools
```

### Enhanced Core Files
```
src/auth/
└── oauthManager.ts           # Extended with Drive scopes

src/utils/
└── errors.ts                 # Enhanced with Drive errors

tests/integration/
└── drive.test.ts             # Drive integration tests
```

## Drive Tools Summary

### File Management Tools
- **`drive_list_files`**: List files with filtering by type, folder, date
- **`drive_get_file`**: Get file metadata and content
- **`drive_upload_file`**: Upload files with metadata and organization
- **`drive_create_folder`**: Create folders with nested structure support

### File Organization Tools
- **`drive_move_file`**: Move files between folders
- **`drive_copy_file`**: Duplicate files with new names/locations
- **`drive_rename_file`**: Rename files and folders
- **`drive_delete_file`**: Delete files (trash or permanent)

### Sharing and Permissions Tools
- **`drive_manage_permissions`**: Control file access and sharing

## Performance Targets

### Response Time Requirements
- File listing: < 2 seconds
- File metadata retrieval: < 1 second
- File upload (< 10MB): < 10 seconds
- Folder operations: < 1 second
- Permission operations: < 2 seconds

### Resource Usage Limits
- Memory usage: < 200MB including all services
- Concurrent operations: Support 5+ simultaneous file operations
- Upload/download streaming: Efficient memory usage for large files
- API rate limiting: Respect Drive API quotas with intelligent backoff

## Security Considerations

### File Access Control
- Request minimal necessary Drive scopes
- Validate file access permissions before operations
- Secure handling of file content and metadata
- Clear audit trail of file operations

### Privacy Protection
- No persistent storage of file content
- Secure token management for Drive access
- User control over file access and operations
- Respect file sharing and permission settings

## Testing Strategy

### Integration Testing Focus
- Complete Drive OAuth flow with scope validation
- File operations with various file types and sizes
- Folder creation and organization workflows
- Permission management across different scenarios
- Error handling and recovery scenarios

### Manual Testing Checklist
- [ ] Drive OAuth authorization completes successfully
- [ ] List files shows actual Drive content
- [ ] Upload file appears in Drive interface
- [ ] Download file retrieves correct content
- [ ] Folder operations work in Drive interface
- [ ] Permission changes reflect in Drive sharing
- [ ] Error scenarios provide helpful guidance

## Risk Mitigation

### Technical Risks
- **Large File Handling**: Implement streaming and progress tracking
- **File Type Support**: Handle various MIME types and formats
- **Rate Limits**: Implement intelligent rate limiting and user guidance
- **Storage Quotas**: Clear error messages for storage limit issues

### User Experience Risks
- **File Privacy**: Clear documentation about file access
- **Accidental Operations**: Confirmation for destructive operations
- **Performance**: Set expectations for large file operations

## Next Phase Preparation

### Docs Integration Readiness (Phase 5)
- OAuth manager ready for Docs scopes
- Tool registry patterns established for document operations
- Error handling framework extensible to Docs errors
- Service architecture supports document manipulation

### Multi-Service File Handling
- Cross-service file operations (e.g., attach Drive files to emails)
- Consistent file handling patterns across services
- Unified error handling for file-related operations
- Performance optimization for multi-service workflows

## Value Delivered

### User Benefits
- **File Management**: AI-powered file organization and access
- **Upload Automation**: Streamlined file upload and organization
- **Sharing Control**: Automated permission and sharing management
- **Search Capabilities**: Leverage Drive's search through AI

### Development Benefits
- **File Handling Patterns**: Establishes patterns for document-based APIs
- **Multi-Service Architecture**: Validates complex service interactions
- **Performance Optimization**: Efficient handling of file operations
- **Security Framework**: Secure file access and permission management

This phase adds comprehensive file management capabilities to the MCP server, enabling AI agents to effectively work with Google Drive while maintaining the security and performance standards established in previous phases.
