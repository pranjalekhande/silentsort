#!/usr/bin/env node

const { formatDetectionWorkflow } = require('./dist/services/format-detection-workflow');
const path = require('path');

// Demo: Context-Aware Format Detection in Real-Time
async function demonstrateContextDetection() {
  console.log('🚀 SilentSort Context-Aware Format Detection Demo\n');
  
  const demoFiles = [
    { name: 'invoice_apple_services_2024.txt', description: '📄 Invoice Document' },
    { name: 'user_authentication_service.js', description: '💻 Code File' },
    { name: 'quarterly_business_report.pdf', description: '📊 Professional Report' },
    { name: 'family_vacation_photos.jpg', description: '🖼️ Image File' },
    { name: 'john_smith_resume.pdf', description: '📋 Resume Document' }
  ];

  for (const file of demoFiles) {
    console.log(`${file.description}: ${file.name}`);
    
    try {
      const result = await formatDetectionWorkflow.processFile({
        suggestedName: file.name,
        targetFolder: path.join(require('os').homedir(), 'Downloads', 'silentsort-test'),
        originalFileName: file.name
      });

      if (result.success) {
        console.log(`   🎯 Context: ${result.contextDetection?.context.type} (${result.contextDetection?.confidence.toFixed(2)} confidence)`);
        console.log(`   📝 Format: ${result.contextDetection?.suggestedFormat.type}`);
        console.log(`   ✨ Result: ${result.finalName}`);
        console.log(`   💡 Reasoning: ${result.contextDetection?.reasoning}`);
      } else {
        console.log(`   ❌ Error: ${result.error}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log(''); // Empty line for readability
  }
  
  console.log('🎉 Demo complete! Context-aware format detection is working intelligently.');
}

// Run the demo
demonstrateContextDetection().catch(console.error); 