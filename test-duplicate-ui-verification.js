#!/usr/bin/env node

/**
 * Duplicate Detection UI Verification Test
 * 
 * This script creates test files to verify that duplicate detection is working
 * and properly displaying in the UI.
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class DuplicateVerificationTest {
  constructor() {
    this.testDir = path.join(os.homedir(), 'Downloads', 'silentsort-test');
    this.testFiles = [];
  }

  async runTest() {
    console.log('🧪 DUPLICATE DETECTION UI VERIFICATION TEST');
    console.log('==========================================');
    console.log('📁 Test directory:', this.testDir);

    try {
      await this.setupTestEnvironment();
      await this.testExactDuplicates();
      await this.testBetterVersionDetection();
      await this.testUI();
      
      console.log('\n✅ TEST COMPLETED!');
      console.log('\n🎯 VERIFICATION CHECKLIST:');
      console.log('□ 1. Open SilentSort app');
      console.log('□ 2. Check for orange borders on duplicate files');
      console.log('□ 3. Look for duplicate warning banners');
      console.log('□ 4. Verify duplicate action buttons appear');
      console.log('□ 5. Check "Better version available" notifications');
      console.log('□ 6. Test duplicate action buttons (Keep Both, Replace, Delete)');
      console.log('\n⏳ Keeping files for 30 seconds for testing...');
      
      setTimeout(async () => {
        await this.cleanup();
        console.log('\n🧹 Test files cleaned up!');
      }, 30000);
      
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

  async testExactDuplicates() {
    console.log('\n🔄 TEST 1: Creating Exact Duplicates');
    
    const originalContent = `
INVOICE #INV-2024-12-001
TechCorp Solutions Inc.
December 15, 2024

BILL TO:
John Smith
123 Main Street
Anytown, NY 12345

SERVICES:
- Web Development: $5,000.00
- Consulting: $2,500.00
- Maintenance: $1,200.00

TOTAL AMOUNT: $8,700.00
DUE DATE: January 15, 2025

Thank you for your business!
    `;

    // Create original file (clean, descriptive name)
    const originalFile = path.join(this.testDir, 'TechCorp_Invoice_Dec2024_INV-2024-12-001.txt');
    await fs.writeFile(originalFile, originalContent);
    this.testFiles.push(originalFile);
    console.log('📄 Created ORIGINAL: TechCorp_Invoice_Dec2024_INV-2024-12-001.txt');

    // Wait for AI processing
    await this.sleep(3000);

    // Create exact duplicate with poor name (should be detected as duplicate)
    const duplicateFile = path.join(this.testDir, 'untitled_document_copy.txt');
    await fs.writeFile(duplicateFile, originalContent);
    this.testFiles.push(duplicateFile);
    console.log('📄 Created DUPLICATE: untitled_document_copy.txt');
    console.log('   ✅ Expected UI: Orange border, "⚠️ DUPLICATE DETECTED" banner');
    console.log('   ✅ Expected UI: Better version suggestion pointing to original');

    // Wait for duplicate detection
    await this.sleep(4000);
  }

  async testBetterVersionDetection() {
    console.log('\n🎯 TEST 2: Better Version Detection');

    const reportContent = `
QUARTERLY BUSINESS REPORT
Q4 2024 Performance Analysis

EXECUTIVE SUMMARY:
Revenue grew 35% YoY to $12.5M
Customer base expanded by 500 users
New product launches exceeded targets

KEY METRICS:
- Monthly Recurring Revenue: $3.2M (+28%)
- Customer Acquisition Cost: $150 (-15%)
- Customer Lifetime Value: $2,400 (+20%)
- Churn Rate: 2.1% (-0.8%)

NEXT QUARTER FOCUS:
1. Scale engineering team
2. Launch mobile app
3. Expand to European markets
4. Implement AI features

Report prepared by: Financial Team
Date: December 20, 2024
    `;

    // Create poorly named version first
    const poorVersion = path.join(this.testDir, 'document1_temp.txt');
    await fs.writeFile(poorVersion, reportContent);
    this.testFiles.push(poorVersion);
    console.log('📄 Created POOR VERSION: document1_temp.txt');

    await this.sleep(3000);

    // Create well-named version (should be detected as better)
    const betterVersion = path.join(this.testDir, 'Q4_2024_Business_Performance_Report.txt');
    await fs.writeFile(betterVersion, reportContent);
    this.testFiles.push(betterVersion);
    console.log('📄 Created BETTER VERSION: Q4_2024_Business_Performance_Report.txt');
    console.log('   ✅ Expected UI: "💡 Better version available" with replace option');

    await this.sleep(4000);
  }

  async testUI() {
    console.log('\n🎨 TEST 3: UI Integration Verification');
    
    console.log('\n📋 EXPECTED UI ELEMENTS:');
    console.log('1. 🟠 File cards with ORANGE BORDERS for duplicates');
    console.log('2. ⚠️  "DUPLICATE DETECTED" warning banners');
    console.log('3. 📊 Duplicate count: "Found X identical files"');
    console.log('4. 💡 "Better version available" recommendations');
    console.log('5. 🔘 Action buttons: 📁 Keep Both, 🔄 Replace, 🗑️ Delete');
    console.log('6. 🏷️ Smart tags for file categories');
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up test files...');
    
    for (const testFile of this.testFiles) {
      try {
        await fs.unlink(testFile);
        console.log('🗑️ Removed:', path.basename(testFile));
      } catch (error) {
        console.log('⚠️ Could not remove:', path.basename(testFile));
      }
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the test
console.log(`
🎯 DUPLICATE DETECTION UI VERIFICATION

This test creates files to verify that:
✅ Duplicate detection backend is working
✅ UI properly displays duplicate information
✅ Action buttons are functional
✅ Better version detection works

🚀 Starting test in 3 seconds...
Make sure SilentSort is running!
`);

setTimeout(async () => {
  const test = new DuplicateVerificationTest();
  await test.runTest();
}, 3000); 