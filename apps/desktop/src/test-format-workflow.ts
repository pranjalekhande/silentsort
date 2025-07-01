import { formatDetectionWorkflow } from './services/format-detection-workflow';
import * as path from 'path';

async function testFormatWorkflow() {
  console.log('🧪 Testing LangGraph Format Detection Workflow...\n');
  
  // Test cases with different naming scenarios
  const testCases = [
    {
      name: 'Invoice Processing',
      suggestedName: 'monthly_invoice_report.pdf', 
      targetFolder: '/Users/test/Documents/Invoices',
      originalFileName: 'IMG_001.pdf'
    },
    {
      name: 'Code File',
      suggestedName: 'user authentication service.js',
      targetFolder: '/Users/test/Code/MyProject',
      originalFileName: 'temp123.js'
    },
    {
      name: 'Resume Processing',
      suggestedName: 'john smith resume 2024.docx',
      targetFolder: '/Users/test/Downloads',
      originalFileName: 'document.docx'
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📋 Test: ${testCase.name}`);
    console.log(`   Input: "${testCase.suggestedName}"`);
    console.log(`   Folder: ${testCase.targetFolder}`);
    
    try {
      const result = await formatDetectionWorkflow.processFile({
        suggestedName: testCase.suggestedName,
        targetFolder: testCase.targetFolder,
        originalFileName: testCase.originalFileName
      });
      
      if (result.success) {
        console.log(`   ✅ Final Name: "${result.finalName}"`);
        console.log(`   📊 Confidence: ${result.confidence.toFixed(2)}`);
        console.log(`   🎨 Pattern: ${result.dominantPattern?.convention.type || 'default'}`);
        console.log(`   ⚡ Time: ${result.processingTimeMs}ms`);
        
        if (result.alternativeFormats.length > 0) {
          console.log(`   🔄 Alternatives: ${result.alternativeFormats.slice(0, 2).join(', ')}`);
        }
        
        if (result.reasoningSteps.length > 0) {
          console.log(`   💭 Reasoning: ${result.reasoningSteps[result.reasoningSteps.length - 1]}`);
        }
      } else {
        console.log(`   ❌ Failed: ${result.error}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error}`);
    }
  }
  
  console.log('\n🏁 Format Detection Workflow Test Complete!');
}

// Run the test
if (require.main === module) {
  testFormatWorkflow().catch(console.error);
}

export { testFormatWorkflow }; 