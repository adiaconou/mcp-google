# Phase 5: Docs API Integration

## Overview
Add comprehensive Google Docs functionality to the MCP server, building on the document handling patterns established in previous phases. This phase delivers essential document creation and editing tools that enable AI agents to create, read, and modify Google Docs while maintaining formatting and collaborative features.

## Human Prerequisites
Before starting Phase 5 implementation, the user must complete these setup tasks:

### 1. Enable Google Docs API
- Go to Google Cloud Console (same project from previous phases)
- Navigate to "APIs & Services" > "Library"
- Search for and enable "Google Docs API"
- Verify the API is enabled in the project

### 2. Update OAuth Scopes
- No additional OAuth credential changes needed
- The existing OAuth setup will be extended to request Docs scopes
- User will need to re-authorize to grant Docs permissions during first use

### 3. Test Google Docs Account
- Ensure the Google account has Google Docs access
- Create a test document for testing read functionality
- Prepare some sample content for document creation testing
- Note any important documents to avoid during testing

### 4. Optional: Prepare Test Content
- Prepare sample text content for document creation
- Create test templates or formatted content examples
- Consider various document structures (headings, lists, tables)

## Objectives
- Extend OAuth manager to include Google Docs scopes
- Create Docs API client with document manipulation capabilities
- Implement core Docs tools: create, read, and edit documents
- Add text formatting and document structure management
- Support collaborative editing and document sharing
- Establish patterns for content-based Google API integrations

## Implementation Steps
1. ☐ Extend OAuth manager to support Docs scopes
2. ☐ Create Docs API client with authentication integration
3. ☐ Implement document parsing and formatting utilities
4. ☐ Create `docs_create_document` tool for document creation
5. ☐ Implement `docs_get_document` tool for reading documents
6. ☐ Create `docs_update_document` tool for content editing
7. ☐ Implement `docs_format_text` tool for formatting operations
8. ☐ Add `docs_insert_content` tool for content insertion
9. ☐ Create `docs_manage_structure` tool for document organization
10. ☐ Register Docs tools with the MCP server
11. ☐ Create comprehensive error handling for Docs operations
12. ☐ Add integration tests for Docs functionality
13. ☐ Test Docs tools with Claude Desktop

## Implementation Plan

### Step 1: Extend OAuth Manager for Docs
**Files**: `src/auth/oauthManager.ts` (enhancement)
- Add Docs scopes to OAuth configuration:
  - `https://www.googleapis.com/auth/documents` (for full document access)
  - `https://www.googleapis.com/auth/documents.readonly` (for reading documents)
- Update scope management for Docs-specific operations
- Add scope validation for document access permissions
- Implement incremental authorization for Docs scopes

### Step 2: Create Docs API Client
**Files**: `src/services/docs/docsClient.ts`
- Create DocsClient class extending base API patterns
- Add authentication integration with OAuth manager
- Implement document creation with template support
- Add document reading with content parsing
- Create batch update operations for efficient editing
- Add document structure manipulation
- Include comprehensive error handling and retry logic

### Step 3: Implement Document Parsing Utilities
**Files**: `src/services/docs/documentUtils.ts`
- Create utilities for parsing Docs document structure
- Add text extraction and formatting preservation
- Implement content insertion and positioning utilities
- Create formatting and style management utilities
- Add document element handling (paragraphs, lists, tables)
- Handle various content types and embedded objects

### Step 4: Create Docs Create Document Tool
**Files**: `src/services/docs/tools/createDocument.ts`
- Implement `docs_create_document` MCP tool
- Add document title and initial content support
- Support template-based document creation
- Include folder destination and sharing options
- Add document metadata and properties setting
- Return created document information and access links

**Tool Schema**:
```typescript
{
  name: "docs_create_document",
  description: "Create a new Google Docs document",
  inputSchema: {
    type: "object",
    required: ["title"],
    properties: {
      title: { type: "string" },
      content: { type: "string", description: "Initial document content" },
      folderId: { type: "string", description: "Parent folder ID in Drive" },
      templateId: { type: "string", description: "Template document ID to copy" },
      shareWithUsers: { 
        type: "array", 
        items: { type: "string", format: "email" },
        description: "Email addresses to share with"
      }
    }
  }
}
```

