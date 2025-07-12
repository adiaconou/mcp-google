# Phase 4: Drive API Integration (Simplified)

## Overview
Add essential Google Drive functionality to the MCP server, focusing on core file management operations that enable AI agents to browse, upload, download, and organize files in Google Drive. This simplified phase delivers the fundamental tools needed for personal productivity while maintaining security and performance.

## Human Prerequisites
Before starting Phase 4 implementation, the user must complete these setup tasks:

### 1. Enable Google Drive API
- Go to Google Cloud Console (same project from previous phases)
- Navigate to "APIs & Services" > "Library"
- Search for and enable "Google Drive API"
- Verify the API is enabled in the project

### 2. Test Google Drive Account
- Ensure the Google account has Google Drive access
- Create a test folder structure for testing (e.g., "MCP-Test" folder)
- Upload a few test files of different types (text, images, documents)
- Note any important files to avoid during testing

### 3. Optional: Prepare Test Files
- Create test files on local system for upload testing
- Prepare various file types: .txt, .pdf, .jpg, .docx
- Keep file sizes reasonable for testing (< 10MB each)

## Objectives
- Extend OAuth manager to include Google Drive scope
- Create Drive API client with essential file operations
- Implement 4 core Drive tools: list, get, upload, and create folder
- Establish patterns for file-based Google API integrations
- Maintain comprehensive test coverage for all functionality

## Implementation Steps
1. ☑ Extend OAuth manager to support Drive scope (with tests)
2. ☑ Create Drive API client with authentication integration (with tests)
3. ☑ Implement `drive_list_files` tool (with unit/integration tests and MCP registration)
4. ☐ Implement `drive_get_file` tool (with unit/integration tests and MCP registration)
5. ☑ Implement `drive_upload_file` tool (with unit/integration tests and MCP registration)
6. ☑ Implement `drive_create_folder` tool (with unit/integration tests and MCP registration)

## Implementation Plan

### Step 1: Extend OAuth Manager for Drive
**Files**: 
- `src/auth/oauthManager.ts` (enhancement)
- `tests/unit/oauthManager.test.ts` (enhancement)

**Implementation**:
- Add Drive scope to OAuth configuration: `https://www.googleapis.com/auth/drive.file`
- Update scope management for Drive-specific operations
- Add scope validation for file access permissions

**Testing**:
- Unit tests for Drive scope addition and validation
- Integration test for OAuth flow with Drive scope
- Verify token refresh includes Drive scope

### Step 2: Create Drive API Client
**Files**: 
- `src/services/drive/driveClient.ts`
- `tests/unit/driveClient.test.ts`

**Implementation**:
- Create DriveClient class following established patterns from Calendar/Gmail
- Add authentication integration with OAuth manager
- Implement core methods: listFiles, getFile, uploadFile, createFolder
- Include basic error handling and retry logic

**Testing**:
- Unit tests for all DriveClient methods with mocked Google APIs
- Test authentication integration
- Test error handling scenarios
- Test retry logic for transient failures

### Step 3: Implement Drive List Files Tool
**Files**: 
- `src/services/drive/tools/listFiles.ts`
- `src/server.ts` (register tool)
- `tests/unit/driveListFiles.test.ts`
- `tests/integration/drive-list-files.test.ts`

**Tool Schema**:
```typescript
{
  name: "drive_list_files",
  description: "List Google Drive files with optional filtering",
  inputSchema: {
    type: "object",
    properties: {
      folderId: { type: "string", description: "Parent folder ID (optional)" },
      query: { type: "string", description: "Drive search query (optional)" },
      maxResults: { type: "number", default: 20, maximum: 100 },
      orderBy: { 
        type: "string", 
        enum: ["name", "modifiedTime", "createdTime"],
        default: "modifiedTime desc"
      }
    }
  }
}
```

**Implementation**:
- List files with optional folder filtering
- Support basic search queries
- Return formatted file metadata (id, name, mimeType, size, modifiedTime)
- Include pagination for large file lists

