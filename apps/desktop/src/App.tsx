import React, { useState, useEffect } from 'react';
import './App.css';

interface FileProcessingItem {
  id: string;
  originalPath: string;
  originalName: string;
  suggestedName: string;
  confidence: number;
  category: string;
  reasoning: string;
  status: 'pending' | 'approved' | 'rejected' | 'processing';
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

  const handleNewFileWithAI = async (filePath: string, aiResult: any) => {
    const fileName = filePath.split('/').pop() || 'Unknown file';
    const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Add file with AI results already processed
    const newFile: FileProcessingItem = {
      id: fileId,
      originalPath: filePath,
      originalName: fileName,
      suggestedName: aiResult.suggestedName,
      confidence: aiResult.confidence,
      category: aiResult.category,
      reasoning: aiResult.reasoning,
      status: aiResult.error ? 'rejected' : 'pending',
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

      // Update file with AI suggestion
      setFiles(prev =>
        prev.map(file =>
          file.id === fileId
            ? {
                ...file,
                suggestedName: result.suggestedName,
                confidence: result.confidence,
                category: result.category,
                reasoning: result.reasoning,
                error: result.error,
                status: result.error ? 'rejected' : 'pending',
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

  const handleApproveRename = async (file: FileProcessingItem) => {
    try {
      const newPath = file.originalPath.replace(
        file.originalName,
        file.suggestedName
      );
      const result = await window.electronAPI.renameFile(
        file.originalPath,
        newPath
      );

      if (result.success) {
        setFiles(prev =>
          prev.map(f =>
            f.id === file.id ? { ...f, status: 'approved' as const } : f
          )
        );
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

  const filteredFiles = files.filter(
    file =>
      file.originalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.suggestedName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className='app'>
      <header className='app-header'>
        <h1>SilentSort</h1>
        <p>AI-Powered File Organization</p>

        <div className='test-section'>
          <button onClick={handleTestAI} className='test-ai-btn'>
            🧪 Test AI Connection
          </button>
          {aiTestResult && (
            <div
              className={`test-result ${aiTestResult.success ? 'success' : 'error'}`}
            >
              {aiTestResult.success ? '✅' : '❌'} {aiTestResult.message}
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
          filteredFiles.map(file => (
            <div key={file.id} className={`file-item ${file.status}`}>
              <div className='file-info'>
                <div className='original-name'>
                  <strong>Original:</strong> {file.originalName}
                </div>
                <div className='suggested-name'>
                  <strong>Suggested:</strong> {file.suggestedName}
                  {file.confidence > 0 && (
                    <span className='confidence'>
                      ({Math.round(file.confidence * 100)}% confident)
                    </span>
                  )}
                </div>
                <div className='file-category'>
                  <strong>Category:</strong>{' '}
                  <span className='category-tag'>{file.category}</span>
                </div>
                <div className='file-reasoning'>
                  <strong>AI Reasoning:</strong> <em>{file.reasoning}</em>
                </div>
                {file.error && (
                  <div className='file-error'>
                    <strong>Error:</strong>{' '}
                    <span className='error-text'>{file.error}</span>
                  </div>
                )}
                <div className='file-path'>
                  <small>{file.originalPath}</small>
                </div>
              </div>

              {file.status === 'pending' && (
                <div className='file-actions'>
                  <button
                    onClick={() => handleApproveRename(file)}
                    className='approve-btn'
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => handleRejectRename(file.id)}
                    className='reject-btn'
                  >
                    ✗ Reject
                  </button>
                </div>
              )}

              {file.status === 'approved' && (
                <div className='status-indicator approved'>Renamed ✓</div>
              )}

              {file.status === 'rejected' && (
                <div className='status-indicator rejected'>Skipped</div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default App;
