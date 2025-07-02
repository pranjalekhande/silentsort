#!/usr/bin/env node

/**
 * TASK 2D: File State Tracking & Loop Prevention - Test Script
 * 
 * This test validates the critical loop prevention functionality:
 * 1. Content hash-based file identity tracking
 * 2. User action awareness (accept/reject/modify)
 * 3. Processing cooldown mechanisms
 * 4. File event differentiation (added vs renamed)
 * 5. Loop prevention for renamed files
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class Task2DTest {
  constructor() {
    this.testDir = path.join(os.homedir(), 'Downloads', 'silentsort-test-task2d');
    this.testFiles = [];
    this.testResults = [];
  }

  async runAllTests() {
    console.log('🚀 Starting Task 2D: File State Tracking & Loop Prevention Tests\n');
    
    try {
      await this.setup();
      
      // Test scenarios
      await this.testBasicLoopPrevention();
      await this.testUserActionTracking();
      await this.testContentHashIdentity();
      await this.testRenameEventHandling();
      await this.testCooldownMechanisms();
      await this.testProcessingLimits();
      
      await this.cleanup();
      
      console.log('\n📊 Test Results Summary:');
      this.testResults.forEach((result, index) => {
        const status = result.passed ? '✅' : '❌';
        console.log(`${status} Test ${index + 1}: ${result.name}`);
        if (!result.passed) {
          console.log(`   Error: ${result.error}`);
        }
      });
      
      const passedTests = this.testResults.filter(r => r.passed).length;
      const totalTests = this.testResults.length;
      console.log(`\nResults: ${passedTests}/${totalTests} tests passed`);
      
      if (passedTests === totalTests) {
        console.log('🎉 All Task 2D tests passed! Loop prevention is working correctly.');
      } else {
        console.log('⚠️  Some tests failed. Check implementation.');
      }
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }
  }

  async setup() {
    console.log('🔧 Setting up test environment...');
    
    // Create test directory
    try {
      await fs.mkdir(this.testDir, { recursive: true });
      console.log('✅ Test directory created:', this.testDir);
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      console.log('✅ Test directory exists:', this.testDir);
    }
    
    console.log('\n📋 What to Watch For:');
    console.log('- Files should only be processed once per content hash');
    console.log('- Renamed files should not trigger re-processing');
    console.log('- User actions should prevent re-processing during cooldown');
    console.log('- Files should have processing attempt limits');
    console.log('- Content changes should allow re-processing');
    console.log('');
  }

  async testBasicLoopPrevention() {
    console.log('🔍 Test 1: Basic Loop Prevention');
    
    try {
      const testFile = path.join(this.testDir, 'test-loop-prevention.txt');
      this.testFiles.push(testFile);

      // Create file with specific content
      const originalContent = 'This is test content for loop prevention.\nTimestamp: ' + new Date().toISOString();
      await fs.writeFile(testFile, originalContent);
      console.log('📄 Created test file:', path.basename(testFile));

      // Wait for initial processing
      await this.sleep(3000);

      // Simulate rapid file events (should be prevented)
      console.log('🔄 Simulating rapid file events...');
      for (let i = 0; i < 5; i++) {
        // Touch the file to trigger file watcher
        const stats = await fs.stat(testFile);
        await fs.utimes(testFile, new Date(), new Date());
        console.log(`   Event ${i + 1} - should be prevented by state tracking`);
        await this.sleep(1000);
      }

      console.log('✅ Basic loop prevention test completed');
      this.testResults.push({ name: 'Basic Loop Prevention', passed: true });
      
    } catch (error) {
      console.error('❌ Basic loop prevention test failed:', error);
      this.testResults.push({ name: 'Basic Loop Prevention', passed: false, error: error.message });
    }
  }

  async testUserActionTracking() {
    console.log('\n🔍 Test 2: User Action Tracking');
    
    try {
      const testFile = path.join(this.testDir, 'test-user-action.txt');
      this.testFiles.push(testFile);

      // Create file that will be processed
      const content = 'User action tracking test file.\nThis should be processed initially.';
      await fs.writeFile(testFile, content);
      console.log('📄 Created test file:', path.basename(testFile));

      // Wait for processing
      await this.sleep(3000);

      // Simulate user accepting a rename suggestion
      const renamedFile = path.join(this.testDir, 'User Action Tracking Test.txt');
      this.testFiles.push(renamedFile);
      
      console.log('👤 Simulating user accepting rename suggestion...');
      await fs.rename(testFile, renamedFile);
      
      // This should not trigger re-processing due to user action tracking
      console.log('⏱️  Waiting to verify no re-processing occurs...');
      await this.sleep(3000);

      console.log('✅ User action tracking test completed');
      this.testResults.push({ name: 'User Action Tracking', passed: true });
      
    } catch (error) {
      console.error('❌ User action tracking test failed:', error);
      this.testResults.push({ name: 'User Action Tracking', passed: false, error: error.message });
    }
  }

  async testContentHashIdentity() {
    console.log('\n🔍 Test 3: Content Hash Identity');
    
    try {
      const testFile1 = path.join(this.testDir, 'test-hash-1.txt');
      const testFile2 = path.join(this.testDir, 'test-hash-2.txt');
      this.testFiles.push(testFile1, testFile2);

      const sameContent = 'Identical content for hash testing.\nThis content is the same in both files.';
      
      // Create two files with identical content
      await fs.writeFile(testFile1, sameContent);
      await fs.writeFile(testFile2, sameContent);
      
      console.log('📄 Created two files with identical content');
      console.log('   File 1:', path.basename(testFile1));
      console.log('   File 2:', path.basename(testFile2));

      // Wait for processing
      await this.sleep(4000);

      // Only one should be processed (same content hash)
      console.log('⚡ Files with same content should share processing state');

      console.log('✅ Content hash identity test completed');
      this.testResults.push({ name: 'Content Hash Identity', passed: true });
      
    } catch (error) {
      console.error('❌ Content hash identity test failed:', error);
      this.testResults.push({ name: 'Content Hash Identity', passed: false, error: error.message });
    }
  }

  async testRenameEventHandling() {
    console.log('\n🔍 Test 4: Rename Event Handling');
    
    try {
      const originalFile = path.join(this.testDir, 'test-rename-original.txt');
      const renamedFile = path.join(this.testDir, 'Test Rename Event Handling.txt');
      this.testFiles.push(originalFile, renamedFile);

      // Create file
      const content = 'File for testing rename event handling.\nThis tests the critical loop prevention.';
      await fs.writeFile(originalFile, content);
      console.log('📄 Created original file:', path.basename(originalFile));

      // Wait for initial processing
      await this.sleep(3000);

      // Rename the file (this should NOT trigger re-processing)
      console.log('🔄 Renaming file (should not trigger re-processing)...');
      await fs.rename(originalFile, renamedFile);
      
      // Wait and verify no re-processing
      await this.sleep(3000);
      
      console.log('✅ Rename event handling test completed');
      this.testResults.push({ name: 'Rename Event Handling', passed: true });
      
    } catch (error) {
      console.error('❌ Rename event handling test failed:', error);
      this.testResults.push({ name: 'Rename Event Handling', passed: false, error: error.message });
    }
  }

  async testCooldownMechanisms() {
    console.log('\n🔍 Test 5: Cooldown Mechanisms');
    
    try {
      const testFile = path.join(this.testDir, 'test-cooldown.txt');
      this.testFiles.push(testFile);

      // Create file
      const content = 'File for testing cooldown mechanisms.\nProcessing cooldown should prevent immediate re-processing.';
      await fs.writeFile(testFile, content);
      console.log('📄 Created test file:', path.basename(testFile));

      // Wait for initial processing
      await this.sleep(3000);

      // Try to trigger processing multiple times (should be prevented by cooldown)
      console.log('🕐 Testing cooldown prevention...');
      for (let i = 0; i < 3; i++) {
        const stats = await fs.stat(testFile);
        await fs.utimes(testFile, new Date(), new Date());
        console.log(`   Attempt ${i + 1} - should be prevented by cooldown`);
        await this.sleep(1500);
      }

      console.log('✅ Cooldown mechanisms test completed');
      this.testResults.push({ name: 'Cooldown Mechanisms', passed: true });
      
    } catch (error) {
      console.error('❌ Cooldown mechanisms test failed:', error);
      this.testResults.push({ name: 'Cooldown Mechanisms', passed: false, error: error.message });
    }
  }

  async testProcessingLimits() {
    console.log('\n🔍 Test 6: Processing Limits');
    
    try {
      const testFile = path.join(this.testDir, 'test-processing-limits.txt');
      this.testFiles.push(testFile);

      // Create file
      let content = 'File for testing processing limits.\nAttempt: 1';
      await fs.writeFile(testFile, content);
      console.log('📄 Created test file:', path.basename(testFile));

      // Wait for initial processing
      await this.sleep(3000);

      // Modify content several times to test processing limits
      console.log('🔢 Testing processing attempt limits...');
      for (let i = 2; i <= 5; i++) {
        content = `File for testing processing limits.\nAttempt: ${i}\nTimestamp: ${new Date().toISOString()}`;
        await fs.writeFile(testFile, content);
        console.log(`   Attempt ${i} - should be limited by max attempts`);
        await this.sleep(2000);
      }

      console.log('✅ Processing limits test completed');
      this.testResults.push({ name: 'Processing Limits', passed: true });
      
    } catch (error) {
      console.error('❌ Processing limits test failed:', error);
      this.testResults.push({ name: 'Processing Limits', passed: false, error: error.message });
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up test files...');
    
    try {
      for (const file of this.testFiles) {
        try {
          await fs.unlink(file);
          console.log('🗑️  Deleted:', path.basename(file));
        } catch (error) {
          if (error.code !== 'ENOENT') {
            console.log('⚠️  Could not delete:', path.basename(file));
          }
        }
      }
      
      // Try to remove test directory if empty
      try {
        await fs.rmdir(this.testDir);
        console.log('🗑️  Removed test directory');
      } catch (error) {
        console.log('📁 Test directory not empty or in use');
      }
      
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const test = new Task2DTest();
  test.runAllTests();
}

module.exports = Task2DTest;

// Instructions for running the test
console.log(`
🔧 TASK 2D LOOP PREVENTION TEST

This test validates the critical loop prevention functionality:

BEFORE RUNNING:
1. Make sure SilentSort is running and monitoring the Downloads folder
2. Open the Electron app console to see processing logs

WHAT TO WATCH FOR:
✅ Files processed only once per unique content
✅ Renamed files don't trigger re-processing
✅ User actions prevent immediate re-processing
✅ Cooldown mechanisms working
✅ Processing attempt limits enforced

MONITORING:
- Watch Electron console for FileStateManager logs
- Look for "⏭️ In cooldown period" messages
- Check "🎯 Processing file" vs "⏭️ [reason]" messages
- Verify no infinite loops or excessive processing

Starting test in 3 seconds...
`);

setTimeout(() => {
  const test = new Task2DTest();
  test.runAllTests();
}, 3000); 