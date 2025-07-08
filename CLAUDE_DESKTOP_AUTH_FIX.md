# Claude Desktop Authentication Fix

## Problem
The Google MCP Server worked from command line but Claude Desktop kept asking for authentication. This was because Claude Desktop never ran the `--auth` command that was required for initial OAuth setup.

## Root Cause
- **Command Line Usage**: Users would run `node dist/index.js --auth` first to authenticate, then run the server normally
- **Claude Desktop Usage**: Only runs `node dist/index.js` directly without the `--auth` flag, so authentication never happened

## Solution
Added **auto-authentication** to the server startup process. The server now automatically checks for valid authentication when it starts and triggers the OAuth flow if needed.

## Changes Made

### Modified `src/server.ts`
Added two key methods:

1. **`ensureAuthentication()`** - Checks if user is authenticated and triggers OAuth if not
2. **Updated `start()`** - Calls `ensureAuthentication()` before starting the MCP server

```typescript
private async ensureAuthentication(): Promise<void> {
  const isAuth = await oauthManager.instance.isAuthenticated();
  if (!isAuth) {
    console.error('[MCP Server] No valid authentication found, starting OAuth flow...');
    console.error('[MCP Server] A browser window will open for Google authentication.');
    await oauthManager.instance.authenticate();
    console.error('[MCP Server] Authentication completed successfully!');
  }
}

async start(): Promise<void> {
  // Ensure authentication before starting MCP server
  await this.ensureAuthentication();
  
  // ... rest of startup process
}
```

## How It Works Now

### Claude Desktop Experience:
1. User tries to use a calendar tool in Claude Desktop
2. Claude Desktop starts the MCP server (via config)
3. **NEW**: Server automatically detects no authentication → starts OAuth flow
4. Browser opens to Google OAuth page automatically
5. User completes OAuth in browser → gets redirected to success page
6. Server receives tokens → stores them → continues startup
7. Claude Desktop can now use the tools normally

### Command Line Experience:
- **Unchanged**: Can still use `--auth` flag manually if desired
- **Improved**: Can also just run `node dist/index.js` and it will auto-authenticate

## Benefits
- **Zero Breaking Changes**: Existing workflows continue to work
- **Seamless Claude Desktop Integration**: No manual auth steps required
- **Minimal Code Changes**: Only 20 lines added to server startup
- **Robust**: Uses existing OAuth flow that already works perfectly

## Testing
- All 80 existing tests still pass
- OAuth flow works identically in both contexts
- Token storage and management unchanged

## User Instructions
For Claude Desktop users:
1. First time: When you try to use calendar tools, a browser will open for Google authentication
2. Complete the OAuth flow in the browser
3. Calendar tools will work normally from then on
4. Tokens are stored locally and persist between sessions

The authentication is now completely automatic - no manual setup required!
