#!/usr/bin/env node

/**
 * Test script for duplicate detection UI integration
 * 
 * This script tests that the UI properly displays and handles duplicate detection
 * data from the backend.
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class DuplicateUITest {
  constructor() {
    this.testDir = path.join(os.homedir(), 'Downloads', 'silentsort-test');
    this.testFiles = [];
  }

  async runTest() {
    console.log('🧪 Starting Duplicate Detection UI Integration Test');
    console.log('📁 Test directory:', this.testDir);

    try {
      await this.setupTestEnvironment();
      await this.testDuplicateUIDisplay();
      await this.testSmartTagsDisplay();
      await this.testMixedScenarios();
      await this.cleanup();
      
      console.log('\n✅ All duplicate detection UI tests completed!');
      console.log('\n📋 Expected UI Behavior:');
      console.log('1. Files with duplicates should show orange border');
      console.log('2. Duplicate warning banner should appear');
      console.log('3. Duplicate action buttons should be visible');
      console.log('4. Smart tags should display in compact view');
      console.log('5. Better version recommendations should show');
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      await this.cleanup();
    }
  }

  async setupTestEnvironment() {
    console.log('\n🔧 Setting up test environment...');
    
    try {
      await fs.mkdir(this.testDir, { recursive: true });
      console.log('✅ Test directory created');
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
      console.log('📁 Test directory already exists');
    }
  }

  async testDuplicateUIDisplay() {
    console.log('\n🎨 Test 1: Duplicate UI Display');
    
    const duplicateContent = `
INVOICE #INV-2024-003
Apple Services
December 2024

Service: iCloud Storage Plan
Amount: $9.99
Due Date: January 1, 2025

Payment Method: Credit Card ending in 1234
Customer: John Smith
Email: john.smith@email.com
    `;

    // Create original file (this should be processed normally)
    const originalFile = path.join(this.testDir, 'apple_services_invoice_clean.pdf');
    await fs.writeFile(originalFile, duplicateContent);
    this.testFiles.push(originalFile);
    console.log('📄 Created clean original file');

    // Wait for processing
    await this.sleep(3000);

    // Create exact duplicate (this should trigger duplicate detection)
    const duplicateFile = path.join(this.testDir, 'copy_of_apple_invoice.pdf');
    await fs.writeFile(duplicateFile, duplicateContent);
    this.testFiles.push(duplicateFile);
    console.log('📄 Created duplicate file - should trigger UI warnings');

    // Wait for duplicate detection
    await this.sleep(4000);

    console.log('✅ Duplicate UI test files created');
    console.log('   Expected: Orange border, duplicate warning, action buttons');
  }

  async testSmartTagsDisplay() {
    console.log('\n🏷️ Test 2: Smart Tags UI Display');

    const taggedContent = `
ANNUAL REPORT 2024
Technology Company Performance

EXECUTIVE SUMMARY
Revenue: $50M (+25% YoY)
Employees: 500
Locations: 5 countries

TECHNOLOGIES USED:
- React, TypeScript, Node.js
- AWS, Docker, Kubernetes
- Machine Learning, AI

FINANCIAL HIGHLIGHTS:
Q1: $10M, Q2: $12M, Q3: $13M, Q4: $15M
    `;

    const taggedFile = path.join(this.testDir, 'annual_technology_report_2024.pdf');
    await fs.writeFile(taggedFile, taggedContent);
    this.testFiles.push(taggedFile);
    console.log('📄 Created file with rich content (should generate many smart tags)');

    await this.sleep(3000);

    console.log('✅ Smart tags test file created');
    console.log('   Expected: Smart tags display with technology, year, report tags');
  }

  async testMixedScenarios() {
    console.log('\n🔀 Test 3: Mixed Scenarios (Duplicates + Tags + Folder Suggestions)');

    const complexContent = `
MONTHLY MEETING NOTES
Product Strategy Session
December 15, 2024

ATTENDEES:
- CEO: Sarah Johnson
- CTO: Mike Chen  
- Product Manager: Lisa Rodriguez
- Engineering Lead: David Kim

TOPICS DISCUSSED:
1. Q4 Revenue Review ($2.3M achieved)
2. 2025 Product Roadmap
3. Technology Stack Updates
4. Team Expansion Plans

ACTION ITEMS:
- Finalize Q1 budget by Dec 30
- Interview 3 senior engineers 
- Launch beta testing for new feature
- Schedule all-hands meeting for January

NEXT MEETING: January 15, 2025
    `;

    // Create well-named file
    const wellNamed = path.join(this.testDir, 'Product Strategy Meeting Notes Dec 2024.md');
    await fs.writeFile(wellNamed, complexContent);
    this.testFiles.push(wellNamed);
    console.log('📄 Created well-named meeting notes');

    await this.sleep(2000);

    // Create messy duplicate
    const messyDuplicate = path.join(this.testDir, 'meeting_notes_temp_final_v2.md');
    await fs.writeFile(messyDuplicate, complexContent);
    this.testFiles.push(messyDuplicate);
    console.log('📄 Created messy duplicate (should suggest better version)');

    await this.sleep(3000);

    console.log('✅ Mixed scenario test completed');
    console.log('   Expected: Better version suggestion, smart tags, folder suggestion');
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

// Instructions
console.log(`
🎨 DUPLICATE DETECTION UI INTEGRATION TEST

This test creates files to verify the UI properly displays:

🔍 DUPLICATE DETECTION UI:
- Orange border on cards with duplicates
- Duplicate warning banner with count
- "Better version available" indicator
- Duplicate action buttons (Keep Both, Replace, Delete)

🏷️ SMART TAGS UI:
- Compact tags in main card view
- Full tags in expanded details
- Tag-based search functionality

🎯 INTEGRATION FEATURES:
- Enhanced search including duplicates and tags
- Proper action handling for duplicate scenarios
- Visual indicators for file status

TESTING STEPS:
1. Start SilentSort Electron app
2. Run this test script
3. Watch the UI for duplicate detection features
4. Test the duplicate action buttons
5. Verify smart tags display correctly

Starting test in 3 seconds...
`);

setTimeout(async () => {
  const test = new DuplicateUITest();
  await test.runTest();
}, 3000); 