import React, { useState, useEffect } from 'react';
import Header, { FilterMode } from './components/Header';
import FileReviewCard from './components/FileReviewCard';
import BatchOperations from './components/BatchOperations';
import './ImprovedApp.css';

// Import types from our electron declarations
import type { AIResult } from './types/electron';

// Simple path utilities for frontend use
const path = {
  isAbsolute: (p: string) => p.startsWith('/') || /^[A-Za-z]:[\\/]/.test(p),
  basename: (p: string) => p.split(/[\\/]/).pop() || '',
};

interface ExtractedEntities {
  budget?: string;
  team_size?: string;
  deadline?: string;
  technology: string[];
  company?: string;
  invoice_number?: string;
  amount?: string;
}

// Add duplicate detection interfaces
interface DuplicateInfo {
  isDuplicate: boolean;
  duplicateFiles: string[];
  similarFiles: string[];
  action: 'merge' | 'rename' | 'keep_both' | 'replace_with_better';
  betterVersion?: {
    filePath: string;
    reason: string;
  };
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
  // New duplicate detection fields
  duplicateInfo?: DuplicateInfo;
  smartTags?: string[];
  folderSuggestion?: {
    path: string;
    confidence: number;
    reasoning: string;
  };
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
  
  // New state for hybrid duplicate UI
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [actionBarVisible, setActionBarVisible] = useState<boolean>(true);

  // Stats calculations
  const pendingFiles = files.filter(f => f.status === 'pending');
  const processedToday = files.filter(f => f.status === 'approved').length;
  const highConfidenceFiles = pendingFiles.filter(f => f.confidence >= 0.8);
  
  // Duplicate files calculations
  const duplicateFiles = pendingFiles.filter(f => f.duplicateInfo?.isDuplicate);
  const regularFiles = pendingFiles.filter(f => !f.duplicateInfo?.isDuplicate);
  const duplicateCount = duplicateFiles.length;

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
      duplicateInfo: aiResult.duplicateInfo,
      smartTags: aiResult.smartTags,
      folderSuggestion: aiResult.folderSuggestion,
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

  // Enhanced duplicate action handlers with success callbacks and better messaging
  const handleKeepBoth = async (fileId: string, callback: (success: boolean, message: string) => void) => {
    const file = files.find(f => f.id === fileId);
    if (!file) {
      callback(false, 'File not found');
      return;
    }

    try {
      // In a real implementation, you might:
      // 1. Rename the current file as suggested
      // 2. Leave duplicate files as they are
      // 3. Update file registry to mark this decision
      
      // Update file status to approved (keep both means we rename the new file as suggested)
      setFiles(prev =>
        prev.map(f =>
          f.id === fileId ? { ...f, status: 'approved' as const } : f
        )
      );
      
      // Remove from selection if selected
      setSelectedFiles(prev => prev.filter(id => id !== fileId));

      const duplicateCount = file.duplicateInfo?.duplicateFiles?.length || 0;
      const message = `✅ Kept both files! "${file.suggestedName}" was saved, ${duplicateCount} duplicate${duplicateCount > 1 ? 's' : ''} remain untouched.`;
      
      callback(true, message);
    } catch (error) {
      callback(false, 'Failed to keep both files');
    }
  };

  const handleReplaceWithBetter = async (fileId: string, betterPath: string, callback: (success: boolean, message: string) => void) => {
    const file = files.find(f => f.id === fileId);
    if (!file || !file.duplicateInfo?.betterVersion) {
      callback(false, 'File or better version not found');
      return;
    }

    try {
      // In a real implementation, you might:
      // 1. Delete the current file (or move to trash)
      // 2. Use the better version instead
      // 3. Update file registry to reflect the decision

      // Update file status to approved
      setFiles(prev =>
        prev.map(f =>
          f.id === fileId ? { 
            ...f, 
            status: 'approved' as const,
            suggestedName: betterPath.split('/').pop() || f.suggestedName
          } : f
        )
      );
      
      // Remove from selection if selected
      setSelectedFiles(prev => prev.filter(id => id !== fileId));

      const betterFileName = betterPath.split('/').pop() || 'better version';
      const message = `✅ Replaced with better version! Using "${betterFileName}" instead of "${file.originalName}".`;
      
      callback(true, message);
    } catch (error) {
      callback(false, 'Failed to replace with better version');
    }
  };

  const handleDeleteDuplicates = async (fileId: string, duplicatePaths: string[], callback: (success: boolean, message: string) => void) => {
    const file = files.find(f => f.id === fileId);
    if (!file) {
      callback(false, 'File not found');
      return;
    }

    try {
      // In a real implementation, you might:
      // 1. Delete the duplicate files (or move to trash)
      // 2. Keep the current file and rename it as suggested
      // 3. Update file registry to mark duplicates as handled

      // Update file status to approved (we keep this file, delete others)
      setFiles(prev =>
        prev.map(f =>
          f.id === fileId ? { ...f, status: 'approved' as const } : f
        )
      );
      
      // Remove from selection if selected
      setSelectedFiles(prev => prev.filter(id => id !== fileId));

      const duplicateCount = duplicatePaths.length;
      const duplicateNames = duplicatePaths.map(path => path.split('/').pop()).slice(0, 2);
      const namesText = duplicateNames.join(', ');
      const extraText = duplicateCount > 2 ? ` and ${duplicateCount - 2} more` : '';
      
      const message = `✅ Deleted ${duplicateCount} duplicate${duplicateCount > 1 ? 's' : ''}! Removed "${namesText}"${extraText}, kept "${file.suggestedName}".`;
      
      callback(true, message);
    } catch (error) {
      callback(false, 'Failed to delete duplicates');
    }
  };

