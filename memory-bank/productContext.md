# Product Context - Project Purpose and Capabilities

## Project Purpose

The **Google MCP Server** is a **personal productivity tool** that bridges AI agents (like Claude Desktop) with your personal Google services through the Model Context Protocol (MCP). It enables AI-powered management of your personal email, calendar, files, and documents while maintaining complete privacy and local control.

## Core Value Proposition

### What It Does
- **AI-Powered Google Integration**: Connect AI agents directly to your personal Google services
- **Privacy-First Design**: All processing happens locally on your machine
- **Comprehensive Coverage**: Access Gmail, Drive, Calendar with document processing capabilities
- **Seamless Authentication**: Automatic OAuth flow management for hassle-free setup
- **Production-Ready**: Robust error handling and security policies

### Why It Exists
- **Personal Productivity**: Enhance your workflow with AI assistance for Google services
- **Privacy Control**: Keep your data local while leveraging AI capabilities
- **Unified Interface**: Single MCP server for all your Google productivity needs
- **AI Integration**: Purpose-built for AI agents and personal assistants

## Current Capabilities

### Working Google Services (3 services, 10 tools)

#### Google Calendar Integration ✅
**Tools Available:**
- `calendar_list_events`: List calendar events with filtering and timezone support
- `calendar_create_event`: Create events with attendees, reminders, timezone handling

**Key Features:**
- Smart timezone processing for calendar events
- Comprehensive reminder configuration for events
- Attendee management and meeting coordination
- Date range filtering and event search

**Use Cases:**
- "Show me my meetings for next week"
- "Create a team meeting for tomorrow at 2 PM with reminders"
- "Find all events with John in the next month"

#### Gmail Integration ✅
**Tools Available:**
- `gmail_list_messages`: List emails with filtering (date, sender, labels)
- `gmail_get_message`: Read email content with thread support
- `gmail_search_messages`: Advanced Gmail query syntax support
- `gmail_download_attachment`: Secure PDF/DOCX only attachment downloads

**Key Features:**
- Advanced email search with Gmail query syntax
- Email content parsing (HTML/text handling)
- Thread support for conversation tracking
- Security-focused attachment handling (PDF/DOCX only)
- Label and metadata management

**Use Cases:**
- "Find all emails from my manager this week"
- "Download the PDF attachment from the contract email"
- "Show me unread emails about the project"
- "Search for emails containing 'budget approval'"

#### Google Drive Integration ✅
**Tools Available:**
- `drive_list_files`: List files and folders with metadata
- `drive_get_file`: Get file content with PDF/DOCX parsing
- `drive_upload_file`: Upload files with metadata and sharing options
- `drive_create_folder`: Create organized folder structures

**Key Features:**
- Advanced document processing (PDF text extraction, DOCX content extraction)
- File metadata and sharing status information
- Folder organization and management
- Content-aware file handling with security policies
- Worker-based processing for large files

**Use Cases:**
- "Find all PDFs in my Documents folder"
- "Extract text from the quarterly report PDF"
- "Upload this document and share it with the team"
- "Create a project folder structure"

### Advanced Features Implemented

#### Document Processing Capabilities
- **PDF Text Extraction**: Using pdf-parse library for comprehensive text extraction
- **DOCX Content Processing**: Using mammoth library for document content extraction
- **Security Policy**: PDF and DOCX only processing for security and productivity focus
- **Worker-Based Processing**: Large file handling without blocking main thread
- **Intelligent Formatting**: Preserves document structure and formatting where possible

#### Multi-Service OAuth Management
- **Seamless Authentication**: Automatic OAuth flow across Calendar, Gmail, Drive
- **Scope Management**: Dynamic scope requests based on tool requirements
- **Token Refresh**: Automatic token refresh with 5-minute expiry buffer
- **Encrypted Storage**: Local token storage with system keychain integration

#### Production-Ready Features
- **Auto-Authentication**: Automatic OAuth flow management for seamless user experience
- **Response Monitoring**: Large document handling optimized for Claude Desktop stability
- **Comprehensive Error Handling**: Robust error handling with clear user guidance
- **Security Policies**: Input validation and file type restrictions

## Use Cases and Workflows

### Personal Email Management
- **Email Triage**: "Show me important emails from this week that need responses"
- **Document Extraction**: "Download and summarize the PDF attachments from contract emails"
- **Search and Organization**: "Find all emails about the project and organize by priority"
- **Content Analysis**: "Extract action items from emails in my inbox"

### Calendar and Scheduling
- **Meeting Coordination**: "Schedule a team meeting next week and send invites"
- **Schedule Analysis**: "Show me my availability for the next two weeks"
- **Event Management**: "Find all recurring meetings and show their details"
- **Time Planning**: "Create calendar blocks for focused work time"

### Document and File Management
- **Document Processing**: "Extract text from all PDFs in my project folder"
- **File Organization**: "Create a folder structure for the new project"
- **Content Search**: "Find documents containing specific keywords"
- **File Sharing**: "Upload and share documents with team members"

