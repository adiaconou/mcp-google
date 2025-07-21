# Google MCP Server - Project Brief

## Project Overview

The **Google MCP Server** is a **personal productivity tool** that provides secure access to your personal Gmail account and Google services through the Model Context Protocol (MCP). It serves as a private bridge between AI agents (like Claude Desktop) and your Google services, enabling AI-powered management of your personal email, calendar, files, and documents while maintaining complete privacy and local control.

## Project Status: Phase 6 Nearly Complete - Sheets Integration 80% Finished

**Current Achievement**: Successfully implemented **15 MCP tools across 4 Google services** (Calendar, Gmail, Drive, Sheets) with comprehensive document processing and screenshot capabilities. The project has validated its architecture through incremental service development and is ready for final Sheets tool completion or expansion to remaining Google Workspace services.

## Core Requirements

### Primary Objective
Create a stdio-based MCP server for **personal use** that provides AI agents with structured access to your personal Google account while maintaining complete privacy and local data control.

### Key Requirements
1. **Personal Use Only**: Designed specifically for single-user, personal Google account access
2. **Privacy First**: All processing happens locally on your machine with no external data sharing
3. **Security Focused**: OAuth 2.0 implementation with encrypted local token storage
4. **AI-Ready**: Optimized for integration with AI agents and personal assistants
5. **Comprehensive Coverage**: Support for Gmail, Drive, Calendar, Docs, and Sheets APIs
6. **Simple Setup**: Easy installation and configuration for personal use
7. **Local-First**: No cloud dependencies or external services required

### Target User
- **You** - A single user wanting AI-powered management of your personal Google services
- Personal productivity enhancement through AI assistance
- Private, local-first approach to Google service automation
- Integration with AI agents like Claude Desktop for personal task management

## Technical Scope

### Core Components
1. **MCP Protocol Handler**: Stdio-based communication with MCP clients
2. **OAuth Authentication**: Secure Google OAuth 2.0 flow with token management
3. **Google API Clients**: Normalized wrappers for each Google service
4. **Tool Registry**: MCP tools for each supported operation
5. **Configuration System**: Environment-based configuration with validation

### Supported Google Services

#### Currently Implemented ✅
- **Google Calendar**: Event management, scheduling, timezone support (2 tools)
- **Gmail**: Email search, reading, attachment downloads, screenshot capture (5 tools)
- **Google Drive**: File operations, folder management, document processing (5 tools)
- **Google Sheets**: Spreadsheet creation, data manipulation, formatting (4 tools)

#### Planned 📋
- **Google Docs**: Document creation, editing, collaboration

### Architecture Principles
- **Modular Design**: Each Google service as independent module
- **Type Safety**: Full TypeScript implementation with strict typing
- **Error Resilience**: Comprehensive error handling and retry logic
- **Performance**: Intelligent caching and batch operations
- **Security**: Encrypted token storage and scope validation

## Implementation Status

### Phase 1: Foundation ✅ (COMPLETE)
- [x] TypeScript project setup with strict typing
- [x] Development tooling (ESLint, Jest, nodemon)
- [x] Basic server structure and environment configuration

### Phase 2: Calendar Integration ✅ (COMPLETE)
- [x] MCP protocol implementation with stdio transport
- [x] OAuth manager with Google authentication
- [x] Calendar API client and 2 tools (list_events, create_event)
- [x] Timezone support and reminder configuration
- [x] Claude Desktop integration with auto-authentication

### Phase 3: Gmail Integration ✅ (COMPLETE)
- [x] Gmail API client with email operations
- [x] 5 Gmail tools: list_messages, get_message, search_messages, download_attachment, export_email_screenshot
- [x] Multi-service OAuth scope management
- [x] Security policy: PDF/DOCX only attachment downloads
- [x] Advanced email screenshot capture with Puppeteer

### Phase 4: Drive Integration ✅ (COMPLETE)
- [x] Drive API client with file operations
- [x] 5 Drive tools: list_files, get_file, upload_file, create_folder, move_file
- [x] Document processing: PDF and DOCX parsing
- [x] Advanced file handling and metadata extraction

### Phase 5: Docs Integration 📋 (PLANNED)
- [ ] Docs API client integration
- [ ] Document creation and editing tools
- [ ] Content manipulation and formatting

### Phase 6: Sheets Integration 🔄 (80% COMPLETE)
- [x] Sheets API client integration
- [x] 4 Sheets tools: create_spreadsheet, get_data, update_cells, format_cells
- [x] Advanced formatting: styling, filters, sorting, conditional formatting
- [x] Comprehensive error handling and OAuth integration
- [ ] Final tool: sheets_calculate (formulas and aggregations)

### Phase 7: Production Hardening 🔄 (ONGOING)
- [x] Comprehensive error handling across all services
- [x] Response size monitoring for Claude Desktop stability
- [x] Automatic authentication flow management
- [x] Security policies and input validation
- [ ] Performance optimization and caching
- [ ] Advanced monitoring and logging

