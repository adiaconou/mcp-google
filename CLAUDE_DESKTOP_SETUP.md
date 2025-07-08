# Claude Desktop Setup Guide

This guide provides step-by-step instructions for setting up the Google MCP Server with Claude Desktop.

## Prerequisites

1. **Google Cloud Project with Calendar API enabled**
2. **OAuth 2.0 credentials configured**
3. **Environment variables set in `.env` file**

## Setup Steps

### 1. Build the Project
```bash
npm run build
```

### 2. Pre-Authentication (CRITICAL)
**This must be done BEFORE configuring Claude Desktop**

```bash
node dist/index.js --auth
```

- Browser will open automatically
- Sign in with your Google account
- Grant Calendar API permissions
- Wait for "Authentication completed successfully!" message

### 3. Verify Authentication
```bash
node test-mcp-server.js
```

You should see:
- Server starts successfully
- Tools are registered
- Calendar tools execute (may show auth required message if tokens aren't working)

### 4. Configure Claude Desktop

**Windows**: Edit `%APPDATA%\Claude\claude_desktop_config.json`
**macOS**: Edit `~/Library/Application Support/Claude/claude_desktop_config.json`

Add this configuration (adjust path as needed):

```json
{
  "mcpServers": {
    "google-calendar": {
      "command": "node",
      "args": ["C:/Code/mcp-google/dist/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### 5. Restart Claude Desktop
- Close Claude Desktop completely
- Reopen Claude Desktop
- The MCP server will be loaded automatically

### 6. Test Integration
In a Claude Desktop conversation, try:
- "List my calendar events for today"
- "Create a calendar event for tomorrow at 2pm"

## Troubleshooting

### Authentication Issues
- Delete `.tokens/` directory and re-run `node dist/index.js --auth`
- Check that `.env` file has correct Google OAuth credentials
- Ensure Google Calendar API is enabled in Google Cloud Console

### Claude Desktop Issues
- Check that the path in `claude_desktop_config.json` is correct
- Ensure you restarted Claude Desktop after configuration changes
- Check Claude Desktop logs for error messages

### MCP Server Issues
- Run `node test-mcp-server.js` to test server functionality
- Check that `npm run build` completed successfully
- Verify all dependencies are installed with `npm install`

## File Structure
After successful setup, you should have:
```
.tokens/
└── calendar-tokens.json    # OAuth tokens (auto-created)
dist/                       # Compiled JavaScript (from npm run build)
src/                        # TypeScript source code
.env                        # Your OAuth credentials
```

## Security Notes
- The `.tokens/` directory contains sensitive authentication data
- Never commit `.tokens/` or `.env` files to version control
- Tokens will auto-refresh, so re-authentication is rarely needed
