#!/usr/bin/env node

/**
 * Google MCP Server
 * 
 * A secure, extensible middleware service that exposes Google APIs
 * (Drive, Gmail, Calendar, Docs, Sheets) over the Model Control Protocol (MCP).
 * 
 * This is the main entry point for the MCP server.
 */

import { config } from 'dotenv';
import { server } from './server.js';
import { oauthManager } from './auth/oauthManager.js';

// Load environment variables only if not already provided (e.g., by Claude Desktop)
if (!process.env.GOOGLE_CLIENT_ID) {
  config();
}

async function handleAuth(): Promise<void> {
  try {
    console.error('[Auth] Starting OAuth authentication flow...');
    await oauthManager.instance.authenticate();
    console.error('[Auth] Authentication completed successfully!');
    console.error('[Auth] You can now use the calendar tools in Claude Desktop.');
    process.exit(0);
  } catch (error) {
    console.error('[Auth] Authentication failed:', error);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  // Check for authentication command
  if (process.argv.includes('--auth')) {
    await handleAuth();
    return;
  }

  try {
    console.error('[Main] Starting Google MCP Server...');
    await server.start();
    console.error('[Main] Server started successfully');
  } catch (error) {
    console.error('[Main] Failed to start Google MCP Server:', error);
    process.exit(1);
  }
}

// Start the server
main().catch((error) => {
  console.error('[Main] Unhandled error in main:', error);
  process.exit(1);
});
