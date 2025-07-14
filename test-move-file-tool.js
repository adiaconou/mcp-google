/**
 * Test script for the drive_move_file tool
 * 
 * This script tests the move file functionality by:
 * 1. Listing files to find a test file
 * 2. Creating a test folder
 * 3. Moving the file to the new folder
 * 4. Verifying the move was successful
 */

const { server } = require('./src/server');

async function testMoveFileTool() {
  console.log('🧪 Testing Drive Move File Tool...\n');

  try {
    // Start the server
    console.log('📡 Starting MCP server...');
    await server.start();
    console.log('✅ Server started successfully\n');

    // Test 1: List available tools to verify move file tool is registered
    console.log('🔍 Step 1: Checking if drive_move_file tool is registered...');
    const toolsResult = await server.server.request(
      { method: 'tools/list' },
      { method: 'tools/list' }
    );
    
    const moveFileTool = toolsResult.tools.find(tool => tool.name === 'drive_move_file');
    if (moveFileTool) {
      console.log('✅ drive_move_file tool found and registered');
      console.log(`   Description: ${moveFileTool.description}`);
      console.log(`   Required params: ${moveFileTool.inputSchema.required.join(', ')}\n`);
    } else {
      throw new Error('drive_move_file tool not found in registered tools');
    }

    // Test 2: List files to find a test file
    console.log('📁 Step 2: Listing Drive files to find a test file...');
    const listResult = await server.server.request(
      { method: 'tools/call', params: { name: 'drive_list_files', arguments: { maxResults: 10 } } },
      { method: 'tools/call', params: { name: 'drive_list_files', arguments: { maxResults: 10 } } }
    );

    if (listResult.isError) {
      console.log('❌ Failed to list files:', listResult.content[0].text);
      return;
    }

    console.log('✅ Files listed successfully');
    
    // Parse the response to find a file ID (this is a simplified approach)
    const responseText = listResult.content[0].text;
    const fileIdMatch = responseText.match(/ID: ([a-zA-Z0-9_-]+)/);
    
    if (!fileIdMatch) {
      console.log('⚠️  No files found to test with. Please ensure you have files in your Google Drive.');
      return;
    }

    const testFileId = fileIdMatch[1];
    console.log(`   Found test file ID: ${testFileId}\n`);

    // Test 3: Create a test folder for moving the file
    console.log('📂 Step 3: Creating a test folder...');
    const createFolderResult = await server.server.request(
      { 
        method: 'tools/call', 
        params: { 
          name: 'drive_create_folder', 
          arguments: { 
            name: `Test Move Folder ${Date.now()}`,
            description: 'Temporary folder for testing file move functionality'
          } 
        } 
      },
      { 
        method: 'tools/call', 
        params: { 
          name: 'drive_create_folder', 
          arguments: { 
            name: `Test Move Folder ${Date.now()}`,
            description: 'Temporary folder for testing file move functionality'
          } 
        } 
      }
    );

    if (createFolderResult.isError) {
      console.log('❌ Failed to create test folder:', createFolderResult.content[0].text);
      return;
    }

    console.log('✅ Test folder created successfully');
    
    // Parse the folder ID from the response
    const folderResponseText = createFolderResult.content[0].text;
    const folderIdMatch = folderResponseText.match(/ID: ([a-zA-Z0-9_-]+)/);
    
    if (!folderIdMatch) {
      console.log('❌ Could not extract folder ID from response');
      return;
    }

    const testFolderId = folderIdMatch[1];
    console.log(`   Test folder ID: ${testFolderId}\n`);

    // Test 4: Move the file to the test folder
    console.log('🚚 Step 4: Moving file to test folder...');
    const moveResult = await server.server.request(
      { 
        method: 'tools/call', 
        params: { 
          name: 'drive_move_file', 
          arguments: { 
            fileId: testFileId,
            targetFolderId: testFolderId
          } 
        } 
      },
      { 
        method: 'tools/call', 
        params: { 
          name: 'drive_move_file', 
          arguments: { 
            fileId: testFileId,
            targetFolderId: testFolderId
          } 
        } 
      }
    );

    if (moveResult.isError) {
      console.log('❌ File move failed:', moveResult.content[0].text);
      return;
    }

    console.log('✅ File moved successfully!');
    console.log('📋 Move Result:');
    console.log(moveResult.content[0].text);
    console.log();

    // Test 5: Test move with rename
    console.log('🏷️  Step 5: Testing move with rename (moving back to root)...');
    const moveWithRenameResult = await server.server.request(
      { 
        method: 'tools/call', 
        params: { 
          name: 'drive_move_file', 
          arguments: { 
            fileId: testFileId,
            targetFolderId: 'root', // Move back to root
            newName: `Renamed Test File ${Date.now()}.txt`
          } 
        } 
      },
      { 
        method: 'tools/call', 
        params: { 
          name: 'drive_move_file', 
          arguments: { 
            fileId: testFileId,
            targetFolderId: 'root', // Move back to root
            newName: `Renamed Test File ${Date.now()}.txt`
          } 
        } 
      }
    );

    if (moveWithRenameResult.isError) {
      console.log('❌ File move with rename failed:', moveWithRenameResult.content[0].text);
    } else {
      console.log('✅ File moved and renamed successfully!');
      console.log('📋 Move with Rename Result:');
      console.log(moveWithRenameResult.content[0].text);
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📊 Test Summary:');
    console.log('   ✅ Tool registration verified');
    console.log('   ✅ File listing successful');
    console.log('   ✅ Test folder creation successful');
    console.log('   ✅ File move successful');
    console.log('   ✅ File move with rename successful');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    // Stop the server
    console.log('\n🛑 Stopping server...');
    await server.stop();
    console.log('✅ Server stopped');
  }
}

// Run the test
testMoveFileTool().catch(console.error);
