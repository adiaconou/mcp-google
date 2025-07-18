#!/usr/bin/env node

/**
 * OAuth Scope Management Test - Verify Phase 1 & 2 Implementation
 * 
 * This script tests the enhanced OAuth scope management features
 * to ensure Gmail tools work with proper scope detection.
 */

const { oauthManager } = require('./dist/auth/oauthManager');

async function testScopeManagement() {
  try {
    console.log('🔍 Testing OAuth Scope Management...\n');

    // Test 1: Check current authentication status
    console.log('1. Checking authentication status...');
    const isAuth = await oauthManager.instance.isAuthenticated();
    console.log(`   Authentication status: ${isAuth ? '✅ Authenticated' : '❌ Not authenticated'}`);

    // Test 2: Validate token scopes
    console.log('\n2. Validating token scopes...');
    const hasValidScopes = await oauthManager.instance.validateTokenScopes();
    console.log(`   Scope validation: ${hasValidScopes ? '✅ All scopes present' : '❌ Missing scopes'}`);

    // Test 3: Get current and required scopes
    console.log('\n3. Scope comparison...');
    const currentScopes = await oauthManager.instance.getCurrentScopesAsync();
    const requiredScopes = oauthManager.instance.getRequiredScopes();
    
    console.log(`   Required scopes: ${requiredScopes.length}`);
    requiredScopes.forEach(scope => console.log(`     - ${scope}`));
    
    console.log(`   Current scopes: ${currentScopes.length}`);
    currentScopes.forEach(scope => console.log(`     - ${scope}`));

    const comparison = oauthManager.instance.compareScopes(currentScopes, requiredScopes);
    if (comparison.missing.length > 0) {
      console.log(`   ❌ Missing scopes: ${comparison.missing.join(', ')}`);
    } else {
      console.log('   ✅ All required scopes are present');
    }

    // Test 4: Test scope enforcement
    console.log('\n4. Testing scope enforcement...');
    try {
      await oauthManager.instance.ensureScopes();
      console.log('   ✅ Scope enforcement passed');
    } catch (error) {
      console.log(`   ⚠️  Scope enforcement triggered: ${error.message}`);
    }

    console.log('\n🎉 Scope management test completed!');
    console.log('\n📋 Summary:');
    console.log(`   - Authentication: ${isAuth ? 'Ready' : 'Required'}`);
    console.log(`   - Scope validation: ${hasValidScopes ? 'Passed' : 'Failed'}`);
    console.log(`   - Missing scopes: ${comparison.missing.length}`);
    
    if (!isAuth || !hasValidScopes) {
      console.log('\n🔧 Recommended action:');
      console.log('   Run: node clear-tokens.js');
      console.log('   Then restart MCP server and authenticate with Gmail permissions');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testScopeManagement();
