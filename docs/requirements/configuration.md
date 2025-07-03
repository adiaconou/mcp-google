# Configuration Guide

## Table of Contents

- [Overview](#overview)
- [Initial Setup](#initial-setup)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Development Setup](#development-setup)
  - [TypeScript Development Requirements](#typescript-development-requirements)
  - [TypeScript Configuration](#typescript-configuration)
  - [Build Scripts](#build-scripts)
- [Configuration Files](#configuration-files)
  - [Main Configuration](#main-configuration)
  - [Environment Variables](#environment-variables)
  - [Logging Configuration](#logging-configuration)
- [Authentication Setup](#authentication-setup)
  - [OAuth 2.0 Configuration](#oauth-20-configuration)
  - [Initial Authentication](#initial-authentication)
- [Service Configuration](#service-configuration)
  - [Gmail Configuration](#gmail-configuration)
  - [Calendar Configuration](#calendar-configuration)
  - [Drive Configuration](#drive-configuration)
  - [Docs Configuration](#docs-configuration)
  - [Sheets Configuration](#sheets-configuration)
- [Performance Configuration](#performance-configuration)
  - [Caching Settings](#caching-settings)
  - [Rate Limiting](#rate-limiting)
- [Integration Configuration](#integration-configuration)
  - [MCP Client Configuration](#mcp-client-configuration)
  - [Custom MCP Client](#custom-mcp-client)
- [Monitoring and Debugging](#monitoring-and-debugging)
  - [Local Monitoring](#local-monitoring)
- [Troubleshooting](#troubleshooting)
  - [Common Configuration Issues](#common-configuration-issues)
  - [Debug Configuration](#debug-configuration)
- [Security Configuration](#security-configuration)
  - [Encryption Settings](#encryption-settings)
  - [Access Control](#access-control)

## Overview

This document provides comprehensive configuration guidance for the Google MCP Server, including setup, authentication, and customization options for personal assistant integrations.

## Initial Setup

### Prerequisites

**System Requirements**:
- Node.js 18.0 or higher
- npm 8.0 or higher
- Operating System: Windows 10+, macOS 10.15+, or Linux (Ubuntu 20.04+)
- Available RAM: 512MB minimum, 2GB recommended
- Disk Space: 100MB for installation, additional space for caching

**Google Cloud Setup**:
1. Create a Google Cloud Project
2. Enable required APIs (Gmail, Calendar, Drive, Docs, Sheets)
3. Create OAuth 2.0 credentials (Desktop Application type)
4. Configure OAuth consent screen
5. Add test users (for development/personal use)

### Installation

**NPM Installation**:
```bash
npm install -g google-mcp-server
```

**NPX Execution**:
```bash
npx google-mcp-server
```

**Manual Installation**:
```bash
git clone https://github.com/your-org/google-mcp-server.git
cd google-mcp-server
npm install
npm run build
```

## Development Setup

### TypeScript Development Requirements

**Development Dependencies**:
- TypeScript 5.0+
- @types/node for Node.js type definitions
- ts-node for development execution
- nodemon for auto-restart during development

**Installation for Development**:
```bash
# Clone and setup for development
git clone https://github.com/your-org/google-mcp-server.git
cd google-mcp-server

# Install dependencies
npm install

# Install development dependencies
npm install --save-dev typescript @types/node ts-node nodemon

# Build TypeScript
npm run build

# Run in development mode
npm run dev
```

### TypeScript Configuration

**tsconfig.json**:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "removeComments": false,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### Build Scripts

**package.json scripts**:
```json
{
  "scripts": {
    "build": "tsc",
    "build:watch": "tsc --watch",
    "dev": "nodemon --exec ts-node src/index.ts",
    "start": "node dist/index.js",
    "type-check": "tsc --noEmit",
    "lint": "eslint src/**/*.ts",
    "test": "jest",
    "test:watch": "jest --watch",
    "clean": "rm -rf dist"
  }
}
```

## Configuration Files

### Main Configuration

**Location**: `~/.config/google-mcp-server/config.json`

```json
{
  "auth": {
    "clientId": "your-google-client-id",
    "clientSecret": "your-google-client-secret",
    "redirectUri": "http://localhost:8080/auth/callback",
    "scopes": [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/documents",
      "https://www.googleapis.com/auth/spreadsheets"
    ]
  },
  "features": {
    "gmail": {
      "enabled": true,
      "maxResults": 100,
      "cacheTTL": 300
    },
    "calendar": {
      "enabled": true,
      "defaultCalendar": "primary",
      "timeZone": "America/Los_Angeles"
    },
    "drive": {
      "enabled": true,
      "uploadFolder": "MCP-Uploads",
      "maxFileSize": "10MB"
    },
    "docs": {
      "enabled": true,
      "defaultTemplate": null
    },
    "sheets": {
      "enabled": true,
      "defaultLocale": "en_US"
    }
  },
  "security": {
    "tokenEncryption": true,
    "logLevel": "INFO",
    "rateLimiting": {
      "enabled": true,
      "maxRequests": 100,
      "windowMs": 60000
    }
  },
  "cache": {
    "enabled": true,
    "ttl": 300,
    "maxSize": "50MB",
    "cleanupInterval": 3600
  }
}
```

### Environment Variables

**Required Variables**:
```bash
# Google OAuth Credentials
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here

# Optional Configuration
MCP_LOG_LEVEL=INFO
MCP_CACHE_ENABLED=true
MCP_ENCRYPTION_KEY=your_encryption_key_here
```

### Logging Configuration

**Log Configuration** (`~/.config/google-mcp-server/logging.json`):
```json
{
  "level": "INFO",
  "format": "json",
  "transports": [
    {
      "type": "file",
      "filename": "logs/mcp-server.log",
      "maxSize": "10MB",
      "maxFiles": 5,
      "rotationInterval": "daily"
    },
    {
      "type": "console",
      "level": "WARN"
    }
  ],
  "excludeFields": [
    "tokens",
    "credentials",
    "personalData"
  ]
}
```

## Authentication Setup

### OAuth 2.0 Configuration

**Google Cloud Console Setup**:
1. Navigate to Google Cloud Console
2. Select your project
3. Go to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth 2.0 Client ID"
5. Choose "Desktop Application"
6. Configure authorized redirect URIs

**OAuth Scopes Configuration**:
```javascript
const requiredScopes = {
  gmail: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.metadata'
  ],
  calendar: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
  ],
  drive: [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.metadata.readonly'
  ],
  docs: [
    'https://www.googleapis.com/auth/documents'
  ],
  sheets: [
    'https://www.googleapis.com/auth/spreadsheets'
  ]
};
```

### Initial Authentication

**First-Time Setup**:
```bash
# Initialize authentication (starts temporary server for OAuth)
google-mcp-server auth init

# Browser will open automatically for OAuth flow
# Temporary server runs only during authentication
# Tokens will be stored securely locally
```

**Token Management**:
```bash
# Check authentication status
google-mcp-server auth status

# Refresh tokens
google-mcp-server auth refresh

# Revoke tokens
google-mcp-server auth revoke
```

## Service Configuration

### Gmail Configuration

```json
{
  "gmail": {
    "enabled": true,
    "settings": {
      "maxResults": 100,
      "includeSpamTrash": false,
      "format": "metadata",
      "cacheTTL": 300,
      "batchSize": 50
    },
    "filters": {
      "excludeLabels": ["SPAM", "TRASH"],
      "includeLabels": ["INBOX", "IMPORTANT"],
      "maxAge": "30d"
    },
    "attachments": {
      "maxSize": "25MB",
      "allowedTypes": [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpeg",
        "image/png"
      ],
      "virusScanning": true
    }
  }
}
```

### Calendar Configuration

```json
{
  "calendar": {
    "enabled": true,
    "settings": {
      "defaultCalendar": "primary",
      "timeZone": "America/Los_Angeles",
      "maxResults": 250,
      "singleEvents": true,
      "orderBy": "startTime"
    },
    "features": {
      "freebusy": true,
      "notifications": true,
      "attendees": true,
      "recurrence": true
    },
    "defaults": {
      "eventDuration": 60,
      "reminderMinutes": [15, 1440],
      "visibility": "default"
    }
  }
}
```

### Drive Configuration

```json
{
  "drive": {
    "enabled": true,
    "settings": {
      "uploadFolder": "MCP-Uploads",
      "maxFileSize": "10MB",
      "pageSize": 100,
      "includeTeamDrives": false
    },
    "organization": {
      "autoOrganize": true,
      "folderStructure": {
        "documents": "Documents/MCP",
        "spreadsheets": "Spreadsheets/MCP",
        "presentations": "Presentations/MCP",
        "images": "Images/MCP",
        "other": "Files/MCP"
      }
    },
    "backup": {
      "enabled": false,
      "schedule": "daily",
      "retention": "30d",
      "location": "Backups/MCP"
    }
  }
}
```

### Docs Configuration

```json
{
  "docs": {
    "enabled": true,
    "settings": {
      "defaultTemplate": null,
      "suggestionsViewMode": "SUGGESTIONS_INLINE",
      "includeRevisions": false
    },
    "templates": {
      "meetingNotes": "1TemplateId123",
      "projectProposal": "1TemplateId456",
      "statusReport": "1TemplateId789"
    },
    "formatting": {
      "defaultFont": "Arial",
      "defaultFontSize": 11,
      "defaultMargins": {
        "top": 72,
        "bottom": 72,
        "left": 72,
        "right": 72
      }
    }
  }
}
```

### Sheets Configuration

```json
{
  "sheets": {
    "enabled": true,
    "settings": {
      "defaultLocale": "en_US",
      "autoRecalc": "ON_CHANGE",
      "timeZone": "America/Los_Angeles",
      "includeGridData": true
    },
    "formatting": {
      "numberFormat": {
        "currency": "$#,##0.00",
        "percentage": "0.00%",
        "date": "M/d/yyyy"
      },
      "defaultStyles": {
        "headerBackground": "#4285f4",
        "headerTextColor": "#ffffff",
        "alternatingRowColor": "#f8f9fa"
      }
    },
    "limits": {
      "maxCells": 10000000,
      "maxColumns": 18278,
      "maxRows": 1000000
    }
  }
}
```

## Performance Configuration

### Caching Settings

```json
{
  "cache": {
    "enabled": true,
    "provider": "memory",
    "settings": {
      "ttl": 300,
      "maxSize": "50MB",
      "cleanupInterval": 3600,
      "compression": true
    },
    "strategies": {
      "gmail": {
        "metadata": 300,
        "content": 60,
        "attachments": 1800
      },
      "calendar": {
        "events": 300,
        "freebusy": 60
      },
      "drive": {
        "metadata": 600,
        "content": 300
      }
    }
  }
}
```

### Rate Limiting

```json
{
  "rateLimiting": {
    "enabled": true,
    "global": {
      "maxRequests": 1000,
      "windowMs": 60000
    },
    "perService": {
      "gmail": {
        "maxRequests": 250,
        "windowMs": 100000
      },
      "calendar": {
        "maxRequests": 100,
        "windowMs": 100000
      },
      "drive": {
        "maxRequests": 1000,
        "windowMs": 100000
      }
    },
    "backoff": {
      "enabled": true,
      "initialDelay": 1000,
      "maxDelay": 30000,
      "multiplier": 2
    }
  }
}
```

## Integration Configuration

### MCP Client Configuration

**Claude Desktop Integration**:
```json
{
  "mcpServers": {
    "google-services": {
      "command": "google-mcp-server",
      "args": ["--config", "~/.config/google-mcp-server/config.json"],
      "env": {
        "GOOGLE_CLIENT_ID": "your_client_id",
        "GOOGLE_CLIENT_SECRET": "your_client_secret"
      }
    }
  }
}
```

**Custom MCP Client**:
```javascript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'google-mcp-server',
  args: ['--config', './config.json']
});

const client = new Client({
  name: "google-integration-client",
  version: "1.0.0"
}, {
  capabilities: {
    tools: {},
    resources: {}
  }
});

await client.connect(transport);
```

## Monitoring and Debugging

### Local Monitoring

```json
{
  "monitoring": {
    "enabled": true,
    "logMetrics": true,
    "collectInterval": 15000,
    "metrics": [
      "request_count",
      "request_duration",
      "error_rate",
      "cache_hit_ratio",
      "api_quota_usage"
    ],
    "checks": [
      "authentication",
      "apiConnectivity",
      "cacheHealth",
      "diskSpace",
      "memoryUsage"
    ]
  }
}
```

## Troubleshooting

### Common Configuration Issues

**Authentication Problems**:
```bash
# Check OAuth configuration
google-mcp-server auth validate

# Reset authentication
google-mcp-server auth reset

# Test API connectivity
google-mcp-server test connectivity
```

**Performance Issues**:
```bash
# Check cache status
google-mcp-server cache status

# Clear cache
google-mcp-server cache clear

# Monitor performance
google-mcp-server monitor --duration 60s
```

### Debug Configuration

```json
{
  "debug": {
    "enabled": false,
    "level": "DEBUG",
    "modules": [
      "auth",
      "gmail",
      "calendar",
      "drive",
      "cache"
    ],
    "tracing": {
      "enabled": false,
      "sampleRate": 0.1
    }
  }
}
```

## Security Configuration

### Encryption Settings

```json
{
  "encryption": {
    "algorithm": "aes-256-gcm",
    "keyDerivation": {
      "algorithm": "pbkdf2",
      "iterations": 100000,
      "saltLength": 32
    },
    "tokenEncryption": true,
    "cacheEncryption": false
  }
}
```

### Access Control

```json
{
  "accessControl": {
    "maxRequestSize": "10MB",
    "requestTimeout": 30000,
    "allowedClients": [
      "claude-desktop",
      "custom-mcp-client"
    ]
  }
}
```

This configuration guide provides comprehensive setup and customization options for the Google MCP Server, enabling secure and efficient integration with personal assistant applications.