## Current Capabilities

### Working MCP Tools (15 total)
**Calendar Tools (2)**
- `calendar_list_events`: List calendar events with filtering and timezone support
- `calendar_create_event`: Create events with attendees, reminders, timezone handling

**Gmail Tools (5)**
- `gmail_list_messages`: List emails with filtering (date, sender, labels)
- `gmail_get_message`: Read email content with thread support
- `gmail_search_messages`: Advanced Gmail query syntax support
- `gmail_download_attachment`: Secure PDF/DOCX only attachment downloads
- `gmail_export_email_screenshot`: Advanced email screenshot capture with Puppeteer

**Drive Tools (5)**
- `drive_list_files`: List files and folders with metadata
- `drive_get_file`: Get file content with PDF/DOCX parsing
- `drive_upload_file`: Upload files with metadata and sharing options
- `drive_create_folder`: Create organized folder structures
- `drive_move_file`: Move files between folders

**Sheets Tools (4)**
- `sheets_create_spreadsheet`: Create new spreadsheets with initial data and sharing
- `sheets_get_data`: Read spreadsheet data with range and formatting options
- `sheets_update_cells`: Update cell values with batch operations
- `sheets_format_cells`: Apply formatting, filters, sorting, conditional formatting

### Advanced Features Implemented
- **Multi-Service OAuth**: Seamless authentication across Calendar, Gmail, Drive, Sheets
- **Document Processing**: PDF and DOCX parsing with mammoth and pdf-parse libraries
- **Screenshot Capabilities**: Advanced email screenshot capture with Puppeteer
- **Security Policies**: PDF/DOCX only downloads for security and productivity focus
- **Response Monitoring**: Large document handling optimized for Claude Desktop stability
- **Auto-Authentication**: Automatic OAuth flow management for seamless user experience

## Constraints and Assumptions

### Technical Constraints
- Node.js 18+ runtime requirement
- Stdio-based MCP communication only
- Local-first operation (no cloud dependencies)
- Google API rate limits and quotas

### Security Constraints
- OAuth 2.0 with PKCE for authentication
- Minimal scope requests (principle of least privilege)
- No persistent user data storage
- Encrypted local token storage only
- PDF/DOCX only file processing (security policy)

### Operational Constraints
- Single-user deployment model
- Local development and testing only
- No external monitoring or telemetry
- User-controlled credential management

## Project Boundaries

### In Scope
- Core Google services (Gmail, Drive, Calendar, Docs, Sheets)
- Essential operations for each service
- OAuth authentication and token management
- MCP protocol compliance
- TypeScript implementation with full typing
- Document processing for PDF and DOCX files
- Email screenshot capture capabilities

### Out of Scope
- Multi-user or enterprise deployment
- Real-time webhooks or push notifications
- Advanced Google Workspace admin features
- Third-party service integrations
- Web-based user interface
- Processing of file types other than PDF/DOCX

### Future Considerations
- Additional Google services (Photos, YouTube, etc.)
- Plugin architecture for third-party extensions
- Advanced workflow automation
- Enterprise features and compliance
- Performance analytics and monitoring

## Risk Assessment

### Technical Risks
- **Google API Changes**: Mitigation through versioned API usage
- **OAuth Complexity**: Mitigation through proven OAuth libraries ✅ MITIGATED
- **Rate Limiting**: Mitigation through client-side rate limiting (planned)
- **Token Security**: Mitigation through encrypted storage ✅ IMPLEMENTED

### Operational Risks
- **User Setup Complexity**: Mitigation through clear documentation and auto-authentication ✅ MITIGATED
- **Credential Management**: Mitigation through secure defaults ✅ IMPLEMENTED
- **Debugging Difficulty**: Mitigation through comprehensive logging ✅ IMPLEMENTED

## Current Architecture Summary

The project has successfully implemented a production-ready MCP server with 15 tools across 4 Google services. The incremental approach (Calendar → Gmail → Drive → Sheets) has validated the architecture and established proven patterns for rapid service addition. Key technical achievements include:

- **Proven Service Module Pattern**: Consistent structure across all Google services
- **Multi-Service OAuth**: Reliable scope management across multiple APIs
- **Document Processing**: Advanced PDF/DOCX parsing with security policies
- **Screenshot Technology**: Puppeteer integration for email archiving
- **Production Features**: Auto-authentication, error handling, response monitoring
- **Comprehensive Testing**: Unit and integration test coverage for all services

The system is ready for final Sheets tool completion, Docs integration, or production hardening focus, with all core infrastructure working reliably and patterns established for confident expansion.

## Next Steps

### Immediate Priority Options
1. **Complete Phase 6**: Implement final `sheets_calculate` tool to finish Sheets integration
2. **Phase 5: Docs Integration**: Apply proven patterns to Google Docs API
3. **Phase 7: Production Hardening**: Optimize existing implementation with caching and monitoring

The architecture has proven its effectiveness across 4 major Google services and is ready for confident expansion or optimization based on user priorities.
