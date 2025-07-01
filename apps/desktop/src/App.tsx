import React, { useState, useEffect } from 'react';
import './App.css';
import { FileReviewCard } from './components';

interface ExtractedEntities {
  budget?: string;
  team_size?: string;
  deadline?: string;
  technology: string[];
  company?: string;
  invoice_number?: string;
  amount?: string;
}

interface FileProcessingItem {
  id: string;
  originalPath: string;
  originalName: string;
  suggestedName: string;
  confidence: number;
  category: string;
  subcategory?: string;
  reasoning: string;
  status: 'pending' | 'approved' | 'rejected' | 'processing';
  technical_tags?: string[];
  extracted_entities?: ExtractedEntities;
  processing_time_ms?: number;
  error?: string;
}

const App: React.FC = () => {
  const [files, setFiles] = useState<FileProcessingItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('Checking API...');
  const [cacheStats, setCacheStats] = useState<{
    totalFiles: number;
    processingFiles: number;
    completedFiles: number;
    failedFiles: number;
  } | null>(null);

  useEffect(() => {
    // Debug electronAPI availability
    console.log('🔍 App mounted. window.electronAPI:', window.electronAPI);
    console.log('🔍 electronAPI type:', typeof window.electronAPI);
    console.log(
      '🔍 electronAPI methods:',
      window.electronAPI ? Object.keys(window.electronAPI) : 'undefined'
    );

    setDebugInfo(
      `electronAPI: ${window.electronAPI ? 'Available' : 'Missing'} | Methods: ${window.electronAPI ? Object.keys(window.electronAPI).join(', ') : 'none'}`
    );

    // Listen for new files detected by the main process
    if (window.electronAPI) {
      window.electronAPI.onNewFileDetected(
        (data: { filePath: string; aiResult: any }) => {
          handleNewFileWithAI(data.filePath, data.aiResult);
        }
      );

      window.electronAPI.onFocusSearch(() => {
        // Focus the search input when global shortcut is pressed
        const searchInput = document.getElementById(
          'search-input'
        ) as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      });
    } else {
      console.error('❌ window.electronAPI is not available!');
    }

    // Cleanup listeners on unmount
    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeAllListeners('new-file-detected');
        window.electronAPI.removeAllListeners('focus-search');
      }
    };
  }, []);

  const handleTestAI = async () => {
    console.log('🧪 Test AI button clicked');
    console.log('🔍 window.electronAPI:', window.electronAPI);

    if (!window.electronAPI) {
      setAiTestResult({
        success: false,
        message: 'electronAPI not available - preload script issue',
      });
      return;
    }

    if (!window.electronAPI.testAIService) {
      setAiTestResult({
        success: false,
        message: 'testAIService method not available',
      });
      return;
    }

    try {
      console.log('🚀 Calling testAIService...');
      const result = await window.electronAPI.testAIService();
      console.log('✅ AI Test Result:', result);
      setAiTestResult(result);
    } catch (error) {
      console.error('❌ Failed to test AI service:', error);
      setAiTestResult({
        success: false,
        message:
          'Failed to test AI service: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      });
    }
  };

  const handleGetCacheStats = async () => {
    if (!window.electronAPI?.getCacheStats) {
      console.error('❌ getCacheStats not available');
      return;
    }

    try {
      const stats = await window.electronAPI.getCacheStats();
      console.log('📊 Cache Stats:', stats);
      setCacheStats(stats);
    } catch (error) {
      console.error('❌ Failed to get cache stats:', error);
    }
  };

  const handleCreateTestFile = () => {
    const testContent = `Test file created at ${new Date().toISOString()}\nThis is a test file to trigger AI processing.`;
    const testFileName = `test-ui-file-${Date.now()}.txt`;
    
    // Create a test file in the watched directory
    console.log('🔧 Creating test file:', testFileName);
    
    // For now, just show instructions since we can't directly create files from renderer
    alert(`Please manually create a file in ~/Downloads/silentsort-test/ named "${testFileName}" with any content to test the UI integration.`);
  };

  const handleNewFileWithAI = async (filePath: string, aiResult: any) => {
    const fileName = filePath.split('/').pop() || 'Unknown file';
    const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Add file with Enhanced AI results already processed
    const newFile: FileProcessingItem = {
      id: fileId,
      originalPath: filePath,
      originalName: fileName,
      suggestedName: aiResult.suggestedName,
      confidence: aiResult.confidence,
      category: aiResult.category,
      subcategory: aiResult.subcategory,
      reasoning: aiResult.reasoning,
      status: aiResult.error ? 'rejected' : 'pending',
      technical_tags: aiResult.technical_tags || [],
      extracted_entities: aiResult.extracted_entities || { technology: [] },
      processing_time_ms: aiResult.processing_time_ms,
      error: aiResult.error,
    };

    setFiles(prev => [newFile, ...prev]);
    console.log('✅ File added to UI with AI analysis:', newFile);
  };

  const handleNewFile = async (filePath: string) => {
    const fileName = filePath.split('/').pop() || 'Unknown file';
    const fileId = Date.now().toString();

    // Add file to processing queue
    const newFile: FileProcessingItem = {
      id: fileId,
      originalPath: filePath,
      originalName: fileName,
      suggestedName: 'Processing...',
      confidence: 0,
      category: 'unknown',
      reasoning: 'Processing file...',
      status: 'processing',
    };

    setFiles(prev => [newFile, ...prev]);
    setIsProcessing(true);

    try {
      // Process file with AI
      const result = await window.electronAPI.processFileContent(filePath);

      // Update file with Enhanced AI suggestion
      const enhancedResult = result as any; // Type assertion for enhanced fields
      setFiles(prev =>
        prev.map(file =>
          file.id === fileId
            ? {
                ...file,
                suggestedName: enhancedResult.suggestedName,
                confidence: enhancedResult.confidence,
                category: enhancedResult.category,
                subcategory: enhancedResult.subcategory,
                reasoning: enhancedResult.reasoning,
                technical_tags: enhancedResult.technical_tags || [],
                extracted_entities: enhancedResult.extracted_entities || { technology: [] },
                processing_time_ms: enhancedResult.processing_time_ms,
                error: enhancedResult.error,
                status: enhancedResult.error ? 'rejected' : 'pending',
              }
            : file
        )
      );
    } catch (error) {
      console.error('Error processing file:', error);
      setFiles(prev =>
        prev.map(file =>
          file.id === fileId
            ? {
                ...file,
                suggestedName: 'Error processing file',
                confidence: 0,
                category: 'error',
                reasoning: 'Failed to process file',
                status: 'rejected',
              }
            : file
        )
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveRename = async (fileId: string, finalName?: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;
    try {
      // Use the edited name if provided, otherwise use the suggested name
      const nameToUse = finalName || file.suggestedName;
      const newPath = file.originalPath.replace(
        file.originalName,
        nameToUse
      );
      const result = await window.electronAPI.renameFile(
        file.originalPath,
        newPath
      );

      if (result.success) {
        setFiles(prev =>
          prev.map(f =>
            f.id === file.id ? { 
              ...f, 
              status: 'approved' as const,
              suggestedName: nameToUse // Update the displayed name to the final used name
            } : f
          )
        );
        console.log('✅ File renamed successfully:', file.originalName, '→', nameToUse);
      } else {
        console.error('❌ File rename failed:', result.error);
        // You could add error handling here to show the user what went wrong
      }
    } catch (error) {
      console.error('Error renaming file:', error);
    }
  };

  const handleRejectRename = (fileId: string) => {
    setFiles(prev =>
      prev.map(file =>
        file.id === fileId ? { ...file, status: 'rejected' as const } : file
      )
    );
  };

  const filteredFiles = files.filter(file => {
    const searchLower = searchQuery.toLowerCase();
    
    // Basic file name and category search
    const basicMatch = 
      file.originalName.toLowerCase().includes(searchLower) ||
      file.suggestedName.toLowerCase().includes(searchLower) ||
      file.category.toLowerCase().includes(searchLower) ||
      (file.subcategory && file.subcategory.toLowerCase().includes(searchLower));
    
    // Technical tags search
    const tagsMatch = file.technical_tags?.some(tag => 
      tag.toLowerCase().includes(searchLower)
    ) || false;
    
    // Extracted entities search
    const entitiesMatch = file.extracted_entities && (
      (file.extracted_entities.budget && file.extracted_entities.budget.toLowerCase().includes(searchLower)) ||
      (file.extracted_entities.team_size && file.extracted_entities.team_size.toLowerCase().includes(searchLower)) ||
      (file.extracted_entities.deadline && file.extracted_entities.deadline.toLowerCase().includes(searchLower)) ||
      (file.extracted_entities.company && file.extracted_entities.company.toLowerCase().includes(searchLower)) ||
      (file.extracted_entities.invoice_number && file.extracted_entities.invoice_number.toLowerCase().includes(searchLower)) ||
      (file.extracted_entities.technology && file.extracted_entities.technology.some(tech => 
        tech.toLowerCase().includes(searchLower)
      ))
    ) || false;
    
    return basicMatch || tagsMatch || entitiesMatch;
  });

  return (
    <div className='app'>
      <header className='app-header'>
        <h1>SilentSort</h1>
        <p>AI-Powered File Organization</p>

        <div className='test-section'>
          <button onClick={handleTestAI} className='test-ai-btn'>
            🧪 Test AI Connection
          </button>
          
          <button onClick={handleGetCacheStats} className='test-ai-btn'>
            📊 Get Cache Stats
          </button>
          
          <button onClick={handleCreateTestFile} className='test-ai-btn'>
            📄 Create Test File
          </button>
          
          {aiTestResult && (
            <div
              className={`test-result ${aiTestResult.success ? 'success' : 'error'}`}
            >
              {aiTestResult.success ? '✅' : '❌'} {aiTestResult.message}
            </div>
          )}

          {cacheStats && (
            <div className='cache-stats' style={{ 
              marginTop: '10px', 
              padding: '10px', 
              border: '1px solid #ddd', 
              borderRadius: '4px',
              fontSize: '0.9rem'
            }}>
              <strong>📊 Cache Statistics:</strong>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '5px' }}>
                <span>📁 Total Files: {cacheStats.totalFiles}</span>
                <span>⏳ Processing: {cacheStats.processingFiles}</span>
                <span>✅ Completed: {cacheStats.completedFiles}</span>
                <span>❌ Failed: {cacheStats.failedFiles}</span>
              </div>
            </div>
          )}

          {/* Debug Information */}
          <div
            className='debug-info'
            style={{ fontSize: '0.8rem', marginTop: '10px', opacity: 0.7 }}
          >
            Debug: {debugInfo}
          </div>
        </div>
      </header>

      <div className='search-section'>
        <input
          id='search-input'
          type='text'
          placeholder='Search files... (Cmd+Shift+F globally)'
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className='search-input'
        />
      </div>

      <div className='status-bar'>
        <span>
          Files processed: {files.filter(f => f.status === 'approved').length}
        </span>
        <span>Queue: {files.filter(f => f.status === 'pending').length}</span>
        {isProcessing && <span className='processing'>Processing...</span>}
      </div>

      <div className='files-list'>
        {filteredFiles.length === 0 ? (
          <div className='empty-state'>
            <h3>No files detected yet</h3>
            <p>
              Add files to your ~/Downloads/silentsort-test/ folder to see them
              here.
            </p>
            <p>
              <small>
                Test the AI connection first to ensure everything is working!
              </small>
            </p>
          </div>
        ) : (
          filteredFiles.map(file => {
            if (file.status === 'pending') {
              return (
                <FileReviewCard
                  key={file.id}
                  file={file}
                  onApprove={handleApproveRename}
                  onReject={handleRejectRename}
                />
              );
            } else {
              // Show approved/rejected files in a simple format
              return (
                <div key={file.id} className={`file-item ${file.status}`}>
                  <div className='file-info'>
                    <div className='original-name'>
                      <strong>Original:</strong> {file.originalName}
                    </div>
                    <div className='suggested-name'>
                      <strong>Final Name:</strong> {file.suggestedName}
                    </div>
                  </div>

                  {file.status === 'approved' && (
                    <div className='status-indicator approved'>Renamed ✓</div>
                  )}

                  {file.status === 'rejected' && (
                    <div className='status-indicator rejected'>Skipped</div>
                  )}
                </div>
              );
            }
          })
        )}
      </div>
    </div>
  );
};

export default App;
