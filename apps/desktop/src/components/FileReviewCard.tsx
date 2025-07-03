import React, { useState } from 'react';
import './FileReviewCard.css';
import EmailPreviewModal from './EmailPreviewModal';
import CalendarPreviewModal from './CalendarPreviewModal';
import { N8NAutomationService } from '../services/n8n-automation';

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

interface ExtractedEntities {
  budget?: string;
  team_size?: string;
  deadline?: string;
  technology: string[];
  company?: string;
  invoice_number?: string;
  amount?: string;
}

interface FileReviewCardProps {
  file: {
    id: string;
    originalName: string;
    suggestedName: string;
    confidence: number;
    category: string;
    subcategory?: string;
    reasoning: string;
    technical_tags?: string[];
    extracted_entities?: ExtractedEntities;
    processing_time_ms?: number;
    error?: string;
    duplicateInfo?: DuplicateInfo;
    smartTags?: string[];
    folderSuggestion?: {
      path: string;
      confidence: number;
      reasoning: string;
    };
  };
  onApprove: (fileId: string, finalName?: string) => void;
  onReject: (fileId: string) => void;
  isSelected?: boolean;
  onSelect?: (fileId: string, selected: boolean) => void;
  onKeepBoth?: (fileId: string, callback: (success: boolean, message: string) => void) => void;
  onReplaceWithBetter?: (fileId: string, betterPath: string, callback: (success: boolean, message: string) => void) => void;
  onDeleteDuplicates?: (fileId: string, duplicatePaths: string[], callback: (success: boolean, message: string) => void) => void;
  onPreviewFile?: (filePath: string) => void;
  onMoveToFolder?: (fileId: string, targetPath: string, createFolder: boolean, callback: (success: boolean, message: string, newPath?: string) => void) => void;
}

