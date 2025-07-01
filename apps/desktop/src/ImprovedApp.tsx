import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import FileReviewCard from './components/FileReviewCard';
import BatchOperations from './components/BatchOperations';
import './ImprovedApp.css';

// Import types from our electron declarations
import type { AIResult } from './types/electron';

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

const ImprovedApp: React.FC = () => {
  const [files, setFiles] = useState<FileProcessingItem[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showBatchOperations, setShowBatchOperations] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<string>('');
  const [isFirstRun, setIsFirstRun] = useState<boolean>(true);

  // Stats calculations
  const pendingFiles = files.filter(f => f.status === 'pending');
  const processedToday = files.filter(f => f.status === 'approved').length;
  const highConfidenceFiles = pendingFiles.filter(f => f.confidence >= 0.8);

  useEffect(() => {
    // Check first run and get current folder
    if (window.electronAPI) {
      window.electronAPI.isFirstRun().then(firstRun => {
        setIsFirstRun(firstRun);
      });

      window.electronAPI.getCurrentFolder().then(folder => {
        setCurrentFolder(folder);
      });

      // Listen for new files detected by the main process
      window.electronAPI.onNewFileDetected(
        (data: { filePath: string; aiResult: AIResult }) => {
          handleNewFileWithAI(data.filePath, data.aiResult);
        }
      );

      window.electronAPI.onFocusSearch(() => {
        const searchInput = document.getElementById('search-input') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      });
    }

    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeAllListeners('new-file-detected');
        window.electronAPI.removeAllListeners('focus-search');
      }
    };
  }, []);

  const handleNewFileWithAI = async (filePath: string, aiResult: AIResult) => {
    const fileName = filePath.split('/').pop() || 'Unknown file';
    const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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
  };

  const handleApproveFile = async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file) {
      return;
    }

    try {
      setIsProcessing(true);
      const newPath = file.originalPath.replace(file.originalName, file.suggestedName);
      const result = await window.electronAPI.renameFile(file.originalPath, newPath);

      if (result.success) {
        setFiles(prev =>
          prev.map(f => (f.id === fileId ? { ...f, status: 'approved' as const } : f))
        );
        // Remove from selection if selected
        setSelectedFiles(prev => prev.filter(id => id !== fileId));
      }
    } catch (error) {
      // Log error for debugging in development
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Error approving file:', error);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectFile = (fileId: string) => {
    setFiles(prev =>
      prev.map(f => (f.id === fileId ? { ...f, status: 'rejected' as const } : f))
    );
    // Remove from selection if selected
    setSelectedFiles(prev => prev.filter(id => id !== fileId));
  };

  const handleFileSelection = (fileId: string, selected: boolean) => {
    if (selected) {
      setSelectedFiles(prev => [...prev, fileId]);
    } else {
      setSelectedFiles(prev => prev.filter(id => id !== fileId));
    }
  };

  const handleSelectAll = () => {
    setSelectedFiles(pendingFiles.map(f => f.id));
  };

  const handleSelectNone = () => {
    setSelectedFiles([]);
  };

  const handleSelectHighConfidence = () => {
    setSelectedFiles(highConfidenceFiles.map(f => f.id));
  };

  const handleBatchApprove = async () => {
    setIsProcessing(true);
    for (const fileId of selectedFiles) {
      await handleApproveFile(fileId);
    }
    setSelectedFiles([]);
    setIsProcessing(false);
  };

  const handleBatchReject = () => {
    selectedFiles.forEach(fileId => handleRejectFile(fileId));
    setSelectedFiles([]);
  };

  const handleBatchApproveHighConfidence = async () => {
    setIsProcessing(true);
    for (const file of highConfidenceFiles) {
      await handleApproveFile(file.id);
    }
    setIsProcessing(false);
  };

  const handleTestAI = async () => {
    if (!window.electronAPI?.testAIService) {
      return;
    }
    
    try {
      const result = await window.electronAPI.testAIService();
      alert(result.success ? '✅ AI service is working!' : `❌ ${result.message}`);
    } catch (error) {
      alert('❌ Failed to test AI service');
    }
  };

  const handleSelectFolder = async () => {
    if (!window.electronAPI?.selectFolder) {
      return;
    }

    try {
      const result = await window.electronAPI.selectFolder();
      
      if (result.success && result.folderPath) {
        setCurrentFolder(result.folderPath);
        setIsFirstRun(false);
      }
    } catch (error) {
      // Silent error handling for better UX
    }
  };

  const filteredFiles = pendingFiles.filter(file => {
    if (!searchQuery) {
      return true;
    }
    
    const searchLower = searchQuery.toLowerCase();
    return (
      file.originalName.toLowerCase().includes(searchLower) ||
      file.suggestedName.toLowerCase().includes(searchLower) ||
      file.category.toLowerCase().includes(searchLower) ||
      (file.subcategory && file.subcategory.toLowerCase().includes(searchLower)) ||
      (file.technical_tags?.some(tag => tag.toLowerCase().includes(searchLower))) ||
      (file.extracted_entities && Object.values(file.extracted_entities).some(value => {
        if (Array.isArray(value)) {
          return value.some(v => v.toLowerCase().includes(searchLower));
        }
        return value && value.toString().toLowerCase().includes(searchLower);
      }))
    );
  });

  return (
    <div className="improved-app">
      <Header
        filesProcessed={processedToday}
        pendingCount={pendingFiles.length}
        onSettingsClick={() => setSettingsOpen(true)}
        onNotificationClick={() => setShowBatchOperations(!showBatchOperations)}
      />

      <main className="main-content">
        {/* Priority Section - Immediate Actions */}
        <section className="priority-section">
          {pendingFiles.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🤖</div>
              {isFirstRun ? (
                <div className="welcome-content">
                  <h2>Welcome to SilentSort!</h2>
                  <p className="welcome-subtitle">Your AI-powered file organization assistant</p>
                  
                  <div className="feature-grid">
                    <div className="feature-card">
                      <div className="feature-icon">🧠</div>
                      <h3>Smart Analysis</h3>
                      <p>AI reads your file content to understand what it is and suggests meaningful names</p>
                    </div>
                    
                    <div className="feature-card">
                      <div className="feature-icon">⚡</div>
                      <h3>Auto Organization</h3>
                      <p>Automatically detects new files and processes them in the background</p>
                    </div>
                    
                    <div className="feature-card">
                      <div className="feature-icon">✅</div>
                      <h3>You Control</h3>
                      <p>Review and approve AI suggestions before any changes are made</p>
                    </div>
                  </div>
                  
                  <div className="getting-started">
                    <h3>Getting Started</h3>
                    <div className="steps">
                      <div className="step">
                        <span className="step-number">1</span>
                        <span>Choose a folder to monitor (Downloads, Documents, etc.)</span>
                      </div>
                      <div className="step">
                        <span className="step-number">2</span>
                        <span>Drop files in that folder or let existing files be detected</span>
                      </div>
                      <div className="step">
                        <span className="step-number">3</span>
                        <span>Review AI suggestions and approve the ones you like</span>
                      </div>
                    </div>
                  </div>
                  
                  <button onClick={handleSelectFolder} className="primary-action-btn">
                    📁 Choose Folder to Monitor
                  </button>
                </div>
              ) : (
                <div className="ready-content">
                  <h2>Ready to organize!</h2>
                  <p className="subtitle">SilentSort is monitoring: <strong>{currentFolder}</strong></p>
                  
                  <div className="info-cards">
                    <div className="info-card">
                      <h3>🎯 How it works</h3>
                      <ul>
                        <li>Drop files in your monitored folder</li>
                        <li>AI analyzes content and suggests better names</li>
                        <li>Review suggestions here and approve the good ones</li>
                        <li>Use ⌘⇧F anywhere to quickly search files</li>
                      </ul>
                    </div>
                    
                    <div className="info-card">
                      <h3>📝 Supported Files</h3>
                      <ul>
                        <li><strong>PDFs:</strong> Resumes, invoices, reports, contracts</li>
                        <li><strong>Documents:</strong> Word docs, text files, presentations</li>
                        <li><strong>Images:</strong> Screenshots, photos, diagrams</li>
                        <li><strong>Code:</strong> Scripts, source files, configs</li>
                      </ul>
                    </div>
                    
                    <div className="info-card">
                      <h3>⚡ Pro Tips</h3>
                      <ul>
                        <li>Use batch operations for multiple files</li>
                        <li>High confidence suggestions (80%+) are usually accurate</li>
                        <li>Search by content, categories, or file names</li>
                        <li>AI learns from your approval patterns</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="action-buttons">
                    <button onClick={handleTestAI} className="secondary-action-btn">
                      🧪 Test AI Connection
                    </button>
                    <button onClick={handleSelectFolder} className="secondary-action-btn">
                      📁 Change Folder
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Batch Operations - Show when files are available */}
              {(pendingFiles.length > 1 || showBatchOperations) && (
                <BatchOperations
                  selectedFiles={selectedFiles}
                  totalPendingFiles={pendingFiles.length}
                  highConfidenceCount={highConfidenceFiles.length}
                  onSelectAll={handleSelectAll}
                  onSelectNone={handleSelectNone}
                  onSelectHighConfidence={handleSelectHighConfidence}
                  onBatchApprove={handleBatchApprove}
                  onBatchReject={handleBatchReject}
                  onBatchApproveHighConfidence={handleBatchApproveHighConfidence}
                />
              )}

              {/* Search and Filter */}
              <div className="search-section">
                <div className="search-container">
                  <input
                    id="search-input"
                    type="text"
                    placeholder={`Search ${pendingFiles.length} pending files... (⌘⇧F globally)`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                  />
                  {searchQuery && (
                    <button 
                      className="clear-search"
                      onClick={() => setSearchQuery('')}
                    >
                      ✕
                    </button>
                  )}
                </div>
                
                {searchQuery && (
                  <div className="search-results-info">
                    Showing {filteredFiles.length} of {pendingFiles.length} files
                  </div>
                )}
              </div>

              {/* File Review Cards */}
              <div className="files-section">
                {filteredFiles.length === 0 ? (
                  <div className="no-results">
                    <div className="no-results-icon">🔍</div>
                    <h3>No files match your search</h3>
                    <p>Try adjusting your search terms or clear the search to see all files.</p>
                  </div>
                ) : (
                  <div className="files-list">
                    {filteredFiles.map(file => (
                      <FileReviewCard
                        key={file.id}
                        file={file}
                        onApprove={handleApproveFile}
                        onReject={handleRejectFile}
                        isSelected={selectedFiles.includes(file.id)}
                        onSelect={handleFileSelection}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </main>

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="modal-overlay" onClick={() => setSettingsOpen(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Settings</h2>
              <button 
                className="close-btn"
                onClick={() => setSettingsOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-content">
              <div className="settings-section">
                <h3>AI Service</h3>
                <button onClick={handleTestAI} className="test-ai-btn">
                  🧪 Test AI Connection
                </button>
              </div>
              <div className="settings-section">
                <h3>File Monitoring</h3>
                <p>Currently monitoring: {currentFolder || 'No folder selected'}</p>
                <button onClick={handleSelectFolder} className="test-ai-btn">
                  📁 Choose Folder to Monitor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {isProcessing && (
        <div className="processing-overlay">
          <div className="processing-spinner">
            <div className="spinner"></div>
            <p>Processing files...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImprovedApp; 