**Testing**:
- Unit tests with mocked Drive API responses
- Integration tests with real Drive API (using test folder)
- Test filtering, search, and pagination
- Test error scenarios (invalid folder ID, API errors)

### Step 4: Implement Drive Get File Tool
**Files**: 
- `src/services/drive/tools/getFile.ts`
- `src/server.ts` (register tool)
- `tests/unit/driveGetFile.test.ts`
- `tests/integration/drive-get-file.test.ts`

**Tool Schema**:
```typescript
{
  name: "drive_get_file",
  description: "Get Google Drive file metadata and optionally download content",
  inputSchema: {
    type: "object",
    required: ["fileId"],
    properties: {
      fileId: { type: "string" },
      includeContent: { type: "boolean", default: false },
      maxContentSize: { type: "number", default: 1048576, description: "Max content size in bytes (1MB default)" }
    }
  }
}
```

**Implementation**:
- Get file metadata by ID
- Optionally download file content for text-based files
- Include size limits for content download
- Return comprehensive file information

**Testing**:
- Unit tests for metadata retrieval and content download
- Integration tests with various file types
- Test content size limits and error handling
- Test with non-existent file IDs

### Step 5: Implement Drive Upload File Tool
**Files**: 
- `src/services/drive/tools/uploadFile.ts`
- `src/server.ts` (register tool)
- `tests/unit/driveUploadFile.test.ts`
- `tests/integration/drive-upload-file.test.ts`

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
      fileName: { type: "string", description: "Name for uploaded file (optional)" },
      folderId: { type: "string", description: "Parent folder ID (optional)" },
      description: { type: "string", description: "File description (optional)" }
    }
  }
}
```

**Implementation**:
- Upload files from local file system
- Support custom file names and descriptions
- Allow uploading to specific folders
- Include basic MIME type detection
- Return uploaded file information

**Testing**:
- Unit tests with mocked file system and Drive API
- Integration tests with real file uploads
- Test various file types and sizes
- Test folder uploads and error scenarios

### Step 6: Implement Drive Create Folder Tool
**Files**: 
- `src/services/drive/tools/createFolder.ts`
- `src/server.ts` (register tool)
- `tests/unit/driveCreateFolder.test.ts`
- `tests/integration/drive-create-folder.test.ts`

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
      parentFolderId: { type: "string", description: "Parent folder ID (optional)" },
      description: { type: "string", description: "Folder description (optional)" }
    }
  }
}
```

**Implementation**:
- Create folders with specified names
- Support nested folder creation
- Include folder metadata and description setting
- Return created folder information

**Testing**:
- Unit tests for folder creation logic
- Integration tests with real folder creation
- Test nested folder creation
- Test duplicate name handling
- Test MCP tool registration and discovery
- Manual testing with Claude Desktop for this specific tool

**Note**: After implementing each tool in Steps 3-6, you can immediately test that specific tool with Claude Desktop before proceeding to the next tool. This allows for incremental validation and easier debugging.

### Tool Registration Pattern
Each tool implementation step includes registering the tool with the MCP server in `src/server.ts`. This allows for immediate testing of each tool as it's completed, rather than waiting until all tools are implemented.

### Final Integration Testing
After all tools are implemented:
- Create `src/services/drive/tools/index.ts` to export all Drive tools
- Verify all Drive tools are properly registered and discoverable
- Run comprehensive integration tests across all Drive functionality
- Test complete Drive workflows with Claude Desktop

## Success Criteria

### Functional Requirements
- ☐ OAuth flow includes Drive scope and completes successfully
- ☐ `drive_list_files` returns user's Drive files with proper filtering
- ☐ `drive_upload_file` successfully uploads files to Drive
- ☐ `drive_get_file` retrieves file metadata and content correctly
- ☐ `drive_create_folder` creates folders in Drive
- ☐ All tools work seamlessly with Claude Desktop

### Technical Requirements
- ☐ Drive API integration follows established service patterns
- ☐ All tools have comprehensive unit and integration tests
- ☐ Error handling provides clear guidance for Drive-specific issues
- ☐ Performance meets targets for file operations
- ☐ Security maintains minimal required scope