const FileReviewCard: React.FC<FileReviewCardProps> = ({
  file,
  onApprove,
  onReject,
  isSelected = false,
  onSelect,
  onKeepBoth,
  onReplaceWithBetter,
  onDeleteDuplicates,
  onPreviewFile,
  onMoveToFolder,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(file.suggestedName);
  const [showDetails, setShowDetails] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [showFolderSuggestion, setShowFolderSuggestion] = useState(false);
  
  // Automation modal states
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [showAutomation, setShowAutomation] = useState(false);
  const [automationStatus, setAutomationStatus] = useState<{
    email: 'idle' | 'sent' | 'failed';
    calendar: 'idle' | 'added' | 'failed';
  }>({ email: 'idle', calendar: 'idle' });

  const getFileIcon = (fileName: string, category: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    
    if (category.toLowerCase().includes('invoice')) {
      return '📄';
    }
    if (category.toLowerCase().includes('report')) {
      return '📊';
    }
    if (category.toLowerCase().includes('resume')) {
      return '👤';
    }
    if (['pdf'].includes(ext || '')) {
      return '📄';
    }
    if (['doc', 'docx'].includes(ext || '')) {
      return '📝';
    }
    if (['xlsx', 'xls', 'csv'].includes(ext || '')) {
      return '📋';
    }
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) {
      return '🖼️';
    }
    return '📄';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) {
      return 'high';
    }
    if (confidence >= 0.6) {
      return 'medium';
    }
    return 'low';
  };

  const showSuccess = (message: string) => {
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.innerHTML = `✅ ${message}`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  };

  // Automation helper functions
  const isFinancialDocument = () => {
    // Include 'document' category if it has financial entities (quick fix)
    const isFinancialCategory = ['invoice', 'receipt', 'financial'].includes(file.category.toLowerCase());
    const isDocumentWithFinancialData = file.category.toLowerCase() === 'document' && 
      (file.extracted_entities?.amount || file.extracted_entities?.invoice_number || 
       file.originalName?.toLowerCase().includes('invoice'));
    
    return isFinancialCategory || isDocumentWithFinancialData;
  };

  const hasAutomationData = () => {
    return file.extracted_entities?.company || file.extracted_entities?.amount || file.extracted_entities?.invoice_number;
  };

  const shouldShowAutomationButton = () => {
    return isFinancialDocument() && hasAutomationData();
  };

  const toggleAutomation = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAutomation(!showAutomation);
  };

  const generateEmailData = () => {
    const vendor = file.extracted_entities?.company || 'Unknown Vendor';
    const amount = file.extracted_entities?.amount || '';
    const invoiceNumber = file.extracted_entities?.invoice_number || '';
    
    return {
      subject: `New ${file.category}: ${vendor} ${amount}`,
      body: `A new ${file.category} has been processed by SilentSort:

📄 File: ${file.suggestedName}
🏢 Vendor: ${vendor}
${amount ? `💰 Amount: ${amount}` : ''}
${invoiceNumber ? `📋 Invoice #: ${invoiceNumber}` : ''}

📁 Suggested Location: ${file.folderSuggestion?.path || 'Not specified'}
🎯 AI Confidence: ${Math.round(file.confidence * 100)}%

🤖 Analysis: ${file.reasoning}

Processed automatically by SilentSort at ${new Date().toISOString()}`,
      priority: (amount && parseFloat(amount.replace(/[^0-9.]/g, '')) > 1000) ? 'high' as const : 'normal' as const
    };
  };

  const generateCalendarData = () => {
    const vendor = file.extracted_entities?.company || 'Unknown Vendor';
    const amount = file.extracted_entities?.amount || '';
    const invoiceNumber = file.extracted_entities?.invoice_number || '';
    
    // For demo purposes, set due date to 30 days from now if not available
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    const dueDateString = dueDate.toISOString().split('T')[0];
    
    return {
      title: `Payment Due: ${vendor} ${amount}`,
      description: `Payment reminder for ${file.category}

${vendor ? `Vendor: ${vendor}` : ''}
${amount ? `Amount: ${amount}` : ''}
${invoiceNumber ? `Invoice: ${invoiceNumber}` : ''}

File: ${file.suggestedName}
Processed by SilentSort`,
      dueDate: dueDateString,
      reminders: [
        { method: 'email' as const, minutes: 1440 }, // 1 day before
        { method: 'popup' as const, minutes: 480 },  // 8 hours before
        { method: 'email' as const, minutes: 60 }    // 1 hour before
      ]
    };
  };

  const handleEmailAutomation = async () => {
    try {
      // Set loading state
      setAutomationStatus(prev => ({ ...prev, email: 'idle' }));
      
      // Get environment variables from main process
      const envVars = await window.electronAPI.getEnvVars();
      const automationService = new N8NAutomationService({
        webhookUrl: envVars.N8N_WEBHOOK_URL
      });
      const payload = {
        fileName: file.suggestedName,
        filePath: file.originalName,
        fileCategory: file.category.toLowerCase().includes('invoice') ? 'invoice' as const : 'financial' as const,
        invoiceNumber: file.extracted_entities?.invoice_number,
        amount: file.extracted_entities?.amount,
        vendor: file.extracted_entities?.company,
        company: file.extracted_entities?.company,
        confidence: file.confidence,
        contentSummary: file.reasoning,
        suggestedFolder: file.folderSuggestion?.path,
        processedAt: new Date().toISOString(),
        extractionSource: 'ai' as const
      };
      
      console.log('📧 Attempting to send email notification...');
      const result = await automationService.processFinancialDocument(payload);
      
      // Check if email workflow was actually triggered
      const emailTriggered = result.triggeredWorkflows.includes('Email Notification');
      
      if (result.success && emailTriggered) {
        setAutomationStatus(prev => ({ ...prev, email: 'sent' }));
        showSuccess('✅ Email notification sent successfully!');
      } else if (result.success && !emailTriggered) {
        // Service is in fallback mode - show different message
        setAutomationStatus(prev => ({ ...prev, email: 'failed' }));
        showSuccess('⚠️ Email automation is in demo mode. Check n8n webhook configuration.');
      } else {
        // Actual failure
        setAutomationStatus(prev => ({ ...prev, email: 'failed' }));
        const errorMsg = result.error || 'Unknown error occurred';
        showSuccess(`❌ Email automation failed: ${errorMsg}`);
        console.error('❌ Email automation failed:', result.error);
      }
      
      setIsEmailModalOpen(false);
      
    } catch (error) {
      console.error('Email automation failed:', error);
      setAutomationStatus(prev => ({ ...prev, email: 'failed' }));
      showSuccess('❌ Email automation failed. Please check your n8n webhook configuration.');
    }
  };

  const handleCalendarAutomation = async () => {
    try {
      // Set loading state
      setAutomationStatus(prev => ({ ...prev, calendar: 'idle' }));
      
      // Get environment variables from main process
      const envVars = await window.electronAPI.getEnvVars();
      
      const automationService = new N8NAutomationService({
        webhookUrl: envVars.N8N_WEBHOOK_URL
      });
      
      const calendarData = generateCalendarData();
      
      const payload = {
        fileName: file.suggestedName,
        filePath: file.originalName,
        fileCategory: file.category.toLowerCase().includes('invoice') ? 'invoice' as const : 'financial' as const,
        invoiceNumber: file.extracted_entities?.invoice_number,
        amount: file.extracted_entities?.amount,
        vendor: file.extracted_entities?.company,
        company: file.extracted_entities?.company,
        dueDate: calendarData.dueDate,
        confidence: file.confidence,
        contentSummary: file.reasoning,
        suggestedFolder: file.folderSuggestion?.path,
        processedAt: new Date().toISOString(),
        extractionSource: 'ai' as const
      };
      
      const result = await automationService.processFinancialDocument(payload);
      
      // Check if calendar workflow was actually triggered
      const calendarTriggered = result.triggeredWorkflows.includes('Calendar Reminder');
      
      if (result.success && calendarTriggered) {
        setAutomationStatus(prev => ({ ...prev, calendar: 'added' }));
        showSuccess('✅ Calendar reminder added successfully!');
      } else if (result.success && !calendarTriggered) {
        // Service is in fallback mode - show different message
        setAutomationStatus(prev => ({ ...prev, calendar: 'failed' }));
        showSuccess('⚠️ Calendar automation is in demo mode. Check n8n webhook configuration.');
      } else {
        // Actual failure
        setAutomationStatus(prev => ({ ...prev, calendar: 'failed' }));
        const errorMsg = result.error || 'Unknown error occurred';
        showSuccess(`❌ Calendar automation failed: ${errorMsg}`);
        console.error('❌ Calendar automation failed:', result.error);
      }
      
      setIsCalendarModalOpen(false);
      
    } catch (error) {
      console.error('❌ Calendar automation error:', error);
      setAutomationStatus(prev => ({ ...prev, calendar: 'failed' }));
      showSuccess('❌ Calendar automation failed. Please check your n8n webhook configuration.');
    }
  };

  const handleKeepBoth = () => {
    if (onKeepBoth) {
      setActionInProgress('keep');
      onKeepBoth(file.id, (success: boolean, message: string) => {
        setActionInProgress(null);
        if (success) {
          showSuccess(message);
        }
      });
    }
  };

  const handleReplaceWithBetter = () => {
    if (onReplaceWithBetter && file.duplicateInfo?.betterVersion?.filePath) {
      setActionInProgress('better');
      onReplaceWithBetter(file.id, file.duplicateInfo.betterVersion.filePath, (success: boolean, message: string) => {
        setActionInProgress(null);
        if (success) {
          showSuccess(message);
        }
      });
    }
  };

  const handleDeleteDuplicates = () => {
    if (onDeleteDuplicates && file.duplicateInfo?.duplicateFiles) {
      setActionInProgress('delete');
      onDeleteDuplicates(file.id, file.duplicateInfo.duplicateFiles, (success: boolean, message: string) => {
        setActionInProgress(null);
        if (success) {
          showSuccess(message);
        }
      });
    }
  };

  const handleMoveToExistingFolder = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (onMoveToFolder && file.folderSuggestion) {
      setActionInProgress('move');
      onMoveToFolder(
        file.id, 
        file.folderSuggestion.path, 
        false, // Don't create folder - expect it to exist
        (success: boolean, message: string, newPath?: string) => {
          setActionInProgress(null);
          if (success) {
            const folderName = (newPath || file.folderSuggestion?.path)?.split('/').pop() || 'destination folder';
            showSuccess(`✅ File successfully moved to "${folderName}" folder!`);
          } else {
            showSuccess(`❌ Move failed: ${message}`);
          }
        }
      );
    }
  };

  const handleCreateAndMoveToFolder = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (onMoveToFolder && file.folderSuggestion) {
      setActionInProgress('create');
      onMoveToFolder(
        file.id, 
        file.folderSuggestion.path, 
        true, // Create folder if needed
        (success: boolean, message: string, newPath?: string) => {
          setActionInProgress(null);
          if (success) {
            const folderName = (newPath || file.folderSuggestion?.path)?.split('/').pop() || 'destination folder';
            showSuccess(`✅ Folder created! File moved to "${folderName}" folder successfully!`);
          } else {
            showSuccess(`❌ Create & move failed: ${message}`);
          }
        }
      );
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditedName(file.suggestedName);
  };

  const handleSave = (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation();
    setIsEditing(false);
    onApprove(file.id, editedName);
  };

  const handleCancel = (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation();
    setIsEditing(false);
    setEditedName(file.suggestedName);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.actions, .file-checkbox, .preview-actions, .duplicate-actions')) {
      return;
    }
    setShowDetails(!showDetails);
  };

  // Get key entities for display
  const keyEntities = [];
  if (file.extracted_entities?.company) {
    keyEntities.push(`🏢 ${file.extracted_entities.company}`);
  }
  if (file.extracted_entities?.amount) {
    keyEntities.push(`💰 ${file.extracted_entities.amount}`);
  }
  if (file.extracted_entities?.technology?.length) {
    keyEntities.push(`⚡ ${file.extracted_entities.technology.slice(0, 2).join(', ')}`);
  }

  // Unified tags function - combines all tag types without duplication
  const getAllTags = () => {
    const allTags = new Set<string>();
    
    // Add technical tags
    if (file.technical_tags) {
      file.technical_tags.forEach(tag => allTags.add(tag));
    }
    
    // Add smart tags
    if (file.smartTags) {
      file.smartTags.forEach(tag => allTags.add(tag));
    }
    
    // Add extracted entities as tags
    if (file.extracted_entities) {
      Object.entries(file.extracted_entities).forEach(([key, value]) => {
        if (value && !['company', 'amount'].includes(key)) { // Skip company and amount as they're shown in key entities
          if (Array.isArray(value)) {
            value.forEach(v => allTags.add(`${key}: ${v}`));
          } else {
            allTags.add(`${key}: ${value}`);
          }
        }
      });
    }
    
    return Array.from(allTags);
  };

  // Check for duplicates
  const hasDuplicates = file.duplicateInfo?.isDuplicate && file.duplicateInfo.duplicateFiles.length > 0;

  return (
    <div 
      className={`file-card ${hasDuplicates ? 'duplicate-card' : 'regular-card'} ${showDetails ? 'expanded' : ''} ${isSelected ? 'selected' : ''}`} 
      data-file-id={file.id}
      onClick={handleCardClick}
    >
      {/* Duplicate Warning Banner */}
      {hasDuplicates && (
        <div className="duplicate-warning">
          <span className="duplicate-badge">🔍 DUPLICATE DETECTED</span>
          <span className="duplicate-count">
            {file.duplicateInfo?.duplicateFiles.length} similar files found
          </span>
        </div>
      )}

      <div className="card-main">
        {onSelect && (
          <input
            type="checkbox"
            className="file-checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(file.id, e.target.checked)}
            onClick={(e) => e.stopPropagation()}
          />
        )}
        
        <div className="file-content">
          <div className="file-names">
            <span className="file-icon">{getFileIcon(file.originalName, file.category)}</span>
            <div className="name-row first-row">
              <span className="label">From:</span>
              <span className="original-name">{file.originalName}</span>
              <div className="file-meta">
                <span className="category">{file.category}</span>
                <span className={`confidence confidence-${getConfidenceColor(file.confidence)}`}>
                  {Math.round(file.confidence * 100)}%
                </span>
              </div>
            </div>
            <div className="name-row second-row">
              <span className="label to-label">To:</span>
              {isEditing ? (
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="name-input"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSave(e);
                    }
                    if (e.key === 'Escape') {
                      handleCancel(e);
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="suggested-name">{file.suggestedName}</span>
              )}
            </div>
          </div>
          
          {/* Only show tags and entities in expanded view */}
          {showDetails && (
            <>
              {keyEntities.length > 0 && (
                <div className="key-entities">
                  {keyEntities.map((entity, i) => (
                    <span key={i} className="entity-tag">{entity}</span>
                  ))}
                </div>
              )}

              {/* Unified tags section */}
              {getAllTags().length > 0 && (
                <div className="unified-tags">
                  {getAllTags().map((tag, i) => (
                    <span key={i} className="unified-tag">{tag}</span>
                  ))}
                </div>
              )}

              {/* Folder Suggestion Section */}
              {file.folderSuggestion && (
                <div className="folder-suggestion-section">
                  <div 
                    className="folder-suggestion-header"
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setShowFolderSuggestion(!showFolderSuggestion); 
                    }}
                  >
                    <span className="folder-suggestion-label">📁 Suggested Folder</span>
                    <span className={`folder-confidence confidence-${getConfidenceColor(file.folderSuggestion.confidence)}`}>
                      {Math.round(file.folderSuggestion.confidence * 100)}%
                    </span>
                    <button className={`folder-toggle ${showFolderSuggestion ? 'expanded' : ''}`}>
                      ⌄
                    </button>
                  </div>
                  
                  {showFolderSuggestion && (
                    <div className="folder-suggestion-content">
                      <div className="suggested-folder-path">
                        {file.folderSuggestion.path}
                      </div>
                      <div className="folder-reasoning">
                        {file.folderSuggestion.reasoning}
                      </div>
                      <div className="folder-actions">
                        <button 
                          className={`action-btn folder-move ${actionInProgress === 'move' ? 'loading' : ''}`}
                          onClick={handleMoveToExistingFolder}
                          disabled={!!actionInProgress}
                        >
                          {actionInProgress === 'move' ? '⏳' : '📁'} Move Here
                        </button>
                        <button 
                          className={`action-btn folder-create ${actionInProgress === 'create' ? 'loading' : ''}`}
                          onClick={handleCreateAndMoveToFolder}
                          disabled={!!actionInProgress}
                        >
                          {actionInProgress === 'create' ? '⏳' : '➕'} Create & Move
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Duplicate Information */}
          {hasDuplicates && (
            <div className="duplicate-info">
              <div className="duplicate-files">
                <strong>Similar Files:</strong>
                {file.duplicateInfo?.duplicateFiles.slice(0, 2).map((duplicateFile, i) => (
                  <div key={i} className="duplicate-file">
                    <span className="duplicate-name">{duplicateFile.split('/').pop()}</span>
                    <button 
                      className="preview-btn-small"
                      onClick={() => onPreviewFile?.(duplicateFile)}
                    >
                      👁️
                    </button>
                  </div>
                ))}
                {file.duplicateInfo?.duplicateFiles && file.duplicateInfo.duplicateFiles.length > 2 && (
                  <div className="more-duplicates">
                    +{file.duplicateInfo.duplicateFiles.length - 2} more files
                  </div>
                )}
              </div>
              
              {file.duplicateInfo?.betterVersion && (
                <div className="better-version">
                  <strong>⭐ Better Version:</strong>
                  <span className="better-file">{file.duplicateInfo.betterVersion.filePath.split('/').pop()}</span>
                  <span className="better-reason">({file.duplicateInfo.betterVersion.reason})</span>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="actions">
          {isEditing ? (
            <>
              <button className="action-btn save" onClick={handleSave}>✓</button>
              <button className="action-btn cancel" onClick={handleCancel}>✕</button>
            </>
          ) : (
            <>
              <button 
                className="action-btn approve" 
                onClick={(e) => { e.stopPropagation(); onApprove(file.id); }}
              >
                ✓
              </button>
              <button 
                className="action-btn edit" 
                onClick={handleEdit}
              >
                ✏️
              </button>
              <button 
                className="action-btn reject" 
                onClick={(e) => { e.stopPropagation(); onReject(file.id); }}
              >
                ✕
              </button>
            </>
          )}
          
          <button 
            className={`action-btn details ${showDetails ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); setShowDetails(!showDetails); }}
          >
            ⌄
          </button>
        </div>
      </div>

      {/* Duplicate Actions */}
      {hasDuplicates && (
        <div className="duplicate-actions">
          <button 
            className={`action-btn keep ${actionInProgress === 'keep' ? 'loading' : ''}`}
            onClick={handleKeepBoth}
            disabled={!!actionInProgress}
          >
            {actionInProgress === 'keep' ? '⏳' : '📁'} Keep Both
          </button>
          
          {file.duplicateInfo?.betterVersion && (
            <button 
              className={`action-btn better ${actionInProgress === 'better' ? 'loading' : ''}`}
              onClick={handleReplaceWithBetter}
              disabled={!!actionInProgress}
            >
              {actionInProgress === 'better' ? '⏳' : '⭐'} Use Better
            </button>
          )}
          
          <button 
            className={`action-btn delete ${actionInProgress === 'delete' ? 'loading' : ''}`}
            onClick={handleDeleteDuplicates}
            disabled={!!actionInProgress}
          >
            {actionInProgress === 'delete' ? '⏳' : '🗑️'} Delete Duplicates
          </button>

          <button 
            className="action-btn preview"
            onClick={() => onPreviewFile?.(file.originalName)}
          >
            👁️ Preview Current
          </button>
        </div>
      )}

      {/* Automation Section - Only for financial documents */}
      {shouldShowAutomationButton() && showAutomation && (
        <div className="automation-section">
          <div className="automation-header">
            <h4>🤖 Finance Automation</h4>
            <span className="automation-subtitle">
              Automate notifications and reminders for this {file.category}
            </span>
          </div>
          
          <div className="automation-actions">
            <button
              className={`automation-btn email-btn ${automationStatus.email === 'sent' ? 'completed' : ''}`}
              onClick={() => setIsEmailModalOpen(true)}
              disabled={automationStatus.email === 'sent'}
            >
              {automationStatus.email === 'sent' ? '📧 Sent' : 
               automationStatus.email === 'failed' ? '📧 Failed' : 
               '📧 Send Email'}
            </button>
            
            <button
              className={`automation-btn calendar-btn ${automationStatus.calendar === 'added' ? 'completed' : ''}`}
              onClick={() => setIsCalendarModalOpen(true)}
              disabled={automationStatus.calendar === 'added'}
            >
              {automationStatus.calendar === 'added' ? '📅 Added' : 
               automationStatus.calendar === 'failed' ? '📅 Failed' : 
               '📅 Add Reminder'}
            </button>
          </div>
          
          <div className="automation-summary">
            <div className="summary-item">
              <span className="summary-label">Vendor:</span>
              <span className="summary-value">{file.extracted_entities?.company || 'Unknown'}</span>
            </div>
            {file.extracted_entities?.amount && (
              <div className="summary-item">
                <span className="summary-label">Amount:</span>
                <span className="summary-value">{file.extracted_entities.amount}</span>
              </div>
            )}
            {file.extracted_entities?.invoice_number && (
              <div className="summary-item">
                <span className="summary-label">Invoice #:</span>
                <span className="summary-value">{file.extracted_entities.invoice_number}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Automation Button - Golden Thunder */}
      {shouldShowAutomationButton() && (
        <button
          className={`automation-fab ${showAutomation ? 'active' : ''}`}
          onClick={toggleAutomation}
          title={showAutomation ? 'Hide Automation' : 'Show Automation Options'}
        >
          ⚡
        </button>
      )}

      {/* Detailed analysis section */}
      {showDetails && (
        <div className="card-details">
          <div className="detail-row">
            <strong>Analysis:</strong>
            <span>{file.reasoning}</span>
          </div>
          
          {file.processing_time_ms && (
            <div className="detail-row">
              <strong>Processing:</strong>
              <span>{file.processing_time_ms}ms</span>
            </div>
          )}
          
          {file.error && (
            <div className="detail-row error">
              <strong>Error:</strong>
              <span>{file.error}</span>
            </div>
          )}
        </div>
      )}

      {/* Email Preview Modal */}
      <EmailPreviewModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        onSend={handleEmailAutomation}
        emailData={generateEmailData()}
        fileData={{
          fileName: file.suggestedName,
          vendor: file.extracted_entities?.company,
          amount: file.extracted_entities?.amount,
          invoiceNumber: file.extracted_entities?.invoice_number,
          category: file.category
        }}
      />

      {/* Calendar Preview Modal */}
      <CalendarPreviewModal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        onAddToCalendar={handleCalendarAutomation}
        calendarData={generateCalendarData()}
        fileData={{
          fileName: file.suggestedName,
          vendor: file.extracted_entities?.company,
          amount: file.extracted_entities?.amount,
          invoiceNumber: file.extracted_entities?.invoice_number,
          dueDate: generateCalendarData().dueDate,
          category: file.category
        }}
      />
    </div>
  );
};

export default FileReviewCard; 