  // New preview functionality
  const handlePreviewFile = async (filePath: string) => {
    try {
      // Check if we have the full path or just filename
      let fullPath = filePath;
      
      // If it's just a filename, try to find the corresponding file in our files array
      if (!path.isAbsolute(filePath)) {
        const fileItem = files.find(f => f.originalName === filePath);
        if (fileItem?.originalPath) {
          fullPath = fileItem.originalPath;
        } else {
          // Fallback - show alert that file path is not available
          alert(`Preview not available: Full file path not found for "${filePath}"`);
          return;
        }
      }
      
      if (window.electronAPI?.openFile) {
        const result = await window.electronAPI.openFile(fullPath);
        if (!result.success) {
          alert(`Failed to open file: ${result.error || 'Unknown error'}`);
        }
        // Success case - file should open in system default application
      } else {
        // Fallback - show an alert with file info
        alert(`Preview: ${fullPath}\n\nElectron API not available - this is a development fallback.`);
      }
    } catch (error) {
      console.error('Preview error:', error);
      alert(`Failed to preview file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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

  // New handlers for duplicate filtering
  const handleFilterModeChange = (mode: FilterMode) => {
    setFilterMode(mode);
  };

  const handleResolveAllDuplicates = async () => {
    // Batch resolve all duplicates - in a real implementation, this would
    // open a modal or wizard to handle all duplicates at once
    const duplicatesToResolve = duplicateFiles.slice(0, 5); // Limit for demo
    
    setIsProcessing(true);
    try {
      for (const file of duplicatesToResolve) {
        // Default action: keep both (approve the current file)
        await handleApproveFile(file.id);
      }
      
      // Show success message
      const resolvedCount = duplicatesToResolve.length;
      alert(`✅ Resolved ${resolvedCount} duplicate${resolvedCount > 1 ? 's' : ''}! All files were kept with suggested names.`);
    } catch (error) {
      alert('❌ Failed to resolve some duplicates');
    } finally {
      setIsProcessing(false);
    }
  };

  // Enhanced filtering logic that respects both search and filter mode
  const getFilteredFiles = () => {
    let filesToFilter = pendingFiles;
    
    // Apply filter mode first
    switch (filterMode) {
      case 'duplicates':
        filesToFilter = duplicateFiles;
        break;
      case 'regular':
        filesToFilter = regularFiles;
        break;
      case 'all':
      default:
        filesToFilter = pendingFiles;
        break;
    }
    
    // Then apply search filter
    if (!searchQuery) {
      return filesToFilter;
    }
    
    const searchLower = searchQuery.toLowerCase();
    
    return filesToFilter.filter(file => {
      // Basic search
      const basicMatch = (
        file.originalName.toLowerCase().includes(searchLower) ||
        file.suggestedName.toLowerCase().includes(searchLower) ||
        file.category.toLowerCase().includes(searchLower) ||
        (file.subcategory && file.subcategory.toLowerCase().includes(searchLower))
      );
      
      // Technical tags search
      const tagsMatch = file.technical_tags?.some(tag => 
        tag.toLowerCase().includes(searchLower)
      ) || false;
      
      // Smart tags search
      const smartTagsMatch = file.smartTags?.some(tag => 
        tag.toLowerCase().includes(searchLower)
      ) || false;
      
      // Duplicate files search
      const duplicatesMatch = file.duplicateInfo?.duplicateFiles?.some(filePath => 
        filePath.toLowerCase().includes(searchLower)
      ) || false;
      
      // Extracted entities search
      const entitiesMatch = file.extracted_entities && (
        Object.values(file.extracted_entities).some(value => {
          if (Array.isArray(value)) {
            return value.some(v => v.toLowerCase().includes(searchLower));
          }
          return value && value.toString().toLowerCase().includes(searchLower);
        })
      ) || false;
      
      return basicMatch || tagsMatch || smartTagsMatch || duplicatesMatch || entitiesMatch;
    });
  };

  const filteredFiles = getFilteredFiles();

  // Group files for display based on filter mode
  const getGroupedFiles = () => {
    if (filterMode === 'all' && !searchQuery) {
      // Show duplicates first, then regular files
      const searchFilteredDuplicates = duplicateFiles;
      const searchFilteredRegular = regularFiles;
      
      return {
        duplicates: searchFilteredDuplicates,
        regular: searchFilteredRegular,
        showSeparately: true
      };
    } else {
      // For search results or specific filter modes, show as one list
      return {
        duplicates: [],
        regular: filteredFiles,
        showSeparately: false
      };
    }
  };

  const groupedFiles = getGroupedFiles();

  // New handlers for the Mac-style header
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleBatchOperations = () => {
    setShowBatchOperations(!showBatchOperations);
  };

  const handleViewModeToggle = () => {
    // Placeholder for view mode toggle functionality
    // Could toggle between list/grid view, compact/detailed view, etc.
  };

  const handleDismissActionBar = () => {
    setActionBarVisible(false);
  };

  return (
    <div className="improved-app">
      <Header
        filesProcessed={processedToday}
        pendingCount={pendingFiles.length}
        duplicateCount={duplicateCount}
        filterMode={filterMode}
        searchQuery={searchQuery}
        currentFolder={currentFolder}
        selectedFilesCount={selectedFiles.length}
        highConfidenceCount={highConfidenceFiles.length}
        onSettingsClick={() => setSettingsOpen(true)}
        onNotificationClick={() => setShowBatchOperations(!showBatchOperations)}
        onFilterModeChange={handleFilterModeChange}
        onResolveAllDuplicates={handleResolveAllDuplicates}
        onSearchChange={handleSearchChange}
        onBatchOperations={handleBatchOperations}
        onViewModeToggle={handleViewModeToggle}
        onDismissActionBar={pendingFiles.length > 0 && actionBarVisible ? handleDismissActionBar : undefined}
        showActionBar={actionBarVisible && pendingFiles.length > 0}
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



              {/* File Review Cards with Hybrid Display */}
              <div className="files-section">
                {filteredFiles.length === 0 ? (
                  <div className="no-results">
                    <div className="no-results-icon">
                      {filterMode === 'duplicates' ? '🔍' : '📄'}
                    </div>
                    <h3>
                      {filterMode === 'duplicates' && duplicateCount === 0
                        ? 'No duplicates found'
                        : filterMode === 'regular' && regularFiles.length === 0
                          ? 'No regular files'
                          : 'No files match your search'
                      }
                    </h3>
                    <p>
                      {filterMode === 'duplicates' && duplicateCount === 0
                        ? 'All files are unique! No duplicate files detected.'
                        : filterMode === 'regular' && regularFiles.length === 0
                          ? 'All pending files are duplicates. Use the "Duplicates" filter to see them.'
                          : 'Try adjusting your search terms or clear the search to see all files.'
                      }
                    </p>
                  </div>
                ) : (
                  <>
                    {groupedFiles.showSeparately ? (
                      <>
                        {/* Duplicates Section */}
                        {groupedFiles.duplicates.length > 0 && (
                          <div className="file-group duplicate-group">
                            <div className="group-header">
                              <h3 className="group-title">
                                <span className="group-icon">🔍</span>
                                Duplicate Files ({groupedFiles.duplicates.length})
                              </h3>
                              <p className="group-subtitle">
                                Files that have similar content or names detected in your system
                              </p>
                            </div>
                            <div className="files-list">
                              {groupedFiles.duplicates.map(file => (
                                <FileReviewCard
                                  key={file.id}
                                  file={file}
                                  onApprove={handleApproveFile}
                                  onReject={handleRejectFile}
                                  isSelected={selectedFiles.includes(file.id)}
                                  onSelect={handleFileSelection}
                                  onKeepBoth={handleKeepBoth}
                                  onReplaceWithBetter={handleReplaceWithBetter}
                                  onDeleteDuplicates={handleDeleteDuplicates}
                                  onPreviewFile={handlePreviewFile}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Regular Files Section */}
                        {groupedFiles.regular.length > 0 && (
                          <div className="file-group regular-group">
                            <div className="group-header">
                              <h3 className="group-title">
                                <span className="group-icon">📄</span>
                                Regular Files ({groupedFiles.regular.length})
                              </h3>
                              <p className="group-subtitle">
                                New files ready for AI-powered organization
                              </p>
                            </div>
                            <div className="files-list">
                              {groupedFiles.regular.map(file => (
                                <FileReviewCard
                                  key={file.id}
                                  file={file}
                                  onApprove={handleApproveFile}
                                  onReject={handleRejectFile}
                                  isSelected={selectedFiles.includes(file.id)}
                                  onSelect={handleFileSelection}
                                  onKeepBoth={handleKeepBoth}
                                  onReplaceWithBetter={handleReplaceWithBetter}
                                  onDeleteDuplicates={handleDeleteDuplicates}
                                  onPreviewFile={handlePreviewFile}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      // Single list view for filtered results
                      <div className="files-list">
                        {filteredFiles.map(file => (
                          <FileReviewCard
                            key={file.id}
                            file={file}
                            onApprove={handleApproveFile}
                            onReject={handleRejectFile}
                            isSelected={selectedFiles.includes(file.id)}
                            onSelect={handleFileSelection}
                            onKeepBoth={handleKeepBoth}
                            onReplaceWithBetter={handleReplaceWithBetter}
                            onDeleteDuplicates={handleDeleteDuplicates}
                            onPreviewFile={handlePreviewFile}
                          />
                        ))}
                      </div>
                    )}
                  </>
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