# Drive API Scope Fix

## Problem
You were getting the error "Failed to initialize Drive API client: User is not authenticated" after going through the OAuth flow. This was caused by using the restrictive `drive.file` scope instead of the full `drive` scope.

## Root Cause
The OAuth manager was requesting the `https://www.googleapis.com/auth/drive.file` scope, which only allows access to files created by the application. However, the Drive tools need access to all your Drive files, which requires the broader `https://www.googleapis.com/auth/drive` scope.

## Changes Made

### 1. Updated OAuth Scope in `src/auth/oauthManager.ts`
```typescript
// Before (restrictive)
'https://www.googleapis.com/auth/drive.file'

// After (full access)
'https://www.googleapis.com/auth/drive'
```

### 2. Updated Drive Client Scope Validation in `src/services/drive/driveClient.ts`
```typescript
// Before
private readonly requiredScopes = ['https://www.googleapis.com/auth/drive.file'];

// After  
private readonly requiredScopes = ['https://www.googleapis.com/auth/drive'];
```

### 3. Updated Tests
- Fixed OAuth manager tests to expect the correct scope
- All Drive-related tests continue to pass

## Scope Comparison

| Scope | Access Level | Use Case |
|-------|-------------|----------|
| `drive.file` | Files created by the app only | Limited file management |
| `drive` | All Drive files and folders | Full Drive integration |

## Resolution Steps

1. **Clear existing tokens** (they have the wrong scope):
   ```bash
   node clear-drive-tokens.js
   ```

2. **Restart Claude Desktop completely** to ensure clean state

3. **Try a Drive tool** (like `drive_list_files`) to trigger re-authentication

4. **Complete the OAuth flow** - the new tokens will have the correct scope

## Verification
After re-authentication, your tokens will include the full `drive` scope, allowing access to all your Drive files and folders. The "User is not authenticated" error should be resolved.

## Files Modified
- `src/auth/oauthManager.ts` - Updated scope in GOOGLE_SCOPES array
- `src/services/drive/driveClient.ts` - Updated requiredScopes property
- `tests/unit/oauthManager.test.ts` - Updated test expectations
- `clear-drive-tokens.js` - New utility script for clearing tokens

## Testing
All tests pass with the new scope configuration:
- ✅ OAuth manager tests
- ✅ Drive client tests  
- ✅ Drive tool tests
- ✅ Integration tests