### Step 5: Implement Docs Get Document Tool
**Files**: `src/services/docs/tools/getDocument.ts`
- Create `docs_get_document` MCP tool
- Add document ID validation and retrieval
- Parse and format document content for readability
- Extract document structure (headings, sections)
- Include document metadata and revision information
- Support various output formats (plain text, markdown, structured)

**Tool Schema**:
```typescript
{
  name: "docs_get_document",
  description: "Get Google Docs document content and metadata",
  inputSchema: {
    type: "object",
    required: ["documentId"],
    properties: {
      documentId: { type: "string" },
      format: { 
        type: "string", 
        enum: ["text", "markdown", "structured", "raw"],
        default: "text"
      },
      includeMetadata: { type: "boolean", default: true },
      includeRevisions: { type: "boolean", default: false },
      extractImages: { type: "boolean", default: false }
    }
  }
}
```

### Step 6: Create Docs Update Document Tool
**Files**: `src/services/docs/tools/updateDocument.ts`
- Implement `docs_update_document` MCP tool
- Add content replacement and insertion capabilities
- Support text formatting and style application
- Include paragraph and section management
- Add collaborative editing with conflict resolution
- Implement batch operations for efficiency

**Tool Schema**:
```typescript
{
  name: "docs_update_document",
  description: "Update Google Docs document content",
  inputSchema: {
    type: "object",
    required: ["documentId", "updates"],
    properties: {
      documentId: { type: "string" },
      updates: {
        type: "array",
        items: {
          type: "object",
          required: ["action"],
          properties: {
            action: { 
              type: "string", 
              enum: ["insert", "replace", "delete", "format"] 
            },
            location: { 
              type: "object",
              properties: {
                index: { type: "number" },
                endIndex: { type: "number" }
              }
            },
            content: { type: "string" },
            formatting: {
              type: "object",
              properties: {
                bold: { type: "boolean" },
                italic: { type: "boolean" },
                fontSize: { type: "number" },
                foregroundColor: { type: "string" }
              }
            }
          }
        }
      }
    }
  }
}
```

### Step 7: Implement Docs Format Text Tool
**Files**: `src/services/docs/tools/formatText.ts`
- Create `docs_format_text` MCP tool
- Add text styling (bold, italic, underline, colors)
- Support paragraph formatting (alignment, spacing)
- Include heading and list formatting
- Add font and size management
- Support style application to text ranges

**Tool Schema**:
```typescript
{
  name: "docs_format_text",
  description: "Apply formatting to text in Google Docs document",
  inputSchema: {
    type: "object",
    required: ["documentId", "startIndex", "endIndex"],
    properties: {
      documentId: { type: "string" },
      startIndex: { type: "number" },
      endIndex: { type: "number" },
      textStyle: {
        type: "object",
        properties: {
          bold: { type: "boolean" },
          italic: { type: "boolean" },
          underline: { type: "boolean" },
          strikethrough: { type: "boolean" },
          fontSize: { type: "number", minimum: 6, maximum: 400 },
          foregroundColor: { type: "string" },
          backgroundColor: { type: "string" },
          fontFamily: { type: "string" }
        }
      },
      paragraphStyle: {
        type: "object",
        properties: {
          alignment: { 
            type: "string", 
            enum: ["START", "CENTER", "END", "JUSTIFIED"] 
          },
          lineSpacing: { type: "number" },
          spaceAbove: { type: "number" },
          spaceBelow: { type: "number" }
        }
      }
    }
  }
}
```

### Step 8: Add Docs Insert Content Tool
**Files**: `src/services/docs/tools/insertContent.ts`
- Create `docs_insert_content` MCP tool
- Add text insertion at specific positions
- Support image and table insertion
- Include list and heading creation
- Add page break and section management
- Support content from templates or other documents

