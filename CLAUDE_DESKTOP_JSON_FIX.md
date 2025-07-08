# Claude Desktop JSON Protocol Fix

## Problem
Claude Desktop was showing "Unexpected token" errors when using calendar tools:
- "Unexpected token 'L', 'Listing ev'..." 
- "Unexpected token 'R', 'Retrieved 3 events'"

## Root Cause
The MCP server uses **stdio transport** where:
- **stdout** is reserved for MCP JSON protocol communication
- **stderr** is for debugging/logging output

The calendar client was using `console.log()` which writes to stdout, interfering with the JSON protocol.

## Solution
Changed all `console.log()` statements to `console.error()` in `src/services/calendar/calendarClient.ts`:

### Fixed Lines:
- Line 67: `console.log(...)` → `console.error(...)`  (Listing events message)
- Line 85: `console.log(...)` → `console.error(...)`  (Retrieved events count)
- Line 108: `console.log(...)` → `console.error(...)` (Creating event message)
- Line 120: `console.log(...)` → `console.error(...)` (Event created success)

## Why This Fixes It
- `console.error()` writes to **stderr** (safe for debugging)
- `console.log()` writes to **stdout** (interferes with MCP JSON)
- Claude Desktop expects clean JSON on stdout for MCP protocol

## Result
- Calendar tools now work properly in Claude Desktop
- No more "Unexpected token" errors
- Debugging output still visible in stderr
- All 80 tests continue to pass

## MCP Protocol Rule
**Critical**: When building MCP servers with stdio transport:
- ✅ Use `console.error()` for all debugging/logging
- ❌ Never use `console.log()` - it breaks JSON protocol
- ✅ Only JSON responses should go to stdout

This fix ensures clean MCP protocol communication while preserving debugging capabilities.
