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
const { GoogleMCPServer } = require('./server');

// Load environment variables
config();

async function main(): Promise<void> {
  try {
    const server = new GoogleMCPServer();
    await server.start();
  } catch (error) {
    console.error('Failed to start Google MCP Server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the server
main().catch((error) => {
  console.error('Unhandled error in main:', error);
  process.exit(1);
});