### Testing Requirements
- ☐ Unit test coverage >90% for all Drive components
- ☐ Integration tests cover real API interactions
- ☐ Error scenarios properly tested and handled
- ☐ Manual testing validates end-user experience

## Key Files Created

### Drive Service Implementation
```
src/services/drive/
├── driveClient.ts            # Drive API wrapper
└── tools/
    ├── index.ts              # Tool exports
    ├── listFiles.ts          # List files tool
    ├── getFile.ts            # Get file metadata/content tool
    ├── uploadFile.ts         # Upload file tool
    └── createFolder.ts       # Create folder tool
```

### Test Coverage
```
tests/unit/
├── driveClient.test.ts       # Drive client unit tests
├── driveListFiles.test.ts    # List files unit tests
├── driveGetFile.test.ts      # Get file unit tests
├── driveUploadFile.test.ts   # Upload file unit tests
└── driveCreateFolder.test.ts # Create folder unit tests

tests/integration/
├── drive-service.test.ts     # Drive service integration
├── drive-list-files.test.ts  # List files integration
├── drive-get-file.test.ts    # Get file integration
├── drive-upload-file.test.ts # Upload file integration
└── drive-create-folder.test.ts # Create folder integration
```

## Drive Tools Summary

### Core File Management Tools
- **`drive_list_files`**: List files with filtering by folder and search queries
- **`drive_get_file`**: Get file metadata and optionally download content
- **`drive_upload_file`**: Upload files with metadata and folder organization
- **`drive_create_folder`**: Create folders for file organization

## Performance Targets

### Response Time Requirements
- File listing: < 2 seconds
- File metadata retrieval: < 1 second
- File upload (< 10MB): < 10 seconds
- Folder operations: < 1 second

### Resource Usage Limits
- Memory usage: < 200MB including all services
- Concurrent operations: Support 3+ simultaneous file operations
- Upload streaming: Efficient memory usage for files up to 10MB

## Security Considerations

### File Access Control
- Request minimal necessary Drive scope (`drive.file` only)
- Validate file access permissions before operations
- Secure handling of file content and metadata
- No persistent storage of file content

### Privacy Protection
- All file processing happens locally
- Secure token management for Drive access
- User control over file access and operations
- Clear audit trail of file operations

## Testing Strategy

### Unit Testing Focus
- Mock all Google Drive API calls
- Test tool input validation and error handling
- Verify proper data transformation and formatting
- Test edge cases and boundary conditions

### Integration Testing Focus
- Real Drive API interactions with test data
- End-to-end workflows with actual file operations
- Error handling with real API error responses
- Performance validation with various file sizes

### Manual Testing Checklist
- [ ] Drive OAuth authorization completes successfully
- [ ] List files shows actual Drive content
- [ ] Upload file appears in Drive interface
- [ ] Download file retrieves correct content
- [ ] Folder creation works in Drive interface
- [ ] Error scenarios provide helpful guidance

## Risk Mitigation

### Technical Risks
- **File Size Limits**: Implement size validation and clear error messages
- **Rate Limits**: Implement intelligent rate limiting and user guidance
- **File Type Support**: Handle various MIME types gracefully
- **Network Issues**: Robust retry logic for transient failures

### User Experience Risks
- **File Privacy**: Clear documentation about file access scope
- **Performance**: Set expectations for file operation timing
- **Error Messages**: Provide actionable guidance for common issues

## Value Delivered

### User Benefits
- **File Access**: AI-powered file browsing and search
- **Upload Automation**: Streamlined file upload and organization
- **Content Retrieval**: Easy access to file content for AI processing
- **Organization**: Simple folder creation for file management

### Development Benefits
- **File Handling Patterns**: Establishes patterns for document-based APIs
- **Service Architecture**: Validates multi-service integration patterns
- **Testing Framework**: Comprehensive testing approach for API integrations
- **Security Framework**: Secure file access with minimal permissions

This simplified phase focuses on delivering essential Drive functionality while maintaining high quality through comprehensive testing and following established patterns from previous phases.