**Tool Schema**:
```typescript
{
  name: "docs_insert_content",
  description: "Insert content into Google Docs document",
  inputSchema: {
    type: "object",
    required: ["documentId", "index", "contentType"],
    properties: {
      documentId: { type: "string" },
      index: { type: "number" },
      contentType: { 
        type: "string", 
        enum: ["text", "image", "table", "pageBreak", "horizontalRule"] 
      },
      content: { type: "string" },
      imageUrl: { type: "string", format: "uri" },
      tableRows: { type: "number", minimum: 1 },
      tableColumns: { type: "number", minimum: 1 },
      formatting: {
        type: "object",
        properties: {
          style: { type: "string" },
          alignment: { type: "string" }
        }
      }
    }
  }
}
```

### Step 9: Create Docs Structure Management Tool
**Files**: `src/services/docs/tools/manageStructure.ts`
- Implement `docs_manage_structure` tool for document organization
- Add heading creation and hierarchy management
- Support table of contents generation
- Include section and page management
- Add document outline and navigation
- Support document merging and splitting

**Tool Schema**:
```typescript
{
  name: "docs_manage_structure",
  description: "Manage Google Docs document structure and organization",
  inputSchema: {
    type: "object",
    required: ["documentId", "action"],
    properties: {
      documentId: { type: "string" },
      action: { 
        type: "string", 
        enum: ["createHeading", "generateTOC", "addSection", "createOutline"] 
      },
      headingText: { type: "string" },
      headingLevel: { type: "number", minimum: 1, maximum: 6 },
      position: { type: "number" },
      tocPosition: { type: "number" },
      sectionTitle: { type: "string" }
    }
  }
}
```

### Step 10: Register Docs Tools with MCP Server
**Files**: `src/server.ts` (Docs integration)
- Import and register all Docs tools
- Add Docs service initialization
- Update tool discovery to include Docs tools
- Add Docs-specific error handling
- Include Docs tools in server capabilities

### Step 11: Create Docs Error Handling
**Files**: `src/utils/errors.ts` (Docs errors)
- Add DocsError class for Docs-specific errors
- Map Docs API error codes to user-friendly messages
- Handle document access and permission errors
- Add collaborative editing conflict error handling
- Create recovery suggestions for common document issues

### Step 12: Add Docs Integration Tests
**Files**: `tests/integration/docs.test.ts`
- Test Docs OAuth scope authorization
- Validate document creation and metadata
- Test document reading and content parsing
- Verify document editing and formatting operations
- Test content insertion and structure management
- Validate collaborative editing scenarios
- Add error scenario testing

### Step 13: Test Docs Tools with MCP Client
**Manual Testing**:
- Connect with Claude Desktop
- Test Docs tool discovery
- Create documents using docs_create_document
- Read documents using docs_get_document
- Edit documents using docs_update_document
- Test formatting and content insertion tools
- Validate document structure management

## Success Criteria

### Functional Requirements
- ☐ OAuth flow includes Docs scopes and completes successfully
- ☐ `docs_create_document` creates documents with proper formatting
- ☐ `docs_get_document` retrieves and formats document content correctly
- ☐ `docs_update_document` modifies documents while preserving structure
- ☐ Formatting tools apply styles correctly in Google Docs
- ☐ Content insertion tools work with various content types

### Technical Requirements
- ☐ Docs API integration follows established multi-service patterns
- ☐ Document operations handle various content types and structures
- ☐ Error handling provides clear guidance for Docs-specific issues
- ☐ Performance meets targets for document operations
- ☐ Collaborative editing handles conflicts gracefully

### User Experience Requirements
- ☐ Document content displays in readable, formatted text
- ☐ Document creation provides immediate access links
- ☐ Editing operations preserve document formatting
- ☐ Error messages guide users to solutions
- ☐ Tools respond within reasonable time limits

## Key Files Created

