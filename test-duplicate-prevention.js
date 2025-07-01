#!/usr/bin/env node

/**
 * Test script for Task 2: Duplicate File Processing Prevention
 * 
 * This script tests the enhanced duplicate prevention system by creating
 * test files and monitoring how the system handles them.
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class DuplicatePreventionTest {
  constructor() {
    this.testDir = path.join(os.homedir(), 'Downloads', 'silentsort-test');
    this.testFiles = [];
  }

  async runTest() {
    console.log('🧪 Starting Duplicate Prevention Test for Task 2');
    console.log('📁 Test directory:', this.testDir);

    try {
      await this.setupTestEnvironment();
      await this.testBasicDuplicatePrevention();
      await this.testDifferentFileStatuses();
      await this.testFileValidation();
      await this.cleanup();
      
      console.log('✅ All duplicate prevention tests completed successfully!');
    } catch (error) {
      console.error('❌ Test failed:', error);
      await this.cleanup();
    }
  }

  async setupTestEnvironment() {
    console.log('\n🔧 Setting up test environment...');
    
    // Create test directory if it doesn't exist
    try {
      await fs.mkdir(this.testDir, { recursive: true });
      console.log('✅ Test directory created/verified');
    } catch (error) {
      console.log('⚠️ Test directory already exists or error:', error.message);
    }

    // Clean up any existing test files
    try {
      const files = await fs.readdir(this.testDir);
      for (const file of files) {
        if (file.startsWith('test-')) {
          await fs.unlink(path.join(this.testDir, file));
        }
      }
      console.log('✅ Cleaned up existing test files');
    } catch (error) {
      console.log('⚠️ No existing test files to clean up');
    }
  }

  async testBasicDuplicatePrevention() {
    console.log('\n🔍 Test 1: Basic Duplicate Prevention');
    
    const testFile = path.join(this.testDir, 'test-duplicate-basic.txt');
    this.testFiles.push(testFile);

    // Create file with content
    await fs.writeFile(testFile, 'This is a test file for duplicate prevention.\nContent: Basic duplicate test');
    console.log('📄 Created test file:', path.basename(testFile));

    // Wait for processing
    await this.sleep(3000);

    // Simulate duplicate file modifications (rapid changes)
    console.log('🔄 Simulating rapid file modifications...');
    for (let i = 0; i < 3; i++) {
      await fs.writeFile(testFile, `Modified content ${i + 1}\nTimestamp: ${new Date().toISOString()}`);
      console.log(`   Modification ${i + 1} - should be prevented if within cache duration`);
      await this.sleep(2000);
    }

    console.log('✅ Basic duplicate prevention test completed');
  }

  async testDifferentFileStatuses() {
    console.log('\n🔍 Test 2: Different File Status Handling');

    // Test hidden file (should be skipped)
    const hiddenTestFile = path.join(this.testDir, '.test-hidden-file.txt');
    this.testFiles.push(hiddenTestFile);
    
    console.log('📄 Creating hidden file (should be skipped)...');
    await fs.writeFile(hiddenTestFile, 'Hidden file content');
    console.log('✅ Hidden file created - should be skipped');

    await this.sleep(2000);

    // Test temp file (should be skipped)
    const tempTestFile = path.join(this.testDir, 'test-temp-file.tmp');
    this.testFiles.push(tempTestFile);
    
    console.log('📄 Creating temp file (should be skipped)...');
    await fs.writeFile(tempTestFile, 'Temp file content');
    console.log('✅ Temp file created - should be skipped');

    await this.sleep(2000);
  }

  async testFileValidation() {
    console.log('\n🔍 Test 3: File Validation');

    // Test normal file (should be processed)
    const normalFile = path.join(this.testDir, 'test-normal-file.pdf');
    this.testFiles.push(normalFile);
    
    console.log('📄 Creating normal PDF file (should be processed)...');
    await fs.writeFile(normalFile, 'PDF file content simulation\n%PDF-1.4\nThis is a test PDF file.');
    console.log('✅ Normal PDF file created - should be processed');

    await this.sleep(3000);

    // Test JavaScript file (should be processed)
    const jsFile = path.join(this.testDir, 'test-script.js');
    this.testFiles.push(jsFile);
    
    console.log('📄 Creating JavaScript file (should be processed)...');
    await fs.writeFile(jsFile, `
// Test JavaScript file
function testFunction() {
  console.log('This is a test function');
  return true;
}

module.exports = { testFunction };
    `);
    console.log('✅ JavaScript file created - should be processed');

    await this.sleep(3000);
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up test files...');
    
    for (const testFile of this.testFiles) {
      try {
        await fs.unlink(testFile);
        console.log('🗑️ Removed:', path.basename(testFile));
      } catch (error) {
        console.log('⚠️ Could not remove:', path.basename(testFile), '-', error.message);
      }
    }
    
    console.log('✅ Cleanup completed');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Instructions for manual testing
console.log(`
🔧 DUPLICATE PREVENTION TEST - TASK 2

This test will:
1. Create various test files in ~/Downloads/silentsort-test/
2. Monitor how the system handles duplicates and different file types
3. Clean up automatically

WHAT TO WATCH FOR:
✅ Files should only be processed once within the cache duration (10 seconds)
✅ Hidden files (.filename) should be skipped  
✅ Temp files (.tmp, ~) should be skipped
✅ System files (._filename) should be skipped
✅ Normal files should be processed with AI analysis

MONITORING:
- Watch the Electron app console for processing logs
- Look for "⏭️ Skipping recently processed file" messages
- Check "📋 File processing cache updated" messages

Starting test in 3 seconds...
`);

// Run the test
setTimeout(async () => {
  const test = new DuplicatePreventionTest();
  await test.runTest();
}, 3000); 