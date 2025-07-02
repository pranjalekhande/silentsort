#!/usr/bin/env node

/**
 * Test script for Task 2B: Duplicate Detection & Smart Tagging
 * 
 * This script tests the new duplicate detection, smart tagging, and folder
 * suggestion features implemented in Task 2B.
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class Task2BTest {
  constructor() {
    this.testDir = path.join(os.homedir(), 'Downloads', 'silentsort-test');
    this.testFiles = [];
  }

  async runTest() {
    console.log('🧪 Starting Task 2B: Duplicate Detection & Smart Tagging Test');
    console.log('📁 Test directory:', this.testDir);

    try {
      await this.setupTestEnvironment();
      await this.testDuplicateDetection();
      await this.testSmartTagging();
      await this.testFolderSuggestions();
      await this.testSimilarFileDetection();
      await this.cleanup();
      
      console.log('✅ All Task 2B tests completed successfully!');
      console.log('\n📊 Test Summary:');
      console.log('🔍 Duplicate Detection: Tests exact content duplicates');
      console.log('🏷️ Smart Tagging: Generates context-based tags');
      console.log('📂 Folder Suggestions: Recommends organization structure');
      console.log('🔗 Similar Files: Detects files with similar content');
      
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

  async testDuplicateDetection() {
    console.log('\n🔍 Test 1: Duplicate Detection');
    
    const originalContent = `
INVOICE #INV-2024-001
Microsoft Azure Services
December 2024

Bill To: Acme Corp
Service Period: Dec 1-31, 2024
Amount Due: $1,250.00

Description: Azure cloud services including:
- Virtual Machines: $800.00
- Storage: $200.00
- Networking: $150.00
- Support: $100.00

Payment Terms: Net 30 days
Due Date: January 31, 2025
    `;

    // Create original file
    const originalFile = path.join(this.testDir, 'microsoft_azure_invoice_december_2024.txt');
    await fs.writeFile(originalFile, originalContent);
    this.testFiles.push(originalFile);
    console.log('📄 Created original file:', path.basename(originalFile));

    // Create exact duplicate (same content)
    const duplicateFile = path.join(this.testDir, 'copy_of_microsoft_azure_invoice_december_2024.txt');
    await fs.writeFile(duplicateFile, originalContent);
    this.testFiles.push(duplicateFile);
    console.log('📄 Created exact duplicate:', path.basename(duplicateFile));

    // Create another duplicate with different name
    const duplicateFile2 = path.join(this.testDir, 'Invoice - Microsoft Azure - Dec 2024.txt');
    await fs.writeFile(duplicateFile2, originalContent);
    this.testFiles.push(duplicateFile2);
    console.log('📄 Created another duplicate:', path.basename(duplicateFile2));

    // Wait for processing
    await this.sleep(5000);

    console.log('✅ Duplicate detection test files created');
    console.log('   Expected: 2 exact duplicates should be detected');
    console.log('   Expected: Better version analysis should prefer organized naming');
  }

  async testSmartTagging() {
    console.log('\n🏷️ Test 2: Smart Tagging');

    // Test different file types and content for tagging
    const testFiles = [
      {
        name: 'john_smith_resume_2024.pdf',
        content: `
JOHN SMITH
Software Engineer

PROFESSIONAL SUMMARY
Experienced software engineer with 5+ years developing web applications.

EXPERIENCE
Senior Developer at Tech Corp (2020-2024)
- Built React applications
- Managed AWS infrastructure
- Led team of 4 developers

EDUCATION
Bachelor of Computer Science
University of Technology (2018)

SKILLS
- JavaScript, TypeScript, Python
- React, Node.js, AWS
- Git, Docker, Kubernetes
        `,
        expectedTags: ['category:resume', 'filetype:pdf', 'year:2024', 'has-date']
      },
      {
        name: 'quarterly_report_q4_2024.txt',
        content: `
Q4 2024 QUARTERLY BUSINESS REPORT
Executive Summary

Revenue: $2.5M (+15% YoY)
Profit Margin: 22%
Customer Growth: 300 new customers

KEY METRICS
- Monthly Recurring Revenue: $450K
- Customer Acquisition Cost: $125
- Churn Rate: 3.2%

ANALYSIS
Strong performance driven by enterprise sales...
        `,
        expectedTags: ['category:report', 'filetype:txt', 'year:2024', 'quarter', 'business']
      },
      {
        name: 'user_authentication_service.js',
        content: `
// User Authentication Service
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

class UserAuthService {
  constructor() {
    this.users = new Map();
  }

  async login(email, password) {
    const user = this.users.get(email);
    if (!user) return null;
    
    const isValid = await bcrypt.compare(password, user.hashedPassword);
    if (!isValid) return null;
    
    return jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
  }
}

module.exports = UserAuthService;
        `,
        expectedTags: ['category:code', 'filetype:js', 'authentication', 'service']
      }
    ];

    for (const testFile of testFiles) {
      const filePath = path.join(this.testDir, testFile.name);
      await fs.writeFile(filePath, testFile.content);
      this.testFiles.push(filePath);
      console.log(`📄 Created ${testFile.name} (expects tags: ${testFile.expectedTags.join(', ')})`);
    }

    await this.sleep(4000);

    console.log('✅ Smart tagging test files created');
    console.log('   Expected: Files should be tagged based on content and patterns');
  }

  async testFolderSuggestions() {
    console.log('\n📂 Test 3: Folder Structure Suggestions');

    // Create files that should get folder suggestions
    const filesWithSuggestions = [
      {
        name: 'apple_services_receipt_december_2024.txt',
        content: 'RECEIPT #R-12345\nApple Services\nAmount: $9.99\nDate: Dec 15, 2024',
        expectedFolder: 'Documents/Receipts'
      },
      {
        name: 'meeting_notes_product_strategy_2024.md',
        content: '# Product Strategy Meeting\n\n## Attendees\n- John Smith\n- Jane Doe\n\n## Agenda\n1. Q1 Goals\n2. Feature Roadmap',
        expectedFolder: 'Documents/Meetings'
      },
      {
        name: 'vacation_photos_hawaii_2024.jpg',
        content: 'Binary image data simulation - vacation photos from Hawaii 2024',
        expectedFolder: 'Pictures/Photos'
      }
    ];

    for (const file of filesWithSuggestions) {
      const filePath = path.join(this.testDir, file.name);
      await fs.writeFile(filePath, file.content);
      this.testFiles.push(filePath);
      console.log(`📄 Created ${file.name} (should suggest: ${file.expectedFolder})`);
    }

    await this.sleep(3000);

    console.log('✅ Folder suggestion test files created');
    console.log('   Expected: Files should get intelligent folder organization suggestions');
  }

  async testSimilarFileDetection() {
    console.log('\n🔗 Test 4: Similar File Detection');

    const baseContent = 'Microsoft Azure Invoice for December 2024\nAmount: $1,250.00';
    
    // Create similar files (same type, similar names, different content)
    const similarFiles = [
      { name: 'microsoft_azure_invoice_november_2024.txt', content: baseContent + '\nService Period: Nov 2024' },
      { name: 'microsoft_azure_invoice_january_2025.txt', content: baseContent + '\nService Period: Jan 2025' },
      { name: 'microsoft_office_invoice_december_2024.txt', content: baseContent.replace('Azure', 'Office 365') }
    ];

    for (const file of similarFiles) {
      const filePath = path.join(this.testDir, file.name);
      await fs.writeFile(filePath, file.content);
      this.testFiles.push(filePath);
      console.log(`📄 Created similar file: ${file.name}`);
    }

    await this.sleep(3000);

    console.log('✅ Similar file detection test completed');
    console.log('   Expected: Files should be identified as similar based on naming patterns');
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
🔧 TASK 2B TEST - DUPLICATE DETECTION & SMART TAGGING

This test will create various files to test:

🔍 DUPLICATE DETECTION:
- Exact content duplicates (same hash)
- Better version analysis (organized vs messy names)
- Duplicate action recommendations

🏷️ SMART TAGGING:
- Content-based tags (invoice, resume, code, etc.)
- File type tags (pdf, txt, js, etc.)
- Date and pattern-based tags
- Folder context tags

📂 FOLDER SUGGESTIONS:
- Category-based organization (Invoices -> Documents/Invoices)
- Content-driven suggestions (Meeting notes -> Documents/Meetings)
- Similar file pattern analysis

🔗 SIMILAR FILE DETECTION:
- Filename similarity analysis
- Content relationship detection
- Version chain identification

MONITORING:
- Watch the Electron app console for duplicate detection logs
- Look for "🔍 Performing duplicate detection" messages
- Check "🏷️ Enhanced analysis completed" messages
- Monitor smart tagging and folder suggestion results

Starting test in 3 seconds...
`);

setTimeout(async () => {
  const test = new Task2BTest();
  await test.runTest();
}, 3000); 