### Docs Service Implementation
```
src/services/docs/
├── docsClient.ts             # Docs API wrapper
├── documentUtils.ts          # Document parsing and utilities
└── tools/
    ├── createDocument.ts     # Create document tool
    ├── getDocument.ts        # Get document content tool
    ├── updateDocument.ts     # Update document tool
    ├── formatText.ts         # Text formatting tool
    ├── insertContent.ts      # Content insertion tool
    └── manageStructure.ts    # Document structure tool
```

### Enhanced Core Files
```
src/auth/
└── oauthManager.ts           # Extended with Docs scopes

src/utils/
└── errors.ts                 # Enhanced with Docs errors

tests/integration/
└── docs.test.ts              # Docs integration tests
```

## Docs Tools Summary

### Document Management Tools
- **`docs_create_document`**: Create new documents with templates and sharing
- **`docs_get_document`**: Read document content with various output formats
- **`docs_update_document`**: Edit document content with batch operations

### Content and Formatting Tools
- **`docs_format_text`**: Apply text and paragraph formatting
- **`docs_insert_content`**: Insert text, images, tables, and other elements
- **`docs_manage_structure`**: Manage headings, sections, and document organization

## Performance Targets

### Response Time Requirements
- Document creation: < 3 seconds
- Document reading: < 2 seconds
- Content updates: < 2 seconds
- Formatting operations: < 1 second
- Content insertion: < 2 seconds

### Resource Usage Limits
- Memory usage: < 250MB including all services
- Concurrent operations: Support 5+ simultaneous document operations
- Batch operations: Efficient handling of multiple document updates
- API rate limiting: Respect Docs API quotas with intelligent backoff

## Security Considerations

### Document Access Control
- Request minimal necessary Docs scopes
- Validate document access permissions before operations
- Secure handling of document content and metadata
- Clear audit trail of document operations

### Privacy Protection
- No persistent storage of document content
- Secure token management for Docs access
- User control over document access and operations
- Respect document sharing and permission settings

## Testing Strategy

### Integration Testing Focus
- Complete Docs OAuth flow with scope validation
- Document operations with various content types
- Formatting and structure management workflows
- Collaborative editing scenarios
- Error handling and recovery scenarios

### Manual Testing Checklist
- [ ] Docs OAuth authorization completes successfully
- [ ] Create document appears in Google Docs interface
- [ ] Get document retrieves correct content and formatting
- [ ] Update document changes appear in Google Docs
- [ ] Formatting operations work correctly
- [ ] Content insertion displays properly
- [ ] Error scenarios provide helpful guidance

## Risk Mitigation

### Technical Risks
- **Document Complexity**: Handle various document structures and content types
- **Collaborative Editing**: Manage conflicts and concurrent edits
- **Rate Limits**: Implement intelligent rate limiting and user guidance
- **Large Documents**: Optimize for documents with extensive content

### User Experience Risks
- **Document Privacy**: Clear documentation about document access
- **Accidental Changes**: Confirmation for destructive operations
- **Performance**: Set expectations for large document operations

## Next Phase Preparation

### Sheets Integration Readiness (Phase 6)
- OAuth manager ready for Sheets scopes
- Tool registry patterns established for spreadsheet operations
- Error handling framework extensible to Sheets errors
- Service architecture supports data manipulation

### Cross-Service Document Workflows
- Integration with Drive for document storage and organization
- Email integration for document sharing and collaboration
- Calendar integration for document-based meeting preparation
- Unified document handling across all Google services

## Value Delivered

### User Benefits
- **Document Creation**: AI-powered document creation and templates
- **Content Editing**: Automated document editing and formatting
- **Structure Management**: Intelligent document organization and formatting
- **Collaboration**: Enhanced collaborative document workflows

### Development Benefits
- **Content Manipulation Patterns**: Establishes patterns for content-based APIs
- **Complex API Integration**: Validates handling of complex document structures
- **Batch Operations**: Efficient handling of multiple document operations
- **Collaborative Features**: Framework for real-time collaborative tools

This phase adds comprehensive document creation and editing capabilities to the MCP server, enabling AI agents to effectively work with Google Docs while maintaining formatting, structure, and collaborative features established in the Google ecosystem.
