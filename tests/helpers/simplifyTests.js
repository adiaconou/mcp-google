/**
 * Test Simplification Script
 * 
 * Applies Phase 2 simplifications to existing test files by:
 * 1. Adding factory function imports
 * 2. Replacing verbose mock setups with factory functions
 * 3. Using helper functions for common assertions
 */

const fs = require('fs');
const path = require('path');

// Files to simplify (starting with a few key ones)
const filesToSimplify = [
  'tests/unit/services/drive/tools/createFolder.test.ts',
  'tests/unit/services/calendar/tools/createEvent.test.ts',
  'tests/unit/services/sheets/tools/createSpreadsheet.test.ts'
];

function simplifyTestFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Add factory imports if not present
  if (!content.includes('testFactories')) {
    const importMatch = content.match(/import.*from.*['"].*\/.*['"];?\n/);
    if (importMatch) {
      const lastImport = importMatch[0];
      const importDepth = (filePath.match(/\//g) || []).length - 1; // Count directory depth
      const relativePath = '../'.repeat(importDepth - 1) + 'helpers/testFactories';
      
      const newImport = `import { mockFactories, testHelpers, testPatterns } from '${relativePath}';\n`;
      content = content.replace(lastImport, lastImport + newImport);
      modified = true;
    }
  }

  // Replace common beforeEach patterns
  const beforeEachPattern = /beforeEach\(\(\) => \{\s*jest\.clearAllMocks\(\);\s*\}\);/g;
  if (beforeEachPattern.test(content)) {
    content = content.replace(beforeEachPattern, 'beforeEach(testPatterns.clientTestSetup(mockClient));');
    modified = true;
  }

  // Replace verbose result assertions
  const verboseAssertions = /expect\(result\.isError\)\.toBe\(false\);\s*expect\(result\.content\)\.toHaveLength\(1\);\s*expect\(result\.content\[0\]\.type\)\.toBe\('text'\);/g;
  if (verboseAssertions.test(content)) {
    content = content.replace(verboseAssertions, 'const text = testHelpers.expectSuccessResult(result);');
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`Simplified: ${filePath}`);
  } else {
    console.log(`No changes needed: ${filePath}`);
  }
}

// Apply simplifications
console.log('Starting test simplification...');
filesToSimplify.forEach(simplifyTestFile);
console.log('Test simplification complete!');
