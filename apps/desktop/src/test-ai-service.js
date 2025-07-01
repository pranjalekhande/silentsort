// Test the enhanced AI service with LangGraph integration
const path = require('path');
const fs = require('fs');

// Create a test file for analysis
const testFilePath = path.join(__dirname, 'test-document.txt');
const testContent = `Invoice: XYZ Company
Date: 2024-01-15
Amount: $1,234.56
Description: Software development services for Q1 2024
Client: ABC Corporation
Payment due: 30 days`;

// Write test file
fs.writeFileSync(testFilePath, testContent);
console.log('📄 Created test file:', testFilePath);

// Import and test the AI service
async function testEnhancedAIService() {
  console.log('🧪 Testing Enhanced AI Service...');
  
  try {
    // Import the enhanced AI service
    // Note: Using require with .ts file - Node.js will handle it
    const { aiService } = require('./services/ai-service.ts');
    
    console.log('🔄 Testing file analysis...');
    
    // Test the enhanced analysis
    const result = await aiService.analyzeFile(testFilePath);
    
    console.log('✅ Analysis completed!');
    console.log('📊 Results:');
    console.log('  Original name:', path.basename(testFilePath));
    console.log('  Suggested name:', result.suggestedName);
    console.log('  Confidence:', result.confidence);
    console.log('  Category:', result.category);
    console.log('  Reasoning:', result.reasoning);
    
    if (result.alternatives) {
      console.log('  Alternatives:', result.alternatives);
    }
    
    if (result.contentSummary) {
      console.log('  Content summary:', result.contentSummary);
    }
    
    if (result.error) {
      console.log('⚠️  Error:', result.error);
    }
    
    // Test connection
    console.log('🔄 Testing AI service connection...');
    const connectionTest = await aiService.testConnection();
    console.log('🔗 Connection test:', connectionTest);
    
    console.log('\n🎉 Enhanced AI Service Test COMPLETED!');
    
  } catch (error) {
    console.error('❌ Enhanced AI Service Test FAILED:', error.message);
    console.error('🔍 Full error:', error);
  } finally {
    // Clean up test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
      console.log('🧹 Cleaned up test file');
    }
  }
}

// Run the test
if (require.main === module) {
  testEnhancedAIService();
}

module.exports = { testEnhancedAIService }; 