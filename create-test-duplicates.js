#!/usr/bin/env node

/**
 * Create test duplicates for manual UI testing
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

async function createTestFiles() {
  const testDir = path.join(os.homedir(), 'Downloads', 'silentsort-test');
  
  console.log('🎨 Creating test files for enhanced duplicate UI testing...');
  console.log('📁 Directory:', testDir);
  
  try {
    await fs.mkdir(testDir, { recursive: true });
    
    // Test 1: Invoice duplicates
    const invoiceContent = `
INVOICE #INV-2024-12-001
TechCorp Solutions Inc.
December 15, 2024

BILL TO: John Smith
123 Main Street, Anytown, NY 12345

SERVICES:
- Web Development: $5,000.00
- Consulting: $2,500.00
- Maintenance: $1,200.00

TOTAL AMOUNT: $8,700.00
DUE DATE: January 15, 2025
    `;
    
    // Clean original
    await fs.writeFile(path.join(testDir, 'TechCorp_Invoice_Dec2024_Professional.txt'), invoiceContent);
    console.log('📄 Created: TechCorp_Invoice_Dec2024_Professional.txt (GOOD VERSION)');
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Messy duplicate
    await fs.writeFile(path.join(testDir, 'untitled_copy_final_v2.txt'), invoiceContent);
    console.log('📄 Created: untitled_copy_final_v2.txt (DUPLICATE - should show orange border)');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: Report with better version detection
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

TECHNOLOGIES USED:
- React, TypeScript, Node.js
- AWS, Docker, Kubernetes
- Machine Learning, AI
    `;
    
    // Poor version first
    await fs.writeFile(path.join(testDir, 'temp_doc_123.txt'), reportContent);
    console.log('📄 Created: temp_doc_123.txt (POOR VERSION)');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Better version
    await fs.writeFile(path.join(testDir, 'Q4_2024_Business_Performance_Report.txt'), reportContent);
    console.log('📄 Created: Q4_2024_Business_Performance_Report.txt (BETTER VERSION)');
    
    console.log('\n✅ Test files created successfully!');
    console.log('\n🎯 ENHANCED UI FEATURES TO TEST:');
    console.log('1. 🟠 Orange borders on duplicate file cards');
    console.log('2. ⚠️ "DUPLICATE" badge floating above duplicate cards');
    console.log('3. 💡 "Better version available" indicators');
    console.log('4. 🎨 Enhanced duplicate warning sections');
    console.log('5. 🔘 Modern gradient action buttons');
    console.log('6. 🏷️ Smart tags with hover effects');
    console.log('7. 🎭 Improved hover animations and shadows');
    console.log('8. 📱 Better responsive design');
    
    console.log('\n📋 WHAT TO LOOK FOR:');
    console.log('• Cards with duplicates should have orange borders');
    console.log('• "⚠️ DUPLICATE" badge should float above duplicate cards');
    console.log('• Duplicate action buttons should have gradient backgrounds');
    console.log('• Better version suggestions should show with green accents');
    console.log('• Smart tags should have blue gradients with hover effects');
    console.log('• Overall design should look more modern and polished');
    
    console.log('\n🗑️ To clean up: run "rm ~/Downloads/silentsort-test/*"');
    
  } catch (error) {
    console.error('❌ Error creating test files:', error);
  }
}

createTestFiles(); 