# Google MCP Server

A secure, extensible middleware service that exposes Google APIs (Drive, Gmail, Calendar, Docs, Sheets) over the Model Control Protocol (MCP).

## Project Status

✅ **Phase 1 Complete: Project Setup**
- Project structure established
- TypeScript configuration
- Development environment setup
- Basic server foundation

🔄 **Next Phase: MCP Protocol Implementation**

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Google Cloud Console account (for API credentials)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd mcp-google

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your Google OAuth credentials
# See Configuration section below for detailed setup instructions
```

### Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

## Configuration

### MCP Client Setup

#### Claude Desktop Configuration

To use this Google MCP Server with Claude Desktop, add the following configuration to your Claude Desktop config file:

**Location of config file:**
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`

**Configuration:**
```json
{
  "mcpServers": {
    "google-mcp-server": {
      "command": "node",
      "args": ["/path/to/mcp-google/dist/index.js"],
      "env": {
        "GOOGLE_CLIENT_ID": "your_google_client_id_here",
        "GOOGLE_CLIENT_SECRET": "your_google_client_secret_here",
        "GOOGLE_REDIRECT_URI": "http://localhost:8080/auth/callback"
      }
    }
  }
}
```

**For development (using npm):**
```json
{
  "mcpServers": {
    "google-mcp-server": {
      "command": "npm",
      "args": ["run", "start"],
      "cwd": "/path/to/mcp-google",
      "env": {
        "GOOGLE_CLIENT_ID": "your_google_client_id_here",
        "GOOGLE_CLIENT_SECRET": "your_google_client_secret_here",
        "GOOGLE_REDIRECT_URI": "http://localhost:8080/auth/callback"
      }
    }
  }
}
```

#### Other MCP Clients

For other MCP clients that support the Model Context Protocol:

1. **Command:** `node /path/to/mcp-google/dist/index.js`
2. **Transport:** stdio
3. **Environment Variables:** Set the Google OAuth credentials as shown above

### Google API Setup

#### 1. Create Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID for later use

#### 2. Enable Required APIs

Enable the following APIs in your Google Cloud project:
- Google Drive API
- Gmail API
- Google Calendar API
- Google Docs API
- Google Sheets API

```bash
# Using gcloud CLI (optional)
gcloud services enable drive.googleapis.com
gcloud services enable gmail.googleapis.com
gcloud services enable calendar-json.googleapis.com
gcloud services enable docs.googleapis.com
gcloud services enable sheets.googleapis.com
```

#### 3. Create OAuth 2.0 Credentials

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth 2.0 Client IDs**
3. Choose **Desktop application** as the application type
4. Set the name (e.g., "Google MCP Server")
5. Add authorized redirect URIs:
   - `http://localhost:8080/auth/callback`
   - `urn:ietf:wg:oauth:2.0:oob` (for CLI flows)

#### 4. Configure OAuth Consent Screen

1. Go to **APIs & Services > OAuth consent screen**
2. Choose **External** user type (unless using Google Workspace)
3. Fill in required fields:
   - App name: "Google MCP Server"
   - User support email: Your email
   - Developer contact information: Your email
4. Add scopes (will be configured automatically by the server)
5. Add test users if in testing mode

### Installation & Setup

#### 1. Install the Server

```bash
# Clone and install
git clone <repository-url>
cd mcp-google
npm install

# Build for production
npm run build
```

#### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your credentials
```

**Required environment variables:**
```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:8080/auth/callback

# Optional Configuration
NODE_ENV=production
MCP_LOG_LEVEL=INFO
```

#### 3. Test the Installation

```bash
# Test the server directly
npm run start

# Or test with development mode
npm run dev
```

### Configuration Examples

#### Complete Claude Desktop Config

```json
{
  "mcpServers": {
    "google-mcp-server": {
      "command": "node",
      "args": ["/Users/username/mcp-google/dist/index.js"],
      "env": {
        "GOOGLE_CLIENT_ID": "123456789-abcdefghijklmnop.apps.googleusercontent.com",
        "GOOGLE_CLIENT_SECRET": "GOCSPX-abcdefghijklmnopqrstuvwxyz",
        "GOOGLE_REDIRECT_URI": "http://localhost:8080/auth/callback",
        "NODE_ENV": "production",
        "MCP_LOG_LEVEL": "INFO"
      }
    }
  }
}
```

#### Multiple Server Configuration

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
    },
    "other-mcp-server": {
      "command": "other-server",
      "args": ["--config", "config.json"]
    }
  }
}
```

