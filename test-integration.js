#!/usr/bin/env node
/**
 * Test Integration Script for SilentSort
 * Tests the connection between Electron app and Python LangGraph service
 */

const fs = require('fs');
const path = require('path');

async function testPythonService() {
  console.log('🐍 Testing Python LangGraph Service...');
  
  try {
    // Test health endpoint
    const healthResponse = await fetch('http://127.0.0.1:8000/health');
    if (!healthResponse.ok) {
      throw new Error(`Health check failed: ${healthResponse.status}`);
    }
    
    const health = await healthResponse.json();
    console.log('✅ Python service is running');
    console.log(`   - Status: ${health.status}`);
    console.log(`   - OpenAI configured: ${health.openai_configured}`);
    console.log(`   - LangGraph version: ${health.langraph_version}`);
    
    // Test file analysis endpoint
    console.log('\n🔍 Testing file analysis...');
    
    const testRequest = {
      file_path: '/test/sample.txt',
      original_name: 'sample.txt',
      file_size: 1024,
      file_extension: '.txt',
      content_preview: 'This is a sample text file for testing the AI analysis workflow.'
    };
    
    const analysisResponse = await fetch('http://127.0.0.1:8000/analyze-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testRequest)
    });
    
    if (!analysisResponse.ok) {
      throw new Error(`Analysis failed: ${analysisResponse.status} - ${analysisResponse.statusText}`);
    }
    
    const analysis = await analysisResponse.json();
    console.log('✅ File analysis working');
    console.log(`   - Suggested name: ${analysis.suggested_name}`);
    console.log(`   - Confidence: ${analysis.confidence}`);
    console.log(`   - Category: ${analysis.category}`);
    console.log(`   - Processing time: ${analysis.processing_time_ms}ms`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Python service test failed:', error.message);
    console.log('\n🔧 To fix this:');
    console.log('   1. Make sure Python service is running: cd apps/python-service && python start.py');
    console.log('   2. Check your OpenAI API key is configured in .env file');
    return false;
  }
}

async function testElectronBuild() {
  console.log('\n⚡ Testing Electron App Build...');
  
  try {
    // Check if dist directory exists
    const distPath = path.join(__dirname, 'apps', 'desktop', 'dist');
    if (!fs.existsSync(distPath)) {
      throw new Error('Electron dist directory not found');
    }
    
    // Check if main files are compiled
    const mainFiles = ['main.js', 'preload.js'];
    for (const file of mainFiles) {
      const filePath = path.join(distPath, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Missing compiled file: ${file}`);
      }
    }
    
    console.log('✅ Electron app compiled successfully');
    console.log(`   - Dist path: ${distPath}`);
    console.log(`   - Main files: ${mainFiles.join(', ')}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Electron build test failed:', error.message);
    console.log('\n🔧 To fix this:');
    console.log('   1. Run: cd apps/desktop && npm run compile:electron');
    console.log('   2. Check for TypeScript compilation errors');
    return false;
  }
}

async function testFileAccess() {
  console.log('\n📁 Testing File System Access...');
  
  try {
    // Create a test file
    const testDir = path.join(__dirname, 'test-files');
    const testFile = path.join(testDir, 'test-integration.txt');
    
    // Ensure test directory exists
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    // Write test file
    const testContent = 'This is a test file created by the integration test script.';
    fs.writeFileSync(testFile, testContent);
    
    // Check file stats
    const stats = fs.statSync(testFile);
    
    console.log('✅ File system access working');
    console.log(`   - Test file: ${testFile}`);
    console.log(`   - File size: ${stats.size} bytes`);
    console.log(`   - Extension: ${path.extname(testFile)}`);
    
    // Clean up
    fs.unlinkSync(testFile);
    
    return true;
    
  } catch (error) {
    console.error('❌ File system test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔥 SilentSort Integration Test');
  console.log('==============================\n');
  
  const tests = [
    { name: 'Python LangGraph Service', fn: testPythonService },
    { name: 'Electron App Build', fn: testElectronBuild },
    { name: 'File System Access', fn: testFileAccess },
  ];
  
  const results = [];
  
  for (const test of tests) {
    const success = await test.fn();
    results.push({ name: test.name, success });
  }
  
  console.log('\n📊 Test Summary');
  console.log('================');
  
  let allPassed = true;
  for (const result of results) {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${result.name}`);
    if (!result.success) allPassed = false;
  }
  
  console.log('\n' + (allPassed ? '🎉 All tests passed! Your setup is ready.' : '⚠️  Some tests failed. Check the output above for fixes.'));
  
  if (allPassed) {
    console.log('\n🚀 Next steps:');
    console.log('   1. Start Python service: cd apps/python-service && python start.py');
    console.log('   2. Start Electron app: cd apps/desktop && npm run dev');
    console.log('   3. Test file analysis in the app!');
  }
  
  process.exit(allPassed ? 0 : 1);
}

// Run the tests
main().catch(console.error); 