### Cross-Service Workflows
- **Email to Calendar**: "Create calendar events from meeting requests in email"
- **Document to Email**: "Find documents mentioned in recent emails"
- **Project Management**: "Organize project files, emails, and meetings"

## Technical Architecture

### MCP Protocol Implementation
- **Stdio Transport**: Direct communication with MCP clients like Claude Desktop
- **JSON-RPC 2.0**: Standard protocol for tool discovery and execution
- **Tool Registry**: Dynamic registration of all Google service tools
- **Error Handling**: Comprehensive error responses with MCP compliance

### Service Module Pattern
- **Modular Design**: Each Google service as independent module
- **Consistent Interface**: Uniform patterns across Calendar, Gmail, Drive
- **Lazy Loading**: Services initialized only when needed
- **Type Safety**: Full TypeScript implementation with strict typing

### Security and Privacy
- **Local Processing**: All data processing happens on your local machine
- **No External Dependencies**: No cloud services or external data sharing
- **Encrypted Token Storage**: OAuth tokens stored securely with system keychain
- **File Type Restrictions**: PDF/DOCX only processing for security
- **Input Validation**: Comprehensive validation of all inputs and parameters

## Current Limitations

### Services Not Yet Implemented
- **Google Docs**: Document creation and editing (planned for Phase 5)
- **Google Sheets**: Spreadsheet manipulation (planned for Phase 6)

### File Processing Limitations
- **File Types**: Currently limited to PDF and DOCX for security reasons
- **File Size**: Large files may have processing timeouts (configurable)

### API Limitations
- **Rate Limits**: Subject to Google API quotas and rate limits
- **Scope Requirements**: Some operations require specific OAuth scopes

## Future Enhancements

### Planned Features (Phase 5-6)
- **Google Docs Integration**: Document creation, editing, and collaboration
- **Google Sheets Integration**: Spreadsheet manipulation and data analysis
- **Cross-Service Workflows**: Advanced automation between services

### Production Hardening (Phase 7)
- **Performance Optimization**: Caching and response time improvements
- **Advanced Monitoring**: Detailed logging and metrics collection
- **Rate Limiting**: Intelligent Google API quota management
- **Circuit Breaker**: Failure isolation and recovery mechanisms

## Integration with AI Agents

### Claude Desktop Integration
- **Seamless Setup**: Works out-of-the-box with Claude Desktop MCP configuration
- **Auto-Authentication**: Handles OAuth flow automatically when tools are called
- **Response Optimization**: Optimized for Claude Desktop's streaming capabilities
- **Error Guidance**: Clear error messages and troubleshooting help

### MCP Client Compatibility
- **Standard Protocol**: Compatible with any MCP-compliant client
- **Tool Discovery**: Automatic tool discovery and schema validation
- **Resource Management**: Prepared for future resource-based features

## Privacy and Security Considerations

### Data Privacy
- **Local-Only Processing**: No data leaves your local machine
- **No Telemetry**: No usage tracking or external reporting
- **User-Controlled**: You maintain complete control over your data and credentials

### Security Measures
- **OAuth 2.0 + PKCE**: Secure authentication with Google services
- **Encrypted Storage**: All tokens encrypted with system-specific keys
- **File Type Validation**: Only safe file types (PDF/DOCX) processed
- **Input Sanitization**: Comprehensive validation of all inputs

### Compliance
- **Personal Use**: Designed for individual, personal Google account access
- **No Data Retention**: No persistent storage of user data
- **Transparent Operation**: All operations logged for user visibility

## Getting Started

### Prerequisites
- Node.js 18+ runtime environment
- Personal Google account with API access
- Google Cloud project with OAuth credentials

### Quick Setup
1. **Install Dependencies**: `npm install`
2. **Configure Environment**: Set up `.env` with Google OAuth credentials
3. **Start Server**: `npm run dev` for development
4. **Authenticate**: OAuth flow triggers automatically on first tool use

### Integration with Claude Desktop
```json
{
  "mcpServers": {
    "google-mcp-server": {
      "command": "node",
      "args": ["/path/to/mcp-google/dist/index.js"],
      "env": {
        "GOOGLE_CLIENT_ID": "your_client_id",
        "GOOGLE_CLIENT_SECRET": "your_client_secret"
      }
    }
  }
}
```

## Project Status Summary

The Google MCP Server has successfully implemented a production-ready foundation with 10 tools across 3 Google services. The incremental approach (Calendar → Gmail → Drive) has validated the architecture and established proven patterns for rapid service addition. Key achievements include:

- **Proven Architecture**: Service module pattern scales effectively across multiple Google services
- **Production Features**: Auto-authentication, error handling, and security policies implemented
- **Document Processing**: Advanced PDF/DOCX parsing with security-focused policies
- **AI Integration**: Optimized for Claude Desktop and other MCP clients

The system is ready for either Docs integration (Phase 5) or production hardening (Phase 7), with all core infrastructure working reliably and patterns established for confident expansion.