### Troubleshooting

#### Common Issues

**1. "Command not found" error**
- Ensure Node.js is installed and in your PATH
- Verify the path to the server executable is correct
- For npm commands, ensure you're in the correct directory

**2. "Authentication failed" error**
- Verify your Google OAuth credentials are correct
- Check that the redirect URI matches your OAuth configuration
- Ensure required APIs are enabled in Google Cloud Console

**3. "Permission denied" errors**
- Check that the OAuth consent screen is properly configured
- Verify you've added the necessary scopes
- For testing, ensure your email is added as a test user

**4. Server startup issues**
- Check the server logs for detailed error messages
- Verify all required environment variables are set
- Ensure the server has necessary file permissions

#### Debug Mode

Enable debug logging by setting:
```env
MCP_LOG_LEVEL=DEBUG
NODE_ENV=development
```

#### Testing Connection

You can test the MCP server connection using the built-in test tool:

1. Start the server
2. In Claude Desktop, try using a command like: "Test the Google MCP server connection"
3. The server should respond with a success message

### Security Considerations

- **Never commit OAuth credentials to version control**
- Store credentials securely using environment variables
- Use the principle of least privilege for API scopes
- Regularly rotate OAuth credentials
- Monitor API usage in Google Cloud Console

### Current Limitations

⚠️ **Development Status:** This server is currently in development. Available features:

- ✅ Basic MCP protocol implementation
- ✅ Server foundation and tool registration
- 🔄 OAuth authentication (in progress)
- 🔄 Google API integrations (planned)

Full Google API functionality will be available in upcoming releases.

## Project Structure

```
mcp-google/
├── src/                    # Source code
│   ├── index.ts           # Main entry point
│   └── server.ts          # Server implementation
├── docs/                  # Documentation
│   ├── api/              # API documentation
│   ├── requirements/     # Requirements and specs
│   └── use-cases/        # Use case examples
├── implementation/       # Implementation guides
├── tests/               # Test files (to be added)
└── dist/               # Compiled output
```

## Implementation Roadmap

### Phase 1: Project Setup ✅
- [x] Project structure and configuration
- [x] TypeScript setup
- [x] Development environment
- [x] Basic server foundation

### Phase 2: MCP Protocol (Next)
- [ ] MCP SDK integration
- [ ] Message handling
- [ ] Tool and resource definitions
- [ ] Basic protocol compliance

### Phase 3: OAuth Authentication
- [ ] Google OAuth 2.0 setup
- [ ] Token management
- [ ] Secure credential storage
- [ ] Authentication flow

### Phase 4: Google API Integration
- [ ] Drive API implementation
- [ ] Gmail API implementation
- [ ] Calendar API implementation
- [ ] Docs API implementation
- [ ] Sheets API implementation

### Phase 5: Advanced Features
- [ ] Caching and optimization
- [ ] Error handling and retry logic
- [ ] Logging and monitoring
- [ ] Configuration management

### Phase 6: Testing & Documentation
- [ ] Comprehensive test suite
- [ ] API documentation
- [ ] Usage examples
- [ ] Deployment guides

## Features (Planned)

### Google Drive
- File operations (create, read, update, delete)
- Folder management
- Permission handling
- Search and filtering

### Gmail
- Email composition and sending
- Inbox management
- Label operations
- Search functionality

### Google Calendar
- Event creation and management
- Calendar operations
- Scheduling assistance
- Availability checking

### Google Docs
- Document creation and editing
- Content manipulation
- Collaboration features
- Export capabilities

### Google Sheets
- Spreadsheet operations
- Data manipulation
- Formula handling
- Chart creation

## Security

- OAuth 2.0 authentication
- Secure token storage
- Encrypted credentials
- Scope-based permissions
- Audit logging

## Contributing

This project follows a phased implementation approach. Please refer to the implementation guides in the `implementation/` directory for detailed development instructions.

## License

ISC License

## Support

For issues and questions, please refer to the documentation in the `docs/` directory or create an issue in the repository.
