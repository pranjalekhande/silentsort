#!/usr/bin/env node

/**
 * Test script to verify SilentSort improvements:
 * 1. Timeout fixes for Python service
 * 2. File processing cache functionality
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing SilentSort Improvements...\n');

// Test 1: Create test files quickly to test processing cache
const testDir = '/Users/pranjal/Downloads/silentsort-test';

if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

console.log('1️⃣ Testing file processing cache...');
console.log('   Creating multiple test files quickly to see if duplicates are prevented\n');

// Create files with slight delays to test cache
const testFiles = [
  'cache-test-1.txt',
  'cache-test-2.txt', 
  'cache-test-3.txt'
];

// Create first batch of files
testFiles.forEach((filename, index) => {
  setTimeout(() => {
    const filePath = path.join(testDir, filename);
    const content = `Test file ${index + 1} created at ${new Date().toISOString()}
This is a test document for the SilentSort cache functionality.
It should only be processed once, not multiple times.`;
    
    fs.writeFileSync(filePath, content);
    console.log(`   ✅ Created: ${filename}`);
    
    // Try to modify the same file immediately to test cache
    setTimeout(() => {
      fs.appendFileSync(filePath, '\nModified immediately after creation');
      console.log(`   📝 Modified: ${filename} (should be cached)`);
    }, 100);
    
  }, index * 500);
});

// Test 2: Monitor for timeout improvements
console.log('\n2️⃣ Testing timeout improvements...');
console.log('   Monitor the console for fewer AbortError messages');
console.log('   Python service calls should now wait up to 10 seconds\n');

setTimeout(() => {
  console.log('\n✅ Test files created successfully!');
  console.log('📊 Check your SilentSort console logs for:');
  console.log('   - Fewer timeout/AbortError messages');
  console.log('   - "⏭️ Skipping recently processed file" messages for duplicates');
  console.log('   - Improved response times for Python service calls\n');
  
  console.log('🎯 Expected behavior:');
  console.log('   ✅ Each file should only be processed once');
  console.log('   ✅ Modified files should show "skipping" message');
  console.log('   ✅ Python service timeouts should be rare\n');
  
}, 3000);

// Cleanup after 30 seconds
setTimeout(() => {
  console.log('🧹 Cleaning up test files...');
  testFiles.forEach(filename => {
    const filePath = path.join(testDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`   🗑️ Deleted: ${filename}`);
    }
  });
  console.log('✅ Cleanup complete!');
}, 